import React, { useState, useCallback } from 'react';
import { Search, Loader2, TrendingUp, AlertTriangle  } from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import { usePriceLookup } from '@/hooks/portfolio/usePriceLookup';
import { useUserSettings } from '@/contexts/UserSettingsContext';

const ITEM_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'skins', label: 'Skins' },
  { value: 'cases', label: 'Cases' },
  { value: 'stickers', label: 'Stickers' },
  { value: 'agents', label: 'Agents' },
  { value: 'keychains', label: 'Keychains' },
  { value: 'graffiti', label: 'Graffiti' },
  { value: 'patches', label: 'Patches' }
];

// pages/PricesPage.jsx - Revised UX
const PricesPage = ({ userSession }) => {
  const [selectedType, setSelectedType] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [allPrices, setAllPrices] = useState([]);
  
  // Filter states (only used if item has options)
  const [filterCondition, setFilterCondition] = useState('all'); // 'all' or specific
  const [filterVariant, setFilterVariant] = useState('all'); // 'all', 'normal', 'stattrak', 'souvenir'

  const { lookupAllPrices, loading, error } = usePriceLookup(userSession);

  // Auto-fetch on item selection
  const handleItemSelect = useCallback(async (item) => {
    setSelectedItem(item);
    setFilterCondition('all');
    setFilterVariant('all');
    
    // AUTOMATICALLY fetch all prices
    const result = await lookupAllPrices(item);
    if (result.success) {
      setAllPrices(result.results);
    }
  }, [lookupAllPrices]);

  // Determine if item has configuration options
  const itemType = selectedItem?.category || selectedItem?.metadata?.[0] || '';
  const hasConditions = ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(itemType);
  const hasVariants = selectedItem && (selectedItem.hasStatTrak || selectedItem.hasSouvenir);
  const showFilters = hasConditions || hasVariants;

  // Filter results based on user selection
  const filteredPrices = allPrices.filter(config => {
    if (filterCondition !== 'all' && config.condition !== filterCondition) return false;
    if (filterVariant !== 'all' && config.variant !== filterVariant) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto"> {/* Wider for filters */}
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
          <CSItemSearch
            type={selectedType}
            onSelect={handleItemSelect}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            maxResults={30}
            showLargeView={true}
            maxHeight="550px"
          />
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
        {selectedItem && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Sidebar: Item Info + Filters */}
            <div className="lg:col-span-1 space-y-4">
              
              {/* Item Card */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="w-full h-32 object-contain bg-gray-700 rounded mb-3"
                />
                <h3 className="text-white font-bold text-sm mb-1 leading-tight">
                  {selectedItem.baseName || selectedItem.name}
                </h3>
                
                {/* Multi-line stats */}
                <div className="space-y-1 text-xs">
  <div className="flex justify-between text-gray-400">
    <span>Market prices:</span>
    <span className="text-white font-medium">
      {filteredPrices.reduce((sum, config) => {
        return sum + Object.values(config.prices).reduce((mpSum, prices) => mpSum + prices.length, 0);
      }, 0)}
    </span>
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
    <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-700">
      <span>Filtered from:</span>
      <span className="text-gray-500 font-medium">
        {allPrices.reduce((sum, config) => {
          return sum + Object.values(config.prices).reduce((mpSum, prices) => mpSum + prices.length, 0);
        }, 0)} total
      </span>
    </div>
  )}
</div>
              </div>

              {/* Filters (only show if item has options) */}
              {showFilters && (
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <h4 className="text-white font-semibold mb-3 text-sm">Filters</h4>
                  
                  {/* Condition Filter */}
                  {hasConditions && (
                    <div className="mb-4">
                      <label className="block text-xs text-gray-400 mb-2">Condition</label>
                      <select
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                      >
                        <option value="all">All Conditions</option>
                        <option value="Factory New">Factory New</option>
                        <option value="Minimal Wear">Minimal Wear</option>
                        <option value="Field-Tested">Field-Tested</option>
                        <option value="Well-Worn">Well-Worn</option>
                        <option value="Battle-Scarred">Battle-Scarred</option>
                      </select>
                    </div>
                  )}

                  {/* Variant Filter */}
                  {hasVariants && (
                    <div className="mb-4">
                      <label className="block text-xs text-gray-400 mb-2">Variant</label>
                      <select
                        value={filterVariant}
                        onChange={(e) => setFilterVariant(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                      >
                        <option value="all">All Variants</option>
                        <option value="normal">Normal</option>
                        {selectedItem.hasStatTrak && <option value="stattrak">StatTrak™</option>}
                        {selectedItem.hasSouvenir && <option value="souvenir">Souvenir</option>}
                      </select>
                    </div>
                  )}

                  {/* Clear Filters */}
                  {(filterCondition !== 'all' || filterVariant !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterCondition('all');
                        setFilterVariant('all');
                      }}
                      className="w-full text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Clear Filters
                    </button>
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
                      const variantLabel = config.variant === 'stattrak' ? 'StatTrak™' : 
                                          config.variant === 'souvenir' ? 'Souvenir' : 'Normal';
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

        {/* Empty State */}
        {!selectedItem && !loading && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Search for an item to view prices</p>
            <p className="text-gray-500 text-sm">All available variants and conditions will be displayed</p>
          </div>
        )}
      </div>
    </div>
  );
};

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
  
  const { settings: contextSettings } = useUserSettings();

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
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Update the table header to show preference */}
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
                      const isPreferred = contextSettings.marketplacePriority?.[0] === marketplace;
                      const isBestPrice = price && !price.is_bid_price && lowestPrice && price.price === lowestPrice;
                      
                      return (
                        <td key={marketplace} className="py-3 px-3 text-center">
                          {price ? (
                          <div className="inline-flex items-center space-x-0">
                            <span className={`font-semibold text-sm px-1 py-0.5 rounded ${
                              isBestPrice ? 'bg-green-500/20 text-green-400' : 'text-white'
                            }`}>
                              ${price.price.toFixed(2)}
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
                        {/* Sort by same marketplace order */}
                        {['csfloat', 'buff163', 'steam', 'skinport']
                          .sort((a, b) => {
                            const aIndex = contextSettings.marketplacePriority?.indexOf(a) ?? 999;
                            const bIndex = contextSettings.marketplacePriority?.indexOf(b) ?? 999;
                            return aIndex - bIndex;
                          })
                          .map(marketplace => {
                            const price = config.prices[marketplace]?.[0];
                            if (!price) return null; // Skip if no price data
                            
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
                                    ${price.price.toFixed(2)}
                                  </div>
                                  
                                  {/* Buff163 - Show bid/ask details */}
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
                                          Highest bid: ${price.highest_order_price.toFixed(2)}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Steam - Historical data */}
                                  {marketplace === 'steam' && price.price_last_7d && (
                                  <div className="text-xs text-gray-400">
                                    7d avg: ${price.price_last_7d.toFixed(2)}
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
                                          30d: ${price.price_last_30d.toFixed(2)}
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
  );
};

export default PricesPage;