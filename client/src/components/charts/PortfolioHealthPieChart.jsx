import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip} from 'recharts';
import { ChartPie, Table, List } from 'lucide-react';

// color palette  constant
const COLOR_PALETTES = {
  type: {
    liquid:  '#10B981',
    craft:  '#F59E0B',
    case:   '#3B82F6',
    sticker:'#32F1FF',
    agent:  '#8B5CF6',
    keychain:'#EC4899',
    graffiti:'#EF4444',
    patch:  '#06B6D4'
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
  // Weapon palette WITHOUT any of the colors above
  weapon: [
    '#0EA5E9', '#65A30D', '#EA580C', '#9333EA', '#E11D48',
    '#B91C1C', '#D97706', '#6366F1', '#D946EF', '#C2410C',
    '#7C2D12', '#92400E', '#1E40AF', '#BE123C', '#0F766E',
    '#166534', '#CA8A04', '#1E3A8A', '#6B21A8', '#9F1239',
    '#134E4A', '#15803D', '#312E81', '#701A75', '#831843',
    '#0F3460', '#064E3B', '#365314', '#422006', '#1E1B4B',
    '#4C1D95', '#DB2777', '#0891B2', '#059669', '#7F1D1D',
    '#0C4A6E', '#D97706', '#0284C7', '#0D9488', '#16A34A'
  ]
};

// 1) A set of hand-picked, high-contrast colors
const CONTRAST_COLORS = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2',
  '#59a14f', '#edc948', '#af7aa1', '#ff9da7'
];

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

