import { useCallback, useMemo } from 'react';

/**
 * Custom hook for consistent item formatting across components
 * Handles display names, conditions, variants, subtitles, and item keys
 */
export const useItemFormatting = () => {
  
  // Generate canonical item key for database lookups
  // Matches the logic in generate_simple_item_key database function
  const generateItemKey = useCallback((fullName) => {
    return fullName
      .toLowerCase()
      .replace(/[★™]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '') // Remove non-alphanumeric except underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Trim underscores from start/end
  }, []);

  // Build display name with variant prefix and skin name
  const buildDisplayName = useCallback((item, options = {}) => {
    const {
      includeCondition = false,
      format = 'full'
    } = options;
   
    const itemName = item.name || item.item_name || '';
    const skinName = item.skin_name || item.item_skin_name;
    const condition = item.condition || item.item_condition;
    const variant = item.variant || item.item_variant;
   
    const hasStarPrefix = itemName.startsWith('★');
    let displayName = '';
   
    if (hasStarPrefix) {
      displayName += '★ ';
    }
   
    if (variant === 'souvenir') {
      displayName += 'Souvenir ';
    } else if (variant === 'stattrak') {
      displayName += 'StatTrak™ ';
    }
   
    const baseName = hasStarPrefix ? itemName.substring(1).trim() : itemName;
   
    if (format === 'simple') {
      displayName += baseName;
      if (skinName) {
        displayName += ` (${skinName})`;
      }
    } else if (format === 'compact') {
      if (skinName) {
        displayName += `${baseName || 'Custom'} ${skinName}`;
      } else {
        displayName += baseName;
      }
    } else {
      displayName += baseName;
      if (skinName) {
        displayName += ` | ${skinName}`;
      }
    }
   
    if (includeCondition && condition && condition.toLowerCase() !== 'unknown') {
      displayName += ` (${condition})`;
    }
   
    return displayName.trim();
  }, []);

  // Build item key directly from item object
  const buildItemKey = useCallback((item, options = {}) => {
    const fullName = buildDisplayName(item, { 
      includeCondition: true, 
      format: 'full',
      ...options 
    });
    return generateItemKey(fullName);
  }, [buildDisplayName, generateItemKey]);

  // Build subtitle with condition and quantity information
  const buildSubtitle = useCallback((item, options = {}) => {
    const {
      showQuantity = true,
      quantityField = 'quantity',
      conditionField = 'condition'
    } = options;
   
    const condition = item[conditionField] || item.item_condition;
    const quantity = item[quantityField] || item.quantity_sold || item.quantity || 1;
   
    const conditionText = condition &&
      condition.toLowerCase() !== 'unknown' &&
      condition.toLowerCase() !== ''
        ? condition
        : '';
   
    const parts = [];
    if (conditionText) {
      parts.push(conditionText);
    }
   
    if (showQuantity) {
      parts.push(`Qty: ${quantity}`);
    }
   
    return parts.join(' • ');
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

  const formatters = useMemo(() => ({
    displayName: buildDisplayName,
    subtitle: buildSubtitle,
    conditionInfo: getConditionInfo,
    itemKey: buildItemKey,
    generateKey: generateItemKey
  }), [buildDisplayName, buildSubtitle, getConditionInfo, buildItemKey, generateItemKey]);
 
  return formatters;
};