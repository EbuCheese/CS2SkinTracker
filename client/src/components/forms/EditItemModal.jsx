import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useItemFormatting, formatDateInTimezone } from '@/hooks/util';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useCSData } from '@/contexts/CSDataContext';
import { convertFromUSD, convertToUSD, formatCurrency, CURRENCY_CONFIG } from '@/hooks/util/currency';

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition' },
  { value: 'Factory New', label: 'Factory New' },
  { value: 'Minimal Wear', label: 'Minimal Wear' },
  { value: 'Field-Tested', label: 'Field-Tested' },
  { value: 'Well-Worn', label: 'Well-Worn' },
  { value: 'Battle-Scarred', label: 'Battle-Scarred' }
];

const VARIANT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'stattrak', label: 'StatTrak™' },
  { value: 'souvenir', label: 'Souvenir' }
];

const getAvailableConditions = (minFloat, maxFloat) => {
  if (minFloat === undefined || maxFloat === undefined) {
    return []; // No conditions available (e.g., non-skin items)
  }

  const floatRanges = {
    'Factory New': [0.00, 0.07],
    'Minimal Wear': [0.07, 0.15],
    'Field-Tested': [0.15, 0.38],
    'Well-Worn': [0.38, 0.45],
    'Battle-Scarred': [0.45, 1.00]
  };

  return CONDITION_OPTIONS.filter(option => {
    if (option.value === '') return true; // Keep the "Select condition" option
    
    const [condMin, condMax] = floatRanges[option.value];
    // Check if there's any overlap between item's float range and condition's range
    return minFloat < condMax && maxFloat > condMin;
  });
};

// Helper to get available variants
const getAvailableVariants = (item) => {
  const variants = [{ value: 'normal', label: 'Normal' }];
  
  // Check for name-based variants (highlights, souvenir packages, music kits)
  const isNameBasedSouvenir = item.isNameBasedSouvenir || 
                             item.item_name?.startsWith('Souvenir Charm') ||
                             item.item_name?.includes('Souvenir Package');
  
  const isNameBasedStatTrak = item.isNameBasedStatTrak ||
                             item.item_name?.startsWith('StatTrak™ Music Kit');
  
  // If it's a name-based variant item, only show normal
  if (isNameBasedSouvenir || isNameBasedStatTrak) {
    return variants;
  }
  
  // Otherwise check the flags
  if (item.hasStatTrak) {
    variants.push({ value: 'stattrak', label: 'StatTrak™' });
  }
  if (item.hasSouvenir) {
    variants.push({ value: 'souvenir', label: 'Souvenir' });
  }
  
  return variants;
};