const generateUniqueColors = (() => {
  const cache = new Map();
 
  // HSL-based color generation for infinite unique colors
  const generateHSLColor = (index, total) => {
    // Use golden ratio for optimal color distribution
    const goldenRatio = 0.618033988749;
    const hue = ((index * goldenRatio) % 1) * 360;
   
    // Vary saturation and lightness for more distinction
    const saturation = 65 + (index % 3) * 15; // 65%, 80%, 95%
    const lightness = 45 + (Math.floor(index / 3) % 3) * 10; // 45%, 55%, 65%
   
    return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
  };
 
  return (count, baseColors) => {
    const cacheKey = `${count}-${baseColors?.length || 0}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
   
    const result = [];
   
    // Use base colors first (most carefully chosen)
    for (let i = 0; i < Math.min(count, baseColors.length); i++) {
      result.push(baseColors[i]);
    }
   
    // Generate additional unique colors using HSL if needed
    for (let i = baseColors.length; i < count; i++) {
      result.push(generateHSLColor(i - baseColors.length, count - baseColors.length));
    }
   
    cache.set(cacheKey, result);
    return result;
  };
})();

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
  const [tooltipPosition, setTooltipPosition] = useState({ side: 'right', x: 0, y: 0 });

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
  const colors = COLOR_PALETTES;

  // Item name consolidation logic for grouping similar items
  const actualPortfolio = portfolioHealth;

  // Consolidated breakdown calculation for item view
  const consolidatedBreakdown = actualPortfolio.weaponBreakdown || [];

  // Main data processing pipeline with search filtering and small slice handling
  const processedData = useMemo(() => {
  // Select and filter data in one step
  const rawData = activeToggle === 'item' ? consolidatedBreakdown : actualPortfolio.typeBreakdown;
  const filteredData = rawData.filter(item =>
    item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  // Early return for non-chart views or non-item views
  if (viewMode !== 'chart' || activeToggle !== 'item') {
    return filteredData.sort((a, b) => b.percentage - a.percentage);
  }

  // Enhanced data with items - only for item view in chart mode
  const enhancedData = filteredData.map(item => ({
    ...item,
    items: item.items || (actualPortfolio.detailedItems?.[item.name]) || []
  }));

  // Small slice grouping - only when needed
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
}, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, actualPortfolio.detailedItems, showSmallSlices, debouncedSearchTerm, viewMode]);

  // Table-specific data processing
  const tableData = useMemo(() => {
  // Reuse processedData if it's already filtered and doesn't need small slice handling
  if (viewMode === 'table') {
    const rawData = activeToggle === 'item' ? consolidatedBreakdown : actualPortfolio.typeBreakdown;
    return rawData
      .filter(item => item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      .sort((a, b) => b.percentage - a.percentage);
  }
  return processedData; // Reuse for chart view
}, [activeToggle, consolidatedBreakdown, actualPortfolio.typeBreakdown, debouncedSearchTerm, viewMode, processedData]);

// 2) Helper that will use the contrast palette first, then fallback to HSL
const getColorByIndex = (index) => {
  if (index < CONTRAST_COLORS.length) {
    return CONTRAST_COLORS[index];
  }
  const generated = generateUniqueColors(index + 1, []); 
  return generated[index];
};

// Modified colorAssignments that prioritizes contrast colors for top items
const colorAssignments = useMemo(() => {
  const assignments = new Map();
  const currentData = viewMode === 'table' ? tableData : processedData;
  
  // Create a persistent assignment tracker that survives across renders
  // This should ideally be stored outside the component or in a ref
  const getStableColorForItem = (itemName, isType = false) => {
    // Check predefined colors first
    const predefinedColor = isType 
      ? colors.type[itemName.toLowerCase()] 
      : colors.item[itemName];
    
    if (predefinedColor) return predefinedColor;

    // Create a deterministic hash that's stable regardless of when item was added
    let hash = 0;
    for (let i = 0; i < itemName.length; i++) {
      hash = ((hash << 5) - hash) + itemName.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash to determine if this item gets a contrast color or palette color
    const hashForContrastAssignment = Math.abs(hash);
    
    // Use the complete dataset for priority calculation, not just visible items
    // This ensures priority positions don't change when grouping toggles
    const completeDataset = activeToggle === 'item' ? consolidatedBreakdown : actualPortfolio.typeBreakdown || [];
    const allItems = completeDataset.filter(item => item.name !== 'Others');
    
    const itemsWithHashes = allItems.map(item => ({
      name: item.name,
      hash: (() => {
        let h = 0;
        for (let i = 0; i < item.name.length; i++) {
          h = ((h << 5) - h) + item.name.charCodeAt(i);
          h = h & h;
        }
        return Math.abs(h);
      })()
    }));
    
    // Sort by hash to get consistent priority order
    itemsWithHashes.sort((a, b) => a.hash - b.hash);
    
    // Find this item's priority position in the complete dataset
    const priorityIndex = itemsWithHashes.findIndex(item => item.name === itemName);
    
    // First 8 in priority order get contrast colors
    if (priorityIndex !== -1 && priorityIndex < CONTRAST_COLORS.length) {
      return CONTRAST_COLORS[priorityIndex];
    }

    // Remaining items use hash-based selection from weapon palette
    const availableColors = COLOR_PALETTES.weapon.filter(color => !CONTRAST_COLORS.includes(color));
    const colorIndex = hashForContrastAssignment % availableColors.length;
    return availableColors[colorIndex];
  };

  // Assign colors to all items that appear in current data
  currentData.forEach(item => {
    if (item.name === 'Others' && item.isGrouped) {
      assignments.set(item.name, '#64748B'); // Special color for Others group
    } else {
      assignments.set(item.name, getStableColorForItem(item.name, activeToggle !== 'item'));
    }
  });

  return assignments;
}, [activeToggle, processedData, tableData, viewMode, colors]);

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
  const getItemColor = useCallback((item, index) => {
  const assignedColor = colorAssignments.get(item.name);
  
  // If no assigned color and it's "Others", use specific gray
  if (!assignedColor && item.isGrouped && item.name === 'Others') {
    return '#64748B';
  }
  
  // For all other cases, use assigned color or cyan fallback (NOT gray)
  return assignedColor || '#06B6D4';
}, [colorAssignments]);

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
    const sliceColor = getItemColor(data, 0);
    
    // Adjust tooltip position to avoid overlap with sticky tooltips
    const tooltipStyle = data.isGrouped ? {} : {
      transform: 'translateX(-65%)',
      marginLeft: '-15px'
    };
    
    return (
      <div 
        className="bg-gray-900/95 border-2 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs"
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
  const sliceColor = getItemColor(data, 0);
  
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
      className="absolute bg-gray-900/95 border-2 rounded-lg p-3 shadow-xl backdrop-blur-sm z-50 pointer-events-auto"
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
                    className="group flex items-start justify-between px-1 py-1.5 rounded-md hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-300 break-words leading-relaxed">
                          {item.displayName}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex items-center">
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

  // Pagination logic
  // Select appropriate data source based on current view mode
  const currentData = viewMode === 'table' ? tableData : sortedProcessedData;
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentPageData = currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
    setCurrentPage(0);
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
      <div className={`flex items-center justify-between gap-4 ${viewMode === 'table' && !isEmpty ? 'mb-4' : ''}`}>
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
        <div className="flex-1" style={{ minHeight: '320px', maxHeight: '320px' }} onClick={handleChartContainerClick}>
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
            {/* Show empty state if no data after filtering/search */}
            {currentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <List className="w-8 h-8 text-gray-500" />
                </div>
                <h4 className="text-xl font-medium text-gray-400 mb-2">No {activeToggle === 'item' ? 'Items' : 'Types'} Found</h4>
                <p className="text-gray-500 max-w-md">
                  {debouncedSearchTerm
                    ? `No ${activeToggle}s match your search "${debouncedSearchTerm}"`
                    : `${activeToggle === 'item' ? 'Item' : 'Type'} distribution list will appear here when you add investments.`
                  }
                </p>
              </div>
            ) : (
              /* Render current page of distribution items using memoized component */
              currentPageData.map((item, index) => (
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
              ))
            )}
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