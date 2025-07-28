import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Memoized component for rendering individual distribution items in the list
const DistributionItem = React.memo(({ 
  item, 
  index, 
  startIndex, 
  isSelected, 
  onClick,
  getItemColor,
  formatCurrency,
  formatPercentage 
}) => (
  <div 
    className={`flex items-center justify-between py-2 px-3 rounded transition-colors cursor-pointer ${
      isSelected ? 'bg-gray-700/50' : 'hover:bg-gray-700/20'
    }`}
    onClick={onClick}
  >
    {/* Left side: Color indicator and item name */}
    <div className="flex items-center space-x-3">
      <div 
        className={`w-3 h-3 rounded-full ${item.isGrouped ? 'ring-1 ring-gray-500' : ''}`}
        style={{ backgroundColor: getItemColor(item, startIndex + index) }}
      />
      <span className={`text-sm ${item.isGrouped ? 'text-gray-400' : 'text-gray-300'}`}>
        {item.name} {item.isGrouped && `(${item.items.length} items)`}
      </span>
    </div>

    {/* Right side: Value, percentage, and item count */}
    <div className="text-right">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-green-400">{formatCurrency(item.value)}</span>
        <span className="text-sm font-medium text-white">{formatPercentage(item.percentage)}</span>
      </div>
      <p className="text-xs text-gray-400">{item.count} items</p>
    </div>
  </div>
));

