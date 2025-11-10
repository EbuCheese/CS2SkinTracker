import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { useItemFormatting } from '@/hooks/util';

// Maps category names to database type identifiers
const TYPE_MAP = {
  'Liquids': 'liquid',
  'Cases': 'case',
  'Stickers': 'sticker',
  'Agents': 'agent',
  'Keychains': 'keychain',
  'Graffiti': 'graffiti',
  'Patches': 'patch',
  'Music Kits': 'music_kit',
  'Highlights': 'highlight'
};

const CONTEXT_TYPE_MAP = {
  'skins': 'liquid',
  'cases': 'case',
  'stickers': 'sticker',
  'agents': 'agent',
  'keychains': 'keychain',
  'graffiti': 'graffiti',
  'patches': 'patch',
  'music_kits': 'music_kit',
  'highlights': 'highlight'
};

export const useWatchlist = (userSession) => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const { displayName } = useItemFormatting();

  // Fetch all watchlist items for user with prices using the RPC function
  const fetchWatchlist = useCallback(async () => {
    if (!userSession?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the RPC function to fetch watchlist with prices
      const { data, error: fetchError } = await supabase.rpc('fetch_user_watchlist', {
        context_user_id: userSession.id
      });

      if (fetchError) throw fetchError;

      // Parse the JSON response
      setWatchlist(data || []);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError(err.message);
      toast.error('Failed to load watchlist', 'Error');
    } finally {
      setLoading(false);
    }
  }, [userSession, toast]);

  // Add item to watchlist using the RPC function
  const addToWatchlist = useCallback(async (item, initialPrice, marketplace, options = {}) => {
    if (!userSession?.id) {
      toast.error('No user session found', 'Error');
      return { success: false };
    }

    try {
      // Determine item type
      let itemType;
      if (item.itemType) {
        itemType = CONTEXT_TYPE_MAP[item.itemType] || item.itemType;
      } else {
        itemType = 'liquid';
      }

      // Create watchlist item data
      const watchlistItem = {
        type: itemType,
        name: item.baseName || item.name,
        variant: item.variant || item.selectedVariant || 'normal',
        condition: item.condition || null,
        image_url: item.image || item.image_url || null,
        initial_price: parseFloat(initialPrice),
        initial_marketplace: marketplace,
        target_price: options.targetPrice ? parseFloat(options.targetPrice) : null,
        alert_enabled: options.alertEnabled || false,
        alert_on_drop: options.alertOnDrop || false,
        alert_threshold_percent: options.alertThreshold ? parseFloat(options.alertThreshold) : null,
        preferred_marketplace_override: options.preferredMarketplace || null,
        notes: options.notes?.trim() || null,
        tags: options.tags || null
      };

      // Use RPC function to insert
      const { data, error: insertError } = await supabase.rpc('insert_watchlist_with_context', {
        context_user_id: userSession.id,
        watchlist_data: watchlistItem
      });

      if (insertError) throw insertError;

      // Refresh the full watchlist to get prices
      await fetchWatchlist();

      const detailedName = displayName(data, { includeCondition: true, format: 'compact' });
      toast.itemAddedToWatchlist(detailedName);

      return { success: true, data };
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      toast.error('Failed to add item to watchlist', 'Error');
      return { success: false, error: err.message };
    }
  }, [userSession, displayName, toast, fetchWatchlist]);

  // Remove item from watchlist using RPC function
  const removeFromWatchlist = useCallback(async (id) => {
  if (!userSession?.id) return { success: false };

  try {
    // Find the item before deleting
    const item = watchlist.find(w => w.id === id);
    
    const { data, error: deleteError } = await supabase.rpc('delete_watchlist_with_context', {
      watchlist_id: id,
      context_user_id: userSession.id
    });

    if (deleteError) throw deleteError;

    setWatchlist(prev => prev.filter(item => item.id !== id));
    toast.itemRemovedFromWatchlist(item?.full_name || 'Item');

    return { success: true };
  } catch (err) {
    console.error('Error removing from watchlist:', err);
    toast.error('Failed to remove item', 'Error');
    return { success: false, error: err.message };
  }
}, [userSession, toast, watchlist]);

  // Update watchlist item using RPC function
  const updateWatchlistItem = useCallback(async (id, updates) => {
  if (!userSession?.id) return { success: false };

  try {
    // ADD THIS: Find the item before updating
    const item = watchlist.find(w => w.id === id);
    
    const { data, error: updateError } = await supabase.rpc('update_watchlist_with_context', {
      watchlist_id: id,
      watchlist_data: updates,
      context_user_id: userSession.id
    });

    if (updateError) throw updateError;

    await fetchWatchlist();
    toast.itemUpdated(item?.full_name || 'Item'); // Now item is defined

    return { success: true, data };
  } catch (err) {
    console.error('Error updating watchlist item:', err);
    toast.error('Failed to update item', 'Error');
    return { success: false, error: err.message };
  }
}, [userSession, toast, fetchWatchlist, watchlist]);

  const switchMarketplace = useCallback(async (id, marketplace) => {
  if (!userSession?.id) return { success: false };

  try {
    // Find the item to get its name for the toast
    const item = watchlist.find(w => w.id === id);
    
    const { data, error } = await supabase.rpc('switch_watchlist_marketplace', {
      p_watchlist_id: id,
      p_user_id: userSession.id,
      p_new_marketplace: marketplace
    });

    if (error) throw error;

    await fetchWatchlist();
    
    // Use the item's full_name in the toast
    toast.info(
      `Now tracking ${marketplace.toUpperCase()} prices`, 
      item?.full_name || 'Marketplace Switched'
    );

    return { success: true, data };
  } catch (err) {
    console.error('Error switching marketplace:', err);
    toast.error('Failed to switch marketplace', 'Error');
    return { success: false, error: err.message };
  }
}, [userSession, toast, fetchWatchlist, watchlist]);

