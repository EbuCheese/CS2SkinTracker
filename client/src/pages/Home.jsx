import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star } from 'lucide-react';

const HomePage = () => {
  // Mock data for the inventory chart
  const chartData = [
    { date: 'Jan', totalValue: 2450, growth: 2.3 },
    { date: 'Feb', totalValue: 2680, growth: 9.4 },
    { date: 'Mar', totalValue: 2520, growth: -6.0 },
    { date: 'Apr', totalValue: 2890, growth: 14.7 },
    { date: 'May', totalValue: 3120, growth: 8.0 },
    { date: 'Jun', totalValue: 3340, growth: 7.1 },
  ];

  // Mock data for recent price changes
  const recentChanges = [
    {
      id: 1,
      name: 'AK-47 | Redline',
      quality: 'Field-Tested',
      oldPrice: 45.20,
      newPrice: 52.80,
      change: 16.8,
      image: '🔫',
      trend: 'up'
    },
    {
      id: 2,
      name: 'AWP | Dragon Lore',
      quality: 'Factory New',
      oldPrice: 4200.00,
      newPrice: 3890.50,
      change: -7.4,
      image: '🎯',
      trend: 'down'
    },
    {
      id: 3,
      name: 'Butterfly Knife | Fade',
      quality: 'Minimal Wear',
      oldPrice: 1250.00,
      newPrice: 1380.25,
      change: 10.4,
      image: '🗡️',
      trend: 'up'
    },
    {
      id: 4,
      name: 'M4A4 | Howl',
      quality: 'Field-Tested',
      oldPrice: 2800.00,
      newPrice: 2950.75,
      change: 5.4,
      image: '🔥',
      trend: 'up'
    },
    {
      id: 5,
      name: 'Karambit | Gamma Doppler',
      quality: 'Factory New',
      oldPrice: 820.50,
      newPrice: 785.20,
      change: -4.3,
      image: '💎',
      trend: 'down'
    },
  ];

  const totalValue = chartData[chartData.length - 1].totalValue;
  const totalGrowth = chartData[chartData.length - 1].growth;

  const quickActions = [
    {
      title: 'Add New Skin',
      description: 'Add a skin to your inventory',
      icon: Plus,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700'
    },
    {
      title: 'Check Skin Price',
      description: 'Look up current market prices',
      icon: Search,
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'hover:from-blue-600 hover:to-cyan-700'
    },
    {
      title: 'Add to Watchlist',
      description: 'Track skins you\'re interested in',
      icon: Eye,
      color: 'from-purple-500 to-violet-600',
      hoverColor: 'hover:from-purple-600 hover:to-violet-700'
    }
  ];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Portfolio Overview
          </h1>
          <p className="text-gray-400">Track your CS:GO skin investments and market trends</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-white">{formatPrice(totalValue)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Monthly Growth</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-2xl font-bold ${totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalGrowth >= 0 ? '+' : ''}{totalGrowth}%
                  </p>
                  {totalGrowth >= 0 ? (
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
                <p className="text-gray-400 text-sm">Active Watchlist</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full"></div>
              <span>Total Value</span>
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
          
          {/* Recent Price Changes */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold text-white mb-6">Recent Price Changes</h2>
              
              <div className="space-y-4">
                {recentChanges.map((skin) => (
                  <div key={skin.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{skin.image}</div>
                      <div>
                        <h3 className="font-medium text-white">{skin.name}</h3>
                        <p className="text-sm text-gray-400">{skin.quality}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{formatPrice(skin.newPrice)}</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          skin.trend === 'up' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {skin.trend === 'up' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(skin.change)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">from {formatPrice(skin.oldPrice)}</p>
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

              {/* Market Status */}
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Market Status</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">Active</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Last updated 2 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;