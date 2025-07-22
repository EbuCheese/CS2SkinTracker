import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star, Loader2 } from 'lucide-react';
import { PortfolioPerformanceChart, PortfolioHealthPieChart } from '@/components/charts';
import { RecentPriceChanges, RecentActivity } from '@/components/item-display';
import { QuickAddItemForm, QuickSellModal } from '@/components/forms';
import { supabase } from '@/supabaseClient';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useCalculatePortfolioHealth } from '@/hooks/useCalculatePortfolioHealth';
import { useAdvancedDebounce } from '@/hooks/useAdvancedDebounce';

const createQuickActions = (setShowQuickAdd, setShowQuickSell) => [
  {
    title: 'Check Prices',
    description: 'Look up current market prices',
    icon: Search,
    color: 'from-blue-500 to-cyan-600',
    hoverColor: 'hover:from-blue-600 hover:to-cyan-700',
    // onClick: () => navigate to price checker or open price modal
  },
  {
    title: 'Add New Investment',
    description: 'Add a new skin to your portfolio',
    icon: Plus,
    color: 'from-green-500 to-emerald-600',
    hoverColor: 'hover:from-green-600 hover:to-emerald-700',
    onClick: () => setShowQuickAdd(true)
  },
  {
    title: 'Sell Items',
    description: 'Record a sale from your portfolio',
    icon: DollarSign,
    color: 'from-purple-500 to-violet-600',
    hoverColor: 'hover:from-purple-600 hover:to-violet-700',
    onClick: () => setShowQuickSell(true)
  },
  {
    title: 'View Watchlist',
    description: 'Monitor items you\'re tracking',
    icon: Eye,
    color: 'from-orange-500 to-red-600',
    hoverColor: 'hover:from-orange-600 hover:to-red-700',
    // onClick: () => setShowWatchlist(true) or navigate to watchlist
  },
  {
    title: 'Market Trends',
    description: 'View trending skins & market insights',
    icon: TrendingUp,
    color: 'from-rose-500 to-pink-600',
    hoverColor: 'hover:from-rose-600 hover:to-pink-700',
    // onClick: () => navigate to market trends
  },
];

// Calculate portfolio metrics (memoized for performance)
const calculatePortfolioMetrics = (investments) => {
    const totalBuyValue = investments.reduce((sum, inv) => 
      sum + (parseFloat(inv.buy_price) * parseFloat(inv.original_quantity)), 0);
    
    const totalCurrentValue = investments.reduce((sum, inv) => 
      sum + (parseFloat(inv.current_price) * parseFloat(inv.quantity)) + parseFloat(inv.total_sale_value), 0);
    
    const totalRealizedPL = investments.reduce((sum, inv) => 
      sum + parseFloat(inv.realized_profit_loss), 0);
    
    const totalUnrealizedPL = investments.reduce((sum, inv) => 
      sum + parseFloat(inv.unrealized_profit_loss), 0);
    
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
};

// get the recent added and sold items
const getRecentActivity = (investments, soldItems) => {
  // Create recent purchases from investments (using created_at from investments table)
  // Only include purchases that actually have a positive original_quantity
  const recentInvestments = investments
  .filter(inv => {
    return inv.created_at && 
           parseFloat(inv.original_quantity || inv.quantity) > 0 &&
           parseFloat(inv.buy_price) > 0;
  })
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 10)
  .map(inv => {
    const purchaseQuantity = parseFloat(inv.original_quantity || inv.quantity);
    const purchasePrice = parseFloat(inv.buy_price);
    
    // Updated subtitle logic
    const subtitle = inv.condition && inv.condition.toLowerCase() !== 'unknown' 
      ? `${inv.condition} • Qty: ${purchaseQuantity}`
      : `Qty: ${purchaseQuantity}`;
    
    return {
      ...inv,
      type: 'purchase',
      date: new Date(inv.created_at),
      title: `${inv.name}${inv.skin_name ? ` (${inv.skin_name})` : ''}`,
      subtitle: subtitle,
      amount: purchasePrice * purchaseQuantity,
      isPositive: false,
      image_url: inv.image_url
    };
  });

  // Create recent sales from sold items (using sale_date from investment_sales table)
  const recentSales = soldItems
  .filter(sale => sale.sale_date && parseFloat(sale.total_sale_value) > 0)
  .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
  .slice(0, 10)
  .map(sale => {
    // Updated subtitle logic
    const subtitle = sale.item_condition && sale.item_condition.toLowerCase() !== 'unknown'
      ? `${sale.item_condition} • Qty: ${sale.quantity_sold}`
      : `Qty: ${sale.quantity_sold}`;
    
    return {
      ...sale,
      type: 'sale',
      date: new Date(sale.sale_date),
      title: `${sale.item_name}${sale.item_skin_name ? ` (${sale.item_skin_name})` : ''}`,
      subtitle: subtitle,
      amount: parseFloat(sale.total_sale_value),
      isPositive: true,
      image_url: sale.image_url,
      variant: sale.item_variant, // Add this line to map the variant correctly
      quantity: sale.quantity_sold // Also add quantity for consistency
    };
  });

  // Combine and sort by date (most recent first)
  const combinedActivity = [...recentInvestments, ...recentSales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8); // Show last 8 activities

  return combinedActivity;
};

