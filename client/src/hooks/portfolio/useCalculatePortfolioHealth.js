import { useMemo, useCallback } from 'react';

// Shared formatting helper
const formatDisplayName = (name) => {
  if (!name) return 'Unknown';
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// consolidate item names into broader categories
const consolidateItems = (() => {
  const cache = new Map();
  
  // agent organizations array since agents don't follow the same pattern
  const agentOrganizations = [
    'elite crew', 'fbi swat', 'phoenix', 'guerrilla warfare', 'pirates', 
    'gendarmerie nationale', 'sabre', 'nswc seal', 'the professionals',
    'blackwolf', 'taskforce 121', 'superior agents', 'master agents',
    'distinguished agents', 'exceptional agents'
  ];
  
  return (itemName, itemType = null, skinName = null) => {
    const cacheKey = `${itemName}-${itemType}-${skinName}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    const lowerName = itemName.toLowerCase();
    let result;
    
    // Handle knives - extract type directly from name structure
    if (itemName.startsWith('★') && !lowerName.includes('gloves') && !lowerName.includes('wraps')) {
      // Format: "★ Bayonet | Doppler (Phase 4)" -> "Bayonet"
      const nameWithoutStar = itemName.substring(2); // Remove "★ "
      const pipeIndex = nameWithoutStar.indexOf(' | ');
      
      if (pipeIndex > 0) {
        const knifeType = nameWithoutStar.substring(0, pipeIndex).trim();
        const formattedType = formatDisplayName(knifeType);
        
        // Special cases that don't need "Knife" suffix
        if (knifeType.toLowerCase().includes('daggers')) {
          result = formattedType;
        } else {
          result = formattedType;
        }
      } else {
        result = 'Knives'; // fallback for unexpected format
      }
    }
    
    // Handle gloves - extract type directly from name structure  
    else if (itemName.startsWith('★') && (lowerName.includes('gloves') || lowerName.includes('wraps'))) {
      // Format: "★ Sport Gloves | Hedge Maze" -> "Sport Gloves"
      const nameWithoutStar = itemName.substring(2); // Remove "★ "
      const pipeIndex = nameWithoutStar.indexOf(' | ');
      
      if (pipeIndex > 0) {
        const gloveType = nameWithoutStar.substring(0, pipeIndex).trim();
        result = formatDisplayName(gloveType);
      } else {
        result = 'Gloves'; // fallback for unexpected format
      }
    }

    // Handle custom crafts - use skin_name to get weapon type
    else if (itemType === 'craft') {
      if (skinName) {
        const parts = skinName.split(' | ');
        if (parts.length > 0) {
          const weaponName = parts[0].trim();
          result = `Custom ${weaponName} Craft`;
        } else {
          result = 'Custom Craft';
        }
      } else {
        result = 'Custom Craft';
      }
    }

    // Handle agents - check type first, then group by organization
    else if (itemType === 'agent') {
      const parts = itemName.split(' | ');
      if (parts.length > 1) {
        const organization = parts[1].trim();
        result = `${organization} Agent`;
      } else {
        // Fallback - try to find organization in name
        const foundOrg = agentOrganizations.find(org => 
          lowerName.includes(org.toLowerCase())
        );
        
        if (foundOrg) {
          const formattedOrg = formatDisplayName(foundOrg);
          result = `${formattedOrg} Agent`;
        } else {
          result = 'Agents';
        }
      }
    }
    
    // Handle other item types (existing logic)
    else if (lowerName.includes('sticker')) {
      result = 'Stickers';
    } else if (lowerName.includes('patch')) {
      result = 'Patches';
    } else if (lowerName.includes('sealed graffiti')) {
      result = 'Graffiti';
    } else if (lowerName.includes('charm')) {
      result = 'Charms';
    } else if (lowerName.includes('case')) {
      result = itemName; // Keep cases as individual items
    } else {
      // Default logic for other items
      const parts = itemName.split(' | ');
      result = parts.length > 1 ? parts[0] : itemName.split(' ')[0];
    }
    
    cache.set(cacheKey, result);
    return result;
  };
})();

// Aggregates raw investment data into organized groups and totals
const aggregatePortfolioData = (investments) => {
  // Early return for empty data
  if (!investments?.length) {
    return {
      typeGroups: new Map(),
      itemGroups: new Map(),
      totalValue: 0,
      safeValue: 0,
      totalBuyValue: 0,
      totalRealizedPL: 0,
      totalUnrealizedPL: 0
    };
  }

  const typeGroups = new Map();
  const itemGroups = new Map();
  let totalValue = 0;
  let safeValue = 0;
  let totalBuyValue = 0;
  let totalRealizedPL = 0;
  let totalUnrealizedPL = 0;
  
  // Process each investment
  for (const inv of investments) {
    const quantity = parseFloat(inv.quantity || 0);
    const currentPrice = parseFloat(inv.current_price || 0);
    const buyPrice = parseFloat(inv.buy_price || 0);
    
    // Skip invalid entries
    if (isNaN(quantity) || quantity <= 0 || isNaN(currentPrice)) continue;
    
    const value = currentPrice * quantity;
    totalValue += value;
    
    // Use original_quantity from the view for accurate buy value calculation
    const originalQuantity = parseFloat(inv.original_quantity || quantity);
    totalBuyValue += buyPrice * originalQuantity;
    
    // Use pre-calculated profit/loss values from investment_summary view
    totalRealizedPL += parseFloat(inv.realized_profit_loss || 0);
    totalUnrealizedPL += parseFloat(inv.unrealized_profit_loss || 0);
    
    // Calculate safe allocation (cases and keys are considered "safe")
    const itemType = inv.type?.toLowerCase() || 'unknown';
    const itemName = inv.name?.toLowerCase() || '';
    if (itemType === 'case' || itemName.includes('case') || itemType === 'key') {
      safeValue += value;
    }
    
    // Process type groups
    const type = formatDisplayName(itemType);
    if (!typeGroups.has(type)) {
      typeGroups.set(type, { name: type, count: 0, totalValue: 0, items: [] });
    }
    const typeGroup = typeGroups.get(type);
    typeGroup.count += quantity;
    typeGroup.totalValue += value;
    typeGroup.items.push(inv);
    
    // Process item groups
    const consolidatedName = consolidateItems(inv.name, inv.type, inv.skin_name);
    if (!itemGroups.has(consolidatedName)) {
      itemGroups.set(consolidatedName, { name: consolidatedName, count: 0, totalValue: 0, items: [] });
    }
    const itemGroup = itemGroups.get(consolidatedName);
    itemGroup.count += quantity;
    itemGroup.totalValue += value;
    itemGroup.items.push(inv);
  }

  return { 
    typeGroups, 
    itemGroups, 
    totalValue, 
    safeValue,
    totalBuyValue,
    totalRealizedPL,
    totalUnrealizedPL
  };
};

// Calculates percentage breakdowns from aggregated data
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

// Calculates diversification score based on investment type distribution
const calculateTypeDiversityScore = (typeBreakdown, safeAllocation) => {
  const numTypes = typeBreakdown.length;
  const typeMaxConcentration = typeBreakdown.length > 0 ? 
    Math.max(...typeBreakdown.map(t => t.percentage)) : 0;
  
  let typeDiversityScore = 0;
  
  // Base scoring based on maximum concentration in any single typ
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

  // Apply multiplier based on number of different types
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

  // Apply safety weighting based on safe allocation percentage
  if (safeAllocation < 15) {
    typeDiversityScore *= 0.5;
  } else if (safeAllocation >= 70) {
    typeDiversityScore *= 1.25;
  } else if (safeAllocation >= 50) {
    typeDiversityScore *= 1.15;
  }

  return Math.min(100, Math.max(0, Math.round(typeDiversityScore)));
};

// Calculates item-level diversification score
const calculateItemDiversityScore = (weaponBreakdown) => {
  if (weaponBreakdown.length === 0) return 0;

  const numItems = weaponBreakdown.length;
  const itemMaxConcentration = Math.max(...weaponBreakdown.map(w => w.percentage));

  // 1. Base concentration penalty
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

  // 2. Additional penalty for top holdings concentration
  const sortedPercentages = weaponBreakdown
    .map(w => w.percentage)
    .sort((a, b) => b - a);
  
  const top2Concentration = sortedPercentages.slice(0, 2).reduce((sum, p) => sum + p, 0);
  const top3Concentration = sortedPercentages.slice(0, 3).reduce((sum, p) => sum + p, 0);
  
  // Apply penalties for concentrated top holdings
  if (top2Concentration >= 80) {
    concentrationScore *= 0.6;
  } else if (top2Concentration >= 60) {
    concentrationScore *= 0.8;
  }
  
  if (top3Concentration >= 85) {
    concentrationScore *= 0.7;
  }

  // 3. Diversity multiplier based on total number of items
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

  // 4. Category balance analysis
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

  // Penalize excessive concentration in any single category
  const maxCategoryPercentage = Math.max(...categoryPercentages.map(c => c.percentage));
  if (maxCategoryPercentage >= 90) {
    diversityMultiplier *= 0.5;
  } else if (maxCategoryPercentage >= 75) {
    diversityMultiplier *= 0.7;
  } else if (maxCategoryPercentage >= 60) {
    diversityMultiplier *= 0.85;
  }

  // Bonus for having multiple active categories
  const activeCategories = categoryPercentages.filter(c => c.percentage > 0).length;
  if (activeCategories >= 4) {
    diversityMultiplier *= 1.15;
  } else if (activeCategories >= 3) {
    diversityMultiplier *= 1.05;
  }

  // Apply all multipliers
  let itemDiversityScore = concentrationScore * diversityMultiplier;

  // Special case: heavy weapon concentration
  const weaponPercentage = categories.weapons.reduce((sum, item) => sum + item.percentage, 0);
  if (weaponPercentage >= 95) {
    itemDiversityScore *= 0.8;
  } else if (weaponPercentage >= 85) {
    itemDiversityScore *= 0.9;
  }

  return Math.min(100, Math.max(0, Math.round(itemDiversityScore)));
};

// Generates human-readable feedback for type diversification
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

// Generates human-readable feedback for item diversification
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

// Main hook for calculating portfolio health metrics
export const useCalculatePortfolioHealth = (investments) => {
  // Level 1: Memoize raw data aggregation (now more efficient with pre-calculated fields)
  const aggregatedData = useMemo(() => {
    return aggregatePortfolioData(investments);
  }, [investments]);

  // Level 2: Memoize breakdown calculations
  const breakdowns = useMemo(() => {
    const { typeGroups, itemGroups, totalValue } = aggregatedData;
    return calculateBreakdowns(typeGroups, itemGroups, totalValue);
  }, [aggregatedData]);

  // Level 3: Memoize score calculations
  const scores = useMemo(() => {
    const { totalValue, safeValue } = aggregatedData;
    const { typeBreakdown, weaponBreakdown } = breakdowns;
    const safeAllocation = totalValue > 0 ? (safeValue / totalValue) * 100 : 0;

    const typeDiversityScore = calculateTypeDiversityScore(typeBreakdown, safeAllocation);
    const itemDiversityScore = calculateItemDiversityScore(weaponBreakdown);

    return { typeDiversityScore, itemDiversityScore, safeAllocation };
  }, [aggregatedData, breakdowns]);

  // Level 4: Memoize feedback generation
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

  // Final result memoization
  return useMemo(() => {
    // Handle empty state
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
        safeAllocationPercentage: 0,
        totalValue: 0,
        totalBuyValue: 0,
        totalRealizedPL: 0,
        totalUnrealizedPL: 0
      };
    }

    const { typeBreakdown, weaponBreakdown } = breakdowns;
    const { typeDiversityScore, itemDiversityScore, safeAllocation } = scores;
    const { typeFeedback, itemFeedback } = feedback;
    const { totalValue, totalBuyValue, totalRealizedPL, totalUnrealizedPL } = aggregatedData;

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
      totalValue,
      totalBuyValue,
      totalRealizedPL,
      totalUnrealizedPL,
      investments
    };
  }, [investments, breakdowns, scores, feedback, aggregatedData]);
};