const EditItemModal = ({ 
  isOpen, 
  onClose, 
  item, 
  isSoldItem = false, 
  onSave, 
  isLoading = false 
}) => {
  const { timezone, currency } = useUserSettings();
  const { lookupMaps, data } = useCSData();


  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const formatPriceInput = useCallback((usdAmount) => {
    if (!usdAmount) return '';
    return convertFromUSD(usdAmount, currency).toFixed(
      CURRENCY_CONFIG[currency]?.decimals || 2
    );
  }, [currency]);

  const currencySymbol = useMemo(() => 
    CURRENCY_CONFIG[currency]?.symbol || '$',
    [currency]
  );

  const csItemData = useMemo(() => {
    if (!item || isSoldItem) return null;
    
    // Determine the item type
    const itemType = item.type; // 'liquid', 'case', 'sticker', etc.
    
    // Map database types to CS data types
    const typeMap = {
      'liquid': 'skins',
      'case': 'cases',
      'sticker': 'stickers',
      'agent': 'agents',
      'keychain': 'keychains',
      'graffiti': 'graffiti',
      'patch': 'patches',
      'music_kit': 'music_kits',
      'highlight': 'highlights'
    };
    
    const csDataType = typeMap[itemType] || itemType;
    const csData = data[csDataType];
    
    if (!csData) return null;
    
    // Find matching item in CS data
    // For skins, need to match both name and skin_name
    const matchingItem = csData.find(csItem => {
      if (itemType === 'liquid' || itemType === 'skins') {
        // Match weapon name and skin name
        return csItem.name === item.name && 
               (!item.skin_name || csItem.pattern === item.skin_name);
      } else {
        // For other items, just match the name
        return csItem.name === item.name;
      }
    });
    
    if (!matchingItem) return null;
    
    return {
      minFloat: matchingItem.minFloat,
      maxFloat: matchingItem.maxFloat,
      hasStatTrak: matchingItem.stattrak === true,
      hasSouvenir: matchingItem.souvenir === true
    };
  }, [item, isSoldItem, data]);

  // name format hook
  const { displayName: formatDisplayName, subtitle: formatSubtitle } = useItemFormatting();

  const itemDisplayName = useMemo(() => {
  // Create a normalized item object that works for both sold and active items
  const normalizedItem = {
    name: item.item_name || item.name,
    skin_name: item.item_skin_name || item.skin_name,
    condition: item.item_condition || item.condition,
    variant: item.item_variant || item.variant
  };
  return formatDisplayName(normalizedItem, { 
    format: 'full' 
  });
}, [item, formatDisplayName]);

const itemSubtitle = useMemo(() => {
  const normalizedItem = {
    condition: item.item_condition || item.condition,
    quantity: item.quantity || item.quantity_sold
  };
  return formatSubtitle(normalizedItem, { 
    showQuantity: false,
    conditionField: 'condition'
  });
}, [item, formatSubtitle]);

  const availableConditions = useMemo(() => {
    // Use CS data if available, otherwise show all conditions if item has a condition
    if (csItemData?.minFloat !== undefined && csItemData?.maxFloat !== undefined) {
      return getAvailableConditions(csItemData.minFloat, csItemData.maxFloat);
    }
    // Fallback: if item has a condition, show all conditions
    if (item?.condition) {
      return CONDITION_OPTIONS;
    }
    return [];
  }, [csItemData, item?.condition]);

  const availableVariants = useMemo(() => {
    // Build item object with CS data
    const itemWithCSData = {
      ...item,
      hasStatTrak: csItemData?.hasStatTrak,
      hasSouvenir: csItemData?.hasSouvenir,
      isNameBasedSouvenir: item.isNameBasedSouvenir,
      isNameBasedStatTrak: item.isNameBasedStatTrak,
      item_name: item.item_name || item.name
    };
    
    const variants = getAvailableVariants(itemWithCSData);
    
    // Fallback: if only normal but item has a variant, show all variants
    if (variants.length === 1 && item?.variant && item.variant !== 'normal') {
      return VARIANT_OPTIONS;
    }
    return variants;
  }, [csItemData, item]);

  const showConditionSelector = !isSoldItem && availableConditions.length > 1;
  const showVariantSelector = !isSoldItem && availableVariants.length > 1;

  // Helper to get available marketplaces
  const getAvailableMarketplaces = useCallback(() => {
    if (!item?.available_prices) return [];
    
    try {
      const prices = typeof item.available_prices === 'string' 
        ? JSON.parse(item.available_prices) 
        : item.available_prices;
      
      return prices.map(p => ({
        marketplace: p.marketplace,
        price: p.price,
        last_updated: p.last_updated,
        is_bid_price: p.is_bid_price
      }));
    } catch (e) {
      console.error('Error parsing available prices:', e);
      return [];
    }
  }, [item?.available_prices]);

  // Initialize form data
  useEffect(() => {
    if (isOpen && item) {
      if (isSoldItem) {
        setFormData({
          quantity_sold: item.quantity_sold || 1,
          price_per_unit: formatPriceInput(item.price_per_unit),
          notes: item.notes || ''
        });
      } else {
        const currentPriceSource = item.price_source === 'manual' ? 'manual' : 
          (item.preferred_marketplace_override || item.price_source || 'csfloat');
        
        const availableMarketplaces = getAvailableMarketplaces();
        const isCurrentSourceAvailable = availableMarketplaces.some(mp => mp.marketplace === currentPriceSource);
        
        const effectivePriceSource = (availableMarketplaces.length === 0 || !isCurrentSourceAvailable) 
          ? 'manual' 
          : currentPriceSource;

        setFormData({
          condition: item.condition || '',
          variant: item.variant || 'normal',
          quantity: item.quantity || 1,
          buy_price: formatPriceInput(item.buy_price),
          notes: item.notes || '',
          price_source: effectivePriceSource,
          manual_price: item.market_price_override 
          ? formatPriceInput(item.market_price_override)
          : item.current_price 
            ? formatPriceInput(item.current_price)
            : ''
      });
      }
      setErrors({});
    }
  }, [isOpen, item, isSoldItem, getAvailableMarketplaces, formatPriceInput]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors = {};

    if (isSoldItem) {
      const quantity = parseInt(formData.quantity_sold);
      const price = parseFloat(formData.price_per_unit);

      if (!quantity || quantity < 1 || quantity > 9999) {
        newErrors.quantity_sold = 'Quantity must be between 1 and 9999';
      }
      if (!price || price <= 0) {
        newErrors.price_per_unit = 'Sale price must be greater than 0';
      }
    } else {
      const quantity = parseInt(formData.quantity);
      const buyPrice = parseFloat(formData.buy_price);

      if (!quantity || quantity < 1 || quantity > 9999) {
        newErrors.quantity = 'Quantity must be between 1 and 9999';
      }
      if (!buyPrice || buyPrice <= 0) {
        newErrors.buy_price = 'Buy price must be greater than 0';
      }
      if (formData.price_source === 'manual' && formData.manual_price) {
        const manualPrice = parseFloat(formData.manual_price);
        if (isNaN(manualPrice) || manualPrice <= 0) {
          newErrors.manual_price = 'Manual price must be greater than 0 or left empty';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isSoldItem]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  }, [formData, validate, onSave]);

  const availableMarketplaces = useMemo(() => getAvailableMarketplaces(), [getAvailableMarketplaces]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-slate-800 rounded-xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Item Image */}
            <div className="relative flex-shrink-0">
              <div className="w-18 h-18 bg-gradient-to-br from-slate-700/30 to-gray-700/30 rounded-xl overflow-hidden border border-slate-600/40 shadow-lg">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={itemDisplayName || 'Item image'}
                    className="w-full h-full object-contain p-1"
                    style={{ 
                      textIndent: '-9999px' 
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-xs text-center flex items-center justify-center h-full">No Image</div>
                )}
              </div>
              
              {/* Variant badge */}
              {((item.item_variant || item.variant) && (item.item_variant || item.variant) !== 'normal') && (
                <div className={`absolute -top-1 -right-1 z-10 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg ${
                  (item.item_variant || item.variant) === 'stattrak' 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                }`}>
                  {(item.item_variant || item.variant) === 'stattrak' ? 'ST' : 'SV'}
                </div>
              )}
            </div>
            
            {/* Title and Info */}
            <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              {isSoldItem ? 'Edit Sale Record' : 'Edit Investment'}
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-white font-medium leading-tight" title={itemDisplayName}>
                {itemDisplayName}
              </p>
             <div className="flex items-center gap-1 text-xs">
              {itemSubtitle && (
                <>
                  <span className="text-gray-400">{itemSubtitle}</span>
                  <span className="text-gray-600">•</span>
                </>
              )}
              <span className="text-gray-500">
                {isSoldItem ? 'Sold' : 'Added'}{' '}
                {formatDateInTimezone(
                  isSoldItem ? item.sale_date : item.created_at,
                  timezone,
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )}
              </span>
            </div>
            </div>
          </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50 flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isSoldItem ? (
            // SOLD ITEM FORM
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity Sold
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={formData.quantity_sold || ''}
                    onChange={(e) => handleChange('quantity_sold', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                      errors.quantity_sold ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-orange-500'
                    }`}
                  />
                  {errors.quantity_sold && (
                    <p className="text-red-400 text-xs mt-1">{errors.quantity_sold}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sale Price (each) {currencySymbol}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price_per_unit || ''}
                    onChange={(e) => handleChange('price_per_unit', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                      errors.price_per_unit ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-orange-500'
                    }`}
                  />
                  {errors.price_per_unit && (
                    <p className="text-red-400 text-xs mt-1">{errors.price_per_unit}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add notes about this sale..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="3"
                />
              </div>
            </>
          ) : (
            // ACTIVE ITEM FORM
            <>
              {/* Only show if filters produced results */}
              {showConditionSelector || showVariantSelector ? (
                <div className="grid grid-cols-2 gap-4">
                  {showConditionSelector && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Condition
                      </label>
                      <select
                        value={formData.condition || ''}
                        onChange={(e) => handleChange('condition', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                      >
                        {availableConditions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {showVariantSelector && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Variant
                      </label>
                      <select
                        value={formData.variant || 'normal'}
                        onChange={(e) => handleChange('variant', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                      >
                        {availableVariants.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : null}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={formData.quantity || ''}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                      errors.quantity ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-orange-500'
                    }`}
                  />
                  {errors.quantity && (
                    <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buy Price (each) {currencySymbol}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.buy_price || ''}
                    onChange={(e) => handleChange('buy_price', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                      errors.buy_price ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-orange-500'
                    }`}
                  />
                  {errors.buy_price && (
                    <p className="text-red-400 text-xs mt-1">{errors.buy_price}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price Source
                  </label>
                  <select
                    value={formData.price_source || 'manual'}
                    onChange={(e) => handleChange('price_source', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    {availableMarketplaces.map(mp => (
                      <option key={mp.marketplace} value={mp.marketplace}>
                        {mp.marketplace.toUpperCase()}
                        {mp.is_bid_price ? ' (Bid)' : ''}
                      </option>
                    ))}
                    <option value="manual">Set Manual Price</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-1">
                    <span>Current Price {currencySymbol}</span>
                    {formData.price_source === 'manual' && (
                      <div className="relative group">
                        <Info className="w-3 h-3 mt-0.5 text-gray-500 hover:text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Leave empty and save to remove manual pricing
                        </div>
                      </div>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price_source === 'manual' ? (formData.manual_price || '') : 
                      (availableMarketplaces.find(mp => mp.marketplace === formData.price_source)
                        ? convertFromUSD(
                            availableMarketplaces.find(mp => mp.marketplace === formData.price_source).price,
                            currency
                          ).toFixed(CURRENCY_CONFIG[currency]?.decimals || 2)
                        : formatPriceInput(item.current_price) || ''
                      )}
                    onChange={(e) => handleChange('manual_price', e.target.value)}
                    disabled={formData.price_source !== 'manual'}
                    className={`w-full px-3 py-2 border rounded-lg text-white focus:outline-none transition-colors ${
                      formData.price_source !== 'manual' 
                        ? 'bg-gray-600 cursor-not-allowed opacity-75 border-gray-600' 
                        : errors.manual_price
                        ? 'bg-gray-700 border-red-500 focus:border-red-400'
                        : 'bg-gray-700 border-gray-600 focus:border-orange-500'
                    }`}
                    placeholder={formData.price_source !== 'manual' ? 'Managed automatically' : 'Enter manual price'}
                  />
                  {errors.manual_price && (
                    <p className="text-red-400 text-xs mt-1">{errors.manual_price}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add notes about this investment..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="3"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditItemModal;