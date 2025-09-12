import { useMemo } from 'react';

/**
 * Reusable hook for searching through CS2 items
 * Provides sophisticated search functionality including partial matches,
 * variant handling, and flexible tokenization
 */
export const useItemSearch = (items, searchQuery) => {
  
  // Create search filter function based on query
  const searchFilter = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return () => true; // Return all items if no meaningful search
    }

    // Normalize the search query
    const normalizedQuery = searchQuery.toLowerCase()
      .replace(/[★]/g, 'star')           // Convert star symbols to text
      .replace(/[|]/g, ' ')              // Replace pipe separators with spaces
      .replace(/[^\w\s\-]/g, ' ')        // Remove special characters except hyphens
      .replace(/\s+/g, ' ')              // Collapse multiple spaces
      .trim();

    // Split into individual search terms (minimum 2 characters)
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length >= 2);

    if (queryWords.length === 0) {
      return () => true;
    }

    return (item) => {
      // Handle both sold items and active investments field names
      const itemName = (item.item_name || item.name || '').toLowerCase();
      const skinName = (item.item_skin_name || item.skin_name || '').toLowerCase();
      const condition = (item.item_condition || item.condition || '').toLowerCase();
      const variant = (item.item_variant || item.variant || '').toLowerCase();
      const type = (item.type || '').toLowerCase();

      // Build comprehensive searchable text
      const searchableFields = [
        itemName,
        skinName,
        condition,
        type,
        // Add variant-specific terms
        variant === 'stattrak' ? 'stattrak stat trak' : '',
        variant === 'souvenir' ? 'souvenir' : '',
        // Add condition synonyms
        condition === 'factory new' ? 'fn factory new' : '',
        condition === 'minimal wear' ? 'mw minimal wear' : '',
        condition === 'field-tested' ? 'ft field tested field-tested' : '',
        condition === 'well-worn' ? 'ww well worn well-worn' : '',
        condition === 'battle-scarred' ? 'bs battle scarred battle-scarred' : '',
        // Popular weapon abbreviations
        itemName.includes('ak-47') ? 'ak ak47' : '',
        itemName.includes('m4a4') ? 'm4 m4a4' : '',
        itemName.includes('m4a1-s') ? 'm4 m4a1 m4a1s' : '',
        itemName.includes('awp') ? 'awp' : '',
        itemName.includes('usp-s') ? 'usp usps' : '',
        itemName.includes('glock-18') ? 'glock' : '',
        // Add skin name variations
        skinName.includes('dragon lore') ? 'dlore' : '',
        skinName.includes('asiimov') ? 'asii' : '',
        skinName.includes('redline') ? 'red line' : '',
        skinName.includes('bloodsport') ? 'blood sport' : '',
      ].join(' ');

      // Tokenize the searchable text
      const searchTokens = searchableFields
        .replace(/[★]/g, 'star')
        .replace(/[|]/g, ' ')
        .replace(/[^\w\s\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(token => token.length >= 2);

      // Check if all query words have matching tokens
      return queryWords.every(queryWord => 
        searchTokens.some(token => {
          // Exact match
          if (token === queryWord) return true;
          
          // Token contains query word (for partial matches)
          if (token.includes(queryWord)) return true;
          
          // Query word contains token (for abbreviations)
          if (queryWord.includes(token)) return true;
          
          // Special case: handle common abbreviations
          if (queryWord === 'st' && (token === 'stattrak' || token === 'stat')) return true;
          if (queryWord === 'sv' && token === 'souvenir') return true;
          
          return false;
        })
      );
    };
  }, [searchQuery]);

  // Apply the filter to items
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.filter(searchFilter);
  }, [items, searchFilter]);

  return {
    filteredItems,
    hasActiveSearch: searchQuery && searchQuery.trim().length >= 2,
    searchTermCount: searchQuery ? searchQuery.trim().split(/\s+/).filter(w => w.length >= 2).length : 0
  };
};