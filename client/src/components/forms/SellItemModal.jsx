import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { formatDateInTimezone, useItemFormatting } from '@/hooks/util';
import { convertToUSD, convertFromUSD, convertAndFormat, CURRENCY_CONFIG } from '@/hooks/util/currency';

const SellItemModal = ({ 
  isOpen, 
  onClose, 
  item, 
  availableQuantity,
  buyPrice,
  onConfirmSale,
  isLoading = false 
}) => {
  const { timezone, currency } = useUserSettings();

  const toast = useToast();

  // Get currency config
  const currencySymbol = CURRENCY_CONFIG[currency]?.symbol || '$';
  const currencyName = CURRENCY_CONFIG[currency]?.name || 'USD';

  const { displayName: formatDisplayName, subtitle: formatSubtitle } = useItemFormatting();

  const itemDisplayName = useMemo(() => 
    formatDisplayName(item, { format: 'full' }), 
    [item, formatDisplayName]
  );

  const itemSubtitle = useMemo(() => 
    formatSubtitle(item, { showQuantity: false }),
    [item, formatSubtitle]
  );

  // Format price helper
  const formatPrice = useCallback((usdAmount) => {
    return convertAndFormat(usdAmount, currency);
  }, [currency]);

  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSoldQuantity(Math.min(1, availableQuantity));
      setSoldPrice('');
    }
  }, [isOpen, availableQuantity]);

  // Calculate sale preview
  const salePreview = useMemo(() => {
    const pricePerUnit = parseFloat(soldPrice);
    const quantity = parseInt(soldQuantity);
    
    if (!soldPrice || !soldQuantity || isNaN(pricePerUnit) || isNaN(quantity)) return null;
    
    // Convert buy price from USD to user's currency for comparison
    const buyPriceInUserCurrency = convertFromUSD(buyPrice, currency);

    const totalSaleValue = pricePerUnit * quantity;
    const profitLoss = (pricePerUnit - buyPriceInUserCurrency) * quantity;
    const investment = buyPriceInUserCurrency * quantity;
    const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';
    
    return { 
      totalSaleValue, 
      profitLoss, 
      percentage,
      investment,
      buyPriceInUserCurrency 
    };
  }, [soldPrice, soldQuantity, buyPrice, currency]);

  const validateSaleInput = () => {
    const priceNum = parseFloat(soldPrice);
    const quantityNum = parseInt(soldQuantity);
    
    if (!soldPrice || isNaN(priceNum) || priceNum <= 0) {
      return { isValid: false, error: 'Please enter a valid price per unit greater than 0' };
    }
    
    if (!soldQuantity || quantityNum < 1 || quantityNum > availableQuantity) {
      return { isValid: false, error: `Please enter a valid quantity between 1 and ${availableQuantity}` };
    }
    
    return { isValid: true, error: null };
  };

  const handleSubmit = async () => {
    const validation = validateSaleInput();
    if (!validation.isValid) {
      toast.error(validation.error, 'Invalid Input');
      return;
    }

    const userInputPrice = parseFloat(soldPrice); // Price in user's currency
    const quantity = parseInt(soldQuantity);
    
    // Convert user's input to USD for storage
    const priceInUSD = convertToUSD(userInputPrice, currency);
    
    // Send USD price to backend
    onConfirmSale(quantity, priceInUSD);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
          <div className="flex items-center justify-between mb-6">
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
              
            {/* Title and Item Info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Record Sale
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-white font-medium leading-tight" title={itemDisplayName}>
                  {itemDisplayName}
                </p>
                <div className={`flex items-center text-xs ${itemSubtitle ? 'gap-1' : ''}`}>
                  {itemSubtitle && <span className="text-gray-400">{itemSubtitle}</span>}
                  {itemSubtitle && <span className="text-gray-600">•</span>}
                  <span className="text-gray-500">
                    Added {formatDateInTimezone(
                      item.created_at,
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

        {/* Form Content */}
        <div className="space-y-4">
          <div className="text-sm text-gray-400 mb-4">
            {availableQuantity} available to sell
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Quantity to sell
            </label>
            <input
              type="number"
              min="1"
              max={availableQuantity}
              value={soldQuantity}
              onChange={(e) => setSoldQuantity(Math.min(parseInt(e.target.value) || 1, availableQuantity))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sale price per item ({currencySymbol} {currency})
            </label>
            <div className="relative">
              {/* Currency symbol prefix */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={`Enter sale price in ${currency}`}
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Price per item in {currencyName}
            </p>
          </div>

          {/* Preview */}
          {salePreview && (
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600/50">
              <h4 className="text-sm font-medium text-white mb-2">Sale Summary</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex justify-between">
                  <span>Total sale value:</span>
                  <span className="text-white font-medium">
                    {currencySymbol}{salePreview.totalSaleValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Your buy price:</span>
                  <span className="text-gray-400">
                    {formatPrice(buyPrice * soldQuantity)}
                  </span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className={`flex justify-between font-medium ${
                    salePreview.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span>Profit/Loss:</span>
                    <span>
                      {salePreview.profitLoss >= 0 ? '+' : '-'}
                      {currencySymbol}{(Math.abs(salePreview.profitLoss).toFixed(2))} 
                      ({salePreview.percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Confirm Sale</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SellItemModal;