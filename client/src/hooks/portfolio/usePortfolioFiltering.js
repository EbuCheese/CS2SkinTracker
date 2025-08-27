import { useMemo, useCallback } from 'react';

// Centralized search function
const createSearchFilter = (searchQuery) => {
  if (!searchQuery) return () => true;
  
  const query = searchQuery.toLowerCase();
  return (item) => {
    const itemName = item.item_name || item.name || '';
    const skinName = item.item_skin_name || item.skin_name || '';
    const condition = item.item_condition || item.condition || '';
    const variant = item.item_variant || item.variant || '';
    
    return itemName.toLowerCase().includes(query) ||
           skinName.toLowerCase().includes(query) ||
           condition.toLowerCase().includes(query) ||
           variant.toLowerCase().includes(query);
  };
};

// filtering hook - only filters, no calculations
export const usePortfolioFiltering = (investments, soldItems, activeTab, searchQuery) => {
  
  // Groups sold items that are identical and sold on the same day.
  const groupSoldItems = useCallback((soldItems) => {
    const groups = {};
    
    soldItems.forEach(item => {
      const dateOnly = item.sale_date.split('T')[0];
      const itemSkinName = item.item_skin_name || '';
      const itemCondition = item.item_condition || '';
      
      const groupKey = `${item.item_name}-${itemSkinName}-${itemCondition}-${item.buy_price_per_unit}-${item.price_per_unit}-${dateOnly}`;
      
      if (groups[groupKey]) {
        groups[groupKey].quantity_sold += item.quantity_sold;
        groups[groupKey].total_sale_value += item.total_sale_value;
        groups[groupKey].sale_ids.push(item.id);
        
        const existingDate = new Date(groups[groupKey].sale_date);
        const currentDate = new Date(item.sale_date);
        if (currentDate < existingDate) {
          groups[groupKey].sale_date = item.sale_date;
        }
      } else {
        groups[groupKey] = {
          ...item,
          sale_ids: [item.id],
        };
      }
    });
    
    return Object.values(groups);
  }, []);

  // Base filtered data - no search applied yet
  const activeInvestments = useMemo(() => {
    return investments.filter(item => item.quantity > 0);
  }, [investments]);

  const groupedSoldItems = useMemo(() => {
    return groupSoldItems(soldItems);
  }, [soldItems, groupSoldItems]);

  // Apply category filtering to active investments
  const categoryFilteredInvestments = useMemo(() => {
    if (activeTab === 'All' || activeTab === 'Sold') {
      return activeInvestments;
    }

    let typeFilter;
    if (activeTab === 'Graffiti') {
      typeFilter = 'graffiti';
    } else if (activeTab === 'Patches') {
      typeFilter = 'patch';
    } else {
      typeFilter = activeTab.toLowerCase().slice(0, -1);
    }
    
    return activeInvestments.filter(item => item.type === typeFilter);
  }, [activeInvestments, activeTab]);

  // Create search filter function
  const searchFilter = useMemo(() => createSearchFilter(searchQuery), [searchQuery]);

  // Apply search filtering only once
  const currentItems = useMemo(() => {
    if (activeTab === 'Sold') {
      return groupedSoldItems.filter(searchFilter);
    }
    return categoryFilteredInvestments.filter(searchFilter);
  }, [activeTab, groupedSoldItems, categoryFilteredInvestments, searchFilter]);

  return {
    activeInvestments,
    groupedSoldItems,
    currentItems, // This is the single source of truth for what's displayed
  };
};