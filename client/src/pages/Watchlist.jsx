import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import { usePriceLookup, useWatchlist } from '@/hooks/portfolio';
import { useUserSettings } from '@/contexts/UserSettingsContext';

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

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'change_desc', label: 'Biggest Gain' },
  { value: 'change_asc', label: 'Biggest Loss' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

const WatchlistPage = ({ userSession }) => {
  // Hooks
  const { 
    watchlist, 
    loading, 
    addToWatchlist, 
    removeFromWatchlist,
    bulkRemove,
    refreshWatchlist 
  } = useWatchlist(userSession);

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [priceFilter, setPriceFilter] = useState('all'); // 'all', 'gaining', 'losing'
  const [refreshing, setRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWatchlist();
    setRefreshing(false);
  };

  // Filter and sort watchlist
  const filteredAndSortedWatchlist = useMemo(() => {
    let filtered = watchlist;

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Price change filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.price_change) return false;
        return priceFilter === 'gaining' ? item.price_change > 0 : item.price_change < 0;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date_asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'change_desc':
          return (b.price_change_percent || 0) - (a.price_change_percent || 0);
        case 'change_asc':
          return (a.price_change_percent || 0) - (b.price_change_percent || 0);
        case 'name_asc':
          return a.full_name.localeCompare(b.full_name);
        case 'name_desc':
          return b.full_name.localeCompare(a.full_name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [watchlist, selectedType, priceFilter, sortBy]);

  // Selection handlers
  const toggleSelection = (id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedWatchlist.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedWatchlist.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (confirm(`Remove ${selectedItems.size} items from watchlist?`)) {
      await bulkRemove(Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  // Stats - Recalculate whenever watchlist changes
  const stats = useMemo(() => {
    let totalGaining = 0;
    let totalLosing = 0;
    let totalValue = 0;
    let totalInitialValue = 0;

    watchlist.forEach(item => {
      if (item.current_price && item.price_change !== null) {
        totalValue += parseFloat(item.current_price);
        totalInitialValue += parseFloat(item.initial_price);
        
        if (item.price_change > 0) totalGaining++;
        if (item.price_change < 0) totalLosing++;
      }
    });

    const totalChangePercent = totalInitialValue > 0 
      ? ((totalValue - totalInitialValue) / totalInitialValue) * 100 
      : 0;

    return { 
      totalGaining, 
      totalLosing, 
      totalValue, 
      totalInitialValue,
      totalChangePercent,
      totalItems: watchlist.length 
    };
  }, [watchlist]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Price Watchlist
              </h1>
              <p className="text-gray-400 mt-1">Track CS2 item prices and market changes</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {watchlist.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Items</div>
                <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Gaining</div>
                <div className="text-2xl font-bold text-green-400 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-1" />
                  {stats.totalGaining}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Losing</div>
                <div className="text-2xl font-bold text-red-400 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-1" />
                  {stats.totalLosing}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Current Value</div>
                <div className="text-2xl font-bold text-white">${stats.totalValue.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Change</div>
                <div className={`text-2xl font-bold flex items-center ${
                  stats.totalChangePercent > 0 ? 'text-green-400' : 
                  stats.totalChangePercent < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {stats.totalChangePercent > 0 ? <TrendingUp className="w-5 h-5 mr-1" /> : 
                   stats.totalChangePercent < 0 ? <TrendingDown className="w-5 h-5 mr-1" /> : null}
                  {stats.totalChangePercent > 0 ? '+' : ''}{stats.totalChangePercent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Item Type</label>
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type.value
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort and Filter Row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Price Change</label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="all">All Items</option>
                  <option value="gaining">Gaining Value</option>
                  <option value="losing">Losing Value</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <span className="text-orange-400 font-medium">
                  {selectedItems.size} items selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Selected</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Table */}
        {filteredAndSortedWatchlist.length > 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredAndSortedWatchlist.length && filteredAndSortedWatchlist.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded bg-gray-600 border-gray-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-left text-sm font-medium text-gray-300">Item</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Initial Price</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Current Price</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Change</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Source</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Added</th>
                    <th className="p-3 text-center text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedWatchlist.map(item => (
                    <WatchlistRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.has(item.id)}
                      onToggleSelect={() => toggleSelection(item.id)}
                      onRemove={() => removeFromWatchlist(item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {watchlist.length === 0 ? 'No items in watchlist' : 'No items match your filters'}
            </h3>
            <p className="text-gray-400 mb-4">
              {watchlist.length === 0 
                ? 'Add items to start tracking prices'
                : 'Try adjusting your filters to see more items'}
            </p>
            {watchlist.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all"
              >
                Add First Item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddToWatchlistModal
          userSession={userSession}
          onClose={() => setShowAddModal(false)}
          onAdd={addToWatchlist}
        />
      )}
    </div>
  );
};

// Watchlist Row Component
const WatchlistRow = ({ item, isSelected, onToggleSelect, onRemove }) => {
  const [showAllPrices, setShowAllPrices] = useState(false);
  const priceChange = item.price_change || 0;
  const priceChangePercent = item.price_change_percent || 0;
  const isGaining = priceChange > 0;
  const hasPrice = item.current_price && item.price_source !== 'none';
  
  // Parse available prices
  const availablePrices = useMemo(() => {
    if (!item.available_prices) return [];
    try {
      return typeof item.available_prices === 'string' 
        ? JSON.parse(item.available_prices)
        : item.available_prices;
    } catch {
      return [];
    }
  }, [item.available_prices]);

  return (
    <>
      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
        <td className="p-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded bg-gray-600 border-gray-500 cursor-pointer"
          />
        </td>
        <td className="p-3">
          <div className="flex items-center space-x-3">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.full_name}
                className="w-12 h-12 object-contain bg-gray-700 rounded"
              />
            )}
            <div>
              <div className="text-white font-medium">{item.full_name}</div>
              {item.notes && (
                <div className="text-gray-500 text-xs mt-0.5 truncate max-w-xs" title={item.notes}>
                  {item.notes}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-3 text-center">
          <div className="text-white font-medium">${item.initial_price.toFixed(2)}</div>
          <div className="text-gray-500 text-xs">{item.initial_marketplace.toUpperCase()}</div>
        </td>
        <td className="p-3 text-center">
          {hasPrice ? (
            <div>
              <div className="text-white font-medium">${item.current_price.toFixed(2)}</div>
              {item.is_bid_price && (
                <div className="flex items-center justify-center space-x-1 text-yellow-400 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>Bid</span>
                </div>
              )}
              {/* Show all prices button */}
              {availablePrices.length > 1 && (
                <button
                  onClick={() => setShowAllPrices(!showAllPrices)}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  {showAllPrices ? 'Hide' : `+${availablePrices.length - 1} more`}
                </button>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">N/A</div>
          )}
        </td>
        <td className="p-3 text-center">
          {hasPrice ? (
            <div className="flex flex-col items-center">
              <div className={`font-bold flex items-center ${
                isGaining ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {isGaining ? <TrendingUp className="w-4 h-4 mr-1" /> : 
                 priceChange < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
                {isGaining ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </div>
              <div className={`text-xs ${
                isGaining ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {priceChange >= 0 ? '+' : '-'}${Math.abs(priceChange).toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">—</div>
          )}
        </td>
        <td className="p-3 text-center">
          <div className="text-gray-400 text-sm uppercase">
            {hasPrice ? item.price_source : '—'}
          </div>
        </td>
        <td className="p-3 text-center">
          <div className="text-gray-400 text-sm">
            {new Date(item.created_at).toLocaleDateString()}
          </div>
        </td>
        <td className="p-3 text-center">
          <button
            onClick={onRemove}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
            title="Remove from watchlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
      
      {/* Expanded row showing all marketplace prices */}
      {showAllPrices && availablePrices.length > 1 && (
        <tr className="bg-gray-700/20">
          <td colSpan="8" className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availablePrices.map((priceData) => {
                const marketplaceChange = priceData.price - item.initial_price;
                const marketplaceChangePercent = (marketplaceChange / item.initial_price) * 100;
                const isMarketGaining = marketplaceChange > 0;
                const isCurrent = priceData.marketplace === item.price_source;
                
                return (
                  <div 
                    key={priceData.marketplace} 
                    className={`bg-gray-800/50 rounded-lg p-3 border ${
                      isCurrent ? 'border-orange-500/50' : 'border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300 uppercase font-medium">
                        {priceData.marketplace}
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <div className="text-lg font-bold text-white mb-1">
                      ${priceData.price.toFixed(2)}
                    </div>
                    
                    <div className={`text-xs font-medium ${
                      isMarketGaining ? 'text-green-400' : marketplaceChange < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {marketplaceChange >= 0 ? '+' : '-'}{Math.abs(marketplaceChangePercent).toFixed(2)}% 
                      ({marketplaceChange >= 0 ? '+' : '-'}${Math.abs(marketplaceChange).toFixed(2)})
                    </div>
                    
                    {priceData.is_bid_price && (
                      <div className="flex items-center space-x-1 text-yellow-400 text-xs mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Bid only</span>
                      </div>
                    )}
                    
                    {/* Steam specific data */}
                    {priceData.marketplace === 'steam' && priceData.price_last_7d && (
                      <div className="text-xs text-gray-500 mt-1">
                        7d: ${priceData.price_last_7d.toFixed(2)}
                      </div>
                    )}
                    
                    {/* Buff163 specific data */}
                    {priceData.marketplace === 'buff163' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {priceData.highest_order_price && (
                          <div>Bid: ${priceData.highest_order_price.toFixed(2)}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Add to Watchlist Modal
const AddToWatchlistModal = ({ userSession, onClose, onAdd }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [allMarketplacePrices, setAllMarketplacePrices] = useState({});
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form state for condition and variant
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('normal');
  
  const { settings } = useUserSettings();
  const { lookupSinglePrice } = usePriceLookup(userSession);

  // Check if item needs condition/variant selection
  const needsCondition = selectedItem && ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(
    selectedItem.category || selectedItem.metadata?.[0]
  );
  
  // Get the current variant item to check actual availability
  const currentVariantItem = useMemo(() => {
    if (!selectedItem) return null;
    return selectedItem.variants?.get?.(selectedVariant) || 
           selectedItem.variants?.get?.('normal') || 
           selectedItem;
  }, [selectedItem, selectedVariant]);
  
  // Check if item has variants based on the base item data
  const hasVariants = selectedItem && !selectedItem.requiresVariantPreSelection && 
                     (selectedItem.hasStatTrak || selectedItem.hasSouvenir);
  
  const isFormComplete = selectedItem && (!needsCondition || selectedCondition) && selectedItem.initialPrice;

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setSearchValue(''); // Clear search after selection
    
    // Get the actual variant item data from the selected variant
    const currentVariantKey = item.selectedVariant || item.variant || 'normal';
    const currentVariantItem = item.variants?.get?.(currentVariantKey) || 
                               item.variants?.get?.('normal') || 
                               item;
    
    // Reset form state
    setSelectedCondition('');
    setSelectedVariant(currentVariantKey);
    setAllMarketplacePrices({});
    
    // Use user's preferred marketplace as default
    const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
    setSelectedMarketplace(preferredMarket);

    // Check if this item needs condition using the variant item's category
    const requiresCondition = ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(
      currentVariantItem.category || item.category || item.metadata?.[0]
    );

    // If item doesn't need condition, fetch prices immediately
    if (!requiresCondition) {
      await fetchAllMarketplacePrices(item, currentVariantKey, null, preferredMarket);
    } else {
      // For items that need condition, just set the item without prices
      setSelectedItem({
        ...item,
        marketplace: preferredMarket
      });
    }
  };
  
  // Fetch prices from all marketplaces
  const fetchAllMarketplacePrices = async (item, variant, condition, defaultMarket) => {
    setLoading(true);
    try {
      const result = await lookupSinglePrice(item, variant, condition);

      if (result.success && result.data) {
        setAllMarketplacePrices(result.data);
        
        // Set initial price from preferred marketplace or first available
        const preferredPrice = result.data[defaultMarket]?.[0];
        const firstAvailableMarket = Object.keys(result.data).find(m => result.data[m]?.length > 0);
        const firstAvailablePrice = firstAvailableMarket ? result.data[firstAvailableMarket][0] : null;
        
        if (preferredPrice) {
          setSelectedItem(prev => ({
            ...prev || item,
            initialPrice: preferredPrice.price,
            marketplace: defaultMarket,
            condition: condition,
            variant: variant
          }));
          setSelectedMarketplace(defaultMarket);
        } else if (firstAvailablePrice) {
          setSelectedItem(prev => ({
            ...prev || item,
            initialPrice: firstAvailablePrice.price,
            marketplace: firstAvailableMarket,
            condition: condition,
            variant: variant
          }));
          setSelectedMarketplace(firstAvailableMarket);
        }
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch price when condition or variant changes (with debounce to prevent multiple calls)
  useEffect(() => {
    if (!needsCondition || !selectedCondition || !selectedItem) return;
    
    let isCancelled = false;
    
    const fetchPrice = async () => {
      const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
      await fetchAllMarketplacePrices(selectedItem, selectedVariant, selectedCondition, preferredMarket);
    };

    // Small delay to prevent rapid successive calls
    const timeoutId = setTimeout(fetchPrice, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [selectedCondition, selectedVariant, needsCondition, selectedItem?.id, settings.marketplacePriority]);

  const handleAdd = async () => {
    if (!isFormComplete) return;

    await onAdd(
      selectedItem,
      selectedItem.initialPrice,
      selectedItem.marketplace,
      {
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        notes: notes.trim() || null
      }
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-xl border border-orange-500/20 w-full max-w-3xl h-[85vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Add to Watchlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl">
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 pt-4">
          <div className="space-y-4">
          {/* Search Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Item Category</label>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchValue('');
                setSelectedItem(null);
                setSelectedCondition('');
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
            >
              {ITEM_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Item
            </label>
            <CSItemSearch
              type={searchType}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSelect={handleItemSelect}
              showLargeView={true}
              maxHeight="550px"
              maxResults={30}
            />
          </div>

          {/* Selected Item */}
          {selectedItem && (
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
              {/* Item Preview */}
              <div className="flex items-center space-x-3">
                {selectedItem.image && (
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-16 h-16 object-contain bg-gray-700 rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">{selectedItem.name}</p>
                  {loading ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span className="text-gray-400 text-sm">Fetching prices...</span>
                    </div>
                  ) : selectedItem.initialPrice ? (
                    <p className="text-green-400 text-sm mt-1">
                      Initial Price: ${selectedItem.initialPrice.toFixed(2)} ({selectedMarketplace.toUpperCase()})
                    </p>
                  ) : needsCondition && !selectedCondition ? (
                    <p className="text-yellow-400 text-sm mt-1">
                      Select condition to get prices
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm mt-1">
                      Fetching prices...
                    </p>
                  )}
                </div>
              </div>

              {/* Condition Selector - Show FIRST (before prices) */}
              {needsCondition && currentVariantItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Condition <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { short: 'FN', full: 'Factory New', minFloat: 0.00, maxFloat: 0.07 },
                      { short: 'MW', full: 'Minimal Wear', minFloat: 0.07, maxFloat: 0.15 },
                      { short: 'FT', full: 'Field-Tested', minFloat: 0.15, maxFloat: 0.37 },
                      { short: 'WW', full: 'Well-Worn', minFloat: 0.37, maxFloat: 0.44 },
                      { short: 'BS', full: 'Battle-Scarred', minFloat: 0.44, maxFloat: 1.00 }
                    ].map(({ short, full, minFloat: condMin, maxFloat: condMax }) => {
                      const itemMinFloat = currentVariantItem.minFloat;
                      const itemMaxFloat = currentVariantItem.maxFloat;
                      
                      const isAvailable = itemMinFloat === undefined || 
                                        itemMaxFloat === undefined ||
                                        (condMin < itemMaxFloat && condMax > itemMinFloat);
                      
                      return (
                        <button
                          key={short}
                          type="button"
                          onClick={() => isAvailable && setSelectedCondition(full)}
                          disabled={!isAvailable}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                            selectedCondition === full
                              ? 'bg-blue-600 text-white'
                              : isAvailable
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          }`}
                          title={isAvailable ? full : 'Not available for this item'}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                  {selectedCondition && (
                    <p className="text-gray-400 text-xs mt-2">Selected: {selectedCondition}</p>
                  )}
                  {currentVariantItem.minFloat !== undefined && currentVariantItem.maxFloat !== undefined && (
                    <p className="text-gray-500 text-xs mt-1">
                      Available float range: {currentVariantItem.minFloat.toFixed(2)} - {currentVariantItem.maxFloat.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Variant Selector */}
              {hasVariants && !selectedItem.requiresVariantPreSelection && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Variant
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
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
                        type="button"
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
                        type="button"
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

              {/* Locked variant indicator */}
              {selectedItem.requiresVariantPreSelection && (
                <div className="pt-2 border-t border-gray-600">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Variant:</span>
                    <span className={`px-2 py-1 rounded font-medium ${
                      selectedItem.actualSelectedVariant === 'stattrak' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      {selectedItem.actualSelectedVariant === 'stattrak' ? 'StatTrak™' : 'Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This variant was pre-selected during search
                  </p>
                </div>
              )}

              {/* Marketplace Price Selector - Show AFTER condition/variant selected and prices fetched */}
              {!loading && Object.keys(allMarketplacePrices).length > 0 && (
                <div className="pt-3 border-t border-gray-600">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Marketplace & Price <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Choose which marketplace to track from. Your primary marketplace ({(settings.marketplacePriority?.[0] || 'csfloat').toUpperCase()}) is selected by default. Current prices will use your primary marketplace setting.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(allMarketplacePrices).map(([marketplace, prices]) => {
                      if (!prices || prices.length === 0) return null;
                      const price = prices[0];
                      const isSelected = selectedMarketplace === marketplace;
                      const isPrimary = marketplace === (settings.marketplacePriority?.[0] || 'csfloat');
                      
                      return (
                        <button
                          key={marketplace}
                          type="button"
                          onClick={() => {
                            setSelectedMarketplace(marketplace);
                            setSelectedItem(prev => ({
                              ...prev,
                              initialPrice: price.price,
                              marketplace: marketplace
                            }));
                          }}
                          className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white uppercase">
                              {marketplace}
                            </span>
                            <div className="flex items-center gap-1">
                              {isPrimary && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-base font-bold text-white mb-0.5">
                            ${price.price.toFixed(2)}
                          </div>
                          {price.is_bid_price && (
                            <div className="flex items-center space-x-1 text-yellow-400 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>Bid only</span>
                            </div>
                          )}
                          {marketplace === 'steam' && price.price_last_7d && (
                            <div className="text-xs text-gray-400">
                              7d: ${price.price_last_7d.toFixed(2)}
                            </div>
                          )}
                          {marketplace === 'buff163' && price.highest_order_price && (
                            <div className="text-xs text-gray-400">
                              Bid: ${price.highest_order_price.toFixed(2)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Target Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Set a target price to track when the item reaches your goal</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this item..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none resize-none"
                  rows={2}
                  maxLength={300}
                />
                <p className="text-gray-500 text-xs mt-1">{notes.length}/300 characters</p>
              </div>
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={handleAdd}
            disabled={!isFormComplete || loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Fetching Price...' : 'Add to Watchlist'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;