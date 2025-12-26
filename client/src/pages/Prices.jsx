import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Loader2, TrendingUp, AlertTriangle, Eye, X  } from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import { useCSData } from '@/contexts/CSDataContext';
import { usePriceLookup } from '@/hooks/portfolio/usePriceLookup';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { QuickWatchlistAdd } from '@/components/forms';
import { useWatchlist } from '@/hooks/portfolio';
import { convertAndFormat } from '@/hooks/util/currency';

const ITEM_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'skins', label: 'Skins' },
  { value: 'cases', label: 'Cases' },
  { value: 'stickers', label: 'Stickers' },
  { value: 'agents', label: 'Agents' },
  { value: 'keychains', label: 'Keychains' },
  { value: 'graffiti', label: 'Graffiti' },
  { value: 'patches', label: 'Patches' },
  { value: 'music_kits', label: 'Music Kits' },
  { value: 'highlights', label: 'Highlights' },
];

const PricesPage = ({ userSession }) => {
  const location = useLocation();
  const { lookupMaps } = useCSData();
  const { addToWatchlist, refreshWatchlist } = useWatchlist(userSession);
  const { currency } = useUserSettings();

  const [selectedType, setSelectedType] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [allPrices, setAllPrices] = useState([]);
  
  // Filter states (only used if item has options)
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterVariant, setFilterVariant] = useState('all'); // 'all', 'normal', 'stattrak', 'souvenir'

  const { lookupAllPrices, loading, error } = usePriceLookup(userSession);
  const [showQuickWatchlistAdd, setShowQuickWatchlistAdd] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
  const timer = setTimeout(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, 200); // Slightly longer delay to ensure component is ready
  
  return () => clearTimeout(timer);
}, [selectedType]); // Runs on mount AND when type changes

    useEffect(() => {
      if (location.state?.preSelectedItem) {
        const item = location.state.preSelectedItem;
        
        // Keep filter on 'all' - user can change if needed
        setSelectedType('all');
        
        // Auto-select and fetch prices for the item
        handleItemSelect(item);
        
        // Clear navigation state so refresh doesn't re-trigger
        window.history.replaceState({}, document.title);
      }
    }, [location.state]);

  // Auto-fetch on item selection
  const handleItemSelect = useCallback(async (item) => {
  setSelectedItem(item);
  
  const requiresVariantPreSelection = item.requiresVariantPreSelection || false;
  
  // For music items, keep filterVariant at 'all' showing all data for that variant
  // For other items, default to 'all'
  let initialVariant = 'all';
  
  // Only set a specific variant if it's NOT a pre-selection item
  // (Pre-selection items already have the variant baked into the data)
  if (!requiresVariantPreSelection) {
    initialVariant = 'all';
  }
  
  setFilterCondition('all');
  setFilterVariant(initialVariant);
  
  const result = await lookupAllPrices(item);
  if (result.success) {
    setAllPrices(result.results);
  }
}, [lookupAllPrices]);

  // Item stat calculations
  // Filter results based on user selection
  const filteredPrices = allPrices.filter(config => {
    if (filterCondition !== 'all' && config.condition !== filterCondition) return false;
    if (filterVariant !== 'all' && config.variant !== filterVariant) return false;
    return true;
  });

  const totalMarketPrices = useMemo(() => 
  allPrices.reduce((sum, config) => {
    return sum + Object.values(config.prices).reduce((mpSum, prices) => mpSum + prices.length, 0);
  }, 0),
  [allPrices]
);

