// contexts/CSDataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

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
        
        setData(loadedData);
        console.log('All CS data loaded successfully');
        
      } catch (err) {
        console.error('Failed to load CS data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  return (
    <CSDataContext.Provider value={{ 
      data, 
      loading, 
      error, 
      loadingProgress,
      // Helper function to get data for a specific type
      getDataForType: (type) => {
        // Handle 'liquids' -> 'skins' mapping
        const dataType = type === 'liquids' ? 'skins' : type;
        return data[dataType] || [];
      }
    }}>
      {children}
    </CSDataContext.Provider>
  );
};