// Main Portfolio Health Pie Chart Component
const PortfolioHealthPieChart = ({ portfolioHealth }) => {
  // Toggle types
  const [activeToggle, setActiveToggle] = useState('type');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);

  // Slice states
  const [showSmallSlices, setShowSmallSlices] = useState(true);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [stickyTooltip, setStickyTooltip] = useState(null);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Reset UI state when switching between major view modes
  useEffect(() => {
    setSelectedSlice(null);
    setStickyTooltip(null);
  }, [activeToggle, viewMode, showSmallSlices]);

  // Debounce search input to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Color palettes for different visualization modes
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

  // Optimized percentage formatter with dynamic precision
  const formatPercentage = useMemo(() => (percentage) => {
    if (percentage >= 1) return `${percentage.toFixed(1)}%`;
    if (percentage >= 0.1) return `${percentage.toFixed(2)}%`;
    if (percentage >= 0.01) return `${percentage.toFixed(3)}%`;
    return percentage > 0 ? '<0.001%' : '0%';
  }, []);

  // Currency formatter with consistent USD formatting
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Item name consolidation logic for grouping similar items
  const consolidateItems = useMemo(() => (itemName) => {
    const lowerName = itemName.toLowerCase();
    
    // Handle special items (★ indicates StatTrak or special quality)
    if (itemName.startsWith('★')) {
      return lowerName.includes('gloves') || lowerName.includes('wraps') ? 'Gloves' : 'Knives';
    }
    
    // Category-based consolidation
    if (lowerName.includes('sticker')) return 'Stickers';
    if (lowerName.includes('patch')) return 'Patches';
    if (lowerName.includes('sealed graffiti')) return 'Graffiti';
    if (lowerName.includes('charm')) return 'Charms';
    if (lowerName.includes('agent')) return 'Agents';
    if (lowerName.includes('case')) return itemName;
    
    // Default: use first part of item name (before |) or first word
    const parts = itemName.split(' | ');
    return parts.length > 1 ? parts[0] : itemName.split(' ')[0];
  }, []);

  // Mock data for development and demonstration purposes
  // const mockPortfolioHealth = useMemo(() => ({
  //   typeBreakdown: [
  //     { name: 'liquid', value: 25000, percentage: 45.5, count: 50 },
  //     { name: 'craft', value: 15000, percentage: 27.3, count: 30 },
  //     { name: 'case', value: 8000, percentage: 14.5, count: 100 },
  //     { name: 'sticker', value: 4000, percentage: 7.3, count: 200 },
  //     { name: 'agent', value: 2000, percentage: 3.6, count: 15 },
  //     { name: 'keychain', value: 1000, percentage: 1.8, count: 25 }
  //   ],
  //   typeDiversityScore: 72,
  //   typeFeedback: "Good type diversification with strong liquid asset base. Consider reducing case concentration.",
  //   itemDiversityScore: 68,
  //   itemFeedback: "Reasonable item spread but heavily weighted towards knives. Consider more glove investments.",
  //   investments: [
  //     { name: '★ AK-47 | Redline', quantity: 5, current_price: 50 },
  //     { name: '★ Karambit | Doppler', quantity: 2, current_price: 800 },
  //     { name: '★ Driver Gloves | King Snake', quantity: 1, current_price: 400 },
  //     { name: 'AWP | Dragon Lore', quantity: 1, current_price: 3000 },
  //     { name: 'M4A4 | Howl', quantity: 3, current_price: 600 },
  //     { name: 'Sticker | Katowice 2014', quantity: 10, current_price: 100 },
  //     { name: 'Agent | Sir Bloody Miami Darryl', quantity: 2, current_price: 150 },
  //     { name: 'Sealed Graffiti | Lambda', quantity: 50, current_price: 2 },
  //     { name: 'Spectrum Case', quantity: 100, current_price: 1.5 },
  //     { name: 'Music Kit | AWOLNATION', quantity: 1, current_price: 25 }
  //   ]
  // }), []);

  // Use provided data or fall back to mock data
  const actualPortfolio = portfolioHealth;

  // Consolidated breakdown calculation for item view
  const consolidatedBreakdown = useMemo(() => {
    const investments = actualPortfolio.investments || [];

    // Filter out invalid investments (zero quantity or invalid numbers)
    const activeInvestments = investments.filter(inv => {
      const quantity = parseFloat(inv.quantity);
      return !isNaN(quantity) && quantity > 0;
    });

    if (activeInvestments.length === 0) return [];

    const itemGroups = {};
    let totalValue = 0;

    // Group investments by consolidated category
    activeInvestments.forEach(inv => {
      const consolidatedName = consolidateItems(inv.name);
      const currentPrice = parseFloat(inv.current_price);
      const quantity = parseFloat(inv.quantity);
      
      // Skip invalid price/quantity data
      if (isNaN(currentPrice) || isNaN(quantity)) return;
      
      const value = currentPrice * quantity;
      
      // Initialize group if it doesn't exist
      if (!itemGroups[consolidatedName]) {
        itemGroups[consolidatedName] = {
          name: consolidatedName,
          count: 0,
          totalValue: 0,
          items: []
        };
      }
      
      // Accumulate group data
      itemGroups[consolidatedName].count += quantity;
      itemGroups[consolidatedName].totalValue += value;
      itemGroups[consolidatedName].items.push(inv);
      totalValue += value;
    });

    // Convert to array format with percentage calculations
    return Object.values(itemGroups)
      .map(group => ({
        ...group,
        percentage: totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0,
        value: group.totalValue
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [actualPortfolio.investments, consolidateItems]);

  // Main data processing pipeline with search filtering and small slice handling
  const processedData = useMemo(() => {
    // Select base data based on current toggle
    const rawData = activeToggle === 'item' ? consolidatedBreakdown : (actualPortfolio.typeBreakdown || []);
    
    // Apply search filter
    const filteredData = rawData.filter(item =>
      item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    
    // Small slice grouping logic - only for item view in chart mode
    if (activeToggle === 'item' && viewMode === 'chart') {
      const threshold = 2; // 2% threshold for small slices
      const largeSlices = filteredData.filter(item => item.percentage >= threshold);
      const smallSlices = filteredData.filter(item => item.percentage < threshold);
      
      let processedData = [...largeSlices];
      
      // Handle small slices based on user preference
      if (smallSlices.length > 0) {
        if (showSmallSlices) {
          // Show individual small slices
          processedData = [...processedData, ...smallSlices];
        } else {
          // Group small slices into "Others" category
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
    
    // For type view or table view, return filtered data without grouping
    return filteredData.sort((a, b) => b.percentage - a.percentage);
  }, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, showSmallSlices, debouncedSearchTerm, viewMode]);

  // Table-specific data processing
  const tableData = useMemo(() => {
  const rawData = activeToggle === 'item' ? consolidatedBreakdown : (actualPortfolio.typeBreakdown || []);
  
  return rawData.filter(item =>
    item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  ).sort((a, b) => b.percentage - a.percentage);
}, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, debouncedSearchTerm]);

  // Color assignment function with fallback logic
  const getItemColor = useMemo(() => (item, index) => {
    // Special color for grouped items
    if (item.isGrouped) return '#64748B';
    
    if (activeToggle === 'item') {
      // Use predefined item colors or fall back to weapon color array
      return colors.item[item.name] || colors.weapon[index % colors.weapon.length];
    }

    // Use type-specific colors or default gray
    return colors.type[item.name.toLowerCase()] || '#6B7280';
  }, [activeToggle, colors]);

  // Get current diversity metrics based on active toggle
  const currentScore = activeToggle === 'item' ? 
    actualPortfolio.itemDiversityScore : 
    actualPortfolio.typeDiversityScore;
    
  const currentFeedback = activeToggle === 'item' ? 
    actualPortfolio.itemFeedback : 
    actualPortfolio.typeFeedback;

  // Check if small slices exist in current item view
  const hasSmallSlices = activeToggle === 'item' && consolidatedBreakdown.some(item => item.percentage < 2);

  // Custom tooltip component for pie chart hover interactions
  const CustomTooltip = React.memo(({ active, payload, coordinate }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Prevent hover tooltip when sticky tooltip is open for the same slice
      if (data.isGrouped && stickyTooltip && stickyTooltip.name === data.name) {
        return null; // Don't show hover tooltip when sticky is open for same slice
      }
      
      // Adjust tooltip position to avoid overlap with sticky tooltips
      const tooltipStyle = data.isGrouped ? {} : {
        transform: 'translateX(-65%)',
        marginLeft: '-15px'
      };
      
      return (
        <div 
          className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs"
          style={tooltipStyle}
        >
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
            {/* Interactive hint for grouped items */}
            {data.isGrouped && (
              <p className="text-yellow-400 text-xs mt-1">
                {selectedSlice === data.name 
                  ? `Click to deselect • ${data.items.length} items`
                  : `Click to see ${data.items.length} grouped items`
                }
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  });

  // Sticky tooltip component for expanded "Others" group details
  const StickyTooltip = React.memo(() => {
    if (!stickyTooltip) return null;
    
    const data = stickyTooltip;
    return (
      <div 
        className="absolute bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs z-50 pointer-events-auto"
        style={{
          right: '13px',
          top: '250px'
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-medium text-base">{data.name}</p>
          <button
            onClick={() => setStickyTooltip(null)}
            className="text-gray-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Summary information */}
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

          {/* Detailed breakdown of grouped items */}
          <div className="mt-2 pt-2 border-t border-gray-600">
            <p className="text-yellow-400 text-xs mb-1">
              Contains {data.items.length} items:
            </p>
            <div className="text-xs text-gray-300 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {data.items.map((item, i) => (
                <div key={i} className="py-0.5">• {item.name} ({formatPercentage(item.percentage)})</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Custom label renderer for pie chart slices
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, name, startAngle, endAngle }) => {
    // Calculate slice angle to determine if label should be shown
    const sliceAngle = Math.abs(endAngle - startAngle);
    
    // Only show labels for significant slices or "Others" group
    if (percentage < 2 && sliceAngle < 15 && name !== 'Others') return null;
    
    // Calculate label position
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

  // Pagination logic
  // Select appropriate data source based on current view mode
  const currentData = viewMode === 'table' ? tableData : processedData;
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentPageData = currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handle clicks on distribution list items
  const handleDistributionItemClick = useCallback((item) => {
  if (item.isGrouped) {
    const isCurrentlySelected = selectedSlice === item.name;
    if (isCurrentlySelected) {
      setStickyTooltip(null);
      setSelectedSlice(null);
    } else {
      setStickyTooltip(item); // Show detailed breakdown
      setSelectedSlice(item.name);
    }
  } else {
    setStickyTooltip(null);
    setSelectedSlice(selectedSlice === item.name ? null : item.name);
  }
}, [selectedSlice]);

  // Handle toggle changes between type and item views
  const handleToggleChange = useCallback((newToggle) => {
    setActiveToggle(newToggle);
    setCurrentPage(0);
    setSearchTerm('');
    setSelectedSlice(null);
  }, []);

  // Handle pie chart slice clicks
  const handleSliceClick = useCallback((data, index) => {
    if (data.isGrouped) {
      const isCurrentlySelected = selectedSlice === data.name;
      if (isCurrentlySelected) {
        setStickyTooltip(null);
        setSelectedSlice(null);
      } else {
        setStickyTooltip(data);
        setSelectedSlice(data.name);
      }
    } else {
      setStickyTooltip(null);
      setSelectedSlice(selectedSlice === data.name ? null : data.name);
    }
  }, [selectedSlice]);

  // Handle clicks outside chart elements to deselect
  const handleChartContainerClick = useCallback((e) => {
  // Only deselect if clicking on container elements, not chart slices
  if (e.target.tagName === 'DIV' || e.target.tagName === 'svg') {
    setSelectedSlice(null);
    setStickyTooltip(null);
  }
}, []);

  // Toggle button configuration
  const toggleOptions = [
    { id: 'type', label: 'By Type', description: 'Investment type distribution' },
    { id: 'item', label: 'By Item', description: 'Consolidated item distribution' }
  ];

  // Table view component for tabular data display
  const TableView = () => (
    <div className="h-full overflow-auto">
    <table className="w-full text-sm">
      {/* Sticky header */}
      <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm">
        <tr className="border-b border-gray-600">
          <th className="text-left py-3 px-1 text-gray-300">Item</th>
          <th className="text-right py-3 text-gray-300">Value</th>
          <th className="text-right py-3 text-gray-300">Share</th>
          <th className="text-right py-3 px-1 text-gray-300">Count</th>
        </tr>
      </thead>

        {/* Data rows */}
        <tbody>
          {currentPageData.map((item, index) => (
            <tr 
              key={`${item.name}-${index}`} 
              className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
            >
              {/* Item name with color indicator */}
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

              {/* Financial data columns */}
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

  // Main render
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col relative" style={{ minHeight: '600px' }}>

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Portfolio Distribution</h2>
          <p className="text-sm text-gray-400 mt-1">
            Total: {formatCurrency(currentData.reduce((sum, item) => sum + item.value, 0))}
          </p>
        </div>

        {/* Diversity Score Badge */}
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
      <div className={`flex items-center justify-between gap-4 ${viewMode === 'table' ? 'mb-4' : ''}`}>
        {/* Search Input */}
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

          {/* Small slice toggle - Conditional visibility based on multiple criteria */}
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

      {/* Main content area - Chart or Table View */}
      <div className={viewMode === 'table' ? 'mb-6' : ''}></div>
      {viewMode === 'chart' ? (
        <div className="flex-1" style={{ minHeight: '320px', maxHeight: '320px' }} onClick={handleChartContainerClick}>
          {/* Recharts ResponsiveContainer - Automatically adjusts to parent dimensions */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={130}
                innerRadius={55}
                fill="#8884d8"
                dataKey="value"
                stroke="#1f2937"
                strokeWidth={1}
                animationBegin={0}
                animationDuration={800}
                onClick={handleSliceClick}
                className="cursor-pointer"
                minAngle={2}
              >
                {/* Individual slice styling - Each slice gets custom colors and selection states */}
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
              {/* Interactive tooltip that follows mouse cursor */}
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Sticky tooltip for "Others" group details - Positioned absolutely, stays visible */}
          <StickyTooltip />
        </div>
      ) : (
        /* Table View Container */
        <div className="flex-1 mb-6">
          <TableView />
        </div>
      )}
      
      {/* Diversity Score Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {/* Dynamic label based on current analysis type */}
          <span className="text-sm text-gray-400">
            {activeToggle === 'item' ? 'Item' : 'Type'} Diversity Score
          </span>
          {/* Percentage display with consistent formatting */}
          <span className="text-sm font-medium text-white">{currentScore}%</span>
        </div>
        {/* Progress bar container with rounded styling */}
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

      {/* Distribution List or Pagination */}
      {viewMode === 'chart' ? (
        <div>
          {/* Distribution list header with dynamic counts and pagination controls */}
          <div className="flex items-center justify-between mb-3">
            {/* Dynamic title showing current filter results */}
            <h3 className="text-sm font-medium text-white">
              {activeToggle === 'item' ? 'Item' : 'Type'} Distribution ({currentData.length} {activeToggle === 'item' ? 'categories' : 'types'})
            </h3>
            {/* Pagination controls - Only show when data spans multiple pages */}
            {totalPages > 1 && (
              <div className="flex items-center">
                {/* Previous page button - Disabled on first page */}
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 text-xs bg-gray-700/50 text-gray-300 rounded hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {/* Page indicator - Shows current position */}
                <span className="text-xs text-gray-400 px-2">
                  {currentPage + 1} of {totalPages}
                </span>
                {/* Next page button - Disabled on last page */}
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
          {/* Distribution items container with fixed minimum height for layout stability */}
          <div className="space-y-1" style={{ minHeight: '255px' }}>
            {/* Render current page of distribution items using memoized component */}
            {currentPageData.map((item, index) => (
              <DistributionItem
                key={`${item.name}-${index}`}
                item={item}
                index={index}
                startIndex={startIndex}
                isSelected={selectedSlice === item.name}
                onClick={() => handleDistributionItemClick(item)}
                getItemColor={getItemColor}
                formatCurrency={formatCurrency}
                formatPercentage={formatPercentage}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Table View Pagination - Only show pagination controls when needed */
        totalPages > 1 && (
          <div className="flex items-center justify-center">
            {/* Centered pagination controls with same styling as chart view */}
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