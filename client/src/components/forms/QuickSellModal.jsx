import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, TrendingUp, TrendingDown, Loader2, Save } from 'lucide-react';

const QuickSellModal = ({ 
  isOpen, 
  onClose, 
  investments, 
  userSession, 
  onSaleComplete,
  supabase
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter available items (quantity > 0)
  const availableItems = useMemo(() => {
    return investments.filter(item => item.quantity > 0);
  }, [investments]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return availableItems;
    
    const query = searchQuery.toLowerCase();
    return availableItems.filter(item => {
      const itemName = item.name || '';
      const skinName = item.skin_name || '';
      const condition = item.condition || '';
      
      return itemName.toLowerCase().includes(query) ||
             skinName.toLowerCase().includes(query) ||
             condition.toLowerCase().includes(query);
    });
  }, [availableItems, searchQuery]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedItem(null);
      setSoldPrice('');
      setSoldQuantity(1);
      setError('');
    }
  }, [isOpen]);

  // Update quantity when item changes
  useEffect(() => {
    if (selectedItem) {
      setSoldQuantity(Math.min(1, selectedItem.quantity));
    }
  }, [selectedItem]);

  const handleItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setSoldQuantity(Math.min(1, item.quantity));
    setSoldPrice('');
    setError('');
  }, []);

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
      
      // Call parent callback to update the investments list
      onSaleComplete(selectedItem.id, quantity, pricePerUnit, saleResult.remaining_quantity);
      
      // Reset and close
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

  const handleBackToSearch = () => {
    setSelectedItem(null);
    setSoldPrice('');
    setSoldQuantity(1);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 shadow-2xl transition-all duration-200 scale-100 opacity-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white">Quick Sell</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!selectedItem ? (
            // Search and item selection view
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items to sell..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Items list */}
              <div className="space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {searchQuery ? 'No items found matching your search' : 'No items available to sell'}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const profitLoss = (item.current_price - item.buy_price) * item.quantity;
                    const profitPercentage = item.buy_price > 0 ? 
                      ((profitLoss / (item.buy_price * item.quantity)) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 cursor-pointer transition-colors backdrop-blur-sm"
                      >
                        {/* Image */}
                        <div className="w-12 h-10 bg-gray-600/50 rounded flex-shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{item.name}</h3>
                          {item.skin_name && (
                            <p className="text-sm text-gray-400 truncate">{item.skin_name}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            {item.condition && (
                              <span className="text-xs text-gray-500">{item.condition}</span>
                            )}
                            <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                          </div>
                        </div>

                        {/* Price and profit */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-white">${item.current_price.toFixed(2)}</div>
                          <div className={`text-xs flex items-center space-x-1 ${
                            profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {profitLoss >= 0 ? 
                              <TrendingUp className="w-3 h-3" /> : 
                              <TrendingDown className="w-3 h-3" />
                            }
                            <span>{profitPercentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            // Sale form view
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={handleBackToSearch}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center space-x-1"
              >
                <span>← Back to search</span>
              </button>

              {/* Selected item display */}
              <div className="bg-gray-700/50 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-12 bg-gray-600/50 rounded overflow-hidden flex-shrink-0">
                    {selectedItem.image_url ? (
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{selectedItem.name}</h3>
                    {selectedItem.skin_name && (
                      <p className="text-sm text-gray-400">{selectedItem.skin_name}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-400">
                      {selectedItem.condition && <span>{selectedItem.condition}</span>}
                      <span>Available: {selectedItem.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Current Price</div>
                    <div className="text-white font-medium">${selectedItem.current_price.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Sale form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Quantity to sell
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    value={soldQuantity}
                    onChange={(e) => setSoldQuantity(Math.min(parseInt(e.target.value) || 1, selectedItem.quantity))}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Sale price per item ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sale preview */}
              {soldPrice && soldQuantity && (
                <div className="bg-gray-700/30 p-3 rounded-lg text-sm backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">Total sale value:</span>
                    <span className="text-white font-medium">
                      ${(parseFloat(soldPrice) * soldQuantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Profit/Loss:</span>
                    <span className={`font-medium ${
                      ((parseFloat(soldPrice) - selectedItem.buy_price) * soldQuantity) >= 0 ? 
                      'text-green-400' : 'text-red-400'
                    }`}>
                      ${((parseFloat(soldPrice) - selectedItem.buy_price) * soldQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSellConfirm}
                  disabled={isLoading || !soldPrice || !soldQuantity}
                  className="flex-1 px-4 py-2 bg-green-600/80 hover:bg-green-700/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2 backdrop-blur-sm"
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
                  className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700/80 text-white rounded-lg transition-colors backdrop-blur-sm"
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