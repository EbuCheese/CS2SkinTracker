import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { useAdvancedDebounce } from '@/hooks/util';

export const usePortfolioData = (userSession) => {
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const lastDataFetchRef = useRef(0);

  // Validates user session object for security and data integrity
  const validateUserSession = useCallback((session) => {
    if (!session?.id || typeof session.id !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(session.id);
  }, []);

  // Fetches critical data (investments and sales) without debouncing
  const fetchCriticalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!validateUserSession(userSession)) {
        setError('Invalid user session. Please re-validate your beta key.');
        return;
      }

      console.log('Fetching data for user:', userSession.id);

      const [investmentsResult, soldItemsResult] = await Promise.allSettled([
        supabase.rpc('fetch_user_investment_summary', {
          context_user_id: userSession.id
        }),
        supabase.rpc('fetch_user_investment_sales', {
          context_user_id: userSession.id
        })
      ]);

      let investmentsArray = [];

      if (investmentsResult.status === 'fulfilled' && !investmentsResult.value.error) {
        investmentsArray = Array.isArray(investmentsResult.value.data) 
          ? investmentsResult.value.data 
          : (investmentsResult.value.data || []);
        setInvestments(investmentsArray);
      } else {
        console.error('Investments query failed:', investmentsResult.reason || investmentsResult.value?.error);
        setError('Access denied. Please verify your beta key is valid and active.');
        return;
      }

      if (soldItemsResult.status === 'fulfilled' && !soldItemsResult.value.error) {
        const soldItemsArray = Array.isArray(soldItemsResult.value.data)
          ? soldItemsResult.value.data
          : (soldItemsResult.value.data || []);
        setSoldItems(soldItemsArray);
      } else {
        console.warn('Could not fetch sold items, continuing with investments only');
        setSoldItems([]);
      }

      lastDataFetchRef.current = Date.now();

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userSession?.id, validateUserSession]);

  // Debounced refresh function for user-initiated actions
  const { debouncedFunction: debouncedRefresh } = useAdvancedDebounce(
    useCallback(async () => {
      const timeSinceLastFetch = Date.now() - lastDataFetchRef.current;
      if (timeSinceLastFetch < 1000) return;
      
      await fetchCriticalData();
    }, [fetchCriticalData]),
    800,
    { 
      leading: false,
      trailing: true,
      maxWait: 2000
    }
  );

  // Initial data fetch
  useEffect(() => {
    if (!userSession) return;

    if (validateUserSession(userSession)) {
      fetchCriticalData();
    } else {
      setLoading(false);
      setError('Invalid user session. Please validate your beta key.');
    }
  }, [userSession, fetchCriticalData, validateUserSession]);

  return {
    investments,
    soldItems,
    loading,
    error,
    refetch: debouncedRefresh,
    setInvestments // For optimistic updates
  };
};