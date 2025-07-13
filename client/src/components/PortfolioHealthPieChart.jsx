import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PortfolioHealthPieChart = ({ portfolioHealth }) => {
  const [activeToggle, setActiveToggle] = useState('type'); // 'type' or 'item'

  // Color palette for different types
  const typeColors = {
    liquid: '#10B981',    // Green
    craft: '#F59E0B',     // Amber
    case: '#3B82F6',      // Blue
    agent: '#8B5CF6',     // Purple
    keychain: '#EC4899',  // Pink
    graffiti: '#6B7280',  // Gray
    patch: '#EF4444'      // Red
  };

  // Color palette for consolidated items
  const itemColors = {
    'Knives': '#8B5CF6',        // Purple
    'Gloves': '#EC4899',        // Pink
    'Stickers': '#10B981',      // Green
    'Patches': '#EF4444',       // Red
    'Graffiti': '#6B7280',      // Gray
    'Charms': '#F59E0B',        // Amber
    'Agents': '#06B6D4',        // Cyan
    // Weapons and cases use dynamic colors
  };

  // Color palette for weapons and cases (using a broader range)
  const weaponColors = [
    '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#EF4444',
    '#06B6D4', '#84CC16', '#F97316', '#A855F7', '#F472B6', '#64748B', '#DC2626',
    '#0EA5E9', '#65A30D', '#EA580C', '#9333EA', '#E11D48', '#475569', '#B91C1C'
  ];

  // Smart consolidation logic for items
  const consolidateItems = (itemName) => {
    const lowerName = itemName.toLowerCase();
    
    // Check for knives (★ without 'Wraps' or 'Gloves')
    if (itemName.startsWith('★')) {
      if (lowerName.includes('gloves') || lowerName.includes('wraps')) {
        return 'Gloves';
      }
      return 'Knives';
    }
    
    // Check for collectibles before the '|'
    const beforePipe = itemName.split(' | ')[0];
    
    if (lowerName.includes('sticker')) {
      return 'Stickers';
    }
    
    if (lowerName.includes('patch')) {
      return 'Patches';
    }
    
    if (lowerName.includes('sealed graffiti')) {
      return 'Graffiti';
    }
    
    if (lowerName.includes('charm')) {
      return 'Charms';
    }
    
    if (lowerName.includes('agent')) {
      return 'Agents';
    }
    
    // Cases kept individual
    if (lowerName.includes('case')) {
      return itemName;
    }
    
    // Weapons kept individual (extract weapon name before |)
    const parts = itemName.split(' | ');
    if (parts.length > 1) {
      return parts[0]; // Return "AK-47", "AWP", etc.
    }
    
    // Fallback
    return itemName.split(' ')[0];
  };

  // Calculate consolidated item breakdown
  const calculateConsolidatedBreakdown = (investments) => {
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
  };

  // Get current data based on active toggle
  const getCurrentData = () => {
    if (activeToggle === 'item') {
      return calculateConsolidatedBreakdown(portfolioHealth.investments || []);
    }
    return portfolioHealth.typeBreakdown || [];
  };

  // Get current diversity score based on toggle
  const getCurrentDiversityScore = () => {
    return activeToggle === 'item' ? 
      portfolioHealth.itemDiversityScore : 
      portfolioHealth.typeDiversityScore;
  };

  // Get current feedback based on toggle
  const getCurrentFeedback = () => {
    return activeToggle === 'item' ? 
      portfolioHealth.itemFeedback : 
      portfolioHealth.typeFeedback;
  };

  const currentScore = getCurrentDiversityScore();
  const currentFeedback = getCurrentFeedback();
  const currentData = getCurrentData();

  // Get color for item
  const getItemColor = (item, index) => {
    if (activeToggle === 'item') {
      // Use predefined colors for consolidated categories
      if (itemColors[item.name]) {
        return itemColors[item.name];
      }
      // Use weapon colors for weapons and cases
      return weaponColors[index % weaponColors.length];
    }
    return typeColors[item.name.toLowerCase()] || '#6B7280';
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-gray-300 text-sm">
            Value: ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-gray-300 text-sm">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-gray-300 text-sm">
            Items: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label function
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    if (percentage < 5) return null; // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  const toggleOptions = [
    { id: 'type', label: 'By Type', description: 'Investment type distribution' },
    { id: 'item', label: 'By Item', description: 'Consolidated item distribution', disabled: false }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Portfolio Distribution</h2>
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
      <div className="flex space-x-2 mb-6">
        {toggleOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => !option.disabled && setActiveToggle(option.id)}
            disabled={option.disabled}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeToggle === option.id
                ? 'bg-orange-500 text-white shadow-lg'
                : option.disabled
                ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
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

      {/* Pie Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={currentData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              stroke="#374151"
              strokeWidth={2}
            >
              {currentData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getItemColor(entry, index)} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

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
            className={`h-2 rounded-full transition-all duration-300 ${
              currentScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
              currentScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
              currentScore >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-red-500'
            }`}
            style={{ width: `${currentScore}%` }}
          ></div>
        </div>
      </div>

      {/* Feedback */}
      <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
        <p className="text-sm text-gray-300">{currentFeedback}</p>
      </div>

      {/* Distribution List */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">
          {activeToggle === 'item' ? 'Item' : 'Type'} Distribution ({currentData.length} {activeToggle === 'item' ? 'categories' : 'types'})
        </h3>
        <div className="space-y-2">
          {currentData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getItemColor(item, index) }}
                ></div>
                <span className="text-sm text-gray-300">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-white">{item.percentage.toFixed(1)}%</span>
                <p className="text-xs text-gray-400">{item.count} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioHealthPieChart;