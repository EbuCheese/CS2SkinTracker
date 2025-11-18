import React, { useState, useMemo, useCallback } from 'react';
import { X, Eye, Loader2, Target, DollarSign, AlertCircle } from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import { usePriceLookup } from '@/hooks/portfolio/usePriceLookup';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useScrollLock } from '@/hooks/util';

const CONDITION_OPTIONS = [
  { short: 'FN', full: 'Factory New', minFloat: 0.00, maxFloat: 0.07 },
  { short: 'MW', full: 'Minimal Wear', minFloat: 0.07, maxFloat: 0.15 },
  { short: 'FT', full: 'Field-Tested', minFloat: 0.15, maxFloat: 0.37 },
  { short: 'WW', full: 'Well-Worn', minFloat: 0.37, maxFloat: 0.44 },
  { short: 'BS', full: 'Battle-Scarred', minFloat: 0.44, maxFloat: 1.00 }
];

const QuickWatchlistAdd = ({ 
  isOpen, 
  onClose, 
  userSession,
  onAdd
}) => {
  useScrollLock(isOpen);

  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [adding, setAdding] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  
  const [selectedVariant, setSelectedVariant] = useState('normal');
  const [selectedCondition, setSelectedCondition] = useState('');

  const { lookupAllPrices, loading, error } = usePriceLookup(userSession);
  const { settings } = useUserSettings();

  // Determine if item needs condition selection
  const needsCondition = useMemo(() => {
    return selectedItem?.itemType === 'skins' && 
           selectedItem?.minFloat !== undefined && 
           selectedItem?.maxFloat !== undefined;
  }, [selectedItem]);
  
  // Determine if item needs variant selection
  const needsVariant = useMemo(() => {
    if (!selectedItem || selectedItem.requiresVariantPreSelection) return false;
    return selectedItem.hasStatTrak || selectedItem.hasSouvenir;
  }, [selectedItem]);

  // Get available conditions for this item
  const availableConditions = useMemo(() => {
    if (!needsCondition || !selectedItem) return [];
    
    const minFloat = selectedItem.minFloat;
    const maxFloat = selectedItem.maxFloat;
    
    return CONDITION_OPTIONS.filter(condition => 
      condition.minFloat < maxFloat && condition.maxFloat > minFloat
    );
  }, [needsCondition, selectedItem]);

  // Check if ready to add
  const canAdd = useMemo(() => {
    if (!selectedItem) return false;
    if (needsCondition && !selectedCondition) return false;
    return true;
  }, [selectedItem, needsCondition, selectedCondition]);

  const handleItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setSearchValue('');
    
    const itemVariant = item.actualSelectedVariant || item.selectedVariant || 'normal';
    setSelectedVariant(itemVariant);
    setSelectedCondition('');
  }, []);

  const handleAddToWatchlist = useCallback(async () => {
    if (!canAdd) return;
    
    setAdding(true);
    setFetchingPrice(true);
    
    try {
      // Fetch price silently in the background
      const itemToLookup = {
        ...selectedItem,
        variant: selectedVariant,
        condition: selectedCondition || undefined
      };
      
      const result = await lookupAllPrices(itemToLookup);
      
      let initialPrice = null;
      let initialMarketplace = settings.marketplacePriority?.[0] || 'csfloat';
      
      if (result.success && result.results.length > 0) {
        const filtered = result.results.filter(config => {
          if (selectedVariant !== 'all' && config.variant !== selectedVariant) return false;
          if (selectedCondition && config.condition !== selectedCondition) return false;
          return true;
        });
        
        if (filtered.length > 0) {
          const prices = filtered[0].prices;
          
          // Try to get price from user's preferred marketplace
          const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
          if (prices[preferredMarket]?.length > 0) {
            initialPrice = prices[preferredMarket][0].price;
            initialMarketplace = preferredMarket;
          } else {
            // Fallback to first available marketplace
            const firstAvailable = Object.keys(prices).find(mp => prices[mp]?.length > 0);
            if (firstAvailable && prices[firstAvailable]?.length > 0) {
              initialPrice = prices[firstAvailable][0].price;
              initialMarketplace = firstAvailable;
            }
          }
        }
      }
      
      // If we couldn't get a price, throw an error
      if (!initialPrice || initialPrice <= 0) {
        throw new Error('No price data available for this item');
      }
      
      setFetchingPrice(false);
      
      // Add to watchlist with the fetched price
      await onAdd(
        {
          ...selectedItem,
          variant: selectedVariant,
          condition: selectedCondition || null,
          selectedVariant: selectedVariant
        },
        initialPrice,
        initialMarketplace,
        {
          targetPrice: null,
          notes: null
        }
      );
      
      onClose();
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      setFetchingPrice(false);
      // Show user-friendly error
      alert(err.message || 'Failed to add item to watchlist. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [canAdd, selectedItem, selectedVariant, selectedCondition, lookupAllPrices, settings.marketplacePriority, onAdd, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Eye className="w-5 h-5 mr-2 mt-1" />
            Add to Watchlist
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
              Search for an item to track
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
            
            {/* Empty State */}
            {!selectedItem && (
              <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">Search for an item</p>
                  <p className="text-gray-500 text-sm">
                    Track price changes and market trends
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Item Display + Options */}
          {selectedItem && (
            <>
              {/* Item Display */}
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
                    {selectedItem.metadata?.length > 0 && (
                      <p className="text-gray-400 text-sm">{selectedItem.metadata[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Condition Selector */}
              {needsCondition && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Condition <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {availableConditions.map(({ short, full }) => (
                      <button
                        key={full}
                        onClick={() => setSelectedCondition(full)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedCondition === full
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variant Selector */}
              {needsVariant && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Variant
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedVariant('normal')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        selectedVariant === 'normal'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Normal
                    </button>
                    {selectedItem.hasStatTrak && (
                      <button
                        onClick={() => setSelectedVariant('stattrak')}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedVariant === 'stattrak'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        StatTrak™
                      </button>
                    )}
                    {selectedItem.hasSouvenir && (
                      <button
                        onClick={() => setSelectedVariant('souvenir')}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedVariant === 'souvenir'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Souvenir
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300">
                    You can switch marketplaces, add target prices, and notes from the watchlist page.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAddToWatchlist}
                  disabled={!canAdd || adding}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{fetchingPrice ? 'Fetching price...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Add to Watchlist</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={adding}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-6 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickWatchlistAdd;