import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, Eye, DollarSign, Activity, Star, Loader2 } from 'lucide-react';
import { PortfolioPerformanceChart, PortfolioHealthPieChart } from '@/components/charts';
import { RecentPriceChanges, RecentActivity } from '@/components/item-display';
import { QuickAddItemForm, QuickSellModal } from '@/components/forms';
import { supabase } from '@/supabaseClient';
import { useScrollLock } from '@/hooks/useScrollLock';

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
      image_url: sale.image_url
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

const consolidateItems = (() => {
  const cache = new Map();
  return (itemName) => {
    if (cache.has(itemName)) {
      return cache.get(itemName);
    }
    
    const lowerName = itemName.toLowerCase();
    let result;
    
    if (itemName.startsWith('★')) {
      result = lowerName.includes('gloves') || lowerName.includes('wraps') ? 'Gloves' : 'Knives';
    } else if (lowerName.includes('sticker')) {
      result = 'Stickers';
    } else if (lowerName.includes('patch')) {
      result = 'Patches';
    } else if (lowerName.includes('sealed graffiti')) {
      result = 'Graffiti';
    } else if (lowerName.includes('charm')) {
      result = 'Charms';
    } else if (lowerName.includes('agent')) {
      result = 'Agents';
    } else if (lowerName.includes('case')) {
      result = itemName;
    } else {
      const parts = itemName.split(' | ');
      result = parts.length > 1 ? parts[0] : itemName.split(' ')[0];
    }
    
    cache.set(itemName, result);
    return result;
  };
})();

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
  
    // Apply scroll lock when popups are open
    useScrollLock(showQuickAdd || showQuickSell);

    const quickActions = useMemo(() => 
      createQuickActions(setShowQuickAdd, setShowQuickSell), 
      [setShowQuickAdd, setShowQuickSell]
    );

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

