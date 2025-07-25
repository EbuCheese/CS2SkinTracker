import { useMemo, useCallback } from 'react';

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

// 1. PURE DATA AGGREGATION FUNCTIONS
const aggregatePortfolioData = (investments) => {
  if (!investments?.length) {
    return {
      typeGroups: new Map(),
      itemGroups: new Map(),
      totalValue: 0,
      safeValue: 0
    };
  }

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

  return { typeGroups, itemGroups, totalValue, safeValue };
};

// 2. BREAKDOWN CALCULATION FUNCTIONS
const calculateBreakdowns = (typeGroups, itemGroups, totalValue) => {
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

  return { typeBreakdown, weaponBreakdown };
};

// 3. SCORE CALCULATION FUNCTIONS
const calculateTypeDiversityScore = (typeBreakdown, safeAllocation) => {
  const numTypes = typeBreakdown.length;
  const typeMaxConcentration = typeBreakdown.length > 0 ? 
    Math.max(...typeBreakdown.map(t => t.percentage)) : 0;
  
  let typeDiversityScore = 0;
  
  // Base scoring for concentration
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

  // Type multiplier
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

  // Safety weighting
  if (safeAllocation < 15) {
    typeDiversityScore *= 0.5;
  } else if (safeAllocation >= 70) {
    typeDiversityScore *= 1.25;
  } else if (safeAllocation >= 50) {
    typeDiversityScore *= 1.15;
  }

  return Math.min(100, Math.max(0, Math.round(typeDiversityScore)));
};

const calculateItemDiversityScore = (weaponBreakdown) => {
  if (weaponBreakdown.length === 0) return 0;

  const numItems = weaponBreakdown.length;
  const itemMaxConcentration = Math.max(...weaponBreakdown.map(w => w.percentage));

  // 1. Concentration penalty
  let concentrationScore = 0;
  if (itemMaxConcentration >= 80) {
    concentrationScore = 5;
  } else if (itemMaxConcentration >= 60) {
    concentrationScore = 15;
  } else if (itemMaxConcentration >= 40) {
    concentrationScore = 35;
  } else if (itemMaxConcentration >= 25) {
    concentrationScore = 55;
  } else if (itemMaxConcentration >= 15) {
    concentrationScore = 75;
  } else {
    concentrationScore = 90;
  }

  // 2. Top concentration penalty
  const sortedPercentages = weaponBreakdown
    .map(w => w.percentage)
    .sort((a, b) => b - a);
  
  const top2Concentration = sortedPercentages.slice(0, 2).reduce((sum, p) => sum + p, 0);
  const top3Concentration = sortedPercentages.slice(0, 3).reduce((sum, p) => sum + p, 0);
  
  if (top2Concentration >= 80) {
    concentrationScore *= 0.6;
  } else if (top2Concentration >= 60) {
    concentrationScore *= 0.8;
  }
  
  if (top3Concentration >= 85) {
    concentrationScore *= 0.7;
  }

  // 3. Diversity multiplier
  let diversityMultiplier = 1.0;
  if (numItems === 1) {
    diversityMultiplier = 0.1;
  } else if (numItems === 2) {
    diversityMultiplier = 0.3;
  } else if (numItems === 3) {
    diversityMultiplier = 0.5;
  } else if (numItems <= 5) {
    diversityMultiplier = 0.7;
  } else if (numItems <= 8) {
    diversityMultiplier = 0.9;
  } else if (numItems <= 12) {
    diversityMultiplier = 1.0;
  } else if (numItems <= 16) {
    diversityMultiplier = 1.1;
  } else {
    diversityMultiplier = 1.2;
  }

  // 4. Category balance scoring
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

  const categoryPercentages = Object.entries(categories).map(([name, items]) => ({
    name,
    percentage: items.reduce((sum, item) => sum + item.percentage, 0)
  }));

  const maxCategoryPercentage = Math.max(...categoryPercentages.map(c => c.percentage));
  if (maxCategoryPercentage >= 90) {
    diversityMultiplier *= 0.5;
  } else if (maxCategoryPercentage >= 75) {
    diversityMultiplier *= 0.7;
  } else if (maxCategoryPercentage >= 60) {
    diversityMultiplier *= 0.85;
  }

  const activeCategories = categoryPercentages.filter(c => c.percentage > 0).length;
  if (activeCategories >= 4) {
    diversityMultiplier *= 1.15;
  } else if (activeCategories >= 3) {
    diversityMultiplier *= 1.05;
  }

  // Apply all multipliers
  let itemDiversityScore = concentrationScore * diversityMultiplier;

  // Special case adjustments
  const weaponPercentage = categories.weapons.reduce((sum, item) => sum + item.percentage, 0);
  if (weaponPercentage >= 95) {
    itemDiversityScore *= 0.8;
  } else if (weaponPercentage >= 85) {
    itemDiversityScore *= 0.9;
  }

  return Math.min(100, Math.max(0, Math.round(itemDiversityScore)));
};