// Same fix for resetBaseline:
const resetBaseline = useCallback(async (id) => {
  if (!userSession?.id) return { success: false };

  try {
    const item = watchlist.find(w => w.id === id);
    
    const { data, error } = await supabase.rpc('reset_watchlist_baseline', {
      p_watchlist_id: id,
      p_user_id: userSession.id
    });

    if (error) throw error;

    await fetchWatchlist();
    toast.info('Baseline reset to current price', item?.full_name || 'Baseline Updated');

    return { success: true, data };
  } catch (err) {
    console.error('Error resetting baseline:', err);
    toast.error('Failed to reset baseline', 'Error');
    return { success: false, error: err.message };
  }
}, [userSession, toast, fetchWatchlist, watchlist]);

// And editBaseline:
const editBaseline = useCallback(async (id, newBaseline) => {
  if (!userSession?.id) return { success: false };

  try {
    const item = watchlist.find(w => w.id === id);
    
    const { data, error } = await supabase.rpc('edit_watchlist_baseline', {
      p_watchlist_id: id,
      p_user_id: userSession.id,
      p_new_baseline: parseFloat(newBaseline)
    });

    if (error) throw error;

    await fetchWatchlist();
    toast.info(
      `Baseline set to $${parseFloat(newBaseline).toFixed(2)}`, 
      item?.full_name || 'Baseline Updated'
    );

    return { success: true, data };
  } catch (err) {
    console.error('Error editing baseline:', err);
    toast.error('Failed to edit baseline', 'Error');
    return { success: false, error: err.message };
  }
}, [userSession, toast, fetchWatchlist, watchlist]);

  // Bulk remove items using RPC function
  const bulkRemove = useCallback(async (ids) => {
    if (!userSession?.id) return { success: false };

    try {
      const { data, error: deleteError } = await supabase.rpc('bulk_delete_watchlist', {
        watchlist_ids: ids,
        context_user_id: userSession.id
      });

      if (deleteError) throw deleteError;

      setWatchlist(prev => prev.filter(item => !ids.includes(item.id)));
      
      const deletedCount = data?.deleted_count || ids.length;
      toast.bulkRemovedFromWatchlist(deletedCount);

      return { success: true, data };
    } catch (err) {
      console.error('Error bulk removing from watchlist:', err);
      toast.error('Failed to remove items', 'Error');
      return { success: false, error: err.message };
    }
  }, [userSession, toast]);

  // Load watchlist on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return {
    watchlist,
    loading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    bulkRemove,
    refreshWatchlist: fetchWatchlist,
    switchMarketplace,
    resetBaseline,
    editBaseline
  };
};