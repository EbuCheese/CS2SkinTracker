import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip} from 'recharts';
import { ChartPie, Table, List } from 'lucide-react';
import { useItemSearch } from '@/hooks/portfolio';

// color palette  constant
const COLOR_PALETTES = {
  type: {
    weapon:  '#16A34A', // Green
    knife:   '#E11D48', // Crimson Red
    glove:   '#FACC15', // Bright Yellow
    craft:    '#F97316', // Orange
    case:     '#2563EB', // Blue
    sticker:  '#06B6D4', // Cyan / Teal
    agent:    '#9333EA', // Purple
    keychain: '#EC4899', // Pink
    graffiti: '#DC2626', // Deep Red
    patch:    '#88ffd7ff', // Aqua Green
  },
  item: {
    'Knives':   '#14B8A6',
    'Gloves':   '#A855F7',
    'Stickers': '#84CC16',
    'Patches':  '#DC2626',
    'Graffiti': '#F97316',
    'Charms':   '#7C3AED',
    'Agents':   '#581C87'
  },
};

// generate unique item colors
const generateItemColors = (count = 50) => {
  const colors = [];
  const goldenRatio = 0.618033988749;
  
  for (let i = 0; i < count; i++) {
    const hue = (i * goldenRatio * 360) % 360;
    const saturation = 65 + (i % 4) * 8; // 65%, 73%, 81%, 89%
    const lightness = 45 + (i % 3) * 10;  // 45%, 55%, 65%
    colors.push(`hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
};

const ITEM_COLORS = generateItemColors(50);

// Color assignment cache to ensure adjacent slices get distinct colors
const colorAssignmentCache = new Map();

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
        style={{ backgroundColor: getItemColor(item) }}
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
const PortfolioHealthPieChart = ({ portfolioHealth, optimisticUpdates = null, portfolioSummary = null }) => {
  // Toggle types
  const [activeToggle, setActiveToggle] = useState('type');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  // Slice states
  const [showSmallSlices, setShowSmallSlices] = useState(true);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [stickyTooltip, setStickyTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ side: 'right', x: 0, y: 0 });

  // Search states
  const [searchTerm, setSearchTerm] = useState('');

  // Reset UI state when switching between major view modes
  useEffect(() => {
    setSelectedSlice(null);
    setStickyTooltip(null);
    setSearchTerm(''); // Clear search when switching modes
  }, [activeToggle, viewMode, showSmallSlices]);


  // Item name consolidation logic for grouping similar items
  const actualPortfolio = portfolioHealth;

  // Consolidated breakdown calculation for item view
  const consolidatedBreakdown = actualPortfolio.weaponBreakdown || [];

  // Main data processing pipeline with search filtering and small slice handling
  // Get raw items for search hook
const rawItemsForSearch = useMemo(() => {
  if (activeToggle === 'item') {
    // Flatten all items from consolidatedBreakdown for searching
    return consolidatedBreakdown.flatMap(category => 
      (category.items || actualPortfolio.detailedItems?.[category.name] || [])
        .map(item => ({
          ...item,
          categoryName: category.name,
          categoryValue: category.value,
          categoryPercentage: category.percentage,
          categoryCount: category.count
        }))
    );
  }
  return actualPortfolio.typeBreakdown || [];
}, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, actualPortfolio.detailedItems]);

// Use the search hook
const { filteredItems: searchFilteredItems, hasActiveSearch } = useItemSearch(rawItemsForSearch, searchTerm);

// Main data processing pipeline with search filtering and small slice handling
const processedData = useMemo(() => {
  let baseData;
  
  if (activeToggle === 'item') {
    if (hasActiveSearch) {
      // Group filtered individual items back into categories
      const categoryGroups = new Map();
      
      searchFilteredItems.forEach(item => {
        const categoryName = item.categoryName;
        if (!categoryGroups.has(categoryName)) {
          categoryGroups.set(categoryName, {
            name: categoryName,
            items: [],
            value: 0,
            count: 0
          });
        }
        
        const category = categoryGroups.get(categoryName);
        category.items.push(item);
        category.value += (parseFloat(item.current_price || 0) * parseFloat(item.quantity || 0));
        category.count += parseInt(item.quantity || 0);
      });
      
      // Calculate percentages
      const totalValue = actualPortfolio.typeBreakdown?.reduce((sum, type) => sum + type.value, 0) || 
                        consolidatedBreakdown?.reduce((sum, item) => sum + item.value, 0) || 0;
      
      baseData = Array.from(categoryGroups.values()).map(category => ({
        ...category,
        percentage: totalValue > 0 ? ((category.value / totalValue) * 100) : 0
      }));
    } else {
      baseData = consolidatedBreakdown;
    }
  } else {
    baseData = hasActiveSearch ? searchFilteredItems : actualPortfolio.typeBreakdown;
  }

  // Early return for non-chart views
  if (viewMode !== 'chart' || activeToggle !== 'item') {
    return baseData.sort((a, b) => b.percentage - a.percentage);
  }

  // Enhanced data with items - only for item view in chart mode
  const enhancedData = baseData.map(item => ({
    ...item,
    items: item.items || (actualPortfolio.detailedItems?.[item.name]) || []
  }));

  // Small slice grouping - only when needed and not searching
  if (hasActiveSearch) {
    return enhancedData.sort((a, b) => b.percentage - a.percentage);
  }

  const threshold = 2;
  const largeSlices = [];
  const smallSlices = [];
  
  // Single pass to separate large and small slices
  enhancedData.forEach(item => {
    if (item.percentage >= threshold) {
      largeSlices.push(item);
    } else {
      smallSlices.push(item);
    }
  });

  // Handle small slices
  if (smallSlices.length === 0 || showSmallSlices) {
    return [...largeSlices, ...smallSlices].sort((a, b) => b.percentage - a.percentage);
  }

  // Group small slices - calculate totals in single pass
  const totals = smallSlices.reduce(
    (acc, item) => ({
      value: acc.value + item.value,
      percentage: acc.percentage + item.percentage,
      count: acc.count + item.count
    }),
    { value: 0, percentage: 0, count: 0 }
  );

  if (totals.value > 0) {
    largeSlices.push({
      name: 'Others',
      ...totals,
      isGrouped: true,
      items: smallSlices
    });
  }

  return largeSlices.sort((a, b) => b.percentage - a.percentage);
}, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, actualPortfolio.detailedItems, showSmallSlices, searchFilteredItems, hasActiveSearch, viewMode]);

  // Table-specific data processing
  const tableData = useMemo(() => {
    if (viewMode === 'table') {
      let baseData;
      
      if (activeToggle === 'item') {
        if (hasActiveSearch) {
          // Group filtered individual items back into categories for table
          const categoryGroups = new Map();
          
          searchFilteredItems.forEach(item => {
            const categoryName = item.categoryName;
            if (!categoryGroups.has(categoryName)) {
              categoryGroups.set(categoryName, {
                name: categoryName,
                items: [],
                value: 0,
                count: 0
              });
            }
            
            const category = categoryGroups.get(categoryName);
            category.items.push(item);
            category.value += (parseFloat(item.current_price || 0) * parseFloat(item.quantity || 0));
            category.count += parseInt(item.quantity || 0);
          });
          
          // Calculate percentages
          const totalValue = actualPortfolio.typeBreakdown?.reduce((sum, type) => sum + type.value, 0) || 
                            consolidatedBreakdown?.reduce((sum, item) => sum + item.value, 0) || 0;
          
          baseData = Array.from(categoryGroups.values()).map(category => ({
            ...category,
            percentage: totalValue > 0 ? ((category.value / totalValue) * 100) : 0
          }));
        } else {
          baseData = consolidatedBreakdown;
        }
      } else {
        baseData = hasActiveSearch ? searchFilteredItems : actualPortfolio.typeBreakdown;
      }
      
      return baseData.sort((a, b) => b.percentage - a.percentage);
    }
    return processedData;
  }, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, searchFilteredItems, hasActiveSearch, viewMode, processedData]);



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

  // Empty section
  const isEmpty = !actualPortfolio || 
  ((!actualPortfolio.typeBreakdown || actualPortfolio.typeBreakdown.length === 0) && 
   (!consolidatedBreakdown || consolidatedBreakdown.length === 0));

  const sortedProcessedData = useMemo(() => {
    return [...processedData].sort((a, b) => {
      // Primary sort by percentage (descending)
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      // Secondary sort by name for stable ordering when percentages are equal
      return a.name.localeCompare(b.name);
    });
  }, [processedData]);

  // Color assignment function with fallback logic
  const getItemColor = useCallback((item, dataArray = processedData) => {
  // Special handling for grouped "Others" items
  if (item.name === 'Others' && item.isGrouped) {
    return '#64748B';
  }
  
  // Use predefined colors for type view
  if (activeToggle !== 'item') {
    const predefinedColor = COLOR_PALETTES.type[item.name.toLowerCase()];
    if (predefinedColor) return predefinedColor;
  }
  
  // Use predefined colors for specific item categories
  const predefinedItemColor = COLOR_PALETTES.item[item.name];
  if (predefinedItemColor) return predefinedItemColor;
  
  // Get current item's index in the data array
  const currentIndex = dataArray.findIndex(dataItem => dataItem.name === item.name);
  
  // Create a cache key that includes the data context
  const cacheKey = `${item.name}-${currentIndex}-${dataArray.length}`;
  
  // Check if we already assigned a color for this configuration
  if (colorAssignmentCache.has(cacheKey)) {
    return colorAssignmentCache.get(cacheKey);
  }
  
  // Get colors already used by adjacent slices
  const usedColors = new Set();
  const adjacentIndices = [currentIndex - 1, currentIndex + 1];
  
  adjacentIndices.forEach(adjIndex => {
    if (adjIndex >= 0 && adjIndex < dataArray.length) {
      const adjItem = dataArray[adjIndex];
      const adjCacheKey = `${adjItem.name}-${adjIndex}-${dataArray.length}`;
      if (colorAssignmentCache.has(adjCacheKey)) {
        usedColors.add(colorAssignmentCache.get(adjCacheKey));
      }
    }
  });
  
  // Find an available color that's not used by adjacent slices
  let selectedColor;
  let attempts = 0;
  const maxAttempts = ITEM_COLORS.length * 2; // Prevent infinite loops
  
  do {
    // Use hash-based selection with offset for different attempts
    let hash = 0;
    for (let i = 0; i < item.name.length; i++) {
      hash = ((hash << 5) - hash) + item.name.charCodeAt(i);
      hash = hash & hash;
    }
    
    const colorIndex = (Math.abs(hash) + attempts * 7) % ITEM_COLORS.length;
    selectedColor = ITEM_COLORS[colorIndex];
    attempts++;
  } while (usedColors.has(selectedColor) && attempts < maxAttempts);
  
  // Cache the selected color
  colorAssignmentCache.set(cacheKey, selectedColor);
  
  return selectedColor;
}, [activeToggle, processedData]);

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
    if (stickyTooltip && stickyTooltip.name === data.name) {
      return null;
    }
    
    // Get slice color for styling
    const sliceColor = getItemColor(data);
    
    // Adjust tooltip position to avoid overlap with sticky tooltips
    const tooltipStyle = data.isGrouped ? {} : {
      transform: 'translateX(-65%)',
      marginLeft: '-15px'
    };
    
    return (
      <div 
        className="bg-gray-900/95 border-2 rounded-lg p-2 shadow-xl backdrop-blur-sm max-w-xs"
        style={{
          ...tooltipStyle,
          borderColor: sliceColor
        }}
      >
        <p 
          className="font-medium text-base mb-2"
          style={{ 
            color: sliceColor
          }}
        >
          {data.name}
        </p>
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
          {/* Interactive hint for items in item view */}
          {activeToggle === 'item' && (
            <p className="text-yellow-400 text-xs mt-1">
              {selectedSlice === data.name 
                ? 'Click to deselect'
                : data.isGrouped 
                  ? `Click to see ${data.items.length} grouped items`
                  : data.items && data.items.length > 0
                    ? `Click to see ${data.items.length} individual items`
                    : 'Click for details'
              }
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
});

const buildItemDisplayName = (item) => {
  let fullName = item.name || 'Unknown Item';
  let prefixes = '';
  
  // Build prefixes
  if (item.variant === 'stattrak' || (item.stattrak && item.stattrak !== 'false')) {
    prefixes += 'StatTrak™ ';
  }
  if (item.variant === 'souvenir' || (item.souvenir && item.souvenir !== 'false')) {
    prefixes += 'Souvenir ';
  }
  
  // Add skin/variant
  const skinName = item.variant && 
    item.variant !== 'Unknown' && 
    item.variant.toLowerCase() !== 'normal' && 
    item.variant !== 'stattrak' && 
    item.variant !== 'souvenir' && 
    item.variant !== item.name
      ? item.variant 
      : item.skin_name && 
        item.skin_name !== 'Unknown' && 
        item.skin_name.toLowerCase() !== 'normal' && 
        item.skin_name !== item.name
        ? item.skin_name
        : null;
  
  if (skinName) {
    fullName += ` | ${skinName}`;
  }
  
  fullName = prefixes + fullName;
  
  // Add condition
  if (item.condition && item.condition !== 'Unknown') {
    const conditionMap = {
      'Factory New': 'FN',
      'Minimal Wear': 'MW', 
      'Field-Tested': 'FT',
      'Well-Worn': 'WW',
      'Battle-Scarred': 'BS'
    };
    const shortCondition = conditionMap[item.condition] || item.condition;
    fullName += ` (${shortCondition})`;
  }
  
  return fullName;
};

// Updated StickyTooltip component - replace the existing one
const StickyTooltip = React.memo(() => {
  if (!stickyTooltip) return null;
  
  const data = stickyTooltip;
  const hasItemBreakdown = data.items && data.items.length > 0;
  const sliceColor = getItemColor(data);
  
  const processedItems = useMemo(() => {
  if (!hasItemBreakdown) return [];
  
  const totalPortfolioValue = actualPortfolio.typeBreakdown?.reduce((sum, type) => sum + type.value, 0) || 
                              consolidatedBreakdown?.reduce((sum, item) => sum + item.value, 0) || 
                              actualPortfolio.totalValue || 
                              data.value;
  
  const allItems = data.isGrouped && data.items
    ? data.items.flatMap(categoryItem => 
        (categoryItem.items || []).map(actualItem => ({
          ...actualItem,
          displayName: buildItemDisplayName(actualItem),
          categoryName: categoryItem.name,
          categoryPercentage: categoryItem.percentage
        }))
      )
    : data.items.map(item => ({
        ...item,
        displayName: buildItemDisplayName(item)
      }));
  
  return allItems
    .map((item, i) => {
      const individualValue = (parseFloat(item.current_price || 0) * parseFloat(item.quantity || 0));
      const itemPercentage = totalPortfolioValue > 0 ? ((individualValue / totalPortfolioValue) * 100) : 0;
      
      return {
        ...item,
        itemPercentage,
        originalIndex: i
      };
    })
    .sort((a, b) => b.itemPercentage - a.itemPercentage);
}, [data, hasItemBreakdown, actualPortfolio.typeBreakdown, consolidatedBreakdown, actualPortfolio.totalValue]);

  // Fixed positioning - simple left/right placement
  const getTooltipStyle = () => {
    if (tooltipPosition.side === 'left') {
      return {
        left: '13px',
        top: '220px',
        width: 'auto',
        maxWidth: '200px',
        minWidth: '150px',
        borderColor: sliceColor
      };
    } else {
      return {
        right: '13px',
        top: '220px',
        width: 'auto',
        maxWidth: '200px',
        minWidth: '150px',
        borderColor: sliceColor
      };
    }
  };
  
  return (
    <div 
      className="absolute bg-gray-900/95 border-2 rounded-lg p-2 shadow-xl backdrop-blur-sm z-50 pointer-events-auto"
      style={getTooltipStyle()}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside tooltip from bubbling up
    >
      {/* Header with close button */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div 
          className="font-medium text-base flex-1 break-words"
          style={{ 
            color: sliceColor,
            lineHeight: '1.3'
          }}
        >
          {data.name}
        </div>
        <button
          onClick={() => {
            setStickyTooltip(null);
            setSelectedSlice(null);
          }}
          className="text-gray-400 hover:text-white text-sm flex-shrink-0 mt-0.5"
          style={{ minWidth: '16px' }} // Ensure button doesn't shrink
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

        {/* Show individual item breakdown if available */}
        {hasItemBreakdown && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <p className="text-yellow-400 text-xs mb-1">
              {data.isGrouped ? `Contains ${data.items.length} items:` : `Individual items (${data.items.length}):`}
            </p>
            <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800">
              <div className="space-y-1 pr-1">
                {processedItems.map((item, sortedIndex) => (
                  <div 
                    key={data.isGrouped ? `${item.categoryName}-${item.originalIndex}` : item.originalIndex} 
                    className="group flex items-start justify-between px-0.5 py-1.5 rounded-sm hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xxs text-gray-300 break-words leading-relaxed">
                          {item.displayName}
                        </p>
                      </div>
                    </div>
                    <div className="ml-1 flex items-center gap-0.5">
                    {/* Quantity badge */}
                    <span className="text-xs text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded">
                      {item.quantity}x
                    </span>
                    {/* Percentage badge */}
                    <span className="text-xs text-gray-400 bg-gray-800/60 px-1.5 py-0.5 rounded">
                      {formatPercentage(item.itemPercentage)}
                    </span>
                  </div>
                </div>
                ))}
              </div>
            </div>
          </div>
        )}
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

  // Select appropriate data source based on current view mode
  const currentData = viewMode === 'table' ? tableData : sortedProcessedData;
  const startIndex = 0;

  // calculate total holding value with optimistic updates
  const currentTotal = useMemo(() => {
    // Use current holdings value from portfolio summary if available
    const baseHoldingsValue = portfolioSummary?.current_holdings_value ? 
      parseFloat(portfolioSummary.current_holdings_value) : 
      currentData.reduce((sum, item) => sum + item.value, 0);
    
    // Apply optimistic updates
    const optimisticHoldingsUpdate = optimisticUpdates?.currentHoldingsValue || 0;
    
    return baseHoldingsValue + optimisticHoldingsUpdate;
  }, [currentData, optimisticUpdates, portfolioSummary]);

  // Handle clicks on distribution list items
  const handleDistributionItemClick = useCallback((item, event) => {
  if (activeToggle === 'item') {
    const isCurrentlySelected = selectedSlice === item.name;
    if (isCurrentlySelected) {
      setStickyTooltip(null);
      setSelectedSlice(null);
    } else {
      // For list clicks, default to right side but could be enhanced
      // to detect which side of the screen the list is on
      setTooltipPosition({ side: 'right', x: 0, y: 250 });
      setStickyTooltip(item);
      setSelectedSlice(item.name);
    }
  } else {
    // For type view, just handle selection without sticky tooltip
    setStickyTooltip(null);
    setSelectedSlice(selectedSlice === item.name ? null : item.name);
  }
}, [selectedSlice, activeToggle]);

  // Handle toggle changes between type and item views
  const handleToggleChange = useCallback((newToggle) => {
    setActiveToggle(newToggle);
    setSearchTerm('');
    setSelectedSlice(null);
  }, []);

  // Handle pie chart slice clicks
  const handleSliceClick = useCallback((data, index, event) => {
  if (activeToggle === 'item') {
    const isCurrentlySelected = selectedSlice === data.name;
    if (isCurrentlySelected) {
      setStickyTooltip(null);
      setSelectedSlice(null);
    } else {
      // Get the chart container to calculate relative position
      const chartContainer = event.currentTarget.closest('.recharts-wrapper') || event.currentTarget.closest('[data-chart-container]');
      const containerRect = chartContainer?.getBoundingClientRect();
      
      if (containerRect) {
        const clickX = event.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        const centerX = containerWidth / 2;
        
        // Determine which side to show tooltip based on click position
        const side = clickX < centerX ? 'left' : 'right';
        
        setTooltipPosition({
          side,
          x: clickX,
          y: event.clientY - containerRect.top
        });
      } else {
        // Fallback to right side if we can't determine position
        setTooltipPosition({ side: 'right', x: 0, y: 250 });
      }
      
      setStickyTooltip(data);
      setSelectedSlice(data.name);
    }
  } else {
    // For type view, just handle selection without sticky tooltip
    setStickyTooltip(null);
    setSelectedSlice(selectedSlice === data.name ? null : data.name);
  }
}, [selectedSlice, activeToggle]);

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
    <div className="flex-shrink-0" style={{ height: '500px' }}>
    <div className="h-full overflow-auto pr-2">
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
          {currentData.map((item, index) => (
            <tr 
              key={`${item.name}-${index}`} 
              className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
            >
              {/* Item name with color indicator */}
              <td className="py-4 px-1">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getItemColor(item, currentData) }}
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
    </div>
  );

  // Main render
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col relative" style={{ minHeight: '800px' }}>

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Portfolio Distribution</h2>
          <p className="text-sm text-gray-400 mt-1">
            Total: {formatCurrency(currentTotal)}
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
      <div className={`flex items-center justify-between gap-4 ${viewMode === 'table' && !isEmpty ? 'mb-4' : ''}`}>
        {/* Search Input */}
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder={hasActiveSearch ? `Searching ${activeToggle}s...` : `Search ${activeToggle}s...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
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
      <div className={viewMode === 'table' && !isEmpty ? 'mb-6' : ''}></div>
      {isEmpty ? (
        // Empty State - Different text based on view mode
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            {viewMode === 'table' ? (
              <Table className="w-8 h-8 text-gray-500" />
            ) : (
              <ChartPie className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <h3 className="text-xl font-medium text-gray-400 mb-1">No Portfolio Data</h3>
          <p className="text-gray-500 text-md max-w-md">
            {viewMode === 'table' 
              ? 'Portfolio distribution table view will appear here when you add investments.'
              : 'Portfolio distribution pie chart will appear here when you add investments.'
            }
          </p>
        </div>
      ) :
      viewMode === 'chart' ? (
        <div className="flex-shrink-0" style={{ height: '320px', maxHeight: '320px' }} onClick={handleChartContainerClick}>
          {/* Recharts ResponsiveContainer - Automatically adjusts to parent dimensions */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedProcessedData}
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
                onClick={(data, index, event) => handleSliceClick(data, index, event)}
                className="cursor-pointer"
                minAngle={2}
              >
                {/* Individual slice styling - Each slice gets custom colors and selection states */}
                {sortedProcessedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getItemColor(entry, sortedProcessedData)}
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
      <div className={`p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 ${viewMode === 'table' ? 'mb-2' : 'mb-6'}`}>
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
          </div>
          {/* Distribution items container with fixed minimum height for layout stability */}
          <div className="overflow-y-auto" style={{ height: '200px' }}>
            <div className="space-y-1 pr-2"> {/* Add right padding for scrollbar */}
            {currentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <List className="w-8 h-8 text-gray-500" />
                </div>
                <h4 className="text-xl font-medium text-gray-400 mb-2">No {activeToggle === 'item' ? 'Items' : 'Types'} Found</h4>
                <p className="text-gray-500 max-w-md">
                  {hasActiveSearch
                    ? `No ${activeToggle}s match your search "${searchTerm}"`
                    : `${activeToggle === 'item' ? 'Item' : 'Type'} distribution list will appear here when you add investments.`
                  }
                </p>
              </div>
            ) : (
              /* Render current page of distribution items using memoized component */
              currentData.map((item, index) => (
                <DistributionItem
                  key={`${item.name}-${index}`}
                  item={item}
                  index={index}
                  startIndex={0}
                  isSelected={selectedSlice === item.name}
                  onClick={() => handleDistributionItemClick(item)}
                  getItemColor={(item) => getItemColor(item, currentData)}
                  formatCurrency={formatCurrency}
                  formatPercentage={formatPercentage}
                />
              ))
            )}
              </div>
            </div>
        </div>
    ) : null}
    </div>
);
};

export default PortfolioHealthPieChart;