// 4. FEEDBACK GENERATION FUNCTIONS
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

const generateItemFeedback = (score, numItems, maxConcentration, weaponBreakdown) => {
  const topHoldings = weaponBreakdown
    .slice(0, 3)
    .map(w => `${w.name} (${w.percentage.toFixed(1)}%)`)
    .join(', ');
  
  const top2Concentration = weaponBreakdown
    .slice(0, 2)
    .reduce((sum, w) => sum + w.percentage, 0);

  if (score >= 85) {
    return `Excellent item diversification! Well-balanced across ${numItems} items. Low concentration risk.`;
  } else if (score >= 70) {
    return `Good item diversification with ${numItems} items. Top holdings: ${topHoldings}`;
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

// 5. MAIN OPTIMIZED FUNCTION
export const useCalculatePortfolioHealth = (investments) => {
  // Memoize the aggregated data
  const aggregatedData = useMemo(() => {
    return aggregatePortfolioData(investments);
  }, [investments]);

  // Memoize the breakdowns
  const breakdowns = useMemo(() => {
    const { typeGroups, itemGroups, totalValue } = aggregatedData;
    return calculateBreakdowns(typeGroups, itemGroups, totalValue);
  }, [aggregatedData]);

  // Memoize the scores
  const scores = useMemo(() => {
    const { totalValue, safeValue } = aggregatedData;
    const { typeBreakdown, weaponBreakdown } = breakdowns;
    const safeAllocation = totalValue > 0 ? (safeValue / totalValue) * 100 : 0;

    const typeDiversityScore = calculateTypeDiversityScore(typeBreakdown, safeAllocation);
    const itemDiversityScore = calculateItemDiversityScore(weaponBreakdown);

    return { typeDiversityScore, itemDiversityScore, safeAllocation };
  }, [aggregatedData, breakdowns]);

  // Memoize the feedback
  const feedback = useMemo(() => {
    const { typeBreakdown, weaponBreakdown } = breakdowns;
    const { typeDiversityScore, itemDiversityScore, safeAllocation } = scores;

    const numTypes = typeBreakdown.length;
    const numItems = weaponBreakdown.length;
    const typeMaxConcentration = typeBreakdown.length > 0 ? 
      Math.max(...typeBreakdown.map(t => t.percentage)) : 0;
    const itemMaxConcentration = weaponBreakdown.length > 0 ? 
      Math.max(...weaponBreakdown.map(w => w.percentage)) : 0;

    return {
      typeFeedback: generateTypeFeedback(typeDiversityScore, numTypes, typeMaxConcentration, safeAllocation),
      itemFeedback: generateItemFeedback(itemDiversityScore, numItems, itemMaxConcentration, weaponBreakdown)
    };
  }, [breakdowns, scores]);

  // Return the final result
  return useMemo(() => {
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

    const { typeBreakdown, weaponBreakdown } = breakdowns;
    const { typeDiversityScore, itemDiversityScore, safeAllocation } = scores;
    const { typeFeedback, itemFeedback } = feedback;

    return {
      typeDiversityScore,
      itemDiversityScore,
      typeBreakdown,
      weaponBreakdown,
      typeFeedback,
      itemFeedback,
      totalTypes: typeBreakdown.length,
      totalWeaponTypes: weaponBreakdown.length,
      safeAllocationPercentage: safeAllocation,
      investments
    };
  }, [investments, breakdowns, scores, feedback]);
};