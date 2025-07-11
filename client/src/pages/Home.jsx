import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const InvestmentDashboard = ({ userSession }) => {
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');
  const [priceChangesPage, setPriceChangesPage] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

    useEffect(() => {
      if (!userSession) return;
  
      if (validateUserSession(userSession)) {
        fetchData();
      } else {
        setLoading(false);
        setError('Invalid user session. Please validate your beta key.');
      }
    }, [userSession]);

  const validateUserSession = (session) => {
    if (!session) return false;
    if (!session.id) return false;
    if (typeof session.id !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session.id)) return false;
    
    return true;
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

      await fetchChartData(selectedTimePeriod);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

// get the chart data from func
const fetchChartData = async (timePeriod) => {
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
    
    // Transform the data for the chart with proper date handling
    const transformedData = chartResult.data.map(point => {
      const date = new Date(point.date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      // Create more detailed date formatting
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
      } else { // monthly
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });
      }
      
      return {
        date: formattedDate,
        rawDate: date, // Keep raw date for tooltip
        totalValue: parseFloat(point.value),
        invested: parseFloat(point.invested),
        profitLoss: parseFloat(point.profit_loss),
        returnPercentage: parseFloat(point.return_percentage),
        isCurrentValue: isToday && chartResult.granularity === 'hourly' || 
                       (chartResult.granularity === 'daily' && isToday) ||
                       (chartResult.granularity === 'monthly' && date.getMonth() === new Date().getMonth())
      };
    });

    // Sort by date to ensure proper order
    transformedData.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    setChartData(transformedData);
    
  } catch (err) {
    console.error('Error fetching chart data:', err);
  } finally {
    setChartLoading(false);
  }
};

