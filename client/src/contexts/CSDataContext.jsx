// contexts/CSDataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context for CS data management
const CSDataContext = createContext();

// Custom hook to access CS data context
export const useCSData = () => {
  const context = useContext(CSDataContext);
  if (!context) {
    throw new Error('useCSData must be used within CSDataProvider');
  }
  return context;
};

// Provider component that manages CS item data and provides it to child components
export const CSDataProvider = ({ children }) => {
  const [data, setData] = useState({
    skins: null,
    cases: null,
    stickers: null,
    agents: null,
    keychains: null,
    graffiti: null,
    patches: null
  });

  // Processed search indices for efficient querying
  const [searchIndices, setSearchIndices] = useState({});
  const [unifiedSearchIndex, setUnifiedSearchIndex] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Progress tracking for data loading operations
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

  // Preprocesses raw item data for efficient searching and organization
  const preprocessData = useCallback((rawData) => {
    const processedData = {};
    const indices = {};

    const unifiedIndex = {
      items: [],
      searchIndex: new Map()
    };

    // Process each item type (skins, cases, stickers, etc.)
    Object.entries(rawData).forEach(([type, items]) => {
      if (!items || items.length === 0) return;

      // Map to group items by their base characteristics
      // Key format: "baseName_category_pattern" to ensure uniqueness
      const baseItemsMap = new Map();

      // Set to collect all search tokens for autocomplete functionality
      const searchTokens = new Set();
      
      // Process each individual item
      items.forEach(item => {
        // Extract base item information (removes StatTrak™/Souvenir prefixes)
        const baseInfo = extractBaseItemInfo(item);
        const baseKey = `${baseInfo.baseName}_${baseInfo.category}_${baseInfo.pattern}`;
        
        // Create or retrieve base item entry
        if (!baseItemsMap.has(baseKey)) {
          baseItemsMap.set(baseKey, {
            id: baseKey,
            baseName: baseInfo.baseName,
            category: baseInfo.category,
            pattern: baseInfo.pattern,
            variants: new Map(), // Stores different variants (normal, StatTrak™, Souvenir)
            searchTokens: createSearchTokens(baseInfo), // Normalized search terms
            metadata: extractMetadata(item, type) // Additional searchable metadata
          });
        }
        
        // Add this item as a variant of the base item
        const baseItem = baseItemsMap.get(baseKey);
        baseItem.variants.set(baseInfo.variant, item);
        
        // Collect all search tokens for global autocomplete
        baseItem.searchTokens.forEach(token => searchTokens.add(token));
      });

      // Create inverted index for efficient text searching
      // Maps each token to a list of item indices that contain it
      const searchIndex = createInvertedIndex(Array.from(baseItemsMap.values()));
      
      // Store processed data for this item type
      processedData[type] = {
        items: Array.from(baseItemsMap.values()),
        searchIndex,
        searchTokens: Array.from(searchTokens)
      };

      const typeItems = Array.from(baseItemsMap.values()).map(item => ({
        ...item,
        itemType: type // Tag with source type
      }));
      
      unifiedIndex.items.push(...typeItems);
    });

    // Build unified search index
    unifiedIndex.items.forEach((item, index) => {
      item.searchTokens.forEach(token => {
        if (!unifiedIndex.searchIndex.has(token)) {
          unifiedIndex.searchIndex.set(token, []);
        }
        unifiedIndex.searchIndex.get(token).push(index);
      });
    });

    setUnifiedSearchIndex(unifiedIndex);
    return { processedData, indices };
  }, []);

  // Extracts base item information by removing variant prefixes and determining variant type
  const extractBaseItemInfo = (item) => {
    let baseName = item.name;
    let variant = 'normal'; // Default variant type
    
    // Priority 1: Check boolean properties (preferred method)
    if (item.stattrak === true) {
      variant = 'stattrak';
      // Clean the name if it still has the prefix
      if (baseName.startsWith('StatTrak™ ')) {
        baseName = baseName.replace('StatTrak™ ', '');
      }
    } else if (item.souvenir === true) {
      variant = 'souvenir';
      // Clean the name if it still has the prefix
      if (baseName.startsWith('Souvenir ')) {
        baseName = baseName.replace('Souvenir ', '');
      }
    } else {
      // Priority 2: Fallback to name-based detection (backward compatibility)
      if (baseName.startsWith('StatTrak™ ')) {
        baseName = baseName.replace('StatTrak™ ', '');
        variant = 'stattrak';
      } else if (baseName.startsWith('Souvenir ')) {
        baseName = baseName.replace('Souvenir ', '');
        variant = 'souvenir';
      }
    }
    
    return {
      baseName,
      variant,
      category: item.category || '',
      pattern: item.pattern || ''
    };
  };

  // Creates normalized search tokens from item information
  const createSearchTokens = (baseInfo) => {
    const tokens = new Set();
    
    // Normalizes text for consistent searching
    const normalizeText = (text) => text.toLowerCase()
      .replace(/[★]/g, 'star')
      .replace(/[|]/g, ' ')
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Add full name as a searchable token
    const fullName = normalizeText(baseInfo.baseName);
    tokens.add(fullName);
    
    // Add individual words as tokens (minimum 2 characters to avoid noise)
    fullName.split(/[\s\-]+/)
      .filter(word => word.length >= 2)
      .forEach(word => tokens.add(word));
    
    // Add category and pattern as additional searchable terms
    if (baseInfo.category) tokens.add(normalizeText(baseInfo.category));
    if (baseInfo.pattern) tokens.add(normalizeText(baseInfo.pattern));
    
    return Array.from(tokens);
  };

  // Creates an inverted index for efficient text searching
  const createInvertedIndex = (items) => {
    const index = new Map();
    
    items.forEach((item, itemIndex) => {
      // For each search token in this item
      item.searchTokens.forEach(token => {
        // Initialize token entry if it doesn't exist
        if (!index.has(token)) {
          index.set(token, []);
        }
        // Add this item's index to the token's list
        index.get(token).push(itemIndex);
      });
    });
    
    return index;
  };

  // Extracts type-specific metadata for additional search and filter capabilities
  const extractMetadata = (item, type) => {
    const metadata = [];
    
    switch (type) {
      case 'skins':
        // Weapon skins have weapon type, category, and pattern information
        if (item.weapon) metadata.push(item.weapon);
        if (item.category) metadata.push(item.category);
        if (item.pattern) metadata.push(item.pattern);
        break;
      case 'agents':
        // Agents belong to different teams (T-side, CT-side)
        if (item.team) metadata.push(item.team);
        break;
      case 'stickers':
        // Stickers may be associated with tournaments and teams
        if (item.tournamentEvent) metadata.push(item.tournamentEvent);
        if (item.tournamentTeam) metadata.push(item.tournamentTeam);
        break;
      default:
        // Generic type information for other item categories
        if (item.type) metadata.push(item.type);
    }
    
    return metadata;
  };

  // Effect hook to load all CS item data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Define all data endpoints
        const endpoints = {
          skins: '/data/skins.json',
          cases: '/data/cases.json',
          stickers: '/data/stickers.json',
          agents: '/data/agents.json',
          keychains: '/data/keychains.json',
          graffiti: '/data/graffiti.json',
          patches: '/data/patches.json'
        };

        const total = Object.keys(endpoints).length;
        setLoadingProgress({ loaded: 0, total });

        // Load all data sequentially with progress tracking
        const loadedData = {};
        let loaded = 0;

        for (const [type, url] of Object.entries(endpoints)) {
          try {
            console.log(`Loading ${type} data...`);
            const response = await fetch(url);
            
            if (!response.ok) {
              // Log warning but continue with empty array as fallback
              console.warn(`Failed to load ${type}: ${response.status}`);
              loadedData[type] = []; // Empty array as fallback
            } else {
              const data = await response.json();
              loadedData[type] = data;
              console.log(`Loaded ${data.length} ${type} items`);
            }
          } catch (err) {
            // Handle individual endpoint failures gracefully
            console.warn(`Error loading ${type}:`, err);
            loadedData[type] = []; // Empty array as fallback
          }

          // Update progress counter
          loaded++;
          setLoadingProgress({ loaded, total });
        }
        
        // Preprocess data for efficient searching
        const { processedData } = preprocessData(loadedData);
        setData(loadedData);
        console.log('All CS data loaded successfully');
        setSearchIndices(processedData);
        
      } catch (err) {
        // Handle critical errors that prevent any data loading
        console.error('Failed to load CS data:', err);
        setError(err.message);
      } finally {
        // Always clear loading state
        setLoading(false);
      }
    };

    loadAllData();
  }, [preprocessData]);

  return (
    <CSDataContext.Provider value={{ 
      data,
      searchIndices,
      unifiedSearchIndex, 
      loading, 
      error, 
      loadingProgress,

      // Helper for searching with 'all'
      searchAllTypes: (query, maxResults = 20) => {
        if (!query || !unifiedSearchIndex || query.length < 2) return [];

        const normalizedQuery = query.toLowerCase()
          .replace(/[★]/g, 'star')
          .replace(/[|]/g, ' ')
          .replace(/[^\w\s\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
        const { items, searchIndex } = unifiedSearchIndex;
        let matchingIndices = [];

        queryWords.forEach((word, wordIndex) => {
          const wordMatches = [];

          for (let [token, indices] of searchIndex) {
            if (token === word) {
              wordMatches.push(...indices); // Exact match
            } else if (token.includes(word) || word.includes(token)) {
              wordMatches.push(...indices); // Partial match
            }
          }

          if (wordIndex === 0) {
            matchingIndices = wordMatches;
          } else {
            matchingIndices = matchingIndices.filter(idx => wordMatches.includes(idx));
          }
        });

        const uniqueIndices = [...new Set(matchingIndices)];
        const results = uniqueIndices
          .slice(0, maxResults)
          .map(idx => items[idx])
          .filter(Boolean);

        results.sort((a, b) => {
          const aExact = a.searchTokens.some(token => token === normalizedQuery) ? 1 : 0;
          const bExact = b.searchTokens.some(token => token === normalizedQuery) ? 1 : 0;
          return bExact - aExact;
        });

        return results;
      },
      // Helper function to get raw data for a specific item type
      getDataForType: (type) => {
        // Handle special mapping: 'liquids' -> 'skins'
        const dataType = type === 'liquids' ? 'skins' : type;
        return data[dataType] || [];
      },
      // Helper function to get search index for a specific item type
      getSearchIndexForType: (type) => {
        const dataType = type === 'liquids' ? 'skins' : type;
        return searchIndices[dataType] || null;
      }
    }}>
      {children}
    </CSDataContext.Provider>
  );
};