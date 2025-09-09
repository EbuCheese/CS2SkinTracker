import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { useAdvancedDebounce } from '@/hooks/util';

// Error classification helper
const classifyError = (error, context = '') => {
  const errorMessage = error?.message || error || '';
  const errorCode = error?.code;
  
  // Authentication and session errors
  if (errorMessage.includes('Invalid user context') || 
      errorMessage.includes('user does not exist') ||
      errorMessage.includes('JWT') ||
      errorMessage.includes('authentication')) {
    return {
      type: 'AUTH_ERROR',
      userMessage: 'Your session has expired. Please refresh the page and re-enter your beta key.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'refresh_session'
    };
  }

  // Access denied / permission errors
  if (errorMessage.includes('Access denied') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('not authorized') ||
      errorCode === 'PGRST301' || // PostgREST insufficient privilege
      errorCode === '42501') { // PostgreSQL insufficient privilege
    return {
      type: 'ACCESS_DENIED',
      userMessage: 'Access denied. Please verify your beta key is valid and active.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'verify_key'
    };
  }

  // Network connectivity errors
  if (errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('ERR_NETWORK') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      error?.name === 'NetworkError') {
    return {
      type: 'NETWORK_ERROR',
      userMessage: 'Connection failed. Please check your internet connection and try again.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'retry'
    };
  }

  // Rate limiting errors
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorCode === '429') {
    return {
      type: 'RATE_LIMIT',
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'wait_retry'
    };
  }

  // Database connection errors
  if (errorMessage.includes('connection') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('server error') ||
      errorCode?.startsWith('08')) { // PostgreSQL connection errors
    return {
      type: 'DATABASE_ERROR',
      userMessage: 'Database connection issue. Our servers may be temporarily unavailable.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'retry_later'
    };
  }

  // Data validation errors
  if (errorMessage.includes('invalid input') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('foreign key') ||
      errorCode?.startsWith('23')) { // PostgreSQL integrity constraint violations
    return {
      type: 'DATA_ERROR',
      userMessage: 'Data validation error. Some information may be corrupted.',
      technicalDetails: errorMessage,
      recoverable: false,
      action: 'contact_support'
    };
  }

  // Function not found errors (database schema issues)
  if (errorMessage.includes('function') && errorMessage.includes('does not exist') ||
      errorCode === '42883') { // PostgreSQL function does not exist
    return {
      type: 'SCHEMA_ERROR',
      userMessage: 'System update in progress. Please try again in a few minutes.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'retry_later'
    };
  }

  // Generic server errors
  if (errorMessage.includes('500') || 
      errorMessage.includes('Internal Server Error') ||
      errorCode?.startsWith('5')) {
    return {
      type: 'SERVER_ERROR',
      userMessage: 'Server error occurred. Please try again shortly.',
      technicalDetails: errorMessage,
      recoverable: true,
      action: 'retry_later'
    };
  }

  // No data / empty response (not necessarily an error)
  if (errorMessage.includes('No data') || 
      errorMessage.includes('empty') ||
      (!error && context === 'empty_response')) {
    return {
      type: 'NO_DATA',
      userMessage: 'No investment data found. Add your first investment to get started.',
      technicalDetails: 'Empty dataset',
      recoverable: true,
      action: 'add_first_item'
    };
  }

  // Default fallback for unknown errors
  return {
    type: 'UNKNOWN_ERROR',
    userMessage: 'An unexpected error occurred. Please try refreshing the page.',
    technicalDetails: errorMessage,
    recoverable: true,
    action: 'retry'
  };
};