// Formatting 
const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
};

const InvestmentDashboard = ({ userSession }) => {
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  
  // Ref to track if initial load is complete
  const initialLoadComplete = useRef(false);
  const lastDataFetchRef = useRef(0);
  
  // Apply scroll lock when popups are open
  useScrollLock(showQuickAdd || showQuickSell);

  const quickActions = useMemo(() => 
    createQuickActions(setShowQuickAdd, setShowQuickSell), 
    []
  );

  const portfolioHealth = useCalculatePortfolioHealth(investments);

  // Memoize portfolio metrics calculation with deep comparison
  const portfolioMetrics = useMemo(() => {
    if (investments.length === 0) {
      return {
        totalBuyValue: 0,
        totalCurrentValue: 0,
        totalRealizedPL: 0,
        totalUnrealizedPL: 0,
        totalProfitLoss: 0,
        overallGrowthPercent: 0
      };
    }
    return calculatePortfolioMetrics(investments);
  }, [investments]);

  // Memoize recent activity with both dependencies
  const recentActivityMemo = useMemo(() => {
    if (investments.length === 0 && soldItems.length === 0) return [];
    return getRecentActivity(investments, soldItems);
  }, [investments, soldItems]);

  // Non-debounced fetch data for initial load and critical updates
  const fetchCriticalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!validateUserSession(userSession)) {
        setError('Invalid user session. Please re-validate your beta key.');
        return;
      }

      console.log('Fetching data for user:', userSession.id);

      const [investmentsResult, soldItemsResult] = await Promise.allSettled([
        supabase.rpc('fetch_user_investment_summary', {
          context_user_id: userSession.id
        }),
        supabase.rpc('fetch_user_investment_sales', {
          context_user_id: userSession.id
        })
      ]);

      // Declare investmentsArray outside the if block
      let investmentsArray = [];

      // Handle investments result
      if (investmentsResult.status === 'fulfilled' && !investmentsResult.value.error) {
        investmentsArray = Array.isArray(investmentsResult.value.data) 
          ? investmentsResult.value.data 
          : (investmentsResult.value.data || []);
        setInvestments(investmentsArray);
      } else {
        console.error('Investments query failed:', investmentsResult.reason || investmentsResult.value?.error);
        setError('Access denied. Please verify your beta key is valid and active.');
        return;
      }

      // Handle sold items result (non-critical)
      if (soldItemsResult.status === 'fulfilled' && !soldItemsResult.value.error) {
        const soldItemsArray = Array.isArray(soldItemsResult.value.data)
          ? soldItemsResult.value.data
          : (soldItemsResult.value.data || []);
        setSoldItems(soldItemsArray);
      } else {
        console.warn('Could not fetch sold items, continuing with investments only');
        setSoldItems([]);
      }

      // Only fetch chart data if we have investments and it's the initial load
      if (investmentsArray.length > 0 && !initialLoadComplete.current) {
        await debouncedFetchChartData(selectedTimePeriod);
      }

      lastDataFetchRef.current = Date.now();
      initialLoadComplete.current = true;

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userSession?.id]);

  // DEBOUNCED REFRESH for user-initiated actions
  const { debouncedFunction: debouncedRefresh } = useAdvancedDebounce(
    useCallback(async () => {
      // Only refresh if enough time has passed since last fetch
      const timeSinceLastFetch = Date.now() - lastDataFetchRef.current;
      if (timeSinceLastFetch < 1000) return; // Minimum 1 second between refreshes
      
      await fetchCriticalData();
    }, [fetchCriticalData]),
    800, // Slightly longer delay for user actions
    { 
      leading: false, 
      trailing: true, 
      maxWait: 2000 // Ensure execution within 2 seconds max
    }
  );

  // Handle sale completion with debounced data refresh
  const handleSaleComplete = useCallback((investmentId, quantitySold, salePrice, remainingQuantity) => {
    // Immediately update local state for responsive UI
    setInvestments(prev => prev.map(inv => 
      inv.id === investmentId 
        ? { ...inv, quantity: remainingQuantity }
        : inv
    ));
    
    // Debounce the full data refresh
    debouncedRefresh();
  }, [debouncedRefresh]);

  const validateUserSession = (session) => {
    if (!session) return false;
    if (!session.id) return false;
    if (typeof session.id !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session.id)) return false;
    
    return true;
  };

  // Debounced chart data fetching for time period changes
  const { debouncedFunction: debouncedFetchChartData } = useAdvancedDebounce(
    useCallback(async (timePeriod) => {
      try {
        setChartLoading(true);
        
        const { data, error } = await supabase.rpc('get_chart_data', {
          context_user_id: userSession.id,
          time_period: timePeriod
        });

        if (error) {
          console.error('Chart data fetch failed:', error);
          return;
        }

        const chartResult = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Pre-calculate current date once
        const currentDate = new Date();
        const currentDateString = currentDate.toDateString();
        const currentMonth = currentDate.getMonth();
        
        // Transform the data for the chart with optimized date handling
        const transformedData = chartResult.data.map(point => {
          const date = new Date(point.date);
          const isToday = date.toDateString() === currentDateString;
          
          let formattedDate;
          if (chartResult.granularity === 'hourly') {
            if (isToday) {
              formattedDate = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            } else {
              formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                hour12: true
              });
            }
          } else if (chartResult.granularity === 'daily') {
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
          } else {
            formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            });
          }
          
          return {
            date: formattedDate,
            rawDate: date,
            totalValue: parseFloat(point.value),
            invested: parseFloat(point.invested),
            profitLoss: parseFloat(point.profit_loss),
            returnPercentage: parseFloat(point.return_percentage),
            isCurrentValue: isToday && chartResult.granularity === 'hourly' || 
                           (chartResult.granularity === 'daily' && isToday) ||
                           (chartResult.granularity === 'monthly' && date.getMonth() === currentMonth)
          };
        });

        transformedData.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        setChartData(transformedData);
        
      } catch (err) {
        console.error('Error fetching chart data:', err);
      } finally {
        setChartLoading(false);
      }
    }, [userSession?.id]),
    500, // delay for chart data updates
    { leading: false,
      trailing: true,
      maxWait: 1500 
    }
  );

  // Initial data fetch - no debouncing for first load
  useEffect(() => {
    if (!userSession) return;

    if (validateUserSession(userSession)) {
      fetchCriticalData();
    } else {
      setLoading(false);
      setError('Invalid user session. Please validate your beta key.');
    }
  }, [userSession, fetchCriticalData]);

  // Chart data fetch for time period changes - debounced
  useEffect(() => {
    if (investments.length > 0 && initialLoadComplete.current) {
      debouncedFetchChartData(selectedTimePeriod);
    }
  }, [selectedTimePeriod, debouncedFetchChartData, investments.length]);

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

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-2xl font-bold ${portfolioMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioMetrics.totalProfitLoss >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalProfitLoss)}
                  </p>
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

        {/* Chart Section */}
        <PortfolioPerformanceChart userSession={userSession} />

        {/* Recent Price Changes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <RecentPriceChanges investments={investments} />
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700/50">
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              
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

              {/* Portfolio Summary */}
              <div className="mt-6 mb-1 space-y-3">
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-md text-gray-400">Realized P&L</span>
                    <span className={`text-md font-medium ${portfolioMetrics.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioMetrics.totalRealizedPL >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalRealizedPL)}
                    </span>
                  </div>
                </div>
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

        {/* New Widgets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <RecentActivity 
          recentActivity={recentActivityMemo} 
          formatPrice={formatPrice} 
        />

        {/* QuickAddItemForm */}
        {showQuickAdd && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
                onClick={() => setShowQuickAdd(false)}
              />
              <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 shadow-2xl transition-all duration-200 scale-100 opacity-100 border-orange-500/20">
                <QuickAddItemForm
                  onClose={() => setShowQuickAdd(false)}
                  onAdd={(newItem) => {
                    console.log('New item added:', newItem);
                    setShowQuickAdd(false);
                    debouncedRefresh(true); // Use debounced refresh for user actions
                    }}
                  userSession={userSession}
                />
                </div>
            </div>
          </div>
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