// contexts/CSDataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CSDataContext = createContext();

export const useCSData = () => {
  const context = useContext(CSDataContext);
  if (!context) {
    throw new Error('useCSData must be used within CSDataProvider');
  }
  return context;
};

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
  const [searchIndices, setSearchIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

    // Pre-process data for efficient searching
  const preprocessData = useCallback((rawData) => {
    const processedData = {};
    const indices = {};

    Object.entries(rawData).forEach(([type, items]) => {
      if (!items || items.length === 0) return;

      // Group items by base name and create search tokens
      const baseItemsMap = new Map();
      const searchTokens = new Set();
      
      items.forEach(item => {
        const baseInfo = extractBaseItemInfo(item);
        const baseKey = `${baseInfo.baseName}_${baseInfo.category}_${baseInfo.pattern}`;
        
        if (!baseItemsMap.has(baseKey)) {
          baseItemsMap.set(baseKey, {
            id: baseKey,
            baseName: baseInfo.baseName,
            category: baseInfo.category,
            pattern: baseInfo.pattern,
            variants: new Map(),
            searchTokens: createSearchTokens(baseInfo),
            metadata: extractMetadata(item, type)
          });
        }
        
        const baseItem = baseItemsMap.get(baseKey);
        baseItem.variants.set(baseInfo.variant, item);
        
        // Add search tokens to global set for autocomplete
        baseItem.searchTokens.forEach(token => searchTokens.add(token));
      });

      // Create efficient search index using inverted index
      const searchIndex = createInvertedIndex(Array.from(baseItemsMap.values()));
      
      processedData[type] = {
        items: Array.from(baseItemsMap.values()),
        searchIndex,
        searchTokens: Array.from(searchTokens)
      };
    });

    return { processedData, indices };
  }, []);

 // Helper functions
  const extractBaseItemInfo = (item) => {
    let baseName = item.name;
    let variant = 'normal';
    
    if (baseName.startsWith('StatTrak™ ')) {
      baseName = baseName.replace('StatTrak™ ', '');
      variant = 'stattrak';
    } else if (baseName.startsWith('Souvenir ')) {
      baseName = baseName.replace('Souvenir ', '');
      variant = 'souvenir';
    }
    
    return {
      baseName,
      variant,
      category: item.category || '',
      pattern: item.pattern || ''
    };
  };

  const createSearchTokens = (baseInfo) => {
    const tokens = new Set();
    
    // Normalize text once
    const normalizeText = (text) => text.toLowerCase()
      .replace(/[★]/g, 'star')
      .replace(/[|]/g, ' ')
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Add full name tokens
    const fullName = normalizeText(baseInfo.baseName);
    tokens.add(fullName);
    
    // Add word tokens (minimum 2 chars)
    fullName.split(/[\s\-]+/)
      .filter(word => word.length >= 2)
      .forEach(word => tokens.add(word));
    
    // Add category and pattern tokens
    if (baseInfo.category) tokens.add(normalizeText(baseInfo.category));
    if (baseInfo.pattern) tokens.add(normalizeText(baseInfo.pattern));
    
    return Array.from(tokens);
  };

  const createInvertedIndex = (items) => {
    const index = new Map();
    
    items.forEach((item, itemIndex) => {
      item.searchTokens.forEach(token => {
        if (!index.has(token)) {
          index.set(token, []);
        }
        index.get(token).push(itemIndex);
      });
    });
    
    return index;
  };

  const extractMetadata = (item, type) => {
    const metadata = [];
    
    switch (type) {
      case 'skins':
        if (item.weapon) metadata.push(item.weapon);
        if (item.category) metadata.push(item.category);
        if (item.pattern) metadata.push(item.pattern);
        break;
      case 'agents':
        if (item.team) metadata.push(item.team);
        break;
      case 'stickers':
        if (item.tournamentEvent) metadata.push(item.tournamentEvent);
        if (item.tournamentTeam) metadata.push(item.tournamentTeam);
        break;
      default:
        if (item.type) metadata.push(item.type);
    }
    
    return metadata;
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
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

        // Load all data with progress tracking
        const loadedData = {};
        let loaded = 0;

        for (const [type, url] of Object.entries(endpoints)) {
          try {
            console.log(`Loading ${type} data...`);
            const response = await fetch(url);
            
            if (!response.ok) {
              console.warn(`Failed to load ${type}: ${response.status}`);
              loadedData[type] = []; // Empty array as fallback
            } else {
              const data = await response.json();
              loadedData[type] = data;
              console.log(`Loaded ${data.length} ${type} items`);
            }
          } catch (err) {
            console.warn(`Error loading ${type}:`, err);
            loadedData[type] = []; // Empty array as fallback
          }

          loaded++;
          setLoadingProgress({ loaded, total });
        }
        
        const { processedData } = preprocessData(loadedData);
        setData(loadedData);
        console.log('All CS data loaded successfully');
        setSearchIndices(processedData);
        
      } catch (err) {
        console.error('Failed to load CS data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [preprocessData]);

  return (
    <CSDataContext.Provider value={{ 
      data,
      searchIndices, 
      loading, 
      error, 
      loadingProgress,
      // Helper function to get data for a specific type
      getDataForType: (type) => {
        // Handle 'liquids' -> 'skins' mapping
        const dataType = type === 'liquids' ? 'skins' : type;
        return data[dataType] || [];
      },
      getSearchIndexForType: (type) => {
        const dataType = type === 'liquids' ? 'skins' : type;
        return searchIndices[dataType] || null;
      }
    }}>
      {children}
    </CSDataContext.Provider>
  );
};