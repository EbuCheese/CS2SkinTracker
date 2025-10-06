// hooks/portfolio/usePriceLookup.js
import { useState, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

export const usePriceLookup = (userSession) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupPrice = useCallback(async (itemKey, fullName) => {
    if (!userSession?.id) {
      setError('User session required');
      return { success: false, error: 'User session required' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_item_market_prices', {
        p_item_key: itemKey,
        p_full_name: fullName,
        p_user_id: userSession.id
      });

      if (rpcError) throw rpcError;

      // Group by marketplace for easier display
      const pricesByMarketplace = (data || []).reduce((acc, price) => {
        const key = price.marketplace;
        if (!acc[key]) acc[key] = [];
        acc[key].push(price);
        return acc;
      }, {});

      return { success: true, data: pricesByMarketplace, raw: data };
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch prices';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [userSession]);

  return { lookupPrice, loading, error };
};