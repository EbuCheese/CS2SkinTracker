import { useMemo } from 'react';

// Manages tab configuration and UI helper functions for portfolio navigation.
export const usePortfolioTabs = (activeTab) => {
  // Main category tabs for filtering active investments
  // Order matters for UI layout - most common categories first
  const mainTabs = [
    'All',        // Show all active investments
    'Liquids',    // High-liquidity items (keys, popular skins)
    'Crafts',     // Custom craft items with stickers applied
    'Cases',      // Weapon cases
    'Stickers',   // Individual stickers
    'Agents',     // Agent skins
    'Keychains',  // Keychain items
    'Graffiti',   // Sealed graffiti
    'Patches'     // Collectible patches
  ];
  
  // Special tab for sold items - kept separate for UI distinction
  const soldTab = 'Sold';

  /**
   * Generates appropriate search placeholder text based on current context.
   * Provides users with clear indication of what they're searching within.
   */
  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'All') {
      return 'Search all investments...';
    } else if (activeTab === 'Sold') {
      return 'Search sold items...';
    } else {
      return `Search ${activeTab.toLowerCase()}...`;
    }
  }, [activeTab]);

  /**
   * Formats the "Add Item" button text based on selected category.
   * Handles special cases where UI display names don't match database types.
   * 
   * @param {string} activeTab - Current selected tab
   * @returns {string} Properly formatted button text
   */
  const getAddButtonText = (activeTab) => {
    // Special cases with different singular/plural forms
    if (activeTab === 'Graffiti') return 'Add Graffiti';
    if (activeTab === 'Patches') return 'Add Patch';
    
    // Standard case: remove 's' from plural tab name
    // e.g., "Cases" -> "Add Case", "Stickers" -> "Add Sticker"
    return `Add ${activeTab.slice(0, -1)}`;
  };

  return {
    mainTabs,              // Array of main category tabs
    soldTab,               // Special sold items tab
    searchPlaceholder,     // Context-appropriate search placeholder
    getAddButtonText       // Function to format add button text
  };
};