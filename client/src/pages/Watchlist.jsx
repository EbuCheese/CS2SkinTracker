import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Plus,
  Loader2,
  RefreshCw,
  RotateCcw,
  Eraser,
  BrushCleaning,
  AlertCircle,
  Edit2,
  Save,
  X,
  DollarSign,
  Target
} from 'lucide-react';
import CSItemSearch from '@/components/search/CSItemSearch';
import PopupManager from '@/components/ui/PopupManager';
import { usePriceLookup, useWatchlist } from '@/hooks/portfolio';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { useScrollLock, formatDateInTimezone } from '@/hooks/util';

// map the item types to display
const ITEM_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'liquid', label: 'Skins' },
  { value: 'case', label: 'Cases' },      
  { value: 'sticker', label: 'Stickers' },
  { value: 'agent', label: 'Agents' },
  { value: 'keychain', label: 'Keychains' },
  { value: 'graffiti', label: 'Graffiti' },
  { value: 'patch', label: 'Patches' },
  { value: 'music_kit', label: 'Music Kits' },
  { value: 'highlight', label: 'Highlights' },
];

// sorting filters at top
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'change_desc', label: 'Biggest Gain' },
  { value: 'change_asc', label: 'Biggest Loss' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

const WatchlistPage = ({ userSession }) => {
  const { 
    watchlist, 
    loading, 
    addToWatchlist, 
    removeFromWatchlist,
    bulkRemove,
    refreshWatchlist ,
    switchMarketplace,
    resetBaseline,
    editBaseline
  } = useWatchlist(userSession);

  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [priceFilter, setPriceFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingBaselines, setEditingBaselines] = useState({});
  const [switchingMarketplace, setSwitchingMarketplace] = useState(null);

  const [popupState, setPopupState] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null
  });

  useScrollLock(showAddModal);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWatchlist();
    setRefreshing(false);
  };

  // stats calculations
  const stats = useMemo(() => {
    let totalGaining = 0;
    let totalLosing = 0;
    let totalUnchanged = 0;
    let totalCurrentValue = 0;
    let totalBaselineValue = 0;
    let itemsWithChanges = [];

    watchlist.forEach(item => {
      const currentPrice = parseFloat(item.current_price || 0);
      const baselinePrice = parseFloat(item.baseline_price || 0); 
      
      totalCurrentValue += currentPrice;
      totalBaselineValue += baselinePrice; 
      
      if (item.price_change !== null && item.price_change !== undefined) {
        const change = parseFloat(item.price_change);
        
        if (change > 0) {
          totalGaining++;
          itemsWithChanges.push(item);
        } else if (change < 0) {
          totalLosing++;
          itemsWithChanges.push(item);
        } else {
          totalUnchanged++;
        }
      }
    });

    const totalChangePercent = totalBaselineValue > 0 
      ? ((totalCurrentValue - totalBaselineValue) / totalBaselineValue) * 100 
      : 0;

    const avgChangePercent = itemsWithChanges.length > 0
      ? itemsWithChanges.reduce((sum, item) => sum + parseFloat(item.price_change_percent || 0), 0) / itemsWithChanges.length
      : 0;

    return { 
      totalGaining, 
      totalLosing, 
      totalUnchanged,
      totalCurrentValue,
      totalBaselineValue, 
      totalChangePercent,
      totalChangeAmount: totalCurrentValue - totalBaselineValue,
      avgChangePercent,
      itemsWithChanges: itemsWithChanges.length,
      totalItems: watchlist.length 
    };
  }, [watchlist]);

  const filteredAndSortedWatchlist = useMemo(() => {
    let filtered = watchlist;

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (priceFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.price_change) return false;
        return priceFilter === 'gaining' ? item.price_change > 0 : item.price_change < 0;
      });
    }

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

  // select all watchlist items toggle
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedWatchlist.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedWatchlist.map(item => item.id)));
    }
  };

  // handle the individual removal of items
  const handleRequestRemove = (itemId, itemName) => {
    setPopupState({
      isOpen: true,
      type: 'confirm',
      title: 'Remove Item',
      message: `Remove "${itemName}" from watchlist?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await removeFromWatchlist(itemId);
        setPopupState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // handle the bulk remove of items
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setPopupState({
      isOpen: true,
      type: 'confirm',
      title: 'Remove Items',
      message: `Remove ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} from watchlist?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await bulkRemove(Array.from(selectedItems));
        setSelectedItems(new Set());
        setPopupState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // edit the baseline price we are tracking from
  const startEditingBaseline = (itemId, currentBaseline) => {
    setEditingBaselines({
      ...editingBaselines,
      [itemId]: {
        baseline: currentBaseline.toString(),
        editing: true
      }
    });
  };

  // cancel editing of the baseline 
  const cancelEditingBaseline = (itemId) => {
    const newEditing = { ...editingBaselines };
    delete newEditing[itemId];
    setEditingBaselines(newEditing);
  };

  // save the new baseline
  const saveBaseline = async (itemId) => {
    const editData = editingBaselines[itemId];
    if (!editData) return;

    const baseline = parseFloat(editData.baseline);
    if (baseline <= 0) {
      toast.error('Baseline must be positive', 'Invalid Input');
      return;
    }

    await editBaseline(itemId, baseline);
    cancelEditingBaseline(itemId);
  };

  // reset the baseline to current price
  const handleResetBaseline = async (itemId) => {
    setPopupState({
      isOpen: true,
      type: 'confirm',
      title: 'Reset Baseline',
      message: 'Reset baseline to current price? This will restart % tracking from now.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await resetBaseline(itemId);
        setPopupState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // switch the tracking to a different marketplace
  const handleSwitchMarketplace = async (itemId, marketplace) => {
    await switchMarketplace(itemId, marketplace);
    setSwitchingMarketplace(null);
  };

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

          {watchlist.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Card 1: Total Items */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Items</div>
                <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
              </div>
              
              {/* Card 2: Gaining */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Gaining</div>
                <div className="text-2xl font-bold text-green-400 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-1" />
                  {stats.totalGaining}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalItems > 0 ? `${((stats.totalGaining / stats.totalItems) * 100).toFixed(0)}%` : '0%'} of items
                </div>
              </div>
              
              {/* Card 3: Losing */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Losing</div>
                <div className="text-2xl font-bold text-red-400 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-1" />
                  {stats.totalLosing}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalItems > 0 ? `${((stats.totalLosing / stats.totalItems) * 100).toFixed(0)}%` : '0%'} of items
                </div>
              </div>
              
              {/* Card 4: Avg Change */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Avg Change</div>
                <div className={`text-2xl font-bold ${
                  stats.avgChangePercent > 0 ? 'text-green-400' : 
                  stats.avgChangePercent < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {stats.avgChangePercent > 0 ? '+' : ''}{stats.avgChangePercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Across {stats.itemsWithChanges} items
                </div>
              </div>
            </div>
          )}

          {/* Filtering section */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
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

            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <span className="text-orange-400 font-medium">
                  {selectedItems.size} items selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Selected</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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
                      <th className="p-3 text-center text-sm font-medium text-gray-300">Baseline Price</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-300">Current Price</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-300">Change</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-300">Tracking</th>
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
                      onRequestRemoveConfirm={handleRequestRemove}
                      editingBaseline={editingBaselines[item.id]}
                      onStartEditBaseline={startEditingBaseline}
                      onCancelEditBaseline={cancelEditingBaseline}
                      onSaveBaseline={saveBaseline}
                      onResetBaseline={handleResetBaseline} 
                      onSwitchMarketplace={handleSwitchMarketplace}
                      switchingMarketplace={switchingMarketplace}
                      onToggleMarketplaceSwitch={setSwitchingMarketplace} 
                      userSession={userSession}
                      onUpdateEditField={(field, value) => {
                        setEditingBaselines({
                          ...editingBaselines,
                          [item.id]: {
                            ...editingBaselines[item.id],
                            [field]: value
                          }
                        });
                      }}
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

        <PopupManager
          isOpen={popupState.isOpen}
          onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
          type={popupState.type}
          title={popupState.title}
          message={popupState.message}
          onConfirm={popupState.onConfirm}
          onCancel={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
          confirmText={popupState.confirmText}
          cancelText={popupState.cancelText}
        />
      </div>

      {showAddModal && (
        <ImprovedAddModal
          userSession={userSession}
          onClose={() => setShowAddModal(false)}
          onAdd={addToWatchlist}
        />
      )}
    </div>
  );
};

const WatchlistRow = ({ 
  item, 
  isSelected, 
  onToggleSelect, 
  onRemove,
  onRequestRemoveConfirm,
  editingBaseline,
  onStartEditBaseline,
  onCancelEditBaseline,
  onSaveBaseline,
  onResetBaseline,
  onSwitchMarketplace,
  switchingMarketplace,
  onToggleMarketplaceSwitch, 
  userSession,
  onUpdateEditField
}) => {
  const [showAllPrices, setShowAllPrices] = useState(false);
  const priceChange = item.price_change || 0;
  const priceChangePercent = item.price_change_percent || 0;
  const isGaining = priceChange > 0;
  const hasPrice = item.current_price && item.current_marketplace;
  const isEditing = editingBaseline?.editing;
  const isShowingMarketplaceSwitch = switchingMarketplace === item.id;
  
  const { timezone } = useUserSettings();

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

  const daysSinceBaseline = Math.floor(item.days_since_baseline || 0);

  return (
    <>
      <tr className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
        {/* Checkbox */}
        <td className="p-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded bg-gray-600 border-gray-500 cursor-pointer"
          />
        </td>

        {/* Item Name */}
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
        
        {/* BASELINE PRICE CELL */}
        <td className="p-3 text-center">
          {isEditing ? (
            <div className="flex flex-col items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editingBaseline.baseline}
                onChange={(e) => onUpdateEditField('baseline', e.target.value)}
                className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center"
                placeholder="0.00"
              />
              <div className="flex gap-1 mt-1">
                <button 
                  onClick={() => onSaveBaseline(item.id)} 
                  className="p-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                  title="Save"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => onCancelEditBaseline(item.id)}
                  className="p-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded transition-colors"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-white font-medium">${item.baseline_price.toFixed(2)}</div>
              {/* Show Manual or Marketplace */}
              {item.baseline_manually_edited ? (
                <div className="text-blue-400 text-xs flex items-center justify-center gap-1">
                  <span>Manual</span>
                </div>
              ) : (
                <div className="text-gray-500 text-xs">{item.baseline_marketplace.toUpperCase()}</div>
              )}
              <div className="text-gray-500 text-xs mt-0.5">
                {daysSinceBaseline === 0 ? 'Today' : 
                daysSinceBaseline === 1 ? '1 day ago' : 
                `${daysSinceBaseline} days ago`}
              </div>
            </div>
          )}
        </td>
        
        {/* CURRENT PRICE CELL */}
        <td className="p-3 text-center">
          {hasPrice ? (
            <div>
              <div className="text-white font-medium">${item.current_price.toFixed(2)}</div>
              <div className="text-gray-500 text-xs">
                {item.current_marketplace.toUpperCase()}
                {item.is_bid_price && (
                  <span className="text-yellow-400 ml-1">(Bid)</span>
                )}
              </div>
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
            <div className="text-gray-500 text-sm">No price</div>
          )}
        </td>
        
        {/* CHANGE FROM BASELINE */}
        <td className="p-3 text-center">
          {hasPrice && priceChange !== null ? (
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
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">—</div>
          )}
        </td>
        
        {/* TRACKING SOURCE */}
        <td className="p-3 text-center">
          {item.current_marketplace ? (
            <div>
              <div className="text-gray-300 font-medium">{item.current_marketplace.toUpperCase()}</div>
              <div className={`text-xs ${item.is_using_custom_marketplace ? 'text-blue-400' : 'text-gray-500'}`}>
                {item.is_using_custom_marketplace ? 'Custom' : 'Auto'}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
        
        {/* ADDED DATE */}
        <td className="p-3 text-center">
          <div className="text-gray-400 text-sm">
            {formatDateInTimezone(item.created_at, timezone, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </td>
        
        {/* ACTIONS */}
        <td className="p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={() => onSaveBaseline(item.id)}
                  className="p-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                  title="Save baseline"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onCancelEditBaseline(item.id)}
                  className="p-1.5 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onStartEditBaseline(item.id, item.baseline_price)}
                  className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors"
                  title="Edit baseline price"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onResetBaseline(item.id)}
                  className="p-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                  title="Reset baseline to current price"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleMarketplaceSwitch(isShowingMarketplaceSwitch ? null : item.id)}
                  className="p-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors"
                  title="Switch marketplace"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                  <button
                    onClick={() => onRequestRemoveConfirm(item.id, item.full_name)} // CHANGE THIS
                    className="p-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </>
            )}
          </div>
        </td>
      </tr>
      
      {/* Marketplace Switcher Row */}
      {isShowingMarketplaceSwitch && (
        <tr className="bg-gray-700/20 border-t border-gray-600">
          <td colSpan="8" className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-300 font-medium">Switch tracking to:</span>
              {['csfloat', 'buff163', 'steam', 'skinport'].map(mp => {
                const isCurrent = mp === item.current_marketplace;
                const mpData = availablePrices.find(p => p.marketplace === mp);
                
                return (
                  <button
                    key={mp}
                    onClick={() => {
                      if (!isCurrent) {
                        onSwitchMarketplace(item.id, mp);
                      }
                    }}
                    disabled={isCurrent || !mpData}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      isCurrent
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-default'
                        : !mpData
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30'
                    }`}
                  >
                    {mp.toUpperCase()}
                    {isCurrent && <span className="ml-1">✓</span>}
                    {mpData && !isCurrent && (
                      <span className="ml-1 text-xs opacity-70">
                        ${mpData.price.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => onToggleMarketplaceSwitch(null)}
                className="ml-auto px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
      
      {/* Expandable Marketplace Comparison */}
      {showAllPrices && availablePrices.length > 1 && (
        <tr className="bg-gray-700/20 border-t border-gray-600">
          <td colSpan="8" className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availablePrices.map((priceData) => {
                const isCurrent = priceData.marketplace === item.current_marketplace;
                
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
                          Tracking
                        </span>
                      )}
                    </div>
                    
                    <div className="text-lg font-bold text-white mb-1">
                      ${priceData.price.toFixed(2)}
                    </div>
                    
                    <div className={`text-xs font-medium ${
                      priceData.change_from_baseline > 0 ? 'text-green-400' : 
                      priceData.change_from_baseline < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {priceData.change_from_baseline >= 0 ? '+' : ''}
                      {priceData.change_percent.toFixed(2)}% vs baseline
                    </div>
                    
                    {priceData.is_bid_price && (
                      <div className="flex items-center space-x-1 text-yellow-400 text-xs mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Bid only</span>
                      </div>
                    )}
                    
                    {priceData.marketplace === 'steam' && priceData.price_last_7d && (
                      <div className="text-xs text-gray-500 mt-1">
                        7d: ${priceData.price_last_7d.toFixed(2)}
                      </div>
                    )}
                    
                    {priceData.marketplace === 'buff163' && priceData.highest_order_price && (
                      <div className="text-xs text-gray-500 mt-1">
                        Bid: ${priceData.highest_order_price.toFixed(2)}
                      </div>
                    )}
                    
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSwitchMarketplace(item.id, priceData.marketplace);
                          setShowAllPrices(false);
                        }}
                        className="w-full mt-2 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded text-xs transition-colors"
                      >
                        Track This
                      </button>
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

const ImprovedAddModal = ({ userSession, onClose, onAdd }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [allMarketplacePrices, setAllMarketplacePrices] = useState({});
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('normal');
  
  useScrollLock(true);

  // converts database types back to searchable types
  const SEARCH_TYPE_MAP = {
    'liquid': 'skins',
    'case': 'cases',
    'sticker': 'stickers',
    'agent': 'agents',
    'keychain': 'keychains',
    'graffiti': 'graffiti',
    'patch': 'patches',
    'music_kit': 'music_kits',
    'highlight': 'highlights'
  };

  const { settings } = useUserSettings();
  const { lookupSinglePrice } = usePriceLookup(userSession);

  // get info based on item
  const needsCondition = selectedItem && ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(
    selectedItem.category || selectedItem.metadata?.[0]
  );
  
  const currentVariantItem = useMemo(() => {
    if (!selectedItem) return null;
    return selectedItem.variants?.get?.(selectedVariant) || 
           selectedItem.variants?.get?.('normal') || 
           selectedItem;
  }, [selectedItem, selectedVariant]);
  
  const hasVariants = selectedItem && !selectedItem.requiresVariantPreSelection && 
                     (selectedItem.hasStatTrak || selectedItem.hasSouvenir);

  const isFormComplete = selectedItem && (!needsCondition || selectedCondition) && selectedItem.initialPrice;

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setSearchValue('');
    setIsSearching(false);
    
    const currentVariantKey = item.selectedVariant || item.variant || 'normal';
    const currentVariantItem = item.variants?.get?.(currentVariantKey) || 
                               item.variants?.get?.('normal') || 
                               item;
    
    setSelectedCondition('');
    setSelectedVariant(currentVariantKey);
    setAllMarketplacePrices({});
    
    const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
    setSelectedMarketplace(preferredMarket);

    const requiresCondition = ['Rifles', 'Pistols', 'SMGs', 'Heavy', 'Knives', 'Gloves'].includes(
      currentVariantItem.category || item.category || item.metadata?.[0]
    );

    if (!requiresCondition) {
      await fetchAllMarketplacePrices(item, currentVariantKey, null, preferredMarket);
    } else {
      setSelectedItem({
        ...item,
        marketplace: preferredMarket
      });
    }
  };
  
  // get all of the market price for items
  const fetchAllMarketplacePrices = async (item, variant, condition, defaultMarket) => {
    setLoading(true);
    try {
      const result = await lookupSinglePrice(item, variant, condition);

      if (result.success && result.data) {
        setAllMarketplacePrices(result.data);
        
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

  useEffect(() => {
    if (!needsCondition || !selectedCondition || !selectedItem) return;
    
    const fetchPrice = async () => {
      const preferredMarket = settings.marketplacePriority?.[0] || 'csfloat';
      await fetchAllMarketplacePrices(selectedItem, selectedVariant, selectedCondition, preferredMarket);
    };

    const timeoutId = setTimeout(fetchPrice, 300);
    return () => clearTimeout(timeoutId);
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
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    {/* Modal container */}
    <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-xl border border-orange-500/20 w-full max-w-3xl">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-700">
        <h3 className="text-xl font-semibold text-white">Add to Watchlist</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl">
          ×
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 pt-4">
        <div className="space-y-4">
          
          {/* Category select */}
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

          {/* Search Section */}
          {!selectedItem && (
            <div className="min-h-[450px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Item
              </label>
              <CSItemSearch
                type={searchType === 'all' ? 'all' : (SEARCH_TYPE_MAP[searchType] || searchType)}
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setIsSearching(e.target.value.length > 0);
                }}
                onSelect={handleItemSelect}
                showLargeView={true}
                maxHeight="400px"
                maxResults={30}
              />
              
              {/* Empty State - shows when not searching */}
              {!searchValue && !loading && (
                <div className="text-center py-16 mt-10">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">Search for an item to view prices</p>
                  <p className="text-gray-500 text-sm">All available variants and conditions will be displayed</p>
                </div>
              )}
            </div>
          )}

          {/* Selected item form */}
          {selectedItem && (
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setSelectedCondition('');
                      setSelectedVariant('normal');
                      setAllMarketplacePrices({});
                      setTargetPrice('');
                      setNotes('');
                    }}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back to Search</span>
                  </button>
                </div>
                <div className="flex items-center space-x-3 pb-3 border-b border-gray-700">
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
                  </div>
                )}

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

                {!loading && Object.keys(allMarketplacePrices).length > 0 && (
                  <div className="pt-3 border-t border-gray-600">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Initial Marketplace & Price <span className="text-red-400">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      Choose which marketplace to track from. Your primary marketplace ({(settings.marketplacePriority?.[0] || 'csfloat').toUpperCase()}) is selected by default.
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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Target Price (Optional)
                    </div>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Set a target price to track when the item reaches your goal
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes like purchase details, strategy, or reminders..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-gray-500 text-xs">Track purchase context or trading strategy</p>
                    <p className="text-gray-500 text-xs">{notes.length}/300</p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <p className="font-medium mb-1">How Tracking Works</p>
                      <ul className="text-xs space-y-1 text-blue-300/80">
                        <li>• Current prices auto-update from your primary marketplace</li>
                        <li>• Initial price tracks your starting point for % change</li>
                        <li>• You can edit both prices anytime to adjust tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleAdd}
                  disabled={!isFormComplete || loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {loading ? 'Fetching Price...' : 'Add to Watchlist'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default WatchlistPage;