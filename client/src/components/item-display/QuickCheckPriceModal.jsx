import React, { useState, useMemo, useCallback } from 'react';
import { X, Search, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import { usePriceLookup } from '@/hooks/portfolio/usePriceLookup';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useScrollLock } from '@/hooks/util';

const QuickCheckPriceModal = ({ 
  isOpen, 
  onClose, 
  userSession,
  onViewFullDetails // Callback to navigate to Prices page with selected item
}) => {
  // Apply scroll lock when modal is open
  useScrollLock(isOpen);

  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [priceData, setPriceData] = useState(null);
  
  const { lookupAllPrices, loading, error } = usePriceLookup(userSession);
  const { settings } = useUserSettings();

  // Calculate best price based on user's marketplace preference
  const bestPrice = useMemo(() => {
    if (!priceData) return null;
    
    // First, try to get price from user's preferred marketplace
    const preferredMarket = settings.marketplacePriority?.[0];
    const preferredPrice = priceData[preferredMarket]?.[0];
    
    if (preferredPrice && !preferredPrice.is_bid_price) {
      return {
        ...preferredPrice,
        marketplace: preferredMarket,
        isPreferred: true
      };
    }
    
    // Fallback: Find lowest non-bid price across all marketplaces
    const allPrices = Object.entries(priceData)
      .flatMap(([mp, prices]) => 
        prices
          .filter(p => !p.is_bid_price)
          .map(p => ({ ...p, marketplace: mp }))
      );
    
    if (allPrices.length === 0) {
      // If all prices are bid-only, return the preferred marketplace's bid price
      if (preferredPrice) {
        return {
          ...preferredPrice,
          marketplace: preferredMarket,
          isPreferred: true
        };
      }
      // Last resort: return any price
      const anyPrice = Object.entries(priceData)[0];
      return anyPrice ? {
        ...anyPrice[1][0],
        marketplace: anyPrice[0],
        isPreferred: false
      } : null;
    }
    
    const lowest = allPrices.sort((a, b) => a.price - b.price)[0];
    return {
      ...lowest,
      isPreferred: lowest.marketplace === preferredMarket
    };
  }, [priceData, settings.marketplacePriority]);

  // Get comparison prices (other marketplaces)
  const comparisonPrices = useMemo(() => {
    if (!priceData || !bestPrice) return [];
    
    return Object.entries(priceData)
      .filter(([mp]) => mp !== bestPrice.marketplace)
      .map(([mp, prices]) => ({
        marketplace: mp,
        price: prices[0]?.price,
        is_bid_price: prices[0]?.is_bid_price
      }))
      .filter(p => p.price)
      .sort((a, b) => a.price - b.price);
  }, [priceData, bestPrice]);

  const handleItemSelect = useCallback(async (item) => {
    setSelectedItem(item);
    setPriceData(null);
    setSearchValue('');
    
    // Use lookupAllPrices like PricesPage does
    const result = await lookupAllPrices(item);
    
    if (result.success && result.results.length > 0) {
        // Get the first result's prices (normal variant, first condition)
        const firstConfig = result.results[0];
        setPriceData(firstConfig.prices);
    }
    }, [lookupAllPrices]);

  const handleViewFullDetails = () => {
    if (onViewFullDetails && selectedItem) {
      onViewFullDetails(selectedItem);
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatMarketplaceName = (marketplace) => {
    const names = {
      csfloat: 'CSFloat',
      buff163: 'Buff163',
      steam: 'Steam',
      skinport: 'Skinport'
    };
    return names[marketplace] || marketplace;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Modal content container */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header - matching QuickAddItemForm */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Search className="w-5 h-5 mr-2 mt-1" />
            Quick Price Check
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          
        {/* Search */}
        <div className={`relative ${selectedItem ? '' : 'min-h-[450px]'}`}>
        <label className="block text-sm font-medium text-gray-300 mb-2">
            Search for an item
        </label>
        <CSItemSearch
            type="all"
            onSelect={handleItemSelect}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            maxResults={30}
            showLargeView={true}
            maxHeight="500px"
        />
        
        {/* Empty State - positioned to avoid label */}
        {!selectedItem && !loading && (
            <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">Search for an item</p>
                <p className="text-gray-500 text-sm">
                Get instant price information from your preferred marketplace
                </p>
            </div>
            </div>
        )}
        </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <p className="text-gray-400">Fetching best prices...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Selected Item Display */}
          {selectedItem && !loading && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="w-20 h-20 object-contain bg-gray-700 rounded"
                />
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-base">
                    {selectedItem.baseName || selectedItem.name}
                  </h3>
                  {selectedItem.skin_name && (
                    <p className="text-gray-400 text-sm">{selectedItem.skin_name}</p>
                  )}
                  {selectedItem.condition && (
                    <p className="text-gray-500 text-xs mt-1">{selectedItem.condition}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Best Price Display */}
          {bestPrice && !loading && (
            <div className="space-y-4">
              
              {/* Main Best Price Card */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-6 border border-green-500/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-gray-400 text-sm">
                        {bestPrice.isPreferred ? 'Your Preferred Marketplace' : 'Best Price'}
                      </span>
                      {bestPrice.isPreferred && (
                        <svg className="w-4 h-4 mt-0.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-4xl font-bold text-white mb-2">
                      ${bestPrice.price.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400 text-sm font-medium capitalize">
                        {formatMarketplaceName(bestPrice.marketplace)}
                      </span>
                      {bestPrice.is_bid_price && (
                        <div className="flex items-center space-x-1 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Bid Only</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Price Info */}
                {bestPrice.marketplace === 'steam' && bestPrice.price_last_7d && (
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">7-day average:</span>
                      <span className="text-gray-300">${bestPrice.price_last_7d.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {bestPrice.marketplace === 'buff163' && bestPrice.highest_order_price && (
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Highest bid:</span>
                      <span className="text-blue-400">${bestPrice.highest_order_price.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-700 mt-3">
                  <p className="text-xs text-gray-500">
                    Updated: {new Date(bestPrice.last_updated).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Comparison Prices */}
              {comparisonPrices.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Other Marketplaces</h4>
                  <div className="space-y-2">
                    {comparisonPrices.map(({ marketplace, price, is_bid_price }) => (
                      <div 
                        key={marketplace}
                        className="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-300 text-sm capitalize">
                            {formatMarketplaceName(marketplace)}
                          </span>
                          {is_bid_price && (
                            <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          )}
                        </div>
                        <span className="text-white font-semibold">
                          ${price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleViewFullDetails}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Full Details</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-6 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* No Price Data State */}
          {selectedItem && !loading && !bestPrice && !error && (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No price data available</p>
              <p className="text-gray-500 text-sm">
                This item may not be actively traded or price data is unavailable
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickCheckPriceModal;