import React, { useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { formatPrice, timePeriods } from '@/hooks/util';

// Pure presentation component for displaying portfolio performance chart
const PortfolioPerformanceChart = ({ 
  chartData, 
  chartLoading, 
  selectedTimePeriod, 
  onTimePeriodChange 
}) => {
  // Formats Y-axis tick values with dollar sign
  const formatTickPrice = useCallback((value) => `$${value.toFixed(2)}`, []);

  // Handles time period selection changes
  const handleTimePeriodChange = useCallback((period) => {
    onTimePeriodChange(period);
  }, [onTimePeriodChange]);

  // Calculates performance change for selected time frame
  const timeFrameChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return { change: 0, percentage: 0 };
    
    const startValue = chartData[0].totalValue;
    const endValue = chartData[chartData.length - 1].totalValue;
    const change = endValue - startValue;
    const percentage = startValue > 0 ? (change / startValue) * 100 : 0;
    
    return { change, percentage };
  }, [chartData]);

  // Calculates optimal Y-axis domain for better chart visualization
  const yAxisDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return ['auto', 'auto'];
    
    const values = chartData.map(d => d.totalValue);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    const range = maxValue - minValue;
    
    // Handle edge case: very small price variations
    if (range < maxValue * 0.005) { // Less than 0.5% variation
      const padding = maxValue * 0.02; // 2% padding
      return [Math.max(0, minValue - padding), maxValue + padding];
    }
    
    // Dynamic padding based on time period
    let paddingPercent;
    switch (selectedTimePeriod) {
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
  }, [chartData, selectedTimePeriod]);

  // Formats tooltip values based on data type
  const tooltipFormatter = useCallback((value, name) => {
    if (name === 'totalValue') return [formatPrice(value), 'Portfolio Value'];
    if (name === 'invested') return [formatPrice(value), 'Total Invested'];
    if (name === 'profitLoss') return [formatPrice(value), 'Profit/Loss'];
    return [value, name];
  }, []);

  // Formats tooltip labels (dates) based on selected time period
  const tooltipLabelFormatter = useCallback((label, payload) => {
    if (payload && payload.length > 0 && payload[0].payload.rawDate) {
      const rawDate = payload[0].payload.rawDate;

      // For short-term periods, include time information
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
  }, [selectedTimePeriod]);

  // Tooltip styling configuration
  const tooltipContentStyle = useMemo(() => ({
    backgroundColor: '#1F2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#F9FAFB'
  }), []);

  // Line chart properties configuration
  const lineProps = useMemo(() => ({
    type: "monotone",
    dataKey: "totalValue",
    stroke: "url(#gradient)",
    strokeWidth: ['1D', '5D'].includes(selectedTimePeriod) ? 2 : 3,
    dot: ['1D', '5D'].includes(selectedTimePeriod) ? 
      { fill: '#F97316', strokeWidth: 2, r: 3 } : 
      { fill: '#F97316', strokeWidth: 2, r: 4 },
    activeDot: { r: 6, fill: '#EA580C' }
  }), [selectedTimePeriod]);

  // X-axis tick count based on time period
  const tickCount = useMemo(() => 
    ['1D', '5D'].includes(selectedTimePeriod) ? 8 : 6, 
    [selectedTimePeriod]
  );

  // Main render
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700/50">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          {/* Title and Legend */}
          <div className="flex items-center space-x-4 mb-2">
            <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full"></div>
              <span>Total Value</span>
            </div>
          </div>
          
          {/* Performance Metrics Display */}
          {chartData.length > 1 && !chartLoading && (
            <div className="flex items-center space-x-2">
              {/* Change Amount */}
              <span className={`text-xl font-bold ${timeFrameChange.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {timeFrameChange.change >= 0 ? '+' : ''}{formatPrice(timeFrameChange.change)}
              </span>
              {/* Percentage Change Badge */}
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                timeFrameChange.change >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {timeFrameChange.change >= 0 ? '+' : ''}{timeFrameChange.percentage.toFixed(2)}%
              </span>
              {/* Time Period Label */}
              <span className="text-sm text-gray-400">({selectedTimePeriod})</span>
              {/* Trend Icon */}
              {timeFrameChange.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
          )}
        </div>
        
        {/* Time Period Selection Buttons */}
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
      
      {/* Chart Container */}
      <div className="h-[28rem]">
        {chartLoading ? (
          // Loading State
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          // Chart Rendering
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              {/* Grid Lines */}
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

              {/* X-Axis (Dates) */}
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />

              {/* Y-Axis (Values) */}
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={formatTickPrice}
                domain={yAxisDomain}
                tickCount={tickCount}
              />

              {/* Interactive Tooltip */}
              <Tooltip 
                formatter={tooltipFormatter}
                labelFormatter={tooltipLabelFormatter}
                contentStyle={tooltipContentStyle}
              />

              {/* Main Chart Line */}
              <Line {...lineProps} />

              {/* Gradient Definition for Line Color */}
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
  );
};

export default PortfolioPerformanceChart;