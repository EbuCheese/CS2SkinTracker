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
  const [priceData, setPriceData] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [selectedVariant, setSelectedVariant] = useState('normal');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');

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

  // Check if we can fetch prices
  const canFetchPrice = useMemo(() => {
    if (!selectedItem) return false;
    if (needsCondition && !selectedCondition) return false;
    return true;
  }, [selectedItem, needsCondition, selectedCondition]);

  // Check if we can add to watchlist
  const canAddToWatchlist = useMemo(() => {
    if (!selectedItem || !priceData || Object.keys(priceData).length === 0) return false;
    if (!selectedMarketplace) return false;
    return true;
  }, [selectedItem, priceData, selectedMarketplace]);

  // Get available marketplace prices
  const availableMarketplaces = useMemo(() => {
    if (!priceData || Object.keys(priceData).length === 0) return [];
    
    const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
    
    return Object.entries(priceData)
      .filter(([_, prices]) => prices && prices.length > 0)
      .map(([marketplace, prices]) => ({
        marketplace,
        price: prices[0].price,
        is_bid_price: prices[0].is_bid_price,
        isPreferred: marketplace === preferredMarket
      }))
      .sort((a, b) => {
        // Preferred marketplace first
        if (a.isPreferred) return -1;
        if (b.isPreferred) return 1;
        // Then by price
        return a.price - b.price;
      });
  }, [priceData, settings.marketplacePriority]);

  // Extracted fetch logic to reuse
  const fetchPriceForItem = useCallback(async (item, variant, condition) => {
    setFetchAttempted(true);
    
    const itemToLookup = {
      ...item,
      variant: variant,
      condition: condition || undefined
    };
    
    const result = await lookupAllPrices(itemToLookup);
    if (result.success && result.results.length > 0) {
      const filtered = result.results.filter(config => {
        if (variant !== 'all' && config.variant !== variant) return false;
        if (condition && config.condition !== condition) return false;
        return true;
      });
      
      if (filtered.length > 0) {
        setPriceData(filtered[0].prices);
        
        // Auto-select primary marketplace
        const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
        if (filtered[0].prices[preferredMarket]?.length > 0) {
          setSelectedMarketplace(preferredMarket);
          // ✅ Automatically set as ready to add
        } else {
          // Select first available
          const firstAvailable = Object.keys(filtered[0].prices).find(
            mp => filtered[0].prices[mp]?.length > 0
          );
          if (firstAvailable) {
            setSelectedMarketplace(firstAvailable);
          }
        }
      }
    }
  }, [lookupAllPrices, settings.marketplacePriority]);

  const handleItemSelect = useCallback((item) => {
    setSelectedItem(item);
    setPriceData(null);
    setSearchValue('');
    setFetchAttempted(false);
    setSelectedMarketplace('');
    setTargetPrice('');
    setNotes('');
    
    // For items with requiresVariantPreSelection, preserve their variant
    const itemVariant = item.actualSelectedVariant || item.selectedVariant || 'normal';
    setSelectedVariant(itemVariant);
    setSelectedCondition('');
    
    // Check if options are needed
    const needsCond = item.itemType === 'skins' && 
                     item.minFloat !== undefined && 
                     item.maxFloat !== undefined;
    const needsVar = !item.requiresVariantPreSelection && 
                    (item.hasStatTrak || item.hasSouvenir);
    
    // Auto-fetch if no options needed
    if (!needsCond && !needsVar) {
      setTimeout(() => {
        fetchPriceForItem(item, itemVariant, '');
      }, 100);
    }
  }, [fetchPriceForItem]);

  const handleFetchPrice = useCallback(async () => {
    if (!canFetchPrice) return;
    await fetchPriceForItem(selectedItem, selectedVariant, selectedCondition);
  }, [canFetchPrice, selectedItem, selectedVariant, selectedCondition, fetchPriceForItem]);

  const handleAddToWatchlist = useCallback(async () => {
  if (!canAddToWatchlist) return;
  
  setAdding(true);
  try {
    const selectedMarketData = priceData[selectedMarketplace][0];
    
    await onAdd(
      {
        ...selectedItem,
        variant: selectedVariant,  // Add variant
        condition: selectedCondition || null,  // Add condition
        selectedVariant: selectedVariant  // For compatibility
      },
      selectedMarketData.price,
      selectedMarketplace,
      {
        targetPrice: null,  // xplicitly set to null
        notes: null  // Explicitly set to null
      }
    );
    
    onClose();
  } catch (err) {
    console.error('Error adding to watchlist:', err);
  } finally {
    setAdding(false);
  }
}, [canAddToWatchlist, selectedItem, selectedVariant, selectedCondition, priceData, selectedMarketplace, onAdd, onClose]);

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
            {!selectedItem && !loading && (
              <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">Search for an item</p>
                  <p className="text-gray-500 text-sm">
                    Track price changes and get alerts when items hit your targets
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <p className="text-gray-400">Fetching prices...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Selected Item Display + Options (only show if not loading and no prices yet) */}
          {selectedItem && !loading && !priceData && (needsCondition || needsVariant) && (
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

              {/* Fetch button */}
              <button
                onClick={handleFetchPrice}
                disabled={!canFetchPrice || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!canFetchPrice && needsCondition && !selectedCondition 
                  ? 'Select a condition to continue'
                  : 'Get Prices'
                }
              </button>
            </>
          )}

          {/* Marketplace Selection + Add to Watchlist Form */}
          {priceData && Object.keys(priceData).length > 0 && !loading && (
            <div className="space-y-4">
              
              {/* Simple confirmation card */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-6 border border-green-500/30">
                <div className="flex items-center space-x-4 mb-4">
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.name}
                    className="w-16 h-16 object-contain bg-gray-700 rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-base">
                      {selectedItem.baseName || selectedItem.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                      {selectedCondition && <span>{selectedCondition}</span>}
                      {selectedVariant !== 'normal' && (
                        <>
                          {selectedCondition && <span>•</span>}
                          <span className={selectedVariant === 'stattrak' ? 'text-orange-400' : 'text-yellow-400'}>
                            {selectedVariant === 'stattrak' ? 'StatTrak™' : 'Souvenir'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Tracking from</span>
                    <span className="text-green-400 text-sm font-medium uppercase">
                      {formatMarketplaceName(selectedMarketplace)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Baseline price</span>
                    <span className="text-white text-lg font-bold">
                      ${priceData[selectedMarketplace][0].price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {priceData[selectedMarketplace][0].is_bid_price && (
                  <div className="mt-3 flex items-center space-x-2 text-yellow-400 text-xs bg-yellow-400/10 px-3 py-2 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>Currently tracking bid price only</span>
                  </div>
                )}
              </div>

              {/* Simple info note */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  You can switch marketplaces, add target prices, and notes from the watchlist page.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAddToWatchlist}
                  disabled={adding}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding...</span>
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
            </div>
          )}

          {/* No Price Data State - only show AFTER fetch attempt */}
          {selectedItem && !loading && fetchAttempted && (!priceData || Object.keys(priceData).length === 0) && !error && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
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

export default QuickWatchlistAdd;