import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TrendingUp, Plus, DollarSign, Activity, Loader2 } from 'lucide-react';
import { PortfolioPerformanceChart, PortfolioHealthPieChart } from '@/components/charts';
import { RecentPriceChanges, RecentActivity } from '@/components/item-display';
import { QuickAddItemForm, QuickSellModal } from '@/components/forms';
import { supabase } from '@/supabaseClient';
import { formatPrice } from '@/hooks/util';
import { useCalculatePortfolioHealth, useChartData, usePortfolioData, useQuickActions, useRecentActivity, usePortfolioSummary } from '@/hooks/portfolio';
import { useToast } from '@/contexts/ToastContext';

// Main InvestmentDashboard component
const InvestmentDashboard = ({ userSession }) => {
  // Add toast hook
  const toast = useToast();

  const { investments, soldItems, portfolioSummary, loading, error, errorDetails, refetch, retry, setInvestments, setSoldItems } = usePortfolioData(userSession);
  
  // track optimistics updates
    const [optimisticUpdates, setOptimisticUpdates] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalRealizedPL: 0,
    totalUnrealizedPL: 0
  });

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');
  const { chartData, chartLoading } = useChartData(userSession, selectedTimePeriod, investments.length > 0);
  
  const recentActivity = useRecentActivity(investments, soldItems);
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const quickActions = useQuickActions(setShowQuickAdd, setShowQuickSell);

  // Calculate portfolio health metrics using custom hook
  const portfolioHealth = useCalculatePortfolioHealth(investments);
  
  // Reset optimistic updates when data is refetched
  useEffect(() => {
    if (!loading && portfolioSummary) {
      setOptimisticUpdates({
        totalInvested: 0,
        totalCurrentValue: 0,
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
      totalRealizedPL: totalRealizedPL + optimisticUpdates.totalRealizedPL,
      totalUnrealizedPL: totalUnrealizedPL + optimisticUpdates.totalUnrealizedPL,
      totalProfitLoss: totalRealizedPL + totalUnrealizedPL + optimisticUpdates.totalRealizedPL + optimisticUpdates.totalUnrealizedPL
    };
  }

  // Use pre-calculated values from database + optimistic updates
  const totalRealizedPL = parseFloat(portfolioSummary.total_realized_pl || 0) + optimisticUpdates.totalRealizedPL;
  const totalUnrealizedPL = parseFloat(portfolioSummary.total_unrealized_pl || 0) + optimisticUpdates.totalUnrealizedPL;
  
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
  // Apply optimistic updates
  const updatedTotalCurrentValue = basePortfolioMetrics.totalCurrentValue + optimisticUpdates.totalCurrentValue;
  const updatedTotalInvested = basePortfolioMetrics.totalInvested + optimisticUpdates.totalInvested;
  const updatedTotalProfitLoss = separatedPL.totalProfitLoss;
  
  // Check if we have optimistic updates that would affect the percentage
  const hasOptimisticUpdates = optimisticUpdates.totalInvested !== 0 || 
                               optimisticUpdates.totalCurrentValue !== 0 || 
                               optimisticUpdates.totalRealizedPL !== 0 || 
                               optimisticUpdates.totalUnrealizedPL !== 0;

  const updatedProfitPercentage = hasOptimisticUpdates ? 
    (() => {
      // For percentage calculation, the denominator should be the UPDATED total investment
      // This includes both original investments AND new purchases (optimistic updates)
      const totalInvestmentForPercentage = portfolioSummary ? 
        parseFloat(portfolioSummary.total_investment || 0) + optimisticUpdates.totalInvested : // DB + optimistic additions
        basePortfolioMetrics.totalInvested; // Already includes optimistic updates
      
      return totalInvestmentForPercentage > 0 
        ? (updatedTotalProfitLoss / totalInvestmentForPercentage) * 100 
        : 0;
    })() : 
    basePortfolioMetrics.profitPercentage; // Use pre-calculated DB value

  return {
    ...basePortfolioMetrics,
    totalCurrentValue: updatedTotalCurrentValue,
    totalInvested: updatedTotalInvested,
    totalProfit: updatedTotalProfitLoss,
    profitPercentage: updatedProfitPercentage
  };
}, [basePortfolioMetrics, optimisticUpdates, separatedPL, portfolioSummary]);

  // Helper function to build detailed item name for toasts
  const buildDetailedItemName = useCallback((item) => {
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
    if (item.condition && item.condition.toLowerCase() !== 'unknown') {
      displayName += ` (${item.condition})`;
    }
    
    return displayName;
  }, []);

  // Handles adding a new item
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
  
  // Add to investments list optimistically
  setInvestments(prev => [itemWithMetrics, ...prev]);
  
  // Update optimistic portfolio summary
  const totalInvestedIncrease = newItem.buy_price * newItem.quantity;
  const totalCurrentValueIncrease = newItem.current_price * newItem.quantity;
  const unrealizedPLIncrease = itemWithMetrics.unrealized_profit_loss;
  
  setOptimisticUpdates(prev => ({
    totalInvested: prev.totalInvested + totalInvestedIncrease,
    totalCurrentValue: prev.totalCurrentValue + totalCurrentValueIncrease,
    totalRealizedPL: prev.totalRealizedPL, // No change
    totalUnrealizedPL: prev.totalUnrealizedPL + unrealizedPLIncrease
  }));
  
  console.log('New item added with optimistic updates:', itemWithMetrics);
}, [setInvestments]);

  // Handles completion of a sale transaction
  const handleSaleComplete = useCallback((investmentId, quantitySold, salePrice, remainingQuantity) => {
    const soldItem = investments.find(inv => inv.id === investmentId);
    if (!soldItem) return;

    // Calculate profit/loss for this sale
    const saleValue = salePrice * quantitySold;
    const saleProfitLoss = (salePrice - soldItem.buy_price) * quantitySold;
    const isFullSale = remainingQuantity === 0;
    
    // Calculate optimistic updates
    const totalInvestedDecrease = isFullSale ? soldItem.buy_price * soldItem.quantity : 0;
    const totalCurrentValueDecrease = soldItem.current_price * quantitySold;
    const realizedPLIncrease = saleProfitLoss;
    const unrealizedPLDecrease = (soldItem.current_price - soldItem.buy_price) * quantitySold;

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
          is_fully_sold: remainingQuantity === 0, // Mark as fully sold instead of removing
          total_sold_quantity: (inv.total_sold_quantity || 0) + quantitySold,
          total_sale_value: (inv.total_sale_value || 0) + saleValue,
          realized_profit_loss: (inv.realized_profit_loss || 0) + saleProfitLoss,
          unrealized_profit_loss: remainingQuantity > 0 ? (inv.current_price - inv.buy_price) * remainingQuantity : 0
        };
      });
    });

    // Add to sold items
    setSoldItems(prev => [soldItemData, ...prev]);
    
    // Update optimistic portfolio summary
    setOptimisticUpdates(prev => ({
      totalInvested: prev.totalInvested,
      totalCurrentValue: prev.totalCurrentValue - totalCurrentValueDecrease,
      totalRealizedPL: prev.totalRealizedPL + realizedPLIncrease,
      totalUnrealizedPL: prev.totalUnrealizedPL - unrealizedPLDecrease
    }));

    // Show toast
    const detailedName = buildDetailedItemName(soldItem);
    if (isFullSale) {
      toast.fullSaleCompleted(detailedName, quantitySold, saleValue, saleProfitLoss);
    } else {
      toast.partialSaleCompleted(detailedName, quantitySold, remainingQuantity, saleValue, saleProfitLoss);
    }

}, [investments, userSession.id, setInvestments, setSoldItems, buildDetailedItemName, toast]);

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
          {/* Total Portfolio Value Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-white">{formatPrice(portfolioMetrics.totalCurrentValue)}</p>
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
                    {separatedPL.totalProfitLoss >= 0 ? '+' : ''}{formatPrice(separatedPL.totalProfitLoss)}
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
        <PortfolioPerformanceChart 
          chartData={chartData}
          chartLoading={chartLoading}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        {/* Recent Price Changes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <RecentPriceChanges investments={investments} />
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

              {/* Portfolio P&L Summary - Now using correct values */}
              <div className="mt-6 mb-1 space-y-3">
                {/* Realized P&L */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Realized P&L</span>
                    <span className={`text-md font-medium ${separatedPL.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {separatedPL.totalRealizedPL >= 0 ? '+' : ''}{formatPrice(separatedPL.totalRealizedPL)}
                    </span>
                  </div>
                </div>

                {/* Unrealized P&L */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Unrealized P&L</span>
                    <span className={`text-md font-medium ${separatedPL.totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {separatedPL.totalUnrealizedPL >= 0 ? '+' : ''}{formatPrice(separatedPL.totalUnrealizedPL)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <RecentActivity 
          recentActivity={recentActivity} 
          formatPrice={formatPrice} 
        />

        {/* QuickAddItemForm (Quick Action Popup) */}
        {showQuickAdd && (
          <QuickAddItemForm
            onClose={() => setShowQuickAdd(false)}
            onAdd={handleAddItem}
            userSession={userSession}
          />
        )}

        {/* QuickSellModal (Quick Action Popup) */}
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

        {/* Portfolio Health */}
        <div className="lg:col-span-1">
        <PortfolioHealthPieChart portfolioHealth={portfolioHealth} />
      </div>
      </div>

      </div>
    </div>
  );
};

export default InvestmentDashboard;