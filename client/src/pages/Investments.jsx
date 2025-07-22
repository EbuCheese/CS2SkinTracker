import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, X, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { ItemCard } from '@/components/item-display';
import { AddItemForm } from '@/components/forms'
import { useScrollLock } from '@/hooks/useScrollLock';

const InvestmentsPage = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newItemIds, setNewItemIds] = useState(new Set());

  // lock scroll on delete popup
  useScrollLock(showAddForm || !!itemToDelete);

  const mainTabs = ['All', 'Liquids', 'Crafts', 'Cases', 'Stickers', 'Agents', 'Keychains', 'Graffiti', 'Patches'];
  const soldTab = 'Sold';

  // HELPER FUNCTION: Group sold items (moved before usage)
  const groupSoldItems = useCallback((soldItems) => {
    const groups = {};
   
    soldItems.forEach(item => {
      const dateOnly = item.sale_date.split('T')[0];
      const itemSkinName = item.item_skin_name || '';
      const itemCondition = item.item_condition || '';
      const groupKey = `${item.item_name}-${itemSkinName}-${itemCondition}-${item.buy_price_per_unit}-${item.price_per_unit}-${dateOnly}`;
      
      if (groups[groupKey]) {
        groups[groupKey].quantity_sold += item.quantity_sold;
        groups[groupKey].total_sale_value += item.total_sale_value;
        groups[groupKey].sale_ids.push(item.id);
        
        const existingDate = new Date(groups[groupKey].sale_date);
        const currentDate = new Date(item.sale_date);
        if (currentDate < existingDate) {
          groups[groupKey].sale_date = item.sale_date;
        }
      } else {
        groups[groupKey] = {
          ...item,
          sale_ids: [item.id],
        };
      }
    });
   
    return Object.values(groups);
  }, []);

  // MEMOIZED: Filter active investments (quantity > 0)
  const activeInvestments = useMemo(() => {
    return investments.filter(item => item.quantity > 0);
  }, [investments]);

  // MEMOIZED: Group sold items (expensive operation)
  const groupedSoldItems = useMemo(() => {
    return groupSoldItems(soldItems);
  }, [soldItems, groupSoldItems]);

  // MEMOIZED: Get current items based on active tab and search
  const currentItems = useMemo(() => {
    let filteredItems;
    
    if (activeTab === 'Sold') {
      filteredItems = groupedSoldItems;
    } else {
      filteredItems = activeInvestments;
      
      if (activeTab !== 'All') {
        let typeFilter;
        if (activeTab === 'Graffiti') {
          typeFilter = 'graffiti';
        } else if (activeTab === 'Patches') {
          typeFilter = 'patch';
        } else {
          typeFilter = activeTab.toLowerCase().slice(0, -1);
        }
        filteredItems = filteredItems.filter(item => item.type === typeFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        if (activeTab === 'Sold') {
          const itemName = item.item_name || '';
          const skinName = item.item_skin_name || '';
          const condition = item.item_condition || '';
          const variant = item.item_variant || '';
          
          return itemName.toLowerCase().includes(query) ||
                skinName.toLowerCase().includes(query) ||
                condition.toLowerCase().includes(query) ||
                variant.toLowerCase().includes(query);
        } else {
          const itemName = item.item_name || item.name || '';
          const skinName = item.skin_name || '';
          const condition = item.condition || '';
          const variant = item.variant || '';
          
          return itemName.toLowerCase().includes(query) ||
                skinName.toLowerCase().includes(query) ||
                condition.toLowerCase().includes(query) ||
                variant.toLowerCase().includes(query);
        }
      });
    }
    
    return filteredItems;
  }, [activeTab, groupedSoldItems, activeInvestments, searchQuery]);

  // MEMOIZED: Portfolio summary calculation
  const portfolioSummary = useMemo(() => {
    if (activeTab === 'Sold') {
      const totalRealizedPL = investments.reduce((sum, inv) => 
        sum + parseFloat(inv.realized_profit_loss), 0);
      
      const totalSaleValue = investments.reduce((sum, inv) => 
        sum + parseFloat(inv.total_sale_value), 0);
      
      const totalBuyValue = investments.reduce((sum, inv) => {
        const soldQuantity = parseFloat(inv.total_sold_quantity);
        return sum + (parseFloat(inv.buy_price) * soldQuantity);
      }, 0);
      
      const profitPercentage = totalBuyValue > 0 ? ((totalRealizedPL / totalBuyValue) * 100) : 0;

      return {
        totalBuyValue,
        totalCurrentValue: totalSaleValue,
        totalProfit: totalRealizedPL,
        profitPercentage,
        itemCount: groupedSoldItems.length
      };
    } else {
      const totalBuyValue = currentItems.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
      const totalCurrentValue = currentItems.reduce((sum, item) => {
        return sum + (item.current_price * item.quantity);
      }, 0);
      const totalProfit = totalCurrentValue - totalBuyValue;
      const profitPercentage = totalBuyValue > 0 ? ((totalProfit / totalBuyValue) * 100) : 0;

      return {
        totalBuyValue,
        totalCurrentValue,
        totalProfit,
        profitPercentage,
        itemCount: currentItems.length
      };
    }
  }, [activeTab, investments, currentItems, groupedSoldItems]);

  // MEMOIZED: Search placeholder text
  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'All') {
      return 'Search all investments...';
    } else if (activeTab === 'Sold') {
      return 'Search sold items...';
    } else {
      return `Search ${activeTab.toLowerCase()}...`;
    }
  }, [activeTab]);

  // STABLE CALLBACKS: Prevent unnecessary re-renders
  const handleItemUpdate = useCallback((itemId, updates) => {
    setInvestments(prev => prev.map(inv => 
      inv.id === itemId ? { ...inv, ...updates } : inv
    ));
    fetchData();
  }, []);

  const handleItemRemove = useCallback((itemId) => {
    setInvestments(prev => prev.filter(inv => inv.id !== itemId));
    fetchData();
  }, []);

  const handleItemDelete = useCallback((itemToDelete) => {
    setItemToDelete(itemToDelete);
  }, []);

  const handleRefreshData = useCallback(() => {
    fetchData();
  }, []);

  const handleAddItem = useCallback((newItem) => {
    setInvestments(prev => [newItem, ...prev]);
    setNewItemIds(prev => new Set([...prev, newItem.id]));
    
    setTimeout(() => {
      setNewItemIds(prev => {
        const updated = new Set(prev);
        updated.delete(newItem.id);
        return updated;
      });
    }, 700);
  }, []);

  // STABLE CALLBACKS: Tab and form handlers
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleShowAddForm = useCallback(() => {
    setShowAddForm(true);
  }, []);

  const handleCloseAddForm = useCallback(() => {
    setShowAddForm(false);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setItemToDelete(null);
  }, []);

  // Fetch investments and sold items from Supabase
  useEffect(() => {
    if (!userSession) return;

    if (validateUserSession(userSession)) {
      fetchData();
    } else {
      setLoading(false);
      setError('Invalid user session. Please validate your beta key.');
    }
  }, [userSession]);

  const refreshData = () => {
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userSession?.id || typeof userSession.id !== 'string') {
        setError('Invalid user session. Please re-validate your beta key.');
        return;
      }

      console.log('Fetching data for user:', userSession.id);

      const [investmentsResult, soldItemsResult] = await Promise.all([
        supabase.rpc('fetch_user_investment_summary', {
          context_user_id: userSession.id
        }),
        supabase.rpc('fetch_user_investment_sales', {
          context_user_id: userSession.id
        })
      ]);

      if (investmentsResult.error) {
        console.error('Investments query failed:', investmentsResult.error);
        setError('Access denied. Please verify your beta key is valid and active.');
        return;
      }

      if (soldItemsResult.error) {
        console.error('Sold items query failed:', soldItemsResult.error);
        console.warn('Could not fetch sold items, continuing with investments only');
      }

      const investmentsArray = Array.isArray(investmentsResult.data) 
        ? investmentsResult.data 
        : JSON.parse(investmentsResult.data || '[]');
      
      let soldItemsArray = soldItemsResult.data || [];

      console.log(`Successfully loaded ${investmentsArray.length} investments and ${soldItemsArray.length} sold items`);
      
      setInvestments(investmentsArray);
      setSoldItems(soldItemsArray);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteItem = async () => {  
    if (!itemToDelete) return;
    
    try {
      const { data, error } = await supabase.rpc('delete_investment_with_context', {
        investment_id: itemToDelete.id,
        context_user_id: userSession.id
      });

      if (error) {
        console.error('Delete failed:', error);
        throw error;
      }
      
      console.log('Investment deleted successfully');
      
      setInvestments(prev => prev.filter(inv => inv.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting investment:', err);
      
      if (err.message.includes('Invalid user context')) {
        alert('Authentication error: Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('not found or access denied')) {
        alert('Access denied: You can only delete your own investments.');
      } else {
        alert('Failed to delete investment: ' + err.message);
      }
    }
  };

  const validateUserSession = (session) => {
    if (!session) return false;
    if (!session.id) return false;
    if (typeof session.id !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session.id)) return false;
    
    return true;
  };

  const retry = () => {
    if (userSession?.id) {
      fetchData();
    } else {
      setError('No user session found. Please validate your beta key first.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Loading Investments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={retry}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            My Investments
          </h1>
          <p className="text-gray-400">Track your Counter-Strike skin investments and performance</p>
        </div>

        {/* Portfolio Summary */}
        {(investments.length > 0 || soldItems.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Total Sold' : 'Current Invested'}
              </div>
              <div className="text-white text-xl font-semibold">
                ${activeTab === 'Sold' ? portfolioSummary.totalCurrentValue.toFixed(2) : portfolioSummary.totalBuyValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Total Invested' : 'Current Value'}
              </div>
              <div className="text-white text-xl font-semibold">
                ${activeTab === 'Sold' ? portfolioSummary.totalBuyValue.toFixed(2) : portfolioSummary.totalCurrentValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Realized P&L' : 'Unrealized P&L'}
              </div>
              <div className={`text-xl font-semibold flex items-center space-x-1 ${
                portfolioSummary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {portfolioSummary.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span>${Math.abs(portfolioSummary.totalProfit).toFixed(2)} ({portfolioSummary.profitPercentage.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Sales' : 'Items'}
              </div>
              <div className="text-white text-xl font-semibold">{portfolioSummary.itemCount}</div>
            </div>
          </div>
        )}

        {/* Search Bar - Centered */}
        <div className="mb-6 flex justify-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs - Centered */}
        <div className="mb-6">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {mainTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Sold Tab - Visually Separated and Centered */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 border-t border-gray-700"></div>
            <button
              onClick={() => handleTabChange(soldTab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === soldTab
                  ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-600'
              }`}
            >
              {soldTab}
            </button>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>
        </div>

        {/* Add Item Button - Don't show for All or Sold tabs, Centered */}
        {activeTab !== 'All' && activeTab !== 'Sold' && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={handleShowAddForm}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add {
                activeTab === 'Graffiti' ? 'Graffiti' : 
                activeTab === 'Patches' ? 'Patch' : 
                activeTab.slice(0, -1)
              }</span>
            </button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => (
            <ItemCard 
              key={activeTab === 'Sold' ? `sold-${item.id}` : item.id}
              item={item} 
              userSession={userSession}
              isSoldItem={activeTab === 'Sold'}
              onUpdate={handleItemUpdate}
              onRemove={handleItemRemove}
              onDelete={handleItemDelete}
              isNew={newItemIds.has(item.id)}
              onRefresh={handleRefreshData}
            />
          ))}
        </div>

        {currentItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchQuery ? 'No matching items' : 
               activeTab === 'Sold' ? 'No sold items yet' : 'No investments yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' :
                activeTab === 'All' 
                  ? 'Start by adding some items to track your investments'
                  : activeTab === 'Sold'
                  ? 'Items you sell will appear here'
                  : `Add your first ${
                      activeTab === 'Graffiti' ? 'graffiti' : 
                      activeTab === 'Patches' ? 'patch' : 
                      activeTab.toLowerCase().slice(0, -1)
                    } to get started`
              }
            </p>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddForm && (
          <AddItemForm
            type={activeTab}
            onClose={handleCloseAddForm}
            onAdd={handleAddItem}
            userSession={userSession}
          />
        )}
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-red-500/20 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Investment</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete "{itemToDelete.item_name || itemToDelete.name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;