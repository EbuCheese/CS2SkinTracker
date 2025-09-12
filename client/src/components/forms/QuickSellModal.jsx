import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, TrendingUp, TrendingDown, Loader2, Save, DollarSign, History, AlertTriangle } from 'lucide-react';
import { useScrollLock, useItemFormatting } from '@/hooks/util';
import { useItemSearch } from '@/hooks/portfolio';
import { ImageWithLoading } from '@/components/ui';

const QuickSellModal = ({ 
  isOpen, 
  onClose,
  investments, 
  userSession, 
  onSaleComplete,
  supabase
}) => {
  useScrollLock(isOpen);

  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Sale form state
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { displayName, subtitle } = useItemFormatting();

  // Helper function to safely get current price with fallback
  const getCurrentPrice = useCallback((item) => {
    const price = item?.current_price;
    return (price !== null && price !== undefined && !isNaN(price)) ? parseFloat(price) : null;
  }, []);

  // Process investments - now with null-safe price handling
  const availableItemsWithProfits = useMemo(() => {
    return investments
      .filter(item => item.quantity > 0)
      .map(item => {
        const currentPrice = getCurrentPrice(item);
        const buyPrice = parseFloat(item.buy_price) || 0;
        
        // Calculate unrealized P&L only if we have valid price data
        let unrealizedPL = 0;
        let unrealizedPercentage = 0;
        
        if (currentPrice !== null) {
          unrealizedPL = item.unrealized_profit_loss || ((currentPrice - buyPrice) * item.quantity);
          const currentInvestment = buyPrice * item.quantity;
          unrealizedPercentage = currentInvestment > 0 ? ((unrealizedPL / currentInvestment) * 100) : 0;
        }
        
        // Calculate total profit/loss including realized gains
        const realizedPL = parseFloat(item.realized_profit_loss) || 0;
        const totalPL = unrealizedPL + realizedPL;
        const totalInvestment = buyPrice * (item.original_quantity || item.quantity);
        const totalPercentage = totalInvestment > 0 ? ((totalPL / totalInvestment) * 100) : 0;
        
        return {
          ...item,
          currentPrice, // Store the safe current price
          hasValidPrice: currentPrice !== null,
          unrealizedPL,
          unrealizedPercentage: Number(unrealizedPercentage.toFixed(1)),
          totalPL,
          totalPercentage: Number(totalPercentage.toFixed(1)),
          hasSalesHistory: (item.total_sold_quantity || 0) > 0,
          averageSalePrice: parseFloat(item.average_sale_price) || 0
        };
      })
      .sort((a, b) => {
        // Sort items with valid prices first, then by total P&L percentage
        if (a.hasValidPrice && !b.hasValidPrice) return -1;
        if (!a.hasValidPrice && b.hasValidPrice) return 1;
        return b.totalPercentage - a.totalPercentage;
      });
  }, [investments, getCurrentPrice]);

  // Use the new useItemSearch hook instead of manual filtering
  const { filteredItems, hasActiveSearch } = useItemSearch(availableItemsWithProfits, searchQuery);

  // Event handlers (keeping your existing logic)
  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedItem(null);
      setSoldPrice('');
      setSoldQuantity(1);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedItem) {
      setSoldQuantity(Math.min(1, selectedItem.quantity));
      // Use current price as default if available, otherwise leave empty for user input
      if (selectedItem.hasValidPrice) {
        setSoldPrice(selectedItem.currentPrice.toFixed(2));
      } else {
        setSoldPrice('');
      }
    }
  }, [selectedItem]);

  const handleItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setSoldQuantity(Math.min(1, item.quantity));
    if (item.hasValidPrice) {
      setSoldPrice(item.currentPrice.toFixed(2));
    } else {
      setSoldPrice('');
    }
    setError('');
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setSelectedItem(null);
    setSoldPrice('');
    setSoldQuantity(1);
    setError('');
  }, []);

  const handleQuantityChange = useCallback((e) => {
    const value = Math.min(parseInt(e.target.value) || 1, selectedItem?.quantity || 1);
    setSoldQuantity(value);
  }, [selectedItem?.quantity]);

  const handlePriceChange = useCallback((e) => {
    setSoldPrice(e.target.value);
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Enhanced sale processing with better error handling
  const handleSellConfirm = async () => {
    if (!selectedItem || !soldPrice || !soldQuantity) {
      setError('Please fill in all fields');
      return;
    }

    const pricePerUnit = parseFloat(soldPrice);
    const quantity = parseInt(soldQuantity);
    
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      setError('Please enter a valid price greater than 0');
      return;
    }
    
    if (quantity < 1 || quantity > selectedItem.quantity) {
      setError(`Quantity must be between 1 and ${selectedItem.quantity}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data: saleResult, error: saleError } = await supabase.rpc('process_investment_sale', {
        p_investment_id: selectedItem.id,
        p_user_id: userSession.id,
        p_quantity_to_sell: quantity,
        p_price_per_unit: pricePerUnit,
        p_sale_notes: null
      });
      
      if (saleError) throw new Error(`Sale failed: ${saleError.message}`);
      
      onSaleComplete(selectedItem.id, quantity, pricePerUnit, saleResult.remaining_quantity);
      
      setSelectedItem(null);
      setSoldPrice('');
      setSoldQuantity(1);
      onClose();
      
    } catch (err) {
      console.error('Error processing sale:', err);
      setError('Failed to process sale: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced sale preview with null-safe handling
  const salePreview = useMemo(() => {
    if (!selectedItem || !soldPrice || !soldQuantity) return null;
    
    const pricePerUnit = parseFloat(soldPrice);
    const quantity = parseInt(soldQuantity);
    const buyPrice = parseFloat(selectedItem.buy_price) || 0;
    
    if (isNaN(pricePerUnit) || isNaN(quantity)) return null;
    
    const totalSaleValue = pricePerUnit * quantity;
    const profitLoss = (pricePerUnit - buyPrice) * quantity;
    const totalInvestment = buyPrice * quantity;
    const profitPercentage = totalInvestment > 0 ? ((profitLoss / totalInvestment) * 100) : 0;
    
    // Compare with historical performance (only if available)
    const vsHistoricalAvg = selectedItem.hasSalesHistory && selectedItem.averageSalePrice > 0
      ? pricePerUnit - selectedItem.averageSalePrice 
      : null;
    
    return { 
      totalSaleValue, 
      profitLoss, 
      profitPercentage: Number(profitPercentage.toFixed(1)),
      vsHistoricalAvg
    };
  }, [selectedItem, soldPrice, soldQuantity]);

  if (!isOpen) return null;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={handleBackdropClick}
      />
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-slate-900 border border-orange-500/20 shadow-2xl transition-all duration-200 scale-100 opacity-100 max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 mt-1" />
            Quick Sell Item
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!selectedItem ? (
            <>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items to sell... (try weapon names, skins, conditions)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                />
                {/* Optional: Show search status */}
                {hasActiveSearch && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    {filteredItems.length} results
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
                      {hasActiveSearch ? (
                        <>
                          <div className="text-lg mb-2">No items found matching your search</div>
                          <div className="text-sm text-gray-500">
                            Try searching for weapon names (AK-47, AWP), skin names (Asiimov, Redline), 
                            conditions (FN, MW, FT), or abbreviations (ST for StatTrak)
                          </div>
                        </>
                      ) : (
                        'No items available to sell'
                      )}
                    </div>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-orange-500/50 hover:bg-gray-800 cursor-pointer transition-all duration-200"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        <ImageWithLoading
                          src={item.image_url}
                          alt={item.name}
                          fallbackClassName="w-full h-full flex items-center justify-center text-white text-xs font-medium"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{displayName(item)}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {subtitle(item)}
                          </span>
                          {/* Sales history indicator */}
                          {item.hasSalesHistory && (
                            <div className="flex items-center space-x-1 text-xs text-blue-400">
                              <History className="w-3 h-3" />
                              <span>Sold {item.total_sold_quantity}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {/* Current price with null handling */}
                          <div className="text-white font-medium">
                            {item.hasValidPrice ? (
                              `$${item.currentPrice.toFixed(2)}`
                            ) : (
                              <span className="text-gray-500 text-sm">No price data</span>
                            )}
                          </div>
                          
                          {/* Profit display - only show if we have valid price data */}
                          {item.hasValidPrice && (
                            <div className={`text-xs flex items-center space-x-1 px-2 py-1 mt-1 rounded-full font-medium ${
                              item.totalPL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {item.totalPL >= 0 ? 
                                <TrendingUp className="w-3 h-3" /> : 
                                <TrendingDown className="w-3 h-3" />
                              }
                              <span>{Math.abs(item.totalPercentage)}%</span>
                            </div>
                          )}
                          
                          {/* Show warning icon for items without price data */}
                          {!item.hasValidPrice && (
                            <div className="flex items-center text-amber-400 mt-1">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        
                        {/* Show average sale price if available */}
                        {item.hasSalesHistory && item.averageSalePrice > 0 && (
                          <div className="text-xs text-gray-500">
                            Avg sale: ${item.averageSalePrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <button
                onClick={handleBackToSearch}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center space-x-1 transition-colors duration-200"
              >
                <span>← Back to search</span>
              </button>

              {/* Enhanced item display with null-safe price handling */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                    <ImageWithLoading
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      fallbackClassName="w-full h-full flex items-center justify-center text-white text-sm font-medium"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white truncate">{displayName(selectedItem)}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-sm text-gray-400">
                      <span>{subtitle(selectedItem, { showQuantity: false })}</span>
                      <span>Available: {selectedItem.quantity}</span>
                      {selectedItem.hasSalesHistory && selectedItem.averageSalePrice > 0 && (
                        <span className="text-blue-400">
                          Previously sold {selectedItem.total_sold_quantity} @ avg ${selectedItem.averageSalePrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1">
                      <div>
                        <div className="text-xs text-gray-500">Current Price</div>
                        <div className="text-white font-medium">
                          {selectedItem.hasValidPrice ? (
                            `$${selectedItem.currentPrice.toFixed(2)}`
                          ) : (
                            <span className="text-gray-500 text-sm flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5" />
                              <span>No price data</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedItem.hasValidPrice && (
                        <div>
                          <div className="text-xs text-gray-500">Unreal P&L</div>
                          <div className={`font-medium text-sm ${
                            selectedItem.totalPL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {selectedItem.totalPL >= 0 ? '+' : ''}${selectedItem.totalPL.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity to sell
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    value={soldQuantity}
                    onChange={handleQuantityChange}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sale price per item ($)
                    {selectedItem.hasSalesHistory && selectedItem.averageSalePrice > 0 && (
                      <span className="text-xs text-blue-400 ml-1">
                        (historical avg: ${selectedItem.averageSalePrice.toFixed(2)})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={soldPrice}
                    onChange={handlePriceChange}
                    placeholder={selectedItem.hasValidPrice ? "" : "Enter sale price"}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Enhanced sale preview with null-safe handling */}
              {salePreview && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Buy Price (each)</span>
                      <span className="text-white font-medium">
                        ${(parseFloat(selectedItem.buy_price) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Sale Price (each)</span>
                      <span className="text-white font-medium">${parseFloat(soldPrice).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Profit per Item</span>
                      <span className={`font-medium ${
                        (parseFloat(soldPrice) - (parseFloat(selectedItem.buy_price) || 0)) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(parseFloat(soldPrice) - (parseFloat(selectedItem.buy_price) || 0)) >= 0 ? '+' : '-'}
                        ${Math.abs(parseFloat(soldPrice) - (parseFloat(selectedItem.buy_price) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-600 mt-3 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total sale value:</span>
                      <span className="text-white font-medium">
                        ${salePreview.totalSaleValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total Profit/Loss:</span>
                      <span className={`font-medium ${
                        salePreview.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {salePreview.profitLoss >= 0 ? '+' : '-'}${Math.abs(salePreview.profitLoss).toFixed(2)} ({salePreview.profitPercentage}%)
                      </span>
                    </div>
                    {/* Show comparison with historical average */}
                    {salePreview.vsHistoricalAvg !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">vs. Historical avg:</span>
                        <span className={`${salePreview.vsHistoricalAvg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {salePreview.vsHistoricalAvg >= 0 ? '+' : '-'}${Math.abs(salePreview.vsHistoricalAvg).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSellConfirm}
                  disabled={isLoading || !soldPrice || !soldQuantity}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Confirm Sale</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleBackToSearch}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSellModal;