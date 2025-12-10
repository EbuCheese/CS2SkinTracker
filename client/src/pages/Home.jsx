import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Plus, DollarSign, Activity, Loader2 } from 'lucide-react';
import { PortfolioPerformanceChart, PortfolioHealthPieChart } from '@/components/charts';
import { RecentPriceChanges, RecentActivity, QuickCheckPriceModal } from '@/components/item-display';
import { QuickAddItemForm, QuickSellModal, QuickWatchlistAdd } from '@/components/forms';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { supabase } from '@/supabaseClient';
import { formatPrice, useItemFormatting } from '@/hooks/util';
import { convertAndFormat } from '@/hooks/util/currency';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useCalculatePortfolioHealth, useChartData, usePortfolioData, useQuickActions, useRecentActivity, usePortfolioSummary, useSingleItemPrice, useWatchlist } from '@/hooks/portfolio';
import { useToast } from '@/contexts/ToastContext';

// Main InvestmentDashboard component
const InvestmentDashboard = ({ userSession }) => {
  // Add toast hook
  const toast = useToast();

  // User settings hook
  const { currency } = useUserSettings();

  // Display name hook
  const { displayName } = useItemFormatting();

  // Get Portfolio Data hook
  const { investments, soldItems, portfolioSummary, loading, error, errorDetails, refetch, retry, setInvestments, setSoldItems } = usePortfolioData(userSession);
  
  // Get watchlist data
  const { watchlist, addToWatchlist } = useWatchlist(userSession);

  // single price data hook
  const { refreshSingleItemPrice } = useSingleItemPrice();

  // track optimistics updates
  const [optimisticUpdates, setOptimisticUpdates] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    currentHoldingsValue: 0,
    totalRealizedPL: 0,
    totalUnrealizedPL: 0
  });

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');
  const { chartData, chartLoading } = useChartData(userSession, selectedTimePeriod, investments.length > 0);
  
  const recentActivity = useRecentActivity(investments, soldItems);
  
  const [showQuickPrice, setShowQuickPrice] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [showQuickWatchlistAdd, setShowQuickWatchlistAdd] = useState(false);

  // track the new added item states
  const [itemStates, setItemStates] = useState(new Map());

  // track price changes view mode
  const [priceChangesView, setPriceChangesView] = useState('portfolio');

  // Calculate portfolio health metrics using custom hook
  const portfolioHealth = useCalculatePortfolioHealth(investments);

  // navigation for quick add
  const navigate = useNavigate();

  const handleViewFullPriceDetails = (item) => {
    // Navigate to Prices page with the selected item pre-loaded
    navigate('/prices', { 
      state: { preSelectedItem: item } 
    });
  };

  // current quick actions
  const quickActions = useQuickActions(setShowQuickPrice, setShowQuickAdd, setShowQuickSell, setShowQuickWatchlistAdd);
  
  // Reset optimistic updates when data is refetched
  useEffect(() => {
    if (!loading && portfolioSummary) {
      setOptimisticUpdates({
        totalInvested: 0,
        totalCurrentValue: 0,
        currentHoldingsValue: 0,
        totalRealizedPL: 0,
        totalUnrealizedPL: 0
      });
    }
  }, [loading, portfolioSummary]);

  // Calculate separate realized vs unrealized P&L for display
  const separatedPL = useMemo(() => {
  if (!portfolioSummary) {
    // Fallback to manual calculation if portfolio summary not available
    const totalRealizedPL = investments.reduce((sum, inv) =>
      sum + (parseFloat(inv.realized_profit_loss) || 0), 0);
    
    const totalUnrealizedPL = investments.reduce((sum, inv) =>
      sum + (parseFloat(inv.unrealized_profit_loss) || 0), 0);
    
    return {
      totalRealizedPL: totalRealizedPL + (optimisticUpdates.totalRealizedPL || 0),
      totalUnrealizedPL: totalUnrealizedPL + (optimisticUpdates.totalUnrealizedPL || 0),
      totalProfitLoss: totalRealizedPL + totalUnrealizedPL + (optimisticUpdates.totalRealizedPL || 0) + (optimisticUpdates.totalUnrealizedPL || 0)
    };
  }

  // Use pre-calculated values from database + optimistic updates with null-safe operations
  const totalRealizedPL = (parseFloat(portfolioSummary.total_realized_pl) || 0) + (optimisticUpdates.totalRealizedPL || 0);
  const totalUnrealizedPL = (parseFloat(portfolioSummary.total_unrealized_pl) || 0) + (optimisticUpdates.totalUnrealizedPL || 0);
  
  return {
    totalRealizedPL,
    totalUnrealizedPL,
    totalProfitLoss: totalRealizedPL + totalUnrealizedPL
  };
}, [portfolioSummary, investments, optimisticUpdates]);

