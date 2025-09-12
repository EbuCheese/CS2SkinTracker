import { useCallback, useMemo } from 'react';

/**
 * Custom hook for consistent item formatting across components
 * Handles display names, conditions, variants, and subtitles
 */
export const useItemFormatting = () => {
  // Build display name with variant prefix and skin name
  const buildDisplayName = useCallback((item) => {
    const itemName = item.name || '';
    const skinName = item.skin_name;
    
    // Check if item name starts with ★ (knives and gloves)
    const hasStarPrefix = itemName.startsWith('★');
    
    let displayName = '';
    
    // Handle variant prefix placement based on star prefix
    if (hasStarPrefix) {
      // For knives/gloves: ★ StatTrak™ ItemName | SkinName
      displayName += '★ ';
      if (item.variant === 'souvenir') {
        displayName += 'Souvenir ';
      } else if (item.variant === 'stattrak') {
        displayName += 'StatTrak™ ';
      }
      // Remove the ★ from the original name since we already added it
      const nameWithoutStar = itemName.substring(1).trim();
      displayName += nameWithoutStar;
    } else {
      // For regular items: StatTrak™ ItemName | SkinName
      if (item.variant === 'souvenir') {
        displayName += 'Souvenir ';
      } else if (item.variant === 'stattrak') {
        displayName += 'StatTrak™ ';
      }
      displayName += itemName;
    }
    
    // Add skin name with pipe separator
    if (skinName) {
      displayName += ` | ${skinName}`;
    }
    
    return displayName.trim();
  }, []);

  // Build subtitle with condition and quantity information
  // Note: Does NOT include variant info since it's already in the title
  const buildSubtitle = useCallback((item, options = {}) => {
    const {
      showQuantity = true,
      quantityField = 'quantity',
      conditionField = 'condition'
    } = options;

    const condition = item[conditionField] || item.item_condition;
    const quantity = item[quantityField] || item.quantity_sold || item.quantity || 1;
    
    // Process condition text only (variant is in the title already)
    const conditionText = condition && 
      condition.toLowerCase() !== 'unknown' && 
      condition.toLowerCase() !== ''
        ? condition
        : '';
    
    // Build parts array
    const parts = [];
    if (conditionText) {
      parts.push(conditionText);
    }
    
    if (showQuantity) {
      parts.push(`Qty: ${quantity}`);
    }
    
    return parts.join(' • ');
  }, []);

  // Alternative display name format (simpler version used in some components)
  const buildSimpleDisplayName = useCallback((item) => {
    const name = item.name || '';
    const skinName = item.skin_name;
    
    if (skinName) {
      return `${name} (${skinName})`;
    }
    
    return name;
  }, []);

  // Get formatted condition and variant info
  const getConditionInfo = useCallback((item) => {
    const condition = item.condition || item.item_condition;
    const variant = item.variant || item.item_variant;
    
    return {
      condition: condition && condition.toLowerCase() !== 'unknown' ? condition : null,
      variant: variant && variant.toLowerCase() !== 'normal' ? variant : null,
      hasValidCondition: condition && condition.toLowerCase() !== 'unknown',
      isStatTrak: variant && variant.toLowerCase() === 'stattrak',
      isSouvenir: variant && variant.toLowerCase() === 'souvenir'
    };
  }, []);

  // Memoized formatter functions for consistent usage
  const formatters = useMemo(() => ({
    displayName: buildDisplayName,
    simpleDisplayName: buildSimpleDisplayName,
    subtitle: buildSubtitle,
    conditionInfo: getConditionInfo
  }), [buildDisplayName, buildSimpleDisplayName, buildSubtitle, getConditionInfo]);

  return formatters;
};