const handleTimePeriodChange = (period) => {
  setSelectedTimePeriod(period);
  fetchChartData(period);
};

  // Calculate portfolio metrics
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

  // get percentage change over time frame
  const calculateTimeFrameChange = (chartData) => {
  if (!chartData || chartData.length < 2) return { change: 0, percentage: 0 };
  
  const startValue = chartData[0].totalValue;
  const endValue = chartData[chartData.length - 1].totalValue;
  const change = endValue - startValue;
  const percentage = startValue > 0 ? (change / startValue) * 100 : 0;
  
  return { change, percentage };
};


  // Get recent price changes sorted by most changed
  const getRecentPriceChangesSorted = (investments) => {
    return investments
      .filter(inv => parseFloat(inv.quantity) > 0) // Only include items with quantity > 0
      .map(inv => {
        const changePercent = ((parseFloat(inv.current_price) - parseFloat(inv.buy_price)) / parseFloat(inv.buy_price)) * 100;
        return {
          ...inv,
          changePercent,
          changeAmount: parseFloat(inv.current_price) - parseFloat(inv.buy_price),
          trend: changePercent >= 0 ? 'up' : 'down'
        };
      })
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  };


 const calculateYAxisDomain = (data, timePeriod) => {
  if (!data || data.length === 0) return ['auto', 'auto'];
  
  const values = data.map(d => d.totalValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Calculate range
  const range = maxValue - minValue;
  
  // For very small ranges, add minimum padding
  if (range < maxValue * 0.005) { // Less than 0.5% variation
    const padding = maxValue * 0.02; // 2% padding
    return [Math.max(0, minValue - padding), maxValue + padding];
  }
  
  let paddingPercent;
  switch (timePeriod) {
    case '1D':
    case '5D':
      paddingPercent = 0.05; // 5% padding for short periods
      break;
    case '1M':
    case '3M':
      paddingPercent = 0.08; // 8% padding for medium periods
      break;
    case '6M':
    case '1Y':
      paddingPercent = 0.1; // 10% padding for longer periods
      break;
    case '5Y':
    case 'MAX':
      paddingPercent = 0.12; // 12% padding for very long periods
      break;
    default:
      paddingPercent = 0.1;
  }
  
  const padding = range * paddingPercent;
  return [Math.max(0, minValue - padding), maxValue + padding];
};

// Formatting 
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

 


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

  const portfolioMetrics = calculatePortfolioMetrics(investments);
  
  const allPriceChanges = getRecentPriceChangesSorted(investments);
  const totalPages = Math.ceil(allPriceChanges.length / 5);
  const currentPageChanges = allPriceChanges.slice(priceChangesPage * 5, (priceChangesPage + 1) * 5);

  const timePeriods = [
    { label: '1D', value: '1D' },
    { label: '5D', value: '5D' },
    { label: '1M', value: '1M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: '5Y', value: '5Y' },
    { label: 'MAX', value: 'MAX' }
  ];

  const quickActions = [
    {
      title: 'Add New Investment',
      description: 'Add a new skin to your portfolio',
      icon: Plus,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700'
    },
    {
      title: 'Check Prices',
      description: 'Look up current market prices',
      icon: Search,
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'hover:from-blue-600 hover:to-cyan-700'
    },
    {
      title: 'Sell Items',
      description: 'Record a sale from your portfolio',
      icon: DollarSign,
      color: 'from-purple-500 to-violet-600',
      hoverColor: 'hover:from-purple-600 hover:to-violet-700'
    }
  ];

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
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center space-x-4 mb-2">
                <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full"></div>
                  <span>Total Value</span>
                </div>
              </div>
              
              {/* Time Frame Change Display - Under Title */}
              {chartData.length > 1 && !chartLoading && (
                <div className="flex items-center space-x-2">
                  {(() => {
                    const { change, percentage } = calculateTimeFrameChange(chartData);
                    return (
                      <>
                        <span className={`text-xl font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {change >= 0 ? '+' : ''}{formatPrice(change)}
                        </span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          change >= 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {change >= 0 ? '+' : ''}{percentage.toFixed(2)}%
                        </span>
                        <span className="text-sm text-gray-400">({selectedTimePeriod})</span>
                        {change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* Time Period Selection */}
            <div className="flex flex-wrap gap-2">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => handleTimePeriodChange(period.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    selectedTimePeriod === period.value
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[28rem]">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    domain={calculateYAxisDomain(chartData, selectedTimePeriod)}
                    // Add more tick marks for short periods
                    tickCount={['1D', '5D'].includes(selectedTimePeriod) ? 8 : 6}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'totalValue') return [formatPrice(value), 'Portfolio Value'];
                      if (name === 'invested') return [formatPrice(value), 'Total Invested'];
                      if (name === 'profitLoss') return [formatPrice(value), 'Profit/Loss'];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0 && payload[0].payload.rawDate) {
                        const rawDate = payload[0].payload.rawDate;
                        // For hourly data, show full date and time
                        if (['1D', '5D'].includes(selectedTimePeriod)) {
                          return rawDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                        } else {
                          // For other periods, show just the date
                          return rawDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalValue" 
                    stroke="url(#gradient)" 
                    strokeWidth={['1D', '5D'].includes(selectedTimePeriod) ? 2 : 3}
                    dot={['1D', '5D'].includes(selectedTimePeriod) ? 
                      { fill: '#F97316', strokeWidth: 2, r: 3 } : 
                      { fill: '#F97316', strokeWidth: 2, r: 4 }
                    }
                    activeDot={{ r: 6, fill: '#EA580C' }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Price Changes & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Price Changes with Images */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Biggest Price Changes</h2>
                <div className="text-sm text-gray-400">
                  {allPriceChanges.length} active items
                </div>
              </div>
              
              <div className="space-y-4">
                {currentPageChanges.map((investment) => (
                  <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-17 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {investment.image_url ? (
                          <img 
                            src={investment.image_url} 
                            alt={`${investment.name} | ${investment.skin_name}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full ${investment.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                          <span className="text-xs font-medium text-white">
                            {investment.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{investment.name}{investment.skin_name && ` | ${investment.skin_name}`}</h3>
                        <p className="text-sm text-gray-400">{investment.condition} • Qty: {investment.quantity}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{formatPrice(investment.current_price)}</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          investment.trend === 'up' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {investment.trend === 'up' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(investment.changePercent).toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">from {formatPrice(investment.buy_price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6 space-x-2">
                  <button
                    onClick={() => setPriceChangesPage(Math.max(0, priceChangesPage - 1))}
                    disabled={priceChangesPage === 0}
                    className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                    let pageIndex;
                    if (totalPages <= 3) {
                      pageIndex = i;
                    } else if (priceChangesPage === 0) {
                      pageIndex = i;
                    } else if (priceChangesPage === totalPages - 1) {
                      pageIndex = totalPages - 3 + i;
                    } else {
                      pageIndex = priceChangesPage - 1 + i;
                    }
                    
                    return (
                      <button
                        key={pageIndex}
                        onClick={() => setPriceChangesPage(pageIndex)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          priceChangesPage === pageIndex
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                        }`}
                      >
                        {pageIndex + 1}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPriceChangesPage(Math.min(totalPages - 1, priceChangesPage + 1))}
                    disabled={priceChangesPage === totalPages - 1}
                    className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      className={`w-full p-4 rounded-lg bg-gradient-to-r ${action.color} ${action.hoverColor} transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl`}
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

              {/* Portfolio Summary */}
              <div className="mt-6 space-y-3">
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Realized P&L</span>
                    <span className={`text-sm font-medium ${portfolioMetrics.totalRealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioMetrics.totalRealizedPL >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalRealizedPL)}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Unrealized P&L</span>
                    <span className={`text-sm font-medium ${portfolioMetrics.totalUnrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioMetrics.totalUnrealizedPL >= 0 ? '+' : ''}{formatPrice(portfolioMetrics.totalUnrealizedPL)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDashboard;