import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, X, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { ItemCard } from '@/components/item-display';
import { AddItemForm } from '@/components/forms'
import { useScrollLock } from '@/hooks/util';
import { usePortfolioData, usePortfolioFiltering, usePortfolioSummary, usePortfolioTabs  } from '@/hooks/portfolio';
import { useToast } from '@/contexts/ToastContext';

const InvestmentsPage = ({ userSession }) => {
  // toast context
  const toast = useToast()

  // UI States
  const [activeTab, setActiveTab] = useState('All');          // Current category filter
  const [searchQuery, setSearchQuery] = useState('');        // User's search input
  const [showAddForm, setShowAddForm] = useState(false);     // Add item modal visibility
  const [itemToDelete, setItemToDelete] = useState(null);    // Item selected for deletion
  const [newItemIds, setNewItemIds] = useState(new Set());   // Recently added items (for animations)

  // Investment data from hook
  const { investments, soldItems, portfolioSummary, loading, error, refetch, setInvestments, setSoldItems } = usePortfolioData(userSession);

  // Data filtering and search logic
  const { activeInvestments, groupedSoldItems, currentItems } = usePortfolioFiltering(
    investments, soldItems, activeTab, searchQuery
  );
  
  // Financial summary calculations for current view
  const summary = usePortfolioSummary(
    activeTab, investments, soldItems, currentItems, groupedSoldItems, portfolioSummary
  );
  
  // Tab configuration and UI helpers
  const { mainTabs, soldTab, searchPlaceholder, getAddButtonText } = usePortfolioTabs(activeTab);

  // lock scroll on add form or delete message  
  useScrollLock(showAddForm || !!itemToDelete);
  
  // ADD THIS HELPER FUNCTION
  const buildDetailedItemName = (item) => {
    let displayName = '';
    
    // Add variant prefix
    if (item.variant === 'souvenir') {
      displayName += 'Souvenir ';
    } else if (item.variant === 'stattrak') {
      displayName += 'StatTrak™ ';
    }
    
    // Add base name and skin name
    if (item.skin_name) {
      displayName += `${item.name || 'Custom'} ${item.skin_name}`;
    } else {
      displayName += item.name;
    }
    
    // Add condition in parentheses if present
    if (item.condition) {
      displayName += ` (${item.condition})`;
    }
    
    return displayName;
  };

  // STABLE CALLBACKS: Prevent unnecessary re-renders
  const handleItemUpdate = useCallback((itemId, updates, shouldRefresh = false, soldItemData = null) => {
    // update local state for immediate UI feedback
    setInvestments(prev => prev.map(inv => 
      inv.id === itemId ? { ...inv, ...updates } : inv
    ));

    if (soldItemData) {
      setSoldItems(prev => [soldItemData, ...prev]);
    }

    // Conditionally refresh when server calculations are needed
    if (shouldRefresh) {
      refetch();
    }
  }, [setInvestments, refetch]);

  // handle the removal of item form ui, selling or deleting
  const handleItemRemove = useCallback((itemId, shouldRefresh = false, soldItemData = null) => {
    setInvestments(prev => prev.filter(inv => inv.id !== itemId));

    if (soldItemData) {
      setSoldItems(prev => [soldItemData, ...prev]);
    }

    // Conditionally refresh when item might have moved to sold items
    if (shouldRefresh) {
      refetch();
    }
  }, [setInvestments]);

  // set the item to delete
  const handleItemDelete = useCallback((itemToDelete) => {
    setItemToDelete(itemToDelete);
  }, []);

  // trigger manual refresh of db investment data
  const handleRefreshData = useCallback(() => {
    refetch();
  }, [refetch]);

// handle addition of new investment items
const handleAddItem = useCallback((newItem) => {
  // Calculate initial metrics manually
  const itemWithMetrics = {
    ...newItem,
    unrealized_profit_loss: (newItem.current_price - newItem.buy_price) * newItem.quantity,
    realized_profit_loss: 0,
    original_quantity: newItem.quantity,
    total_sold_quantity: 0,
    total_sale_value: 0
  };
  
  setInvestments(prev => [itemWithMetrics, ...prev]);
  setNewItemIds(prev => new Set([...prev, newItem.id]));
    
  setTimeout(() => {
    setNewItemIds(prev => {
      const updated = new Set(prev);
      updated.delete(newItem.id);
      return updated;
    });
  }, 700);
}, [setInvestments]);

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

  const handleDeleteItem = async () => {
    // Safety check - should not be called without an item selected  
    if (!itemToDelete) return;
    
    try {
      // Call database RPC function with user context for security
      const { data, error } = await supabase.rpc('delete_investment_with_context', {
        investment_id: itemToDelete.id,
        context_user_id: userSession.id
      });

      if (error) {
        console.error('Delete failed:', error);
        throw error;
      }
      
      // Remove item from local state for immediate UI update
      setInvestments(prev => prev.filter(inv => inv.id !== itemToDelete.id));

      // show delete toast
      const detailedName = buildDetailedItemName(itemToDelete);
      toast.itemDeleted(detailedName);

      // Close the confirmation modal
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting investment:', err);
      
      // Provide user-friendly toast error messages based on error type
      if (err.message.includes('Invalid user context')) {
        toast.error('Authentication error: Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('not found or access denied')) {
        toast.error('Access denied: You can only delete your own investments.');
      } else {
        toast.error('Failed to delete investment: ' + err.message);
      }
    }
  };

  const retry = () => {
    if (userSession?.id) {
      refetch();
    } else {
      setError('No user session found. Please validate your beta key first.');
    }
  };

  // Loading state - show spinner while data is being fetched
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

  // Error state - show error message with retry option
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

  // Main application render
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

        {/* Portfolio Summary Cards - only show if user has data */}
        {(investments.length > 0 || soldItems.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Total Invested/Sold Value Card */}
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Total Sold' : 'Current Invested'}
              </div>
              <div className="text-white text-xl font-semibold">
                ${activeTab === 'Sold' ? summary.totalCurrentValue.toFixed(2) : summary.totalBuyValue.toFixed(2)}
              </div>
            </div>

            {/* Current Value/Total Invested Card */}
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Total Invested' : 'Current Value'}
              </div>
              <div className="text-white text-xl font-semibold">
                ${activeTab === 'Sold' ? summary.totalBuyValue.toFixed(2) : summary.totalCurrentValue.toFixed(2)}
              </div>
            </div>

            {/* Profit/Loss Card with color coding and trend icons */}
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Realized P&L' : 'Unrealized P&L'}
              </div>
              <div className={`text-xl font-semibold flex items-center space-x-1 ${
                summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {summary.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span>${Math.abs(summary.totalProfit).toFixed(2)} ({summary.profitPercentage.toFixed(2)}%)</span>
              </div>
            </div>

            {/* Item Count Card */}
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">
                {activeTab === 'Sold' ? 'Sales' : 'Items'}
              </div>
              <div className="text-white text-xl font-semibold">{summary.itemCount}</div>
            </div>
          </div>
        )}

        {/* Search Bar*/}
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

        {/* Tabs Navigation */}
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
          
          {/* Sold Tab */}
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

        {/* Add Item Button */}
        {activeTab !== 'All' && activeTab !== 'Sold' && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={handleShowAddForm}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>{getAddButtonText(activeTab)}</span>
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

        {/* Empty State - Shows when no items match current filters */}
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

      {/* Delete Confirmation Modal */}
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