import { useState, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { useItemFormatting } from '@/hooks/util';

export const usePriceLookup = (userSession) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { itemKey, displayName } = useItemFormatting();

  // Single lookup - specific variant/condition
  const lookupSinglePrice = useCallback(async (item, variant, condition) => {
    if (!userSession?.id) {
      return { success: false, error: 'User session required' };
    }

    const itemConfig = {
      ...item,
      variant,
      condition,
      item_variant: variant,
      // Use the actual variant item's name if available
      name: item.variants?.get(variant)?.name || item.name
    };

    const key = itemKey(itemConfig);
    const fullName = displayName(itemConfig, { includeCondition: true, format: 'full' });

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_item_market_prices', {
        p_item_key: key,
        p_full_name: fullName,
        p_user_id: userSession.id
      });

      if (rpcError) throw rpcError;

      const pricesByMarketplace = (data || []).reduce((acc, price) => {
        if (!acc[price.marketplace]) acc[price.marketplace] = [];
        acc[price.marketplace].push(price);
        return acc;
      }, {});

      return { 
        success: true, 
        mode: 'single',
        data: pricesByMarketplace, 
        raw: data,
        config: { variant, condition }
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userSession, itemKey, displayName]);

  // Bulk lookup - all variants/conditions
  const lookupAllPrices = useCallback(async (item) => {
  if (!userSession?.id) {
    return { success: false, error: 'User session required' };
  }

  setLoading(true);
  setError(null);

  try {
    const CONDITIONS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    const results = [];

    // Check if this is a pre-selection item (music kits/boxes)
    const requiresVariantPreSelection = item.requiresVariantPreSelection || false;
    const preSelectedVariant = item.actualSelectedVariant || item.selectedVariant;

    const itemType = item.category || item.metadata?.[0] || '';
    const needsCondition = ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(itemType);

    if (needsCondition) {
      // For items that need conditions (skins)
      let variantsToCheck = ['normal'];
      
      // If pre-selection is required, only check the selected variant
      if (requiresVariantPreSelection) {
        variantsToCheck = [preSelectedVariant];
      } else {
        // Otherwise check all available variants
        if (item.hasStatTrak) variantsToCheck.push('stattrak');
        if (item.hasSouvenir) variantsToCheck.push('souvenir');
      }

      const queryPromises = [];
      const queryConfigs = [];

      for (const variant of variantsToCheck) {
        for (const condition of CONDITIONS) {
          const itemConfig = {
            ...item,
            variant,
            condition,
            item_variant: variant
          };

          const key = itemKey(itemConfig);
          const fullName = displayName(itemConfig, { includeCondition: true, format: 'full' });

          queryConfigs.push({ variant, condition, fullName });
          queryPromises.push(
            supabase.rpc('get_item_market_prices', {
              p_item_key: key,
              p_full_name: fullName,
              p_user_id: userSession.id
            })
          );
        }
      }

      const responses = await Promise.all(queryPromises);

      responses.forEach((response, idx) => {
        const { data, error: rpcError } = response;
        const config = queryConfigs[idx];

        if (!rpcError && data && data.length > 0) {
          const pricesByMarketplace = data.reduce((acc, price) => {
            if (!acc[price.marketplace]) acc[price.marketplace] = [];
            acc[price.marketplace].push(price);
            return acc;
          }, {});

          results.push({
            variant: config.variant,
            condition: config.condition,
            fullName: config.fullName,
            prices: pricesByMarketplace,
            rawPrices: data
          });
        }
      });
    } else {
      // Non-skins logic (including music kits/boxes)
      let variantsToCheck = ['normal'];
      
      // If pre-selection is required, only check the selected variant
      if (requiresVariantPreSelection) {
        variantsToCheck = [preSelectedVariant];
      } else {
        // Otherwise check all available variants
        if (item.hasStatTrak) variantsToCheck.push('stattrak');
      }

      const queryPromises = [];
      const queryConfigs = [];

      for (const variant of variantsToCheck) {
        const itemConfig = {
          ...item,
          variant,
          item_variant: variant
        };

        const key = itemKey(itemConfig);
        const fullName = displayName(itemConfig, { includeCondition: false, format: 'full' });

        queryConfigs.push({ variant, fullName });
        queryPromises.push(
          supabase.rpc('get_item_market_prices', {
            p_item_key: key,
            p_full_name: fullName,
            p_user_id: userSession.id
          })
        );
      }

      const responses = await Promise.all(queryPromises);

      responses.forEach((response, idx) => {
        const { data, error: rpcError } = response;
        const config = queryConfigs[idx];

        if (!rpcError && data && data.length > 0) {
          const pricesByMarketplace = data.reduce((acc, price) => {
            if (!acc[price.marketplace]) acc[price.marketplace] = [];
            acc[price.marketplace].push(price);
            return acc;
          }, {});

          results.push({
            variant: config.variant,
            condition: null,
            fullName: config.fullName,
            prices: pricesByMarketplace,
            rawPrices: data
          });
        }
      });
    }

    return { 
      success: true, 
      mode: 'bulk',
      results, 
      needsCondition 
    };
  } catch (err) {
    setError(err.message);
    return { success: false, error: err.message };
  } finally {
    setLoading(false);
  }
}, [userSession, itemKey, displayName]);

  return { lookupSinglePrice, lookupAllPrices, loading, error };
};