const calculatePortfolioHealth = useCallback((investments) => {
  if (!investments?.length) {
    return {
      typeDiversityScore: 0,
      itemDiversityScore: 0,
      typeBreakdown: [],
      weaponBreakdown: [],
      typeFeedback: 'No active investments to analyze',
      itemFeedback: 'No active investments to analyze',
      totalTypes: 0,
      totalWeaponTypes: 0,
      safeAllocationPercentage: 0
    };
  }

  // Single pass through investments
  const typeGroups = new Map();
  const itemGroups = new Map();
  let totalValue = 0;
  let safeValue = 0;
  
  for (const inv of investments) {
    const quantity = parseFloat(inv.quantity);
    const currentPrice = parseFloat(inv.current_price);
    
    if (isNaN(quantity) || quantity <= 0 || isNaN(currentPrice)) continue;
    
    const value = currentPrice * quantity;
    totalValue += value;
    
    // Calculate safe allocation
    const itemType = inv.type?.toLowerCase() || 'unknown';
    const itemName = inv.name?.toLowerCase() || '';
    if (itemType === 'case' || itemName.includes('case') || itemType === 'key') {
      safeValue += value;
    }
    
    // Process type groups
    const type = itemType;
    if (!typeGroups.has(type)) {
      typeGroups.set(type, { name: type, count: 0, totalValue: 0, items: [] });
    }
    const typeGroup = typeGroups.get(type);
    typeGroup.count += quantity;
    typeGroup.totalValue += value;
    typeGroup.items.push(inv);
    
    // Process item groups
    const consolidatedName = consolidateItems(inv.name);
    if (!itemGroups.has(consolidatedName)) {
      itemGroups.set(consolidatedName, { name: consolidatedName, count: 0, totalValue: 0, items: [] });
    }
    const itemGroup = itemGroups.get(consolidatedName);
    itemGroup.count += quantity;
    itemGroup.totalValue += value;
    itemGroup.items.push(inv);
  }

  // CALCULATE SAFE ALLOCATION PERCENTAGE HERE (before using it)
  const safeAllocation = totalValue > 0 ? (safeValue / totalValue) * 100 : 0;

  // Rest of the function remains the same but uses Map.values()
  const typeBreakdown = Array.from(typeGroups.values())
    .map(group => ({
      ...group,
      percentage: totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0,
      value: group.totalValue
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const weaponBreakdown = Array.from(itemGroups.values())
    .map(group => ({
      ...group,
      percentage: totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0,
      value: group.totalValue
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // TYPE DIVERSITY SCORE WITH SAFETY WEIGHTING
  const numTypes = typeBreakdown.length;
  const typeMaxConcentration = typeBreakdown.length > 0 ? 
    Math.max(...typeBreakdown.map(t => t.percentage)) : 0;
  
  let typeDiversityScore = 0;
  
  // Base scoring for concentration (more lenient for types)
  if (typeMaxConcentration >= 98) {
    typeDiversityScore = 5;
  } else if (typeMaxConcentration >= 90) {
    typeDiversityScore = 20;
  } else if (typeMaxConcentration >= 80) {
    typeDiversityScore = 40;
  } else if (typeMaxConcentration >= 65) {
    typeDiversityScore = 60;
  } else if (typeMaxConcentration >= 50) {
    typeDiversityScore = 75;
  } else {
    typeDiversityScore = 90;
  }

  // Type multiplier (more forgiving since there are fewer total types)
  let typeMultiplier = 1.0;
  if (numTypes === 1) {
    typeMultiplier = 0.2;
  } else if (numTypes === 2) {
    typeMultiplier = 0.7;
  } else if (numTypes === 3) {
    typeMultiplier = 0.9;
  } else if (numTypes >= 4) {
    typeMultiplier = 1.1;
  }

  typeDiversityScore *= typeMultiplier;

  // SAFETY WEIGHTING SYSTEM (now safeAllocation is defined)
  // Apply penalty for portfolios with <15% safe investments
  if (safeAllocation < 15) {
    typeDiversityScore *= 0.5; // 50% penalty for risky portfolios
  }

  // Apply bonuses for safe allocations
  if (safeAllocation >= 70) {
    typeDiversityScore *= 1.25; // 25% bonus for very safe portfolios
  } else if (safeAllocation >= 50) {
    typeDiversityScore *= 1.15; // 15% bonus for moderately safe portfolios
  }

  typeDiversityScore = Math.min(100, Math.max(0, Math.round(typeDiversityScore)));

  // ITEM DIVERSITY SCORE WITH SMART CONSOLIDATION
  const numItems = weaponBreakdown.length;
  const itemMaxConcentration = weaponBreakdown.length > 0 ? 
    Math.max(...weaponBreakdown.map(w => w.percentage)) : 0;

  let itemDiversityScore = 0;

  if (weaponBreakdown.length === 0) {
    itemDiversityScore = 0;
  } else {
    // 1. CONCENTRATION PENALTY (More aggressive penalties for high concentration)
    let concentrationScore = 0;
    if (itemMaxConcentration >= 80) {
      concentrationScore = 5;   // Severe penalty for 80%+ concentration
    } else if (itemMaxConcentration >= 60) {
      concentrationScore = 15;  // Heavy penalty for 60-80% concentration
    } else if (itemMaxConcentration >= 40) {
      concentrationScore = 35;  // Moderate penalty for 40-60% concentration
    } else if (itemMaxConcentration >= 25) {
      concentrationScore = 55;  // Light penalty for 25-40% concentration
    } else if (itemMaxConcentration >= 15) {
      concentrationScore = 75;  // Minimal penalty for 15-25% concentration
    } else {
      concentrationScore = 90;  // Good score for <15% max concentration
    }

    // 2. TOP CONCENTRATION PENALTY (Look at top 2-3 holdings)
    const sortedPercentages = weaponBreakdown
      .map(w => w.percentage)
      .sort((a, b) => b - a);
    
    const top2Concentration = sortedPercentages.slice(0, 2).reduce((sum, p) => sum + p, 0);
    const top3Concentration = sortedPercentages.slice(0, 3).reduce((sum, p) => sum + p, 0);
    
    // Apply additional penalties for high top-N concentrations
    if (top2Concentration >= 80) {
      concentrationScore *= 0.6;  // 40% penalty if top 2 items = 80%+
    } else if (top2Concentration >= 60) {
      concentrationScore *= 0.8;  // 20% penalty if top 2 items = 60-80%
    }
    
    if (top3Concentration >= 85) {
      concentrationScore *= 0.7;  // 30% penalty if top 3 items = 85%+
    }

    // 3. DIVERSITY BONUS (Reward for having many items)
    let diversityMultiplier = 1.0;
    if (numItems === 1) {
      diversityMultiplier = 0.1;  // Severe penalty for single item
    } else if (numItems === 2) {
      diversityMultiplier = 0.3;  // Heavy penalty for only 2 items
    } else if (numItems === 3) {
      diversityMultiplier = 0.5;  // Moderate penalty for 3 items
    } else if (numItems <= 5) {
      diversityMultiplier = 0.7;  // Light penalty for 4-5 items
    } else if (numItems <= 8) {
      diversityMultiplier = 0.9;  // Minimal penalty for 6-8 items
    } else if (numItems <= 12) {
      diversityMultiplier = 1.0;  // Neutral for 9-12 items
    } else if (numItems <= 16) {
      diversityMultiplier = 1.1;  // Small bonus for 13-16 items
    } else {
      diversityMultiplier = 1.2;  // Good bonus for 17+ items
    }

    // 4. CATEGORY BALANCE SCORING
    const categories = {
      weapons: weaponBreakdown.filter(w => 
        !['Knives', 'Gloves', 'Stickers', 'Patches', 'Graffiti', 'Charms', 'Agents'].includes(w.name) && 
        !w.name.toLowerCase().includes('case')
      ),
      knives: weaponBreakdown.filter(w => w.name === 'Knives'),
      gloves: weaponBreakdown.filter(w => w.name === 'Gloves'),
      cases: weaponBreakdown.filter(w => w.name.toLowerCase().includes('case')),
      collectibles: weaponBreakdown.filter(w => 
        ['Stickers', 'Patches', 'Graffiti', 'Charms', 'Agents'].includes(w.name)
      )
    };

    // Calculate category percentages
    const categoryPercentages = Object.entries(categories).map(([name, items]) => ({
      name,
      percentage: items.reduce((sum, item) => sum + item.percentage, 0)
    }));

    // Penalty for single category dominance
    const maxCategoryPercentage = Math.max(...categoryPercentages.map(c => c.percentage));
    if (maxCategoryPercentage >= 90) {
      diversityMultiplier *= 0.5;  // 50% penalty for 90%+ in one category
    } else if (maxCategoryPercentage >= 75) {
      diversityMultiplier *= 0.7;  // 30% penalty for 75%+ in one category
    } else if (maxCategoryPercentage >= 60) {
      diversityMultiplier *= 0.85; // 15% penalty for 60%+ in one category
    }

    // Bonus for balanced categories
    const activeCategories = categoryPercentages.filter(c => c.percentage > 0).length;
    if (activeCategories >= 4) {
      diversityMultiplier *= 1.15; // 15% bonus for 4+ categories
    } else if (activeCategories >= 3) {
      diversityMultiplier *= 1.05; // 5% bonus for 3+ categories
    }

    // 5. APPLY ALL MULTIPLIERS
    itemDiversityScore = concentrationScore * diversityMultiplier;

    // 6. SPECIAL CASE ADJUSTMENTS
    // If portfolio is very concentrated in weapons vs other categories
    const weaponPercentage = categories.weapons.reduce((sum, item) => sum + item.percentage, 0);
    if (weaponPercentage >= 95) {
      itemDiversityScore *= 0.8; // 20% penalty for 95%+ weapons
    } else if (weaponPercentage >= 85) {
      itemDiversityScore *= 0.9; // 10% penalty for 85%+ weapons
    }
  }

  itemDiversityScore = Math.min(100, Math.max(0, Math.round(itemDiversityScore)));

  // ENHANCED FEEDBACK GENERATION
  const generateTypeFeedback = (score, numTypes, maxConcentration, safeAllocation) => {
    const safeText = `Safe allocation: ${safeAllocation.toFixed(1)}%`;
    
    if (score >= 80) {
      return `Excellent type diversification! Well-balanced across ${numTypes} investment types. ${safeText} - great risk management.`;
    } else if (score >= 60) {
      return `Good type diversification across ${numTypes} types. ${safeText}. Consider balancing allocations further.`;
    } else if (score >= 40) {
      return `Moderate type diversification. ${safeText}. Consider spreading across more investment types.`;
    } else if (safeAllocation < 15) {
      return `High risk portfolio! ${safeText} is below recommended 15% minimum. Increase liquid/case allocations.`;
    } else if (maxConcentration >= 90) {
      return `High concentration risk! ${maxConcentration.toFixed(1)}% in one type. ${safeText}. Diversify across more types.`;
    } else {
      return `Low type diversification. ${safeText}. Strongly consider spreading across multiple investment types.`;
    }
  };

  const generateItemFeedback = (score, numItems, maxConcentration, categoryBreakdown) => {
    const categoryCount = Object.values(categoryBreakdown).filter(count => count > 0).length;
    
    // Get top holdings for specific feedback
    const topHoldings = weaponBreakdown
      .slice(0, 3)
      .map(w => `${w.name} (${w.percentage.toFixed(1)}%)`)
      .join(', ');
    
    const top2Concentration = weaponBreakdown
      .slice(0, 2)
      .reduce((sum, w) => sum + w.percentage, 0);

    if (score >= 85) {
      return `Excellent item diversification! Well-balanced across ${numItems} items in ${categoryCount} categories. Low concentration risk.`;
    } else if (score >= 70) {
      return `Good item diversification with ${numItems} items across ${categoryCount} categories. Top holdings: ${topHoldings}`;
    } else if (score >= 50) {
      return `Moderate diversification across ${numItems} items. Consider reducing concentration in top holdings: ${topHoldings}`;
    } else if (score >= 30) {
      return `Low diversification! High concentration risk with ${maxConcentration.toFixed(1)}% in top item. Top holdings: ${topHoldings}`;
    } else if (top2Concentration >= 80) {
      return `Very high concentration risk! Top 2 items represent ${top2Concentration.toFixed(1)}% of portfolio. Urgent diversification needed.`;
    } else if (maxConcentration >= 60) {
      return `Dangerous concentration! ${maxConcentration.toFixed(1)}% in single item. Significantly diversify across more items.`;
    } else {
      return `Poor diversification across ${numItems} items. Spread investments more evenly to reduce single-item risk.`;
    }
  };

  // Calculate categories for feedback
  const categoryBreakdown = {
    weapons: weaponBreakdown.filter(w => 
      !['Knives', 'Gloves', 'Stickers', 'Patches', 'Graffiti', 'Charms', 'Agents'].includes(w.name) && 
      !w.name.toLowerCase().includes('case')
    ).length,
    knives: weaponBreakdown.filter(w => w.name === 'Knives').length,
    gloves: weaponBreakdown.filter(w => w.name === 'Gloves').length,
    cases: weaponBreakdown.filter(w => w.name.toLowerCase().includes('case')).length,
    collectibles: weaponBreakdown.filter(w => 
      ['Stickers', 'Patches', 'Graffiti', 'Charms', 'Agents'].includes(w.name)
    ).length
  };

  return {
    typeDiversityScore,
    itemDiversityScore,
    typeBreakdown,
    weaponBreakdown,
    typeFeedback: generateTypeFeedback(typeDiversityScore, numTypes, typeMaxConcentration, safeAllocation),
    itemFeedback: generateItemFeedback(itemDiversityScore, numItems, itemMaxConcentration, categoryBreakdown),
    totalTypes: numTypes,
    totalWeaponTypes: numItems,
    safeAllocationPercentage: safeAllocation,
    investments: investments
  };
}, [consolidateItems]);

    const portfolioHealthMemo = useMemo(() => {
  if (investments.length === 0) {
    return {
      typeDiversityScore: 0,
      itemDiversityScore: 0,
      typeBreakdown: [],
      weaponBreakdown: [],
      typeFeedback: 'No active investments to analyze',
      itemFeedback: 'No active investments to analyze',
      totalTypes: 0,
      totalWeaponTypes: 0,
      safeAllocationPercentage: 0
    };
  }
  return calculatePortfolioHealth(investments);
}, [investments]);

    const recentActivityMemo = useMemo(() => {
    if (investments.length === 0 && soldItems.length === 0) return [];
    return getRecentActivity(investments, soldItems);
  }, [investments, soldItems]);

  const handleSaleComplete = useCallback((investmentId, quantitySold, salePrice, remainingQuantity) => {
    setInvestments(prev => prev.map(inv => 
      inv.id === investmentId 
        ? { ...inv, quantity: remainingQuantity }
        : inv
    ));
    fetchData();
  }, []);

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

const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    if (!userSession?.id || typeof userSession.id !== 'string') {
      setError('Invalid user session. Please re-validate your beta key.');
      return;
    }

    console.log('Fetching data for user:', userSession.id);

    // Use the correct RPC function names from your schema
    const [investmentsResult, soldItemsResult] = await Promise.allSettled([
        supabase.rpc('fetch_user_investment_summary', {
          context_user_id: userSession.id
        }),
        supabase.rpc('fetch_user_investment_sales', {
          context_user_id: userSession.id
        })
      ]);

    // Handle investments result
      if (investmentsResult.status === 'fulfilled' && !investmentsResult.value.error) {
        const investmentsArray = Array.isArray(investmentsResult.value.data) 
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
        setSoldItems([]); // Set empty array instead of leaving undefined
      }

    await fetchChartData(selectedTimePeriod);

  } catch (err) {
    console.error('Unexpected error:', err);
    setError('An unexpected error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
}, [userSession?.id, selectedTimePeriod]);

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
              <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 shadow-2xl transition-all duration-200 scale-100 opacity-100">
                <QuickAddItemForm
                  onClose={() => setShowQuickAdd(false)}
                  onAdd={(newItem) => {
                    console.log('New item added:', newItem);
                    setShowQuickAdd(false);
                    fetchData(); // Refresh data after adding
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
        <PortfolioHealthPieChart portfolioHealth={portfolioHealthMemo} />
      </div>
      </div>

      </div>
    </div>
  );
};

export default InvestmentDashboard;