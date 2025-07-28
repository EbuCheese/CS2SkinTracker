import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, TrendingUp, TrendingDown, Loader2, Save, DollarSign } from 'lucide-react';

// A reusable image component that handles loading states, errors, and fallbacks.
const ImageWithLoading = ({ src, alt, className, fallbackClassName }) => {
  // Track image loading and error states
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Handle successful image load
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle image load errors with fallback mechanism
  const handleImageError = (e) => {
    setImageLoading(false);
    setImageError(true);

    // Only set fallback SVG if we haven't already tried it (prevents infinite loop)
    if (!e.target.dataset.fallback) {
      e.target.dataset.fallback = 'true';
      // Base64 encoded SVG placeholder - gray background with circle and exclamation
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMjQgMjBWMjgiIHN0cm9rZT0iIzZCNzM4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4K';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading spinner - shown while image is loading and no error occurred */}
      {imageLoading && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Main image or text fallback */}
      {src ? (
        <img 
          src={src} 
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        // Text fallback when no src is provided - shows first 2 characters of alt text
        <div className={fallbackClassName}>
          {alt.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};

// Main Component - A modal that allows users to quickly sell their investment items.
const QuickSellModal = ({ 
  isOpen, 
  onClose,
  investments, 
  userSession, 
  onSaleComplete,
  supabase
}) => {
  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Sale form state
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Process investments data to add profit calculations
  const availableItemsWithProfits = useMemo(() => {
    return investments
      .filter(item => item.quantity > 0) // Only show items that can be sold
      .map(item => {
        // Calculate total profit/loss for all quantity of this item
        const profitLoss = (item.current_price - item.buy_price) * item.quantity;

        // Calculate profit percentage based on original investment
        const profitPercentage = item.buy_price > 0 ? 
          ((profitLoss / (item.buy_price * item.quantity)) * 100) : 0;
        
        return {
          ...item,
          profitLoss,
          profitPercentage: Number(profitPercentage.toFixed(1))
        };
      });
  }, [investments]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return availableItemsWithProfits;
    
    const query = searchQuery.toLowerCase();
    return availableItemsWithProfits.filter(item => {
      // Create searchable text from multiple fields
      const searchableText = [
        item.name || '',
        item.skin_name || '',
        item.condition || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });
  }, [availableItemsWithProfits, searchQuery]);

  // Memoize escape key handler
  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

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

  // Update quantity and price when item changes
  useEffect(() => {
    if (selectedItem) {
      setSoldQuantity(Math.min(1, selectedItem.quantity));
      setSoldPrice(selectedItem.current_price.toFixed(2));
    }
  }, [selectedItem]);

  // Handle item selection from search results
  const handleItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setSoldQuantity(Math.min(1, item.quantity));
    setSoldPrice(item.current_price.toFixed(2));
    setError('');
  }, []);

  // Handle search input changes
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle returning to search view from sale form
  const handleBackToSearch = useCallback(() => {
    setSelectedItem(null);
    setSoldPrice('');
    setSoldQuantity(1);
    setError('');
  }, []);

  // Handle quantity input changes with validation
  const handleQuantityChange = useCallback((e) => {
    const value = Math.min(parseInt(e.target.value) || 1, selectedItem?.quantity || 1);
    setSoldQuantity(value);
  }, [selectedItem?.quantity]);

  // Handle price input changes
  const handlePriceChange = useCallback((e) => {
    setSoldPrice(e.target.value);
  }, []);

  // Handle backdrop clicks to close modal
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Process the sale confirmation
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

  // Calculate sale preview values
  const salePreview = useMemo(() => {
    if (!selectedItem || !soldPrice || !soldQuantity) return null;
    
    const pricePerUnit = parseFloat(soldPrice);
    const quantity = parseInt(soldQuantity);
    
    if (isNaN(pricePerUnit) || isNaN(quantity)) return null;
    
    const totalSaleValue = pricePerUnit * quantity;
    const profitLoss = (pricePerUnit - selectedItem.buy_price) * quantity;
    const totalInvestment = selectedItem.buy_price * quantity;
    const profitPercentage = totalInvestment > 0 ? ((profitLoss / totalInvestment) * 100) : 0;
    
    return { 
      totalSaleValue, 
      profitLoss, 
      profitPercentage: Number(profitPercentage.toFixed(1)) 
    };
  }, [selectedItem, soldPrice, soldQuantity]);

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      {/* Modal backdrop with blur effect */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={handleBackdropClick}
      />
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-slate-900 border border-orange-500/20 shadow-2xl transition-all duration-200 scale-100 opacity-100 max-h-[90vh]">
        {/* Modal container */}
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

        {/* Modal Content - switches between search view and sale form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!selectedItem ? (
            // Search and item selection view
            <>
              {/* Search Input */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items to sell..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  // Empty state - shown when no items match search or no items available
                  <div className="text-center py-12 text-gray-400">
                    <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
                      {searchQuery ? 'No items found matching your search' : 'No items available to sell'}
                    </div>
                  </div>
                ) : (
                  // Render filtered items as clickable cards
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-orange-500/50 hover:bg-gray-800 cursor-pointer transition-all duration-200"
                    >
                      {/* Item Image */}
                      <ImageWithLoading
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden"
                        fallbackClassName="w-full h-full flex items-center justify-center text-white text-xs font-medium"
                      />

                      {/* Item Information */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.name}</h3>
                        {item.skin_name && (
                          <p className="text-sm text-gray-400 truncate">{item.skin_name}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          {/* Only show condition if it's not 'unknown' */}
                          {item.condition && item.condition.toLowerCase() !== 'unknown' && (
                            <span className="text-xs text-gray-400">{item.condition}</span>
                          )}
                          <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                        </div>
                      </div>

                      {/* Price and Profit Indicator */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="text-white font-medium">${item.current_price.toFixed(2)}</div>
                          {/* Profit/Loss badge with color coding and trending icon */}
                          <div className={`text-xs flex items-center space-x-1 px-2 py-1 mt-1 rounded-full font-medium ${
                            item.profitLoss >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {item.profitLoss >= 0 ? 
                              <TrendingUp className="w-3 h-3" /> : 
                              <TrendingDown className="w-3 h-3" />
                            }
                            <span>{Math.abs(item.profitPercentage)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            // Sale form view
            <div className="space-y-6">
              {/* Back to Search Button */}
              <button
                onClick={handleBackToSearch}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center space-x-1 transition-colors duration-200"
              >
                <span>← Back to search</span>
              </button>

              {/* Selected Item Display */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-4">
                  <ImageWithLoading
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0"
                    fallbackClassName="w-full h-full flex items-center justify-center text-white text-sm font-medium"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{selectedItem.name}</h3>
                    {selectedItem.skin_name && (
                      <p className="text-sm text-gray-400">{selectedItem.skin_name}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-400">
                      {selectedItem.condition && selectedItem.condition.toLowerCase() !== 'unknown' && (
                        <span>{selectedItem.condition}</span>
                      )}
                      <span>Available: {selectedItem.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1">
                      <div>
                        <div className="text-xs text-gray-500">Current Price</div>
                        <div className="text-white font-medium">${selectedItem.current_price.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sale Form Inputs */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity Input */}
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

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sale price per item ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={soldPrice}
                    onChange={handlePriceChange}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Sale Preview Section */}
              {salePreview && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  {/* Per-item comparison */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Buy Price (each)</span>
                      <span className="text-white font-medium">${selectedItem.buy_price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Sale Price (each)</span>
                      <span className="text-white font-medium">${parseFloat(soldPrice).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Profit per Item</span>
                      <span className={`font-medium ${
                        (parseFloat(soldPrice) - selectedItem.buy_price) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(parseFloat(soldPrice) - selectedItem.buy_price) >= 0 ? '+' : '-'}${Math.abs(parseFloat(soldPrice) - selectedItem.buy_price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Total sale summary */}
                  <div className="border-t border-gray-600 mt-3 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total sale value:</span>
                      <span className="text-white font-medium">
                        ${salePreview.totalSaleValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Profit/Loss:</span>
                      <span className={`font-medium ${
                        salePreview.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {salePreview.profitLoss >= 0 ? '+' : '-'}${Math.abs(salePreview.profitLoss).toFixed(2)} ({salePreview.profitPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message Display */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Confirm Sale Button */}
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

                {/* Cancel Button */}
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