const filteredMarketPrices = useMemo(() =>
  filteredPrices.reduce((sum, config) => {
    return sum + Object.values(config.prices).reduce((mpSum, prices) => mpSum + prices.length, 0);
  }, 0),
  [filteredPrices]
);

  // Determine if item has configuration options
  const itemType = selectedItem?.category || selectedItem?.metadata?.[0] || '';
  const hasConditions = ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(itemType);
  const hasVariants = selectedItem && (selectedItem.hasStatTrak || selectedItem.hasSouvenir);
  const showFilters = hasConditions || hasVariants;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto"> 
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            Market Prices
          </h1>
          <p className="text-gray-400">Search for CS2 items and view current market prices</p>
        </div>

        {/* Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Item Type</label>
          <div className="flex flex-wrap gap-2">
            {ITEM_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedType(type.value);
                  setSelectedItem(null);
                  setSearchValue('');
                  setAllPrices([]);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === type.value
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Items</label>
          <div className="relative">
            <CSItemSearch
              ref={searchInputRef}
              type={selectedType}
              onSelect={handleItemSelect}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              maxResults={30}
              showLargeView={true}
              maxHeight="550px"
            />
            {searchValue && (
              <button
                onClick={() => {
                  setSearchValue('');
                  setSelectedItem(null);
                  setAllPrices([]);
                }}
                className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 hover:text-white transition-colors z-10"
                style={{ marginTop: '2px' }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
            <p className="text-gray-400">Loading prices...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results Layout: Sidebar + Content (only if item selected and not loading) */}
        {selectedItem && !loading && allPrices.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Sidebar: Item Info + Filters */}
            <div className="lg:col-span-1 space-y-4">
              
              {/* Item Card */}
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="relative">
                    <img 
                      src={selectedItem.image} 
                      alt={selectedItem.name}
                      className="w-full h-32 object-contain bg-gray-700 rounded mb-3"
                    />
                    {/* Subtle Add to Watchlist Icon */}
                    <button
                      onClick={() => setShowQuickWatchlistAdd(true)}
                      className="absolute top-2 right-2 p-1.5 bg-gray-900/70 hover:bg-orange-500/20 border border-gray-600 hover:border-orange-500/50 text-gray-400 hover:text-orange-400 rounded-lg transition-colors"
                      title="Add to Watchlist"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1 leading-tight">
                    {selectedItem.name}
                  </h3>
  
                {/* Primary Stats Section */}
                <div className="space-y-1 text-xs mt-3 pb-3 border-b border-gray-700">
                  <div className="flex justify-between text-gray-400">
                    <span>Market prices:</span>
                    <span className="text-white font-medium">{filteredMarketPrices}</span>
                  </div>    
                  {showFilters && (
                    <>
                      {hasConditions && (
                        <div className="flex justify-between text-gray-400">
                          <span>Conditions:</span>
                          <span className="text-white font-medium">
                            {new Set(filteredPrices.map(p => p.condition).filter(Boolean)).size}
                          </span>
                        </div>
                      )}
                    
                      {hasVariants && (
                        <div className="flex justify-between text-gray-400">
                          <span>Variants:</span>
                          <span className="text-white font-medium">
                            {new Set(filteredPrices.map(p => p.variant)).size}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                
                  {(filterCondition !== 'all' || filterVariant !== 'all') && (
                    <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-700/50">
                      <span>Filtered from:</span>
                      <span className="text-gray-500 font-medium">{totalMarketPrices} total</span>
                    </div>
                  )}
                </div>

                {/* Secondary Info Section - Context */}
                <div className="mt-3 space-y-2">
                  {/* Float Range */}
                  {selectedItem.minFloat !== undefined && selectedItem.maxFloat !== undefined && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Float range:</div>
                      <div className="text-xs text-gray-400">
                        {selectedItem.minFloat.toFixed(2)} - {selectedItem.maxFloat.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Tournament (for stickers) */}
                  {selectedItem.tournament && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Tournament:</div>
                      <div className="text-xs text-blue-400">
                        {selectedItem.tournament.name || selectedItem.tournament}
                      </div>
                    </div>
                  )}

                  {/* Show Collections and Cases separately */}
                  {(() => {
                    // Gather unique collections
                    const collections = new Set();
                    const casesWithoutCollection = [];
                    
                    if (selectedItem.collections?.length > 0) {
                      selectedItem.collections.forEach(collectionId => {
                        const collection = lookupMaps.collectionsById.get(collectionId);
                        if (collection) {
                          collections.add(collection);
                        }
                      });
                    }
                    
                    // Gather cases
                    const allCases = [];
                    if (selectedItem.crates?.length > 0) {
                      selectedItem.crates.forEach(crateId => {
                        const crate = lookupMaps.casesById.get(crateId);
                        if (crate) {
                          allCases.push(crate);
                        }
                      });
                    }
                    
                    // Reverse lookup for patches/music_kits
                    if (lookupMaps.itemToCases?.has(selectedItem.id)) {
                      const caseIds = lookupMaps.itemToCases.get(selectedItem.id);
                      caseIds.forEach(crateId => {
                        const crate = lookupMaps.casesById.get(crateId);
                        if (crate && !allCases.find(c => c.id === crateId)) {
                          allCases.push(crate);
                        }
                      });
                    }
                    
                    // Check which cases are orphaned (no collection link)
                    allCases.forEach(crate => {
                      let hasCollection = false;
                      collections.forEach(collection => {
                        if (collection.crates?.includes(crate.id)) {
                          hasCollection = true;
                        }
                      });
                      if (!hasCollection) {
                        casesWithoutCollection.push(crate);
                      }
                    });
                    
                    if (collections.size === 0 && allCases.length === 0) return null;
                    
                    return (
                      <div>
                        {/* Collections Section */}
                        {collections.size > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Collection:</div>
                            <div className="space-y-1">
                              {Array.from(collections).map((collection, idx) => (
                                <div key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                  <span>{collection.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Cases/Packages Section */}
                        {allCases.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              {collections.size > 0 ? 'Found in:' : 'Cases:'}
                            </div>
                            <div className="space-y-1">
                              {allCases.map((crate, idx) => (
                                <div key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                  <span>{crate.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata (category, etc.) */}
                  {selectedItem.metadata?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Category:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.metadata.slice(0, 2).map((meta, idx) => (
                          <span key={idx} className="text-xs text-gray-400 px-2 py-0.5 bg-gray-700 rounded">
                            {meta}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filters (only show if item has options) */}
              {showFilters && (
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold text-sm">Filters</h4>
                    
                    {/* Clear Filters Button - Top Right */}
                    {(filterCondition !== 'all' || filterVariant !== 'all') && (
                      <button
                        onClick={() => {
                          setFilterCondition('all');
                          setFilterVariant('all');
                        }}
                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
    
                  {/* Condition Filter - Compact Buttons */}
                  {hasConditions && (
                    <div className="mb-4">
                      <label className="block text-xs text-gray-400 mb-2">Condition</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFilterCondition('all')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            filterCondition === 'all'
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          All
                        </button>
                        {[
                          { value: 'Factory New', label: 'FN', min: 0.00, max: 0.07 },
                          { value: 'Minimal Wear', label: 'MW', min: 0.07, max: 0.15 },
                          { value: 'Field-Tested', label: 'FT', min: 0.15, max: 0.37 },
                          { value: 'Well-Worn', label: 'WW', min: 0.37, max: 0.44 },
                          { value: 'Battle-Scarred', label: 'BS', min: 0.44, max: 1.00 }
                        ].map(({ value, label, min, max }) => {
                          // Validate if condition is available for this item
                          const isAvailable = selectedItem.minFloat === undefined || 
                                            selectedItem.maxFloat === undefined ||
                                            (min < selectedItem.maxFloat && max > selectedItem.minFloat);
                          
                          return (
                            <button
                              key={value}
                              onClick={() => isAvailable && setFilterCondition(value)}
                              disabled={!isAvailable}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                filterCondition === value
                                  ? 'bg-blue-500 text-white'
                                  : isAvailable
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              }`}
                              title={!isAvailable ? 'Not available for this item' : value}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

              {/* Variant Filter - Compact Buttons */}
              {hasVariants && !selectedItem.requiresVariantPreSelection && (
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Variant</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterVariant('all')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        filterVariant === 'all'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterVariant('normal')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        filterVariant === 'normal'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Normal
                    </button>
                    {selectedItem.hasStatTrak && (
                      <button
                        onClick={() => setFilterVariant('stattrak')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          filterVariant === 'stattrak'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        StatTrak™
                      </button>
                    )}
                    {selectedItem.hasSouvenir && (
                      <button
                        onClick={() => setFilterVariant('souvenir')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          filterVariant === 'souvenir'
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

              {/* Show locked variant indicator for music items */}
              {selectedItem.requiresVariantPreSelection && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Showing prices for:</span>
                    <span className={`px-2 py-1 rounded font-medium ${
                      selectedItem.actualSelectedVariant === 'stattrak' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      {selectedItem.actualSelectedVariant === 'stattrak' ? 'StatTrak™' : 'Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Search again to view {selectedItem.actualSelectedVariant === 'stattrak' ? 'Normal' : 'StatTrak™'} prices
                  </p>
                </div>
              )}
                </div>
              )}
            </div>

            {/* Right Content: Price Results */}
            <div className="lg:col-span-3">
              {filteredPrices.length > 0 ? (
                <div className="space-y-6">
                  {/* Group by variant */}
                  {Object.entries(
                    filteredPrices.reduce((acc, config) => {
                      // detect name based variant
                      const isNameBasedSouvenir = selectedItem.name?.startsWith('Souvenir Charm') ||
                               selectedItem.name?.includes('Souvenir Package');

                      const variantLabel = config.variant === 'stattrak' ? 'StatTrak™' : 
                        config.variant === 'souvenir' ? 'Souvenir' :
                        isNameBasedSouvenir ? 'Souvenir' : // Override for name-based
                        'Normal';

                      if (!acc[variantLabel]) acc[variantLabel] = [];
                      acc[variantLabel].push(config);
                      return acc;
                    }, {})
                  ).map(([variantLabel, configs]) => (
                    <PriceComparisonTable 
                      key={variantLabel}
                      variantLabel={variantLabel}
                      configs={configs}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                  <p className="text-gray-400">No prices match your filters</p>
                  <button
                    onClick={() => {
                      setFilterCondition('all');
                      setFilterVariant('all');
                    }}
                    className="mt-3 text-sm text-orange-400 hover:text-orange-300"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Market Data State */}
        {selectedItem && !loading && allPrices.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No market prices found</p>
            <p className="text-gray-500 text-sm">
              This item may not be actively traded or price data is unavailable
            </p>
          </div>
        )}

        {/* Empty State */}
        {!selectedItem && !loading && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Search for an item to view prices</p>
            <p className="text-gray-500 text-sm">All available variants and conditions will be displayed</p>
          </div>
        )}
      </div>
      {showQuickWatchlistAdd && selectedItem && (
        <QuickWatchlistAdd
          isOpen={showQuickWatchlistAdd}
          userSession={userSession}
          onClose={() => setShowQuickWatchlistAdd(false)}
          onAdd={async (item, price, marketplace, options) => {
            const result = await addToWatchlist(item, price, marketplace, options);
            if (result.success) {
              await refreshWatchlist();
            }
            setShowQuickWatchlistAdd(false);
          }}
          preSelectedItem={selectedItem}
          preSelectedCondition={filterCondition !== 'all' ? filterCondition : null}
          preSelectedVariant={filterVariant !== 'all' ? filterVariant : null}
        />
      )}
    </div>
  );
};

// un-used for now
const MarketplacePriceCard = ({ marketplace, prices }) => {
  const mainPrice = prices[0];
  
  return (
    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white capitalize">{marketplace}</h3>
        <TrendingUp className="w-5 h-5 text-green-400" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Price:</span>
          <span className="text-xl font-bold text-white">
            ${mainPrice.price.toFixed(2)}
          </span>
        </div>
        
        {mainPrice.is_bid_price && (
          <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
            Bid Price Only
          </div>
        )}
        
        {marketplace === 'buff163' && (
          <>
            {mainPrice.starting_at_price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Starting at:</span>
                <span className="text-green-400">${mainPrice.starting_at_price.toFixed(2)}</span>
              </div>
            )}
            {mainPrice.highest_order_price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Highest bid:</span>
                <span className="text-blue-400">${mainPrice.highest_order_price.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        
        {marketplace === 'steam' && mainPrice.price_last_7d && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">7-day avg:</span>
            <span className="text-gray-300">${mainPrice.price_last_7d.toFixed(2)}</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-600">
          Updated: {new Date(mainPrice.last_updated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

const PriceComparisonTable = ({ variantLabel, configs }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  
  const { settings: contextSettings, currency } = useUserSettings();

  const formatPrice = useCallback((usdAmount) => {
    return convertAndFormat(usdAmount, currency);
  }, [currency]);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
      <h3 className="text-xl font-semibold text-white">
        {variantLabel} Prices
      </h3>
      
      {/* Legend - moved to top right */}
        <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-700/30 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span>Bid only</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-xs font-semibold">
              $0.00
            </span>
            <span>Best</span>
          </div>
          <div className="flex items-center gap-0.5">
            <svg className="w-3 h-3 mt-0.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Preferred</span>
          </div>
        </div>
      </div>

      {/* Compact Table View */}
      <div className="overflow-x-auto -mx-6 lg:mx-0">
        <div className="inline-block min-w-full align-middle px-6 lg:px-0">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-700">
              {configs[0]?.condition && (
                <th className="text-left text-sm text-gray-400 pb-3 pr-4 sticky left-0 bg-gray-800">
                  Condition
                </th>
              )}
              {['csfloat', 'buff163', 'steam', 'skinport']
                .sort((a, b) => {
                  // Sort by user preference
                  const aIndex = contextSettings.marketplacePriority?.indexOf(a) ?? 999;
                  const bIndex = contextSettings.marketplacePriority?.indexOf(b) ?? 999;
                  return aIndex - bIndex;
                })
                .map(marketplace => {
                  const isPreferred = contextSettings.marketplacePriority?.[0] === marketplace;
                  return (
                    <th key={marketplace} className="text-center text-sm pb-3 px-3">
                      <div className="flex items-center justify-center space-x-0.5">
                        <span className={'text-gray-400'}>
                          {marketplace === 'csfloat' ? 'CSFloat' :
                          marketplace === 'buff163' ? 'Buff163' :
                          marketplace === 'steam' ? 'Steam' : 'Skinport'}
                        </span>
                        {isPreferred && (
                          <svg className="w-3 h-3 mt-0.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </div>
                    </th>
                  );
                })
              }
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
          {configs.map((config, idx) => {
          // Calculate best price for THIS row - EXCLUDE bid-only prices
          const allPricesInRow = ['csfloat', 'buff163', 'steam', 'skinport']
            .map(mp => {
              const priceData = config.prices[mp]?.[0];
              // Only include if price exists AND it's not bid-only
              return (priceData && !priceData.is_bid_price) ? priceData.price : null;
            })
            .filter(Boolean);
          const lowestPrice = allPricesInRow.length > 0 ? Math.min(...allPricesInRow) : null;
            
            return (
              <React.Fragment key={config.condition || idx}>
                {/* Main Row */}
                <tr 
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  {configs.some(c => c.condition) && (
                    <td className="py-3 pr-4 text-white font-medium text-sm sticky left-0 bg-gray-800">
                      {config.condition || '—'}
                    </td>
                  )}
                  {['csfloat', 'buff163', 'steam', 'skinport']
                    .sort((a, b) => {
                      const aIndex = contextSettings.marketplacePriority?.indexOf(a) ?? 999;
                      const bIndex = contextSettings.marketplacePriority?.indexOf(b) ?? 999;
                      return aIndex - bIndex;
                    })
                    .map(marketplace => {
                      const price = config.prices[marketplace]?.[0];
                      const isBestPrice = price && !price.is_bid_price && lowestPrice && price.price === lowestPrice;
                      
                       return (
                            <td key={marketplace} className="py-3 px-3 text-center">
                              {price ? (
                                <div className="inline-flex items-center space-x-0">
                                  <span className={`font-semibold text-sm px-1 py-0.5 rounded ${
                                    isBestPrice ? 'bg-green-500/20 text-green-400' : 'text-white'
                                  }`}>
                                    {formatPrice(price.price)}
                                  </span>
                                  {price.is_bid_price && (
                                    <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-400" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-600 text-sm">—</span>
                              )}
                            </td>
                          );
                        })
                      }
                  <td className="py-3 text-center">
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform mx-auto ${
                        expandedRow === idx ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>
                
                {/* Expanded Details Row */}
                {expandedRow === idx && (
                  <tr className="bg-gray-700/20">
                        <td colSpan="6" className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {['csfloat', 'buff163', 'steam', 'skinport']
                              .sort((a, b) => {
                                const aIndex = contextSettings.marketplacePriority?.indexOf(a) ?? 999;
                                const bIndex = contextSettings.marketplacePriority?.indexOf(b) ?? 999;
                                return aIndex - bIndex;
                              })
                              .map(marketplace => {
                                const price = config.prices[marketplace]?.[0];
                                if (!price) return null;
                                
                                return (
                                  <div key={marketplace} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
                                    <div className="text-sm text-gray-300 capitalize font-semibold mb-2">
                                      {marketplace === 'csfloat' ? 'CSFloat' :
                                      marketplace === 'buff163' ? 'Buff163' :
                                      marketplace === 'steam' ? 'Steam' : 'Skinport'}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {/* Main Price */}
                                      <div className="text-lg font-bold text-white">
                                        {formatPrice(price.price)}
                                      </div>
                                      
                                      {/* Buff163 details */}
                                      {marketplace === 'buff163' && (
                                        <>
                                          {price.is_bid_price && (
                                            <div className="flex items-center space-x-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                                              <AlertTriangle className="w-3 h-3" />
                                              <span>Bid only (no sellers)</span>
                                            </div>
                                          )}
                                          {!price.is_bid_price && price.highest_order_price && (
                                            <div className="text-xs text-gray-400">
                                              Highest bid: {formatPrice(price.highest_order_price)}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      
                                      {/* Steam historical data */}
                                      {marketplace === 'steam' && price.price_last_7d && (
                                        <div className="text-xs text-gray-400">
                                          7d avg: {formatPrice(price.price_last_7d)}
                                          {price.price !== price.price_last_7d && (
                                            <span className={`ml-1 font-semibold ${
                                              price.price > price.price_last_7d ? 'text-red-400' : 'text-green-400'
                                            }`}>
                                              {price.price > price.price_last_7d ? '+' : '-'}
                                              {Math.abs(((price.price - price.price_last_7d) / price.price_last_7d) * 100).toFixed(1)}%
                                            </span>
                                          )}
                                          
                                          {price.price_last_30d && (
                                            <div className="text-xs text-gray-400">
                                              30d: {formatPrice(price.price_last_30d)} 
                                            </div>
                                        )}
                                      {/* Show which timeframe is used for main price */}
                                      <div className="text-xs text-gray-500">
                                        Source: {price.price_last_24h ? '24h' : 
                                                price.price_last_7d ? '7d' :
                                                price.price_last_30d ? '30d' : '90d'}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Last updated */}
                                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-600">
                                    {new Date(price.last_updated).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                          .filter(Boolean) // Remove nulls
                        }
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
              })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default PricesPage;