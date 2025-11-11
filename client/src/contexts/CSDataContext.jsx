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
    patches: null,
    music_kits: null,
    highlights: null,
    collections: null
  });

  // Processed search indices for efficient querying
  const [searchIndices, setSearchIndices] = useState({});
  const [unifiedSearchIndex, setUnifiedSearchIndex] = useState(null);

  // Lookup maps for O(1) ID resolution
  const [lookupMaps, setLookupMaps] = useState({
    skinsById: new Map(),
    casesById: new Map(),
    collectionsById: new Map(),
    stickersById: new Map(),
    agentsById: new Map(),
    keychainsById: new Map(),
    graffitiById: new Map(),
    patchesById: new Map(),
    musicKitsById: new Map(),
    highlightsById: new Map()
  });

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

      // Enrich keychains with highlight descriptions
      let processedItems = items;
      
      // Map to group items by their base characteristics
      // Key format: "baseName_category_pattern" to ensure uniqueness
      const baseItemsMap = new Map();

      // Set to collect all search tokens for autocomplete functionality
      const searchTokens = new Set();
      
      // Process each individual item
      processedItems.forEach(item => {
        // Extract base item information (removes StatTrak™/Souvenir prefixes)
        const baseInfo = extractBaseItemInfo(item);
        const baseKey = `${baseInfo.baseName}_${baseInfo.category}_${baseInfo.pattern}`;
        
        // Create or retrieve base item entry
        if (!baseItemsMap.has(baseKey)) {
          baseItemsMap.set(baseKey, {
            id: baseKey,
            baseName: baseInfo.baseName,
            hasStatTrak: false,
            hasSouvenir: false, 
            category: baseInfo.category,
            pattern: baseInfo.pattern,
            variants: new Map(),
            searchTokens: createSearchTokens(baseInfo),
            metadata: extractMetadata(item, type),
            isNameBasedSouvenir: baseInfo.isNameBasedSouvenir,
            isMusicKit: baseInfo.isMusicKit,
            isMusicKitBox: baseInfo.isMusicKitBox,
            requiresVariantPreSelection: baseInfo.requiresVariantPreSelection
          });
        }
        
        // Add this item as a variant of the base item
        const baseItem = baseItemsMap.get(baseKey);
        baseItem.variants.set(baseInfo.variant, {
          ...item,  // This should include the collections array
        });
        
        if (baseInfo.variant === 'stattrak') {
          baseItem.hasStatTrak = true;
        }
        if (baseInfo.variant === 'souvenir') {
          baseItem.hasSouvenir = true;
        }

        if (!item.image) {
            console.warn(`Item missing image:`, item.id, item.name);
          }

        // Collect all search tokens for global autocomplete
        baseItem.searchTokens.forEach(token => searchTokens.add(token));
      });

      // Create inverted index for efficient text searching
      // Maps each token to a list of item indices that contain it
      const searchIndex = createInvertedIndex(Array.from(baseItemsMap.values()));
      
      // Store processed data for this item type
      processedData[type] = {
        items: Array.from(baseItemsMap.values()).map(item => ({
          ...item,
          itemType: type
        })),
        searchIndex,
        searchTokens: Array.from(searchTokens)
      };

      const typeItems = Array.from(baseItemsMap.values()).map(item => ({
        ...item,
        itemType: type // Tag with source type
      }));
      
      if (type !== 'collections') {
        unifiedIndex.items.push(...typeItems);
      }
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
    let variant = 'normal';
    
    // Check for souvenir PACKAGE (case with souvenir in name)
    const isSouvenirPackage = baseName.includes('Souvenir Package');
    if (isSouvenirPackage) {
      return {
        baseName,
        variant: 'normal',
        category: item.category || '',
        pattern: item.pattern || '',
        isNameBasedSouvenir: true
      };
    }

    // Music Kit Boxes - GROUP by base name but flag for variant pre-selection
    const isMusicKitBox = baseName.includes('Music Kit Box');
    if (isMusicKitBox) {
      const isStatTrak = baseName.startsWith('StatTrak™');
      if (isStatTrak) {
        baseName = baseName.replace('StatTrak™ ', '');
        variant = 'stattrak';
      }
      
      return {
        baseName,
        variant,
        category: item.category || '',
        pattern: item.pattern || '',
        isMusicKitBox: true,
        requiresVariantPreSelection: true
      };
    }

    // Music Kits - GROUP by base name but flag for variant pre-selection
    const isStatTrakMusicKit = baseName.startsWith('StatTrak™ Music Kit |');
    const isNormalMusicKit = baseName.startsWith('Music Kit |');
    
    if (isStatTrakMusicKit || isNormalMusicKit) {
      if (isStatTrakMusicKit) {
        baseName = baseName.replace('StatTrak™ ', '');
        variant = 'stattrak';
      }
      
      return {
        baseName,
        variant,
        category: item.category || '',
        pattern: item.pattern || '',
        isMusicKit: true,
        requiresVariantPreSelection: true
      };
    }
    
    // Priority 1: Check boolean properties
    if (item.stattrak === true) {
      variant = 'stattrak';
      if (baseName.startsWith('StatTrak™ ')) {
        baseName = baseName.replace('StatTrak™ ', '');
      }
    } else if (item.souvenir === true) {
      variant = 'souvenir';
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
      pattern: item.pattern || '',
      isNameBasedSouvenir: false,
      isNameBasedStatTrak: false
    };
  };

  // Creates normalized search tokens from item information
  const createSearchTokens = (baseInfo) => {
  const tokens = new Set();
  
  const normalizeText = (text) => text.toLowerCase()
    .replace(/[★]/g, 'star')
    .replace(/[|]/g, ' ')
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const fullName = normalizeText(baseInfo.baseName);
  
  // Add full name (highest priority)
  tokens.add(fullName);
  
  // Add individual words with word boundary markers
  fullName.split(/[\s\-]+/)
    .filter(word => word.length >= 2)
    .forEach(word => {
      tokens.add(word); // Exact word
      tokens.add(`^${word}`); // Word starts with
    });
  
  if (baseInfo.category) {
    const cat = normalizeText(baseInfo.category);
    tokens.add(cat);
    tokens.add(`^${cat}`);
  }
  
  if (baseInfo.pattern) {
    const pat = normalizeText(baseInfo.pattern);
    tokens.add(pat);
    tokens.add(`^${pat}`);
  }
  
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
        // Weapon skins category
        if (item.category) metadata.push(item.category);
        break;
      case 'stickers':
      // Only add tournament if sticker has NO source (no collection/crate)
      const hasSource = (item.collections?.length > 0) || (item.crates?.length > 0);
      if (item.tournament && !hasSource) {
        // Extract the name string from the tournament object
        metadata.push(item.tournament.name || item.tournament);
      }
      break;
      case 'highlights':
        if (item.description) {
          metadata.push(item.description);
        }
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
          patches: '/data/patches.json',
          music_kits: '/data/music_kits.json',
          highlights: '/data/highlights.json',
          collections: '/data/collections.json'
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

  // Build lookup maps after data loads
  useEffect(() => {
    // Wait for data to be loaded
    if (loading || !data.skins) return;

    console.log('Building lookup maps for fast ID resolution...');
    
    try {
      const maps = {
        skinsById: new Map(data.skins?.map(item => [item.id, item]) || []),
        casesById: new Map(data.cases?.map(item => [item.id, item]) || []),
        collectionsById: new Map(data.collections?.map(item => [item.id, item]) || []),
        stickersById: new Map(data.stickers?.map(item => [item.id, item]) || []),
        agentsById: new Map(data.agents?.map(item => [item.id, item]) || []),
        keychainsById: new Map(data.keychains?.map(item => [item.id, item]) || []),
        graffitiById: new Map(data.graffiti?.map(item => [item.id, item]) || []),
        patchesById: new Map(data.patches?.map(item => [item.id, item]) || []),
        musicKitsById: new Map(data.music_kits?.map(item => [item.id, item]) || []),
        highlightsById: new Map(data.highlights?.map(item => [item.id, item]) || []),
        //Reverse lookup - item ID to cases that contain it
        itemToCases: new Map()
      };

      // Build reverse lookup for all items in cases
      data.cases?.forEach(caseItem => {
        // Check regular contains
        caseItem.contains?.forEach(itemId => {
          if (!maps.itemToCases.has(itemId)) {
            maps.itemToCases.set(itemId, []);
          }
          maps.itemToCases.get(itemId).push(caseItem.id);
        });
        
        // Check containsRare
        caseItem.containsRare?.forEach(itemId => {
          if (!maps.itemToCases.has(itemId)) {
            maps.itemToCases.set(itemId, []);
          }
          maps.itemToCases.get(itemId).push(caseItem.id);
        });
      });

      setLookupMaps(maps);
      console.log('✅ Lookup maps built successfully:', {
        skins: maps.skinsById.size,
        cases: maps.casesById.size,
        collections: maps.collectionsById.size,
        stickers: maps.stickersById.size,
        agents: maps.agentsById.size,
        keychains: maps.keychainsById.size,
        graffiti: maps.graffitiById.size,
        patches: maps.patchesById.size,
        musicKits: maps.musicKitsById.size,
        highlights: maps.highlightsById.size
      });
    } catch (err) {
      console.error('Failed to build lookup maps:', err);
    }
  }, [data, loading]);

  return (
    <CSDataContext.Provider value={{ 
      data,
      searchIndices,
      unifiedSearchIndex,
      lookupMaps,
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
      },

      // Helper functions to resolve IDs to full objects
      resolveCollections: (collectionIds) => {
        if (!collectionIds || !Array.isArray(collectionIds)) return [];
        return collectionIds
          .map(id => lookupMaps.collectionsById.get(id))
          .filter(Boolean);
      },

      resolveCases: (caseIds) => {
        if (!caseIds || !Array.isArray(caseIds)) return [];
        return caseIds
          .map(id => lookupMaps.casesById.get(id))
          .filter(Boolean);
      },

      resolveSkins: (skinIds) => {
        if (!skinIds || !Array.isArray(skinIds)) return [];
        return skinIds
          .map(id => lookupMaps.skinsById.get(id))
          .filter(Boolean);
      },

      resolveStickers: (stickerIds) => {
        if (!stickerIds || !Array.isArray(stickerIds)) return [];
        return stickerIds
          .map(id => lookupMaps.stickersById.get(id))
          .filter(Boolean);
      },

      // Generic resolver for any type
      resolveById: (id, type) => {
        const mapKey = `${type}ById`;
        return lookupMaps[mapKey]?.get(id) || null;
      },

      // Batch resolver for multiple IDs of same type
      resolveByIds: (ids, type) => {
        if (!ids || !Array.isArray(ids)) return [];
        const mapKey = `${type}ById`;
        const map = lookupMaps[mapKey];
        if (!map) return [];
        return ids.map(id => map.get(id)).filter(Boolean);
      }
      }}>
      {children}
    </CSDataContext.Provider>
  );
};