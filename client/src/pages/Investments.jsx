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

  // Track sale data optimistically
  const [optimisticSoldItems, setOptimisticSoldItems] = useState([]);
  const [deletedSoldItems, setDeletedSoldItems] = useState([]);

  // Investment data from hook
  const { investments, soldItems, portfolioSummary, loading, error, refetch, setInvestments, setSoldItems } = usePortfolioData(userSession);

  // Data filtering and search logic
  const { activeInvestments, groupedSoldItems, currentItems } = usePortfolioFiltering(
    investments, soldItems, activeTab, searchQuery
  );
  
  // Financial summary calculations for current view
  const summary = usePortfolioSummary(
    activeTab, investments, soldItems, currentItems, groupedSoldItems, portfolioSummary, optimisticSoldItems, searchQuery
  );
  
  // Tab configuration and UI helpers
  const { mainTabs, soldTab, searchPlaceholder, getAddButtonText } = usePortfolioTabs(activeTab);

  // lock scroll on add form or delete message  
  useScrollLock(showAddForm || !!itemToDelete);
  
  // Clean up optimistic sold items when data is refreshed
  useEffect(() => {
    if (!loading && portfolioSummary) {
      setOptimisticSoldItems([]);
    }
  }, [loading, portfolioSummary]);

  // Clean up deleted sold items when data is refreshed
  useEffect(() => {
    if (!loading && portfolioSummary) {
      setOptimisticSoldItems([]);
      setDeletedSoldItems([]); // Add this line
    }
  }, [loading, portfolioSummary]);

  // ADD THIS HELPER FUNCTION
  const buildDetailedItemName = (item) => {
  let displayName = '';
  
  // Handle different field names for sold items vs active investments
  const variant = item.item_variant || item.variant;
  const name = item.item_name || item.name;
  const skinName = item.item_skin_name || item.skin_name;
  const condition = item.item_condition || item.condition;
  
  // Add variant prefix
  if (variant === 'souvenir') {
    displayName += 'Souvenir ';
  } else if (variant === 'stattrak') {
    displayName += 'StatTrak™ ';
  }
  
  // Add base name and skin name
  if (skinName) {
    displayName += `${name || 'Custom'} ${skinName}`;
  } else {
    displayName += name;
  }
  
  // Add condition in parentheses if present
  if (condition) {
    displayName += ` (${condition})`;
  }
  
  return displayName;
};

  // STABLE CALLBACKS: Prevent unnecessary re-renders
  const handleItemUpdate = useCallback((itemId, updates, shouldRefresh = false, soldItemData = null, isRelatedUpdate = false) => {
  if (activeTab === 'Sold' && !isRelatedUpdate) {
    // Handle sold item updates
    setSoldItems(prev => prev.map(sold => 
      sold.id === itemId ? { ...sold, ...updates } : sold
    ));
  } else {
    // Check if this is a new investment being added 
    const existingInvestment = investments.find(inv => inv.id === itemId);
    
    if (!existingInvestment) {
      // This is a new investment - add it to the list
      setInvestments(prev => [updates, ...prev]);
      
      // Add to newItemIds for animation
      setNewItemIds(prev => new Set([...prev, itemId]));
      
      setTimeout(() => {
        setNewItemIds(prev => {
          const updated = new Set(prev);
          updated.delete(itemId);
          return updated;
        });
      }, 700);
    } else {
      // Update existing investment
      setInvestments(prev => prev.map(inv => 
        inv.id === itemId ? { ...inv, ...updates } : inv
      ));
    }
  }

  if (soldItemData) {
    setSoldItems(prev => [soldItemData, ...prev]);
  }

  // Only refresh if explicitly requested
  if (shouldRefresh) {
    refetch();
  }
}, [activeTab, setInvestments, setSoldItems, refetch, investments]);

  // handle the removal of item from ui, selling or deleting
  const handleItemRemove = useCallback((itemId, shouldRefresh = false, soldItemData = null, isActualDelete = false) => {
    // Check if this is a sold item being removed (from sold tab)
    if (activeTab === 'Sold') {
      // Remove from sold items
      setSoldItems(prev => prev.filter(sold => sold.id !== itemId));
      return;
    }
    
    // Get the item being removed/sold
    const removedItem = investments.find(inv => inv.id === itemId);
    if (!removedItem) return;
    
    // Handle actual deletions vs. sales differently
    if (isActualDelete) {
      // For actual deletions, remove completely from state
      setInvestments(prev => prev.filter(inv => inv.id !== itemId));
    } else if (soldItemData) {
      // For sales, update the investment to reflect the sale but keep it in state
      const quantitySold = soldItemData.quantity || removedItem.quantity;
      const totalSaleValue = soldItemData.total_sale_value || (soldItemData.price_per_unit * quantitySold);
      const profitLoss = soldItemData.profit_loss || ((soldItemData.price_per_unit - removedItem.buy_price) * quantitySold);
      
      const updatedItem = {
        ...removedItem,
        quantity: Math.max(0, removedItem.quantity - quantitySold), // Should be 0 for full sales
        total_sold_quantity: (removedItem.total_sold_quantity || 0) + quantitySold,
        total_sale_value: (removedItem.total_sale_value || 0) + totalSaleValue,
        realized_profit_loss: (removedItem.realized_profit_loss || 0) + profitLoss,
        // Recalculate unrealized P/L for remaining quantity
        unrealized_profit_loss: (removedItem.current_price - removedItem.buy_price) * Math.max(0, removedItem.quantity - quantitySold)
      };
      
      // Update the investment in state instead of removing it
      setInvestments(prev => prev.map(inv => 
        inv.id === itemId ? updatedItem : inv
      ));
      
      // Track optimistic sold item for sold tab calculations (if needed)
      if (updatedItem.quantity === 0) {
        const optimisticSoldItem = {
          id: itemId,
          quantity: quantitySold,
          salePrice: soldItemData.price_per_unit,
          buyPrice: removedItem.buy_price,
          name: removedItem.name,
          skinName: removedItem.skin_name,
          condition: removedItem.condition,
          variant: removedItem.variant,
          saleDate: new Date().toISOString()
        };
        
        setOptimisticSoldItems(prev => [...prev, optimisticSoldItem]);
      }
    } else {
      // Fallback: remove from investments (for cases where soldItemData is not provided)
      setInvestments(prev => prev.filter(inv => inv.id !== itemId));
    }

    // Add sold item to sold items list
    if (soldItemData) {
      setSoldItems(prev => [soldItemData, ...prev]);
    }

    if (shouldRefresh) {
      refetch();
    }
  }, [activeTab, setSoldItems, setInvestments, investments, refetch]);

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
  if (!itemToDelete) return;
  
  try {
    if (activeTab === 'Sold') {
      // SOLD ITEM DELETION - Enhanced with proper group handling
      
      // Store references before deletion for rollback if needed
      const deletedSoldItem = itemToDelete;
      const relatedInvestmentId = deletedSoldItem.investment_id;
      let originalRelatedInvestment = null;
      
      // Determine which sale IDs to delete (handle both individual and grouped items)
      const saleIdsToDelete = deletedSoldItem.sale_ids || [deletedSoldItem.id];
      
      // Find related investment if it exists
      if (relatedInvestmentId) {
        originalRelatedInvestment = investments.find(inv => inv.id === relatedInvestmentId);
      }
      
      setSoldItems(prev => prev.filter(sold => !saleIdsToDelete.includes(sold.id)));
      setDeletedSoldItems(prev => [...prev, ...soldItems.filter(sold => saleIdsToDelete.includes(sold.id))]);
      
      // If there's a related investment, optimistically update it
      if (originalRelatedInvestment) {
        const quantityDeleted = deletedSoldItem.quantity_sold || 0;
        const saleValueToRemove = deletedSoldItem.total_sale_value || (deletedSoldItem.quantity_sold * deletedSoldItem.price_per_unit);
        
        // Calculate the profit/loss that was realized from this specific sale (or group of sales)
        const realizedPLFromThisSale = (deletedSoldItem.price_per_unit - deletedSoldItem.buy_price_per_unit) * deletedSoldItem.quantity_sold;
        
        // Calculate new values - DO NOT restore quantity to active investment
        const newTotalSoldQuantity = Math.max(0, (originalRelatedInvestment.total_sold_quantity || 0) - quantityDeleted);
        const newTotalSaleValue = Math.max(0, (originalRelatedInvestment.total_sale_value || 0) - saleValueToRemove);
        const newRealizedPL = (originalRelatedInvestment.realized_profit_loss || 0) - realizedPLFromThisSale;
        
        console.log('Delete calculation:', {
          deletedQuantity: quantityDeleted,
          saleIdsToDelete,
          oldTotalSold: originalRelatedInvestment.total_sold_quantity,
          newTotalSold: newTotalSoldQuantity,
          saleValueRemoved: saleValueToRemove,
          realizedPLRemoved: realizedPLFromThisSale
        });

        const optimisticInvestmentUpdate = {
          ...originalRelatedInvestment,
          total_sold_quantity: newTotalSoldQuantity,
          total_sale_value: newTotalSaleValue,
          realized_profit_loss: newRealizedPL
        };
        
        setInvestments(prev => prev.map(inv => 
          inv.id === relatedInvestmentId ? optimisticInvestmentUpdate : inv
        ));
      }
      
      // Close modal immediately for better UX
      setItemToDelete(null);
      
      try {
        // Delete all sales in the group (if it's a grouped item)
        const deletePromises = saleIdsToDelete.map(saleId => 
          supabase.rpc('delete_investment_sale_with_context', {
            p_sale_id: saleId,
            p_user_id: userSession.id
          })
        );
        
        const results = await Promise.all(deletePromises);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
          throw errors[0].error;
        }
        
        // Success toast - treat all deletions the same way for user simplicity
        const detailedName = buildDetailedItemName(deletedSoldItem);
        const deletedQuantity = deletedSoldItem.quantity_sold || 1;
        toast.saleRecordDeleted(detailedName, deletedQuantity);
        
      } catch (deleteError) {
        console.error('Delete failed, rolling back optimistic updates:', deleteError);
        
        // ROLLBACK - Restore deleted items and related investment
        const deletedItems = soldItems.filter(sold => saleIdsToDelete.includes(sold.id));
        setSoldItems(prev => [...deletedItems, ...prev]);
        setDeletedSoldItems(prev => prev.filter(item => !saleIdsToDelete.includes(item.id)));
        
        if (originalRelatedInvestment) {
          setInvestments(prev => prev.map(inv => 
            inv.id === relatedInvestmentId ? originalRelatedInvestment : inv
          ));
        }
        
        // Error handling
        if (deleteError.message.includes('Invalid user context')) {
          toast.error('Authentication error: Please refresh the page and re-enter your beta key.');
        } else if (deleteError.message.includes('not found or access denied')) {
          toast.error('Access denied: You can only delete your own items.');
        } else {
          toast.error('Failed to delete sale record: ' + deleteError.message);
        }
      }
      
    } else {
      // ACTIVE INVESTMENT DELETION (existing logic unchanged)
      const investmentIds = itemToDelete.investment_ids || [itemToDelete.id];
      
      const deletePromises = investmentIds.map(investmentId => 
        supabase.rpc('delete_investment_with_context', {
          investment_id: investmentId,
          context_user_id: userSession.id
        })
      );
      
      const results = await Promise.all(deletePromises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        console.error('Delete failed:', errors[0].error);
        throw errors[0].error;
      }
      
      // Remove from investments
      setInvestments(prev => prev.filter(inv => !investmentIds.includes(inv.id)));
      
      // Remove from optimistic sold items if present
      setOptimisticSoldItems(prev => prev.filter(item => !investmentIds.includes(item.id)));

      const detailedName = buildDetailedItemName(itemToDelete);
      const deletedQuantity = itemToDelete.quantity || 1;
      toast.itemDeleted(detailedName, deletedQuantity);
      
      setItemToDelete(null);
    }
    
  } catch (err) {
    console.error('Error deleting item:', err);
    
    // Only handle errors for active investments here (sold item errors handled above)
    if (activeTab !== 'Sold') {
      if (err.message.includes('Invalid user context')) {
        toast.error('Authentication error: Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('not found or access denied')) {
        toast.error('Access denied: You can only delete your own items.');
      } else {
        toast.error('Failed to delete item: ' + err.message);
      }
      setItemToDelete(null);
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
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" style={{ marginTop: '2px' }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 hover:text-white transition-colors"
                style={{ marginTop: '2px' }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
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
          {currentItems.map((item) => {
            const relatedInvestment = activeTab === 'Sold' && item.investment_id 
              ? investments.find(inv => inv.id === item.investment_id) 
              : null;
              
            return (
              <ItemCard
                key={item.id}
                item={item}
                userSession={userSession}
                onUpdate={handleItemUpdate}
                onDelete={handleItemDelete}
                onRemove={handleItemRemove}
                onRefresh={handleRefreshData}
                isNew={newItemIds.has(item.id)}
                isSoldItem={activeTab === 'Sold'}
                relatedInvestment={relatedInvestment} // Pass specific investment
              />
            );
          })}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-red-500/20 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-3">
                {activeTab === 'Sold' ? 'Delete Sale Record' : 'Delete Investment'}
              </h3>
              
              {/* Item name with truncation and tooltip */}
              <div className="mb-2">
                <div className="text-sm text-gray-500 mb-1">Item:</div>
                <div 
                  className="text-orange-400 font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 break-words text-sm leading-relaxed max-h-20 overflow-y-auto"
                  title={buildDetailedItemName(itemToDelete)}
                >
                  {buildDetailedItemName(itemToDelete)}
                </div>
              </div>
              
              {/* Quantity display */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Quantity:</div>
                <div className="text-white font-semibold">
                  {activeTab === 'Sold' 
                    ? `${itemToDelete.quantity_sold || 1}x sold` 
                    : `${itemToDelete.quantity || 1}x owned`
                  }
                </div>
              </div>
              
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                This action cannot be undone. Are you sure you want to proceed?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow-lg shadow-red-600/25"
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