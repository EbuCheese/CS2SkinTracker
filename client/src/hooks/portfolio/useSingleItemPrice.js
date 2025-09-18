// hooks/useSingleItemPrice.js
import { useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';

export const useSingleItemPrice = () => {
  const activePriceRequests = useRef(new Set());

  const refreshSingleItemPrice = useCallback(async (itemId, userSession, onSuccess, onError) => {
    // Prevent duplicate requests for same item
    if (activePriceRequests.current.has(itemId)) {
      return;
    }

    // Add to active requests to prevent duplicates
    activePriceRequests.current.add(itemId);

    try {
      const { data, error } = await supabase.rpc('get_single_investment_with_prices', {
        p_investment_id: itemId,
        p_user_id: userSession.id
      });

      if (error) throw error;

      if (data && onSuccess) {
        // Calculate derived metrics to match investments_with_prices view
        const itemWithMetrics = {
          ...data,
          // Ensure unrealized P/L is calculated properly
          unrealized_profit_loss: data.current_price ? 
            (data.current_price - data.buy_price) * data.quantity : 0,
          // Ensure original quantity is set
          original_quantity: data.original_quantity || data.quantity
        };
        
        onSuccess(itemId, itemWithMetrics);
      }

    } catch (error) {
      console.error('Failed to refresh single item price:', error);
      if (onError) {
        onError(itemId, error);
      }
    } finally {
      // Always remove from active requests when done
      activePriceRequests.current.delete(itemId);
    }
  }, []);

  const cancelAllRequests = useCallback(() => {
    activePriceRequests.current.clear();
  }, []);

  const hasActiveRequest = useCallback((itemId) => {
    return activePriceRequests.current.has(itemId);
  }, []);

  return {
    refreshSingleItemPrice,
    cancelAllRequests,
    hasActiveRequest
  };
};