export const usePortfolioData = (userSession) => {
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
 
  const lastDataFetchRef = useRef(0);

  // Validates user session object for security and data integrity
  const validateUserSession = useCallback((session) => {
    if (!session?.id || typeof session.id !== 'string') return false;
   
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(session.id);
  }, []);

  // Enhanced error handler
  const handleError = useCallback((error, context = '') => {
    const classified = classifyError(error, context);
    setError(classified.userMessage);
    setErrorDetails(classified);
    
    // Log technical details for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`Portfolio Data Error [${classified.type}]:`, {
        context,
        userMessage: classified.userMessage,
        technicalDetails: classified.technicalDetails,
        originalError: error
      });
    }
  }, []);

  // Fetches critical data (investments, sales, and portfolio summary) without debouncing
  const fetchCriticalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      
      if (!validateUserSession(userSession)) {
        handleError(new Error('Invalid session format'), 'session_validation');
        return;
      }

      console.log('Fetching data for user:', userSession.id);
      
      // Fetch all three data sources in parallel
      const [investmentsResult, soldItemsResult, portfolioResult] = await Promise.allSettled([
        supabase.rpc('fetch_user_investment_summary', {
          context_user_id: userSession.id
        }),
        supabase.rpc('fetch_user_investment_sales', {
          context_user_id: userSession.id
        }),
        supabase.rpc('get_user_portfolio_summary', {
          context_user_id: userSession.id
        })
      ]);

      // Handle investments data
      let investmentsArray = [];
      if (investmentsResult.status === 'fulfilled' && !investmentsResult.value.error) {
        investmentsArray = Array.isArray(investmentsResult.value.data)
          ? investmentsResult.value.data
          : (investmentsResult.value.data || []);
        setInvestments(investmentsArray);
      } else {
        const investmentError = investmentsResult.reason || investmentsResult.value?.error;
        handleError(investmentError, 'investments_fetch');
        return;
      }

      // Handle sold items data
      if (soldItemsResult.status === 'fulfilled' && !soldItemsResult.value.error) {
        const soldItemsArray = Array.isArray(soldItemsResult.value.data)
          ? soldItemsResult.value.data
          : (soldItemsResult.value.data || []);
        setSoldItems(soldItemsArray);
      } else {
        // Don't fail completely for sold items - just log and continue
        const soldError = soldItemsResult.reason || soldItemsResult.value?.error;
        console.warn('Could not fetch sold items:', soldError);
        setSoldItems([]);
      }

      // Handle portfolio summary data
      if (portfolioResult.status === 'fulfilled' && !portfolioResult.value.error) {
        const summaryData = portfolioResult.value.data;
        setPortfolioSummary(summaryData);
        console.log('Portfolio summary fetched:', summaryData);
      } else {
        // Don't fail completely for portfolio summary - just log and continue
        const summaryError = portfolioResult.reason || portfolioResult.value?.error;
        console.warn('Could not fetch portfolio summary:', summaryError);
        setPortfolioSummary(null);
      }

      // Check if we have completely empty data (might indicate first-time user)
      if (investmentsArray.length === 0) {
        handleError(null, 'empty_response');
      }

      lastDataFetchRef.current = Date.now();
      
    } catch (err) {
      handleError(err, 'unexpected_error');
    } finally {
      setLoading(false);
    }
  }, [userSession?.id, validateUserSession, handleError]);

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

  // Enhanced retry function that considers error type
  const retryWithStrategy = useCallback(() => {
    if (!errorDetails) {
      debouncedRefresh();
      return;
    }

    switch (errorDetails.action) {
      case 'refresh_session':
        // For auth errors, user needs to refresh page/re-enter key
        window.location.reload();
        break;
      case 'verify_key':
        // For access denied, user needs to verify their key
        setError('Please verify your beta key is valid. Contact support if this persists.');
        break;
      case 'wait_retry':
        // For rate limits, wait a bit longer before retry
        setTimeout(() => debouncedRefresh(), 5000);
        break;
      case 'retry_later':
        // For server issues, suggest waiting
        setError(errorDetails.userMessage + ' We\'ll automatically retry in 30 seconds.');
        setTimeout(() => debouncedRefresh(), 30000);
        break;
      case 'add_first_item':
        // Clear error for empty data case
        setError(null);
        setErrorDetails(null);
        break;
      case 'contact_support':
        // For data errors, don't auto-retry
        setError(errorDetails.userMessage + ' Please contact support if this continues.');
        break;
      default:
        debouncedRefresh();
    }
  }, [errorDetails, debouncedRefresh]);

  // Initial data fetch
  useEffect(() => {
    if (!userSession) return;
    
    if (validateUserSession(userSession)) {
      fetchCriticalData();
    } else {
      handleError(new Error('Invalid user session'), 'initial_validation');
      setLoading(false);
    }
  }, [userSession, fetchCriticalData, validateUserSession, handleError]);

  return {
    investments,
    soldItems,
    portfolioSummary,
    loading,
    error,
    errorDetails,
    refetch: debouncedRefresh,
    retry: retryWithStrategy,
    setInvestments,
    setSoldItems
  };
};