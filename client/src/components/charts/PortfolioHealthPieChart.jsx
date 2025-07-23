import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PortfolioHealthPieChart = ({ portfolioHealth }) => {
  const [activeToggle, setActiveToggle] = useState('type');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSmallSlices, setShowSmallSlices] = useState(true);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset selected slice when switching tabs or view modes
  useEffect(() => {
    setSelectedSlice(null);
  }, [activeToggle, viewMode]);

  // Memoized color palettes
  const colors = useMemo(() => ({
    type: {
      liquid: '#10B981',
      craft: '#F59E0B',
      case: '#3B82F6',
      sticker: '#32f1ffff',
      agent: '#8B5CF6',
      keychain: '#EC4899',
      graffiti: '#6B7280',
      patch: '#EF4444'
    },
    item: {
      'Knives': '#8B5CF6',
      'Gloves': '#EC4899',
      'Stickers': '#10B981',
      'Patches': '#EF4444',
      'Graffiti': '#6B7280',
      'Charms': '#F59E0B',
      'Agents': '#06B6D4',
    },
    weapon: [
      '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#EF4444',
      '#06B6D4', '#84CC16', '#F97316', '#A855F7', '#F472B6', '#64748B', '#DC2626',
      '#0EA5E9', '#65A30D', '#EA580C', '#9333EA', '#E11D48', '#475569', '#B91C1C'
    ]
  }), []);

  // Memoized format percentage function
  const formatPercentage = useMemo(() => (percentage) => {
    if (percentage >= 1) return `${percentage.toFixed(1)}%`;
    if (percentage >= 0.1) return `${percentage.toFixed(2)}%`;
    if (percentage >= 0.01) return `${percentage.toFixed(3)}%`;
    return percentage > 0 ? '<0.001%' : '0%';
  }, []);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Memoized consolidation function
  const consolidateItems = useMemo(() => (itemName) => {
    const lowerName = itemName.toLowerCase();
    
    if (itemName.startsWith('★')) {
      return lowerName.includes('gloves') || lowerName.includes('wraps') ? 'Gloves' : 'Knives';
    }
    
    if (lowerName.includes('sticker')) return 'Stickers';
    if (lowerName.includes('patch')) return 'Patches';
    if (lowerName.includes('sealed graffiti')) return 'Graffiti';
    if (lowerName.includes('charm')) return 'Charms';
    if (lowerName.includes('agent')) return 'Agents';
    if (lowerName.includes('case')) return itemName;
    
    const parts = itemName.split(' | ');
    return parts.length > 1 ? parts[0] : itemName.split(' ')[0];
  }, []);

  // Mock data for demonstration
  const mockPortfolioHealth = useMemo(() => ({
    typeBreakdown: [
      { name: 'liquid', value: 25000, percentage: 45.5, count: 50 },
      { name: 'craft', value: 15000, percentage: 27.3, count: 30 },
      { name: 'case', value: 8000, percentage: 14.5, count: 100 },
      { name: 'sticker', value: 4000, percentage: 7.3, count: 200 },
      { name: 'agent', value: 2000, percentage: 3.6, count: 15 },
      { name: 'keychain', value: 1000, percentage: 1.8, count: 25 }
    ],
    typeDiversityScore: 72,
    typeFeedback: "Good type diversification with strong liquid asset base. Consider reducing case concentration.",
    itemDiversityScore: 68,
    itemFeedback: "Reasonable item spread but heavily weighted towards knives. Consider more glove investments.",
    investments: [
      { name: '★ AK-47 | Redline', quantity: 5, current_price: 50 },
      { name: '★ Karambit | Doppler', quantity: 2, current_price: 800 },
      { name: '★ Driver Gloves | King Snake', quantity: 1, current_price: 400 },
      { name: 'AWP | Dragon Lore', quantity: 1, current_price: 3000 },
      { name: 'M4A4 | Howl', quantity: 3, current_price: 600 },
      { name: 'Sticker | Katowice 2014', quantity: 10, current_price: 100 },
      { name: 'Agent | Sir Bloody Miami Darryl', quantity: 2, current_price: 150 },
      { name: 'Sealed Graffiti | Lambda', quantity: 50, current_price: 2 },
      { name: 'Spectrum Case', quantity: 100, current_price: 1.5 },
      { name: 'Music Kit | AWOLNATION', quantity: 1, current_price: 25 }
    ]
  }), []);

  const actualPortfolio = portfolioHealth || mockPortfolioHealth;

  // Memoized consolidated breakdown calculation
  const consolidatedBreakdown = useMemo(() => {
    const investments = actualPortfolio.investments || [];
    const activeInvestments = investments.filter(inv => {
      const quantity = parseFloat(inv.quantity);
      return !isNaN(quantity) && quantity > 0;
    });

    if (activeInvestments.length === 0) return [];

    const itemGroups = {};
    let totalValue = 0;

    activeInvestments.forEach(inv => {
      const consolidatedName = consolidateItems(inv.name);
      const currentPrice = parseFloat(inv.current_price);
      const quantity = parseFloat(inv.quantity);
      
      if (isNaN(currentPrice) || isNaN(quantity)) return;
      
      const value = currentPrice * quantity;
      
      if (!itemGroups[consolidatedName]) {
        itemGroups[consolidatedName] = {
          name: consolidatedName,
          count: 0,
          totalValue: 0,
          items: []
        };
      }
      
      itemGroups[consolidatedName].count += quantity;
      itemGroups[consolidatedName].totalValue += value;
      itemGroups[consolidatedName].items.push(inv);
      totalValue += value;
    });

    return Object.values(itemGroups)
      .map(group => ({
        ...group,
        percentage: totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0,
        value: group.totalValue
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [actualPortfolio.investments, consolidateItems]);

  // Enhanced data processing with small slice handling for chart view only
  const processedData = useMemo(() => {
    const rawData = activeToggle === 'item' ? consolidatedBreakdown : (actualPortfolio.typeBreakdown || []);
    
    // Filter by search term
    const filteredData = rawData.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Only apply small slice grouping logic for item view and chart mode
    if (activeToggle === 'item' && viewMode === 'chart') {
      // Separate large and small slices
      const threshold = 2; // 2% threshold for small slices
      const largeSlices = filteredData.filter(item => item.percentage >= threshold);
      const smallSlices = filteredData.filter(item => item.percentage < threshold);
      
      let processedData = [...largeSlices];
      
      // Group small slices if there are any and showSmallSlices is false
      if (smallSlices.length > 0) {
        if (showSmallSlices) {
          // Show individual small slices
          processedData = [...processedData, ...smallSlices];
        } else {
          // Group small slices into "Others"
          const othersValue = smallSlices.reduce((sum, item) => sum + item.value, 0);
          const othersPercentage = smallSlices.reduce((sum, item) => sum + item.percentage, 0);
          const othersCount = smallSlices.reduce((sum, item) => sum + item.count, 0);
          
          if (othersValue > 0) {
            processedData.push({
              name: 'Others',
              value: othersValue,
              percentage: othersPercentage,
              count: othersCount,
              isGrouped: true,
              items: smallSlices
            });
          }
        }
      }
      
      return processedData.sort((a, b) => b.percentage - a.percentage);
    }
    
    // For type view or table view, return filtered data as-is (no grouping)
    return filteredData.sort((a, b) => b.percentage - a.percentage);
  }, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, showSmallSlices, searchTerm, viewMode]);

  // Table data - always shows all items without grouping
  const tableData = useMemo(() => {
    const rawData = activeToggle === 'item' ? consolidatedBreakdown : (actualPortfolio.typeBreakdown || []);
    
    // Filter by search term
    return rawData.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.percentage - a.percentage);
  }, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, searchTerm]);

  // Memoized color getter
  const getItemColor = useMemo(() => (item, index) => {
    if (item.isGrouped) return '#64748B'; // Gray for "Others"
    
    if (activeToggle === 'item') {
      return colors.item[item.name] || colors.weapon[index % colors.weapon.length];
    }
    return colors.type[item.name.toLowerCase()] || '#6B7280';
  }, [activeToggle, colors]);

  // Current metrics
  const currentScore = activeToggle === 'item' ? 
    actualPortfolio.itemDiversityScore : 
    actualPortfolio.typeDiversityScore;
    
  const currentFeedback = activeToggle === 'item' ? 
    actualPortfolio.itemFeedback : 
    actualPortfolio.typeFeedback;

  // Check if there are small slices in item view
  const hasSmallSlices = activeToggle === 'item' && consolidatedBreakdown.some(item => item.percentage < 2);

  // Enhanced tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs">
          <p className="text-white font-medium text-base mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-gray-300 text-sm">
              <span className="text-green-400">Value:</span> {formatCurrency(data.value)}
            </p>
            <p className="text-gray-300 text-sm">
              <span className="text-blue-400">Share:</span> {formatPercentage(data.percentage)}
            </p>
            <p className="text-gray-300 text-sm">
              <span className="text-purple-400">Items:</span> {data.count}
            </p>
            {data.isGrouped && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-yellow-400 text-xs mb-1">
                  Contains {data.items.length} items:
                </p>
                <div className="text-xs text-gray-300 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {data.items.map((item, i) => (
                    <div key={i} className="py-0.5">• {item.name} ({formatPercentage(item.percentage)})</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Enhanced label rendering with minimum size
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, name, startAngle, endAngle }) => {
    // Calculate slice angle
    const sliceAngle = Math.abs(endAngle - startAngle);
    
    // Show labels for slices >= 3% or if slice angle is large enough
    if (percentage < 2 && sliceAngle < 15 && name !== 'Others') return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium drop-shadow-lg pointer-events-none"
        style={{ 
          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))',
          fontSize: percentage > 10 ? '14px' : '12px'
        }}
      >
        {formatPercentage(percentage)}
      </text>
    );
  };

  // Pagination logic - use appropriate data based on view mode
  const currentData = viewMode === 'table' ? tableData : processedData;
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentPageData = currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleToggleChange = (newToggle) => {
    setActiveToggle(newToggle);
    setCurrentPage(0);
    setSearchTerm('');
    setSelectedSlice(null);
  };

  const handleSliceClick = (data, index) => {
    // if (data.isGrouped) {
    //   // Expand grouped slice
    //   setShowSmallSlices(true);
    // }
    setSelectedSlice(selectedSlice === data.name ? null : data.name);
  };

  // Handle clicking outside the chart to deselect
  const handleChartContainerClick = (e) => {
    // Only reset if clicking on the container itself, not on chart elements
    if (e.target === e.currentTarget) {
      setSelectedSlice(null);
    }
  };

  const toggleOptions = [
    { id: 'type', label: 'By Type', description: 'Investment type distribution' },
    { id: 'item', label: 'By Item', description: 'Consolidated item distribution' }
  ];

  // Table view component
  const TableView = () => (
    <div className="h-full overflow-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm"> {/* Made header sticky */}
        <tr className="border-b border-gray-600">
          <th className="text-left py-3 px-1 text-gray-300">Item</th>
          <th className="text-right py-3 text-gray-300">Value</th>
          <th className="text-right py-3 text-gray-300">Share</th>
          <th className="text-right py-3 px-1 text-gray-300">Count</th>
        </tr>
      </thead>
        <tbody>
          {currentPageData.map((item, index) => (
            <tr 
              key={`${item.name}-${index}`} 
              className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
            >
              <td className="py-4 px-1">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getItemColor(item, startIndex + index) }}
                  />
                  <span className="text-gray-300">
                    {item.name}
                  </span>
                </div>
              </td>
              <td className="py-4 text-right font-medium text-white">
                {formatCurrency(item.value)}
              </td>
              <td className="py-4 text-right text-gray-300">
                {formatPercentage(item.percentage)}
              </td>
              <td className="py-4 px-1 text-right text-gray-400">
                {item.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Portfolio Distribution</h2>
          <p className="text-sm text-gray-400 mt-1">
            Total: {formatCurrency(currentData.reduce((sum, item) => sum + item.value, 0))}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          currentScore >= 80 ? 'bg-green-500/20 text-green-400' :
          currentScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
          currentScore >= 40 ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {currentScore}/100
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex space-x-2 mb-4">
        {toggleOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleToggleChange(option.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeToggle === option.id
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            }`}
          >
            <div>
              <div>{option.label}</div>
              <div className="text-xs opacity-75">{option.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between mb-4 gap-4">
        {/* Search */}
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder={`Search ${activeToggle}s...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full px-3 py-1.5 text-sm bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                viewMode === 'chart' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                viewMode === 'table' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Table
            </button>
          </div>

          {/* Small slice toggle - only show for item view when there are small slices and chart mode */}
          {hasSmallSlices && viewMode === 'chart' && activeToggle === 'item' && (
            <button
              onClick={() => setShowSmallSlices(!showSmallSlices)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-300 ${
                showSmallSlices
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30'
                  : 'bg-gray-700/60 border-gray-600/50 text-gray-300 hover:bg-gray-600/60 hover:text-white hover:border-gray-500/50'
              }`}
            >
              {showSmallSlices ? 'Showing all' : 'Grouping <2%'}
            </button>
          )}
        </div>
      </div>

      {/* Chart or Table View */}
      <div className="mb-6"></div>
      {viewMode === 'chart' ? (
        <div className="flex-1 mb-6" style={{ minHeight: '260px' }} onClick={handleChartContainerClick}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                innerRadius={45}
                fill="#8884d8"
                dataKey="value"
                stroke="#1f2937"
                strokeWidth={1}
                animationBegin={0}
                animationDuration={800}
                onClick={handleSliceClick}
                className="cursor-pointer"
                minAngle={2} // Ensure minimum slice visibility
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getItemColor(entry, index)}
                    stroke={selectedSlice === entry.name ? '#F59E0B' : (entry.percentage < 2 ? '#374151' : '#1f2937')}
                    strokeWidth={selectedSlice === entry.name ? 2 : (entry.percentage < 2 ? 0.5 : 1)}
                    opacity={selectedSlice && selectedSlice !== entry.name ? 0.6 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 mb-6">
          <TableView />
        </div>
      )}
      
      {/* Diversity Score Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            {activeToggle === 'item' ? 'Item' : 'Type'} Diversity Score
          </span>
          <span className="text-sm font-medium text-white">{currentScore}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              currentScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
              currentScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
              currentScore >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-red-500'
            }`}
            style={{ width: `${Math.max(currentScore, 2)}%` }}
          />
        </div>
      </div>

      {/* Feedback */}
      <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
        <p className="text-sm text-gray-300">{currentFeedback}</p>
      </div>

      {/* Distribution List (for chart view) or Pagination (for table view) */}
      {viewMode === 'chart' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">
              {activeToggle === 'item' ? 'Item' : 'Type'} Distribution ({currentData.length} {activeToggle === 'item' ? 'categories' : 'types'})
            </h3>
            {totalPages > 1 && (
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-400 px-2">
                  {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
          <div className="space-y-1" style={{ minHeight: '255px' }}>
            {currentPageData.map((item, index) => (
              <div 
                key={`${item.name}-${index}`} 
                className={`flex items-center justify-between py-2 px-3 rounded transition-colors cursor-pointer ${
                  selectedSlice === item.name ? 'bg-gray-700/50' : 'hover:bg-gray-700/20'
                }`}
                onClick={() => setSelectedSlice(selectedSlice === item.name ? null : item.name)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-3 h-3 rounded-full ${item.isGrouped ? 'ring-1 ring-gray-500' : ''}`}
                    style={{ backgroundColor: getItemColor(item, startIndex + index) }}
                  />
                  <span className={`text-sm ${item.isGrouped ? 'text-gray-400' : 'text-gray-300'}`}>
                    {item.name} {item.isGrouped && `(${item.items.length} items)`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-green-400">{formatCurrency(item.value)}</span>
                    <span className="text-sm font-medium text-white">{formatPercentage(item.percentage)}</span>
                  </div>
                  <p className="text-xs text-gray-400">{item.count} items</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        totalPages > 1 && (
          <div className="flex items-center justify-center">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-400 px-4">
              {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default PortfolioHealthPieChart;