import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';

const InvestmentDashboard = ({ userSession }) => {
  const [investments, setInvestments] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('MAX');

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

  // Get recent price changes sorted by most changed
  const getRecentPriceChangesSorted = (investments) => {
    return investments
      .map(inv => {
        const changePercent = ((parseFloat(inv.current_price) - parseFloat(inv.buy_price)) / parseFloat(inv.buy_price)) * 100;
        return {
          ...inv,
          changePercent,
          changeAmount: parseFloat(inv.current_price) - parseFloat(inv.buy_price),
          trend: changePercent >= 0 ? 'up' : 'down'
        };
      })
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);
  };

  // Generate chart data based on selected time period
  const generateChartData = (investments, timePeriod) => {
    const now = new Date();
    const cutoffDate = new Date(now);
    
    // Calculate cutoff date based on selected period
    switch (timePeriod) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '5D':
        cutoffDate.setDate(now.getDate() - 5);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case 'YTD':
        cutoffDate.setFullYear(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '5Y':
        cutoffDate.setFullYear(now.getFullYear() - 5);
        break;
      case 'MAX':
      default:
        cutoffDate.setFullYear(2020, 0, 1); // Far enough back for all data
        break;
    }
    
    // Filter investments based on selected time period and create date-based data
    const filteredInvestments = investments.filter(inv => 
      new Date(inv.created_at) >= cutoffDate
    );
    
    // If no investments in the period, show the last investment value
    if (filteredInvestments.length === 0 && investments.length > 0) {
      const latestInvestment = investments[investments.length - 1];
      return [{
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: new Date().getFullYear() !== new Date(latestInvestment.created_at).getFullYear() ? 'numeric' : undefined
        }),
        totalValue: parseFloat(latestInvestment.current_price) * parseFloat(latestInvestment.quantity) + parseFloat(latestInvestment.total_sale_value),
        investment: 'Current Value'
      }];
    }
    
    // Sort by date
    const sortedInvestments = filteredInvestments.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Generate cumulative data points
    let cumulativeValue = 0;
    const chartData = [];
    
    // Add starting point for non-MAX periods
    if (timePeriod !== 'MAX' && sortedInvestments.length > 0) {
      cumulativeValue = investments
        .filter(inv => new Date(inv.created_at) < cutoffDate)
        .reduce((sum, inv) => sum + parseFloat(inv.current_price) * parseFloat(inv.quantity) + parseFloat(inv.total_sale_value), 0);
      
      if (cumulativeValue > 0) {
        chartData.push({
          date: cutoffDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: cutoffDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
          }),
          totalValue: cumulativeValue,
          investment: 'Starting Value'
        });
      }
    }
    
    // Add investment points
    sortedInvestments.forEach((inv, index) => {
      cumulativeValue += parseFloat(inv.current_price) * parseFloat(inv.quantity) + parseFloat(inv.total_sale_value);
      
      const investmentDate = new Date(inv.created_at);
      let dateFormat;
      
      // Adjust date format based on time period
      if (timePeriod === '1D' || timePeriod === '5D') {
        dateFormat = {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        };
      } else if (timePeriod === '1M' || timePeriod === '6M') {
        dateFormat = {
          month: 'short',
          day: 'numeric'
        };
      } else {
        dateFormat = {
          month: 'short',
          day: 'numeric',
          year: investmentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        };
      }
      
      chartData.push({
        date: investmentDate.toLocaleDateString('en-US', dateFormat),
        totalValue: cumulativeValue,
        investment: inv.name
      });
    });
    
    return chartData;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatTooltip = (value, name) => {
    if (name === 'totalValue') {
      return [formatPrice(value), 'Total Value'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
  const recentChanges = getRecentPriceChangesSorted(investments);
  const chartData = generateChartData(investments, selectedTimePeriod);

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
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full"></div>
                <span>Total Value</span>
              </div>
            </div>
            
            {/* Time Period Selection */}
            <div className="flex flex-wrap gap-2">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedTimePeriod(period.value)}
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
          
          <div className="h-80">
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={formatTooltip}
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
                  strokeWidth={3}
                  dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
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
          </div>
        </div>

        {/* Recent Price Changes & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Price Changes with Images */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold text-white mb-6">Biggest Price Changes</h2>
              
              <div className="space-y-4">
                {recentChanges.map((investment) => (
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
                        <p className="text-sm text-gray-400">{investment.condition}</p>
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