// Get base portfolio metrics (call hook at top level)
const basePortfolioMetrics = usePortfolioSummary(
  'All',
  investments, 
  soldItems, 
  investments,
  [],
  portfolioSummary
);

// Use the same portfolio summary logic as the Investments page
const portfolioMetrics = useMemo(() => {
  // Apply optimistic updates with null-safe operations
  const safeBaseCurrentValue = basePortfolioMetrics.totalCurrentValue || 0;
  const safeBaseInvested = basePortfolioMetrics.totalInvested || 0;
  const safeOptimisticCurrentValue = optimisticUpdates.totalCurrentValue || 0;
  const safeOptimisticInvested = optimisticUpdates.totalInvested || 0;
  
  const updatedTotalCurrentValue = safeBaseCurrentValue + safeOptimisticCurrentValue;
  const updatedCurrentHoldingsValue = (basePortfolioMetrics.currentHoldingsValue || 0) + (optimisticUpdates.currentHoldingsValue || 0);
  const updatedTotalInvested = safeBaseInvested + safeOptimisticInvested;
  const updatedTotalProfitLoss = separatedPL.totalProfitLoss || 0;
  
  // Check if we have optimistic updates that would affect the percentage
  const hasOptimisticUpdates = optimisticUpdates.totalInvested !== 0 || 
                               optimisticUpdates.totalCurrentValue !== 0 || 
                               optimisticUpdates.totalRealizedPL !== 0 || 
                               optimisticUpdates.totalUnrealizedPL !== 0;

  const updatedProfitPercentage = hasOptimisticUpdates ? 
    (() => {
      // Use total_investment from portfolioSummary for percentage calculation
      const totalInvestmentForPercentage = portfolioSummary ? 
        (parseFloat(portfolioSummary.total_investment || 0) + safeOptimisticInvested) :
        updatedTotalInvested;
      
      return totalInvestmentForPercentage > 0 
        ? (updatedTotalProfitLoss / totalInvestmentForPercentage) * 100 
        : 0;
    })() : 
    (basePortfolioMetrics.profitPercentage || 0);

  return {
    ...basePortfolioMetrics,
    totalCurrentValue: updatedTotalCurrentValue,
    currentHoldingsValue: updatedCurrentHoldingsValue,
    totalInvested: updatedTotalInvested,
    totalProfit: updatedTotalProfitLoss,
    profitPercentage: isNaN(updatedProfitPercentage) ? 0 : updatedProfitPercentage
  };
}, [basePortfolioMetrics, optimisticUpdates, separatedPL, portfolioSummary]);


  // Helper for updating the item state
  const updateItemState = useCallback((itemId, updates) => {
  setItemStates(prev => {
    const newMap = new Map(prev);
    const current = newMap.get(itemId) || { isNew: false, isPriceLoading: false };
    newMap.set(itemId, { ...current, ...updates });
    return newMap;
  });
}, []);

  // Handles adding a new item
  const handleAddItem = useCallback((newItem) => {
  const safeBuyPrice = parseFloat(newItem.buy_price) || 0;
  const safeQuantity = parseInt(newItem.quantity) || 0;

  // Handle current_price like db
  const rawCurrentPrice = parseFloat(newItem.current_price);
  const safeCurrentPrice = (rawCurrentPrice && rawCurrentPrice > 0) ? rawCurrentPrice : null;

  const unrealizedPL = (safeCurrentPrice && safeCurrentPrice > 0 && safeQuantity > 0) 
    ? (safeCurrentPrice - safeBuyPrice) * safeQuantity 
    : 0;

  // Calculate initial metrics manually
  const itemWithMetrics = {
    ...newItem,
    current_price: safeCurrentPrice,
    buy_price: safeBuyPrice,
    quantity: safeQuantity,
    unrealized_profit_loss: unrealizedPL,
    realized_profit_loss: 0,
    original_quantity: safeQuantity,
    total_sold_quantity: 0,
    total_sale_value: 0
  };
  
  // Add to investments list optimistically
  setInvestments(prev => [itemWithMetrics, ...prev]);
  
  // Set initial states for new item
  updateItemState(newItem.id, { isNew: true, isPriceLoading: true });

  // Update optimistic portfolio summary
  const totalInvestedIncrease = safeBuyPrice * safeQuantity;
  const totalCurrentValueIncrease = safeCurrentPrice ? safeCurrentPrice * safeQuantity : safeBuyPrice * safeQuantity;
  
  setOptimisticUpdates(prev => ({
    totalInvested: (prev.totalInvested || 0) + totalInvestedIncrease,
    totalCurrentValue: (prev.totalCurrentValue || 0) + totalCurrentValueIncrease,
    currentHoldingsValue: (prev.currentHoldingsValue || 0) + totalCurrentValueIncrease, 
    totalRealizedPL: prev.totalRealizedPL || 0,
    totalUnrealizedPL: (prev.totalUnrealizedPL || 0) + unrealizedPL
  }));
  
  // Refresh price data after a short delay
  setTimeout(() => {
  refreshSingleItemPrice(
    newItem.id,
    userSession,
    // SUCCESS CALLBACK - Add optimistic update recalculation
    (itemId, updatedItemData) => {
      setInvestments(prev => prev.map(inv =>
        inv.id === itemId ? updatedItemData : inv
      ));
      updateItemState(itemId, { isPriceLoading: false });
      
      // RECALCULATE optimistic updates with new price
      const oldPrice = safeBuyPrice; // What we used initially
      const newPrice = updatedItemData.current_price || oldPrice;
      const priceDifference = (newPrice - oldPrice) * safeQuantity;
      
      setOptimisticUpdates(prev => ({
        ...prev,
        currentHoldingsValue: (prev.currentHoldingsValue || 0) + priceDifference,
        totalCurrentValue: (prev.totalCurrentValue || 0) + priceDifference,
        totalUnrealizedPL: (prev.totalUnrealizedPL || 0) + priceDifference
      }));
    },
      // Error callback - stop loading indicator
      (itemId, error) => {
        console.error('Failed to refresh price for new item:', error);
        updateItemState(itemId, { isPriceLoading: false });
        toast.warning('Price data will be available on next refresh');
      }
    );
  }, 1000);

  // Remove new flag after animation
  setTimeout(() => {
    updateItemState(newItem.id, { isNew: false });
  }, 700);

  // Remove price loading when data is available OR after timeout
  setTimeout(() => {
    updateItemState(newItem.id, { isPriceLoading: false });
  }, 5000);
}, [setInvestments, updateItemState, refreshSingleItemPrice, userSession, toast]);

  // Handles completion of a sale transaction
  const handleSaleComplete = useCallback((investmentId, quantitySold, salePrice, remainingQuantity) => {
      const soldItem = investments.find(inv => inv.id === investmentId);
      if (!soldItem) return;

      // Calculate profit/loss for this sale
      const saleValue = salePrice * quantitySold;
      const saleProfitLoss = (salePrice - soldItem.buy_price) * quantitySold;
      const isFullSale = remainingQuantity === 0;
      
      // Calculate optimistic updates - CORRECTED
      const totalCurrentValueDecrease = soldItem.current_price ? soldItem.current_price * quantitySold : soldItem.buy_price * quantitySold;
      const realizedPLIncrease = saleProfitLoss;
      const unrealizedPLDecrease = soldItem.current_price ? (soldItem.current_price - soldItem.buy_price) * quantitySold : 0;

      // Create sold item data
      const soldItemData = {
        id: `temp_${Date.now()}`,
        investment_id: investmentId,
        user_id: userSession.id,
        quantity_sold: quantitySold,
        price_per_unit: salePrice,
        total_sale_value: saleValue,
        sale_date: new Date().toISOString(),
        item_name: soldItem.name,
        item_skin_name: soldItem.skin_name,
        item_condition: soldItem.condition,
        buy_price_per_unit: soldItem.buy_price,
        image_url: soldItem.image_url || null,
        notes: null,
        item_variant: soldItem.variant || 'normal'
      };

      // Update investments list optimistically
      setInvestments(prev => {
        return prev.map(inv => {
          if (inv.id !== investmentId) return inv;

          return {
            ...inv,
            quantity: remainingQuantity,
            is_fully_sold: remainingQuantity === 0,
            total_sold_quantity: (inv.total_sold_quantity || 0) + quantitySold,
            total_sale_value: (inv.total_sale_value || 0) + saleValue,
            realized_profit_loss: (inv.realized_profit_loss || 0) + saleProfitLoss,
            unrealized_profit_loss: remainingQuantity > 0 ? 
              (inv.current_price && inv.current_price > 0 ? (inv.current_price - inv.buy_price) * remainingQuantity : 0) : 0
          };
        });
      });

      // Add to sold items
      setSoldItems(prev => [soldItemData, ...prev]);
      
      // Update optimistic portfolio summary
      setOptimisticUpdates(prev => ({
        totalInvested: prev.totalInvested,
        totalCurrentValue: prev.totalCurrentValue - totalCurrentValueDecrease + saleValue, // Keep for total portfolio value
        currentHoldingsValue: (prev.currentHoldingsValue || 0) - totalCurrentValueDecrease, // Add this for holdings only
        totalRealizedPL: prev.totalRealizedPL + realizedPLIncrease,
        totalUnrealizedPL: prev.totalUnrealizedPL - unrealizedPLDecrease
      }));

      // Show toast
      const detailedName = displayName(soldItem, { 
        includeCondition: true, 
        format: 'simple' 
      });

      if (isFullSale) {
        toast.fullSaleCompleted(detailedName, quantitySold, saleValue, saleProfitLoss);
      } else {
        toast.partialSaleCompleted(detailedName, quantitySold, remainingQuantity, saleValue, saleProfitLoss);
      }

  }, [investments, userSession.id, setInvestments, setSoldItems, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-lg mb-2">
            {errorDetails?.type === 'NO_DATA' ? 'Getting Started' : 'Error'}
          </div>
          <div className="text-gray-400 mb-4">{error}</div>
          
          {/* Show different actions based on error type */}
          {errorDetails?.action === 'add_first_item' ? (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Your First Investment</span>
            </button>
          ) : errorDetails?.action === 'refresh_session' ? (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Refresh Page
            </button>
          ) : errorDetails?.action === 'verify_key' ? (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Please verify your beta key is valid and active</p>
              <button
                onClick={retry}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <button
              onClick={retry}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              {errorDetails?.recoverable ? 'Retry' : 'Try Again'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Investment Portfolio
          </h1>
          <p className="text-gray-400">Track your Counter-Strike skin investments and performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Holdings Value Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Holding Value</p>
                <p className="text-2xl font-bold text-white">{convertAndFormat(portfolioMetrics.currentHoldingsValue, currency)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Profit/Loss Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-2xl font-bold ${separatedPL.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {separatedPL.totalProfitLoss >= 0 ? '+' : ''}{convertAndFormat(separatedPL.totalProfitLoss, currency)}
                  </p>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          {/* Overall Growth Percentage Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Overall Growth</p>
                <p className={`text-2xl font-bold ${portfolioMetrics.profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioMetrics.profitPercentage >= 0 ? '+' : ''}{portfolioMetrics.profitPercentage.toFixed(2)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Performance Chart */}
        <ErrorBoundary
          title="Chart Error"
          message="Unable to load portfolio performance chart. Your data is safe, but the visualization is temporarily unavailable."
          onRetry={() => refetch()}
        >
          <PortfolioPerformanceChart 
            chartData={chartData}
            chartLoading={chartLoading}
            selectedTimePeriod={selectedTimePeriod}
            onTimePeriodChange={setSelectedTimePeriod}
          />
        </ErrorBoundary>

        {/* Recent Price Changes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <ErrorBoundary
              title="Price Data Error"
              message="Unable to load recent price changes. This might be due to a temporary API issue."
              onRetry={() => refetch()}
            >
              <RecentPriceChanges 
                investments={priceChangesView === 'portfolio' ? investments : []}
                watchlist={priceChangesView === 'watchlist' ? watchlist : []}
                itemStates={itemStates}
                viewMode={priceChangesView}
                onViewModeChange={setPriceChangesView}
              />
            </ErrorBoundary>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700/50">
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              
              {/* Quick Action Buttons */}
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`
                        w-full p-4 rounded-lg bg-gradient-to-r ${action.color} 
                        hover:${action.hoverColor} active:scale-95 
                        transform hover:scale-105 transition-all duration-200 
                        shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                        relative overflow-hidden group
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <h3 className="font-medium text-white">{action.title}</h3>
                          <p className="text-sm text-white/80">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Portfolio P&L Summary */}
              <div className="mt-6 mb-1 space-y-3">
                {/* Realized P&L */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Realized P&L</span>
                    <span className={`text-md font-medium ${separatedPL.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {separatedPL.totalRealizedPL >= 0 ? '+' : ''}{convertAndFormat(separatedPL.totalRealizedPL, currency)}
                    </span>
                  </div>
                </div>

                {/* Unrealized P&L */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Unrealized P&L</span>
                    <span className={`text-md font-medium ${separatedPL.totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {separatedPL.totalUnrealizedPL >= 0 ? '+' : ''}{convertAndFormat(separatedPL.totalUnrealizedPL, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <ErrorBoundary
            title="Activity Feed Error"
            message="Unable to load recent activity feed. Your transaction history is safe, but the display is temporarily unavailable."
            onRetry={() => refetch()}
          >
            <RecentActivity 
              recentActivity={recentActivity} 
              formatPrice={(value) => convertAndFormat(value, currency)} 
            />
          </ErrorBoundary>

        {/* QuickCheckPriceModal */}
        {showQuickPrice && (
          <QuickCheckPriceModal
            isOpen={showQuickPrice}
            onClose={() => setShowQuickPrice(false)}
            userSession={userSession}
            onViewFullDetails={handleViewFullPriceDetails}
          />
        )}

        {/* QuickAddItemForm */}
        {showQuickAdd && (
          <QuickAddItemForm
            onClose={() => setShowQuickAdd(false)}
            onAdd={handleAddItem}
            userSession={userSession}
          />
        )}

        {/* QuickSellModal */}
        {showQuickSell && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <QuickSellModal
              isOpen={showQuickSell}
              onClose={() => setShowQuickSell(false)}
              investments={investments}
              userSession={userSession}
              onSaleComplete={handleSaleComplete}
              supabase={supabase}
            />
          </div>
        )}

        {/* Quick Watchlist Add Modal */}
        {showQuickWatchlistAdd && (
          <QuickWatchlistAdd
            isOpen={showQuickWatchlistAdd}
            userSession={userSession}
            onClose={() => setShowQuickWatchlistAdd(false)}
            onAdd={async (item, price, marketplace, options) => {
              await addToWatchlist(item, price, marketplace, options);
              setShowQuickWatchlistAdd(false);
            }}
          />
        )}

        {/* Portfolio Health */}
        <div className="lg:col-span-1">
          <ErrorBoundary
            title="Portfolio Analysis Error"
            message="Unable to load portfolio health analysis. Your investment data is still safe."
            onRetry={() => refetch()}
          >
            <PortfolioHealthPieChart 
              portfolioHealth={portfolioHealth} 
              optimisticUpdates={optimisticUpdates}
              portfolioSummary={portfolioSummary}
            />
          </ErrorBoundary>
        </div>
      </div>

      </div>
    </div>
  );
};

export default InvestmentDashboard;