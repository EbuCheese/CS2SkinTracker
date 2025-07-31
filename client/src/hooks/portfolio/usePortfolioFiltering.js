import { useMemo, useCallback } from 'react';

// Handles all data filtering, searching, and grouping logic for portfolio views.
export const usePortfolioFiltering = (investments, soldItems, activeTab, searchQuery) => {
  
  // Groups sold items that are identical and sold on the same day.
  const groupSoldItems = useCallback((soldItems) => {
    const groups = {};
    
    soldItems.forEach(item => {
      // Extract just the date part (YYYY-MM-DD) to group by day
      const dateOnly = item.sale_date.split('T')[0];
      const itemSkinName = item.item_skin_name || '';
      const itemCondition = item.item_condition || '';
      
      // Create unique key combining all item characteristics + sale date
      // This ensures only truly identical items sold on same day are grouped
      const groupKey = `${item.item_name}-${itemSkinName}-${itemCondition}-${item.buy_price_per_unit}-${item.price_per_unit}-${dateOnly}`;
      
      if (groups[groupKey]) {
        // Accumulate quantities and values for existing group
        groups[groupKey].quantity_sold += item.quantity_sold;
        groups[groupKey].total_sale_value += item.total_sale_value;
        groups[groupKey].sale_ids.push(item.id); // Track all sale IDs in group
        
        // Keep the earliest sale time as the representative timestamp
        const existingDate = new Date(groups[groupKey].sale_date);
        const currentDate = new Date(item.sale_date);
        if (currentDate < existingDate) {
          groups[groupKey].sale_date = item.sale_date;
        }
      } else {
        // Create new group with first occurrence
        groups[groupKey] = {
          ...item,
          sale_ids: [item.id], // Initialize with first sale ID
        };
      }
    });
    
    // Convert groups object back to array for rendering
    return Object.values(groups);
  }, []);

  
   // Filters investments to only include active ones (quantity > 0)
  const activeInvestments = useMemo(() => {
    return investments.filter(item => item.quantity > 0);
  }, [investments]);


   // Groups sold items using the consolidation logic above
  const groupedSoldItems = useMemo(() => {
    return groupSoldItems(soldItems);
  }, [soldItems, groupSoldItems]);

  /**
   * Applies both category filtering and search filtering to get the final
   * dataset for the current view. This is the main filtering pipeline.
   * 
   * Processing order:
   * 1. Choose base dataset (active investments vs sold items)
   * 2. Apply category filter if not 'All' or 'Sold'
   * 3. Apply search filter if user has entered search terms
   */
  const currentItems = useMemo(() => {
    let filteredItems;
    
    // Step 1: Choose base dataset based on active tab
    if (activeTab === 'Sold') {
      filteredItems = groupedSoldItems;
    } else {
      filteredItems = activeInvestments;
      
      // Step 2: Apply category filter for specific item types
      // Skip filtering for 'All' tab (show everything)
      if (activeTab !== 'All') {
        let typeFilter;
        
        // Handle special naming cases where UI tab name doesn't match database type
        if (activeTab === 'Graffiti') {
          typeFilter = 'graffiti'; // Database uses lowercase
        } else if (activeTab === 'Patches') {
          typeFilter = 'patch'; // Database uses singular
        } else {
          // Convert plural tab names to singular for database matching
          // e.g., "Cases" -> "case", "Stickers" -> "sticker"
          typeFilter = activeTab.toLowerCase().slice(0, -1);
        }
        
        filteredItems = filteredItems.filter(item => item.type === typeFilter);
      }
    }

    // Step 3: Apply search filter if user has entered search terms
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      filteredItems = filteredItems.filter(item => {
        if (activeTab === 'Sold') {
          // Search fields for sold items (different field naming convention)
          const itemName = item.item_name || '';
          const skinName = item.item_skin_name || '';
          const condition = item.item_condition || '';
          const variant = item.item_variant || '';
          
          return itemName.toLowerCase().includes(query) ||
                skinName.toLowerCase().includes(query) ||
                condition.toLowerCase().includes(query) ||
                variant.toLowerCase().includes(query);
        } else {
          // Search fields for active investments (handles field name variations)
          const itemName = item.item_name || item.name || '';
          const skinName = item.skin_name || '';
          const condition = item.condition || '';
          const variant = item.variant || '';
          
          return itemName.toLowerCase().includes(query) ||
                skinName.toLowerCase().includes(query) ||
                condition.toLowerCase().includes(query) ||
                variant.toLowerCase().includes(query);
        }
      });
    }
    
    return filteredItems;
  }, [activeTab, groupedSoldItems, activeInvestments, searchQuery]);

  return {
    activeInvestments,     // All investments with quantity > 0
    groupedSoldItems,      // Sold items grouped by identical characteristics
    currentItems           // Final filtered dataset for current view
  };
};