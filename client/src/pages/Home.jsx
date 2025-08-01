import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star, Loader2 } from 'lucide-react';
import { PortfolioPerformanceChart, PortfolioHealthPieChart } from '@/components/charts';
import { RecentPriceChanges, RecentActivity } from '@/components/item-display';
import { QuickAddItemForm, QuickSellModal } from '@/components/forms';
import { supabase } from '@/supabaseClient';
import { useScrollLock, useAdvancedDebounce, formatPrice, formatChartDate } from '@/hooks/util';
import { useCalculatePortfolioHealth, useChartData, usePortfolioData, useQuickActions, useRecentActivity } from '@/hooks/portfolio';

// Main InvestmentDashboard component
const InvestmentDashboard = ({ userSession }) => {
  const { investments, soldItems, portfolioSummary, loading, error, refetch, setInvestments } = usePortfolioData(userSession);
  
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');
  const { chartData, chartLoading } = useChartData(userSession, selectedTimePeriod, investments.length > 0);
  
  const recentActivity = useRecentActivity(investments, soldItems);
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const quickActions = useQuickActions(setShowQuickAdd, setShowQuickSell);

  // Calculate portfolio health metrics using custom hook
  const portfolioHealth = useCalculatePortfolioHealth(investments);

  // Memoized portfolio metrics calculation with deep comparison to prevent unnecessary recalculations
  const portfolioMetrics = useMemo(() => {
    if (!portfolioHealth || portfolioHealth.totalValue === 0) {
      return {
        totalBuyValue: 0,
        totalCurrentValue: 0,
        totalRealizedPL: 0,
        totalUnrealizedPL: 0,
        totalProfitLoss: 0,
        overallGrowthPercent: 0
      };
    } 

    const {
      totalValue: totalCurrentValue,
      totalBuyValue,
      totalRealizedPL,
      totalUnrealizedPL
    } = portfolioHealth;

    const totalProfitLoss = totalRealizedPL + totalUnrealizedPL;
    const overallGrowthPercent = totalBuyValue > 0 ? (totalProfitLoss / totalBuyValue) * 100 : 0;
    
    return {
      totalBuyValue,
      totalCurrentValue,
      totalRealizedPL,
      totalUnrealizedPL,
      totalProfitLoss,
      overallGrowthPercent
    };
  }, [portfolioHealth]);

  // Handles completion of a sale transaction
  const handleSaleComplete = useCallback((investmentId, quantitySold, salePrice, remainingQuantity) => {
    // Immediately update local state for responsive UI feedback
    setInvestments(prev => prev.map(inv => 
      inv.id === investmentId 
        ? { ...inv, quantity: remainingQuantity }
        : inv
    ));
    refetch();
  }, [setInvestments, refetch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Loading Portfolio...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
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
                  <p className={`text-2xl font-bold ${portfolioMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioMetrics.totalProfitLoss >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalProfitLoss)}
                  </p>
                  {/* Trending icon based on P&L */}
                  {portfolioMetrics.overallGrowthPercent >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
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
                <p className="text-gray-400 text-12">Overall Growth</p>
                <p className={`text-2xl font-bold ${portfolioMetrics.overallGrowthPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioMetrics.overallGrowthPercent >= 0 ? '+' : ''}{portfolioMetrics.overallGrowthPercent.toFixed(2)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
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
                      `}                    >
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
                    <span className={`text-md font-medium ${portfolioMetrics.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioMetrics.totalRealizedPL >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalRealizedPL)}
                    </span>
                  </div>
                </div>

                {/* Unrealized P&L */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Unrealized P&L</span>
                    <span className={`text-md font-medium ${portfolioMetrics.totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioMetrics.totalUnrealizedPL >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalUnrealizedPL)}
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
            onAdd={(newItem) => {
              console.log('New item added:', newItem);
              setShowQuickAdd(false);
              refetch();  // Use the refetch from usePortfolioData hook
            }}
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
              supabase={supabase} // Make sure to pass your supabase instance
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