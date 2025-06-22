// CSItemSearch.jsx - Enhanced version with smart image loading
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';
import { useCSData } from '../contexts/CSDataContext';

const CSItemSearch = ({ 
  type = 'skins', 
  placeholder = 'Search items...', 
  onSelect, 
  value = '',
  onChange,
  maxResults = 20,
  className = '',
  disabled = false,
  showLargeView = false // New prop for larger search results
}) => {
  const { data, loading: globalLoading, error: globalError, getDataForType } = useCSData();
  const [searchIndex, setSearchIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const intersectionObserver = useRef(null); // For lazy loading visible images

  // Setup intersection observer for smart image loading
  useEffect(() => {
    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src && !img.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              intersectionObserver.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading images 50px before they come into view
        threshold: 0.1
      }
    );

    return () => {
      intersectionObserver.current?.disconnect();
    };
  }, []);
  useEffect(() => {
    const createSearchIndex = () => {
      const typeData = getDataForType(type);
      if (!typeData || typeData.length === 0) return;

      console.log(`Creating search index for ${type} with ${typeData.length} items`);
      
      // Create search data with enhanced text processing
      const searchData = typeData.map(item => {
        const searchText = item.name.toLowerCase()
          .replace(/[★]/g, 'star')
          .replace(/[|]/g, ' ')
          .replace(/[^\w\s\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        return { ...item, searchText };
      });

      // Create comprehensive search index
      const index = new Map();
      searchData.forEach((item, idx) => {
        // Index full name
        const fullName = item.searchText;
        if (!index.has(fullName)) index.set(fullName, []);
        index.get(fullName).push(idx);

        // Index individual words (minimum 2 characters)
        const words = fullName.split(/[\s\-]+/).filter(w => w.length >= 2);
        words.forEach(word => {
          if (!index.has(word)) index.set(word, []);
          index.get(word).push(idx);
        });

        // Index additional fields based on item type
        const fieldsToIndex = ['weapon', 'category', 'pattern', 'team', 'tournamentEvent', 'tournamentTeam'];
        fieldsToIndex.forEach(field => {
          if (item[field]) {
            const fieldValue = item[field].toLowerCase();
            if (!index.has(fieldValue)) index.set(fieldValue, []);
            index.get(fieldValue).push(idx);
          }
        });
      });

      setSearchIndex({ index, items: searchData });
      console.log(`Search index created with ${index.size} entries`);
    };

    if (!globalLoading && data) {
      createSearchIndex();
    }
  }, [data, type, globalLoading, getDataForType]);

  // Enhanced search function
  const performSearch = useCallback((query) => {
    if (!query || !searchIndex || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const normalizedQuery = query.toLowerCase()
      .replace(/[★]/g, 'star')
      .replace(/[|]/g, ' ')
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
    let matchingIndices = [];

    words.forEach((word, wordIndex) => {
      const wordMatches = [];
      
      // Look for matches in the search index
      for (let [indexWord, indices] of searchIndex.index) {
        if (indexWord === word) {
          // Exact word match
          wordMatches.push(...indices);
        } else if (indexWord.includes(word) || word.includes(indexWord)) {
          // Partial match
          wordMatches.push(...indices);
        }
      }
      
      if (wordIndex === 0) {
        matchingIndices = wordMatches;
      } else {
        // For multiple words, find intersection
        matchingIndices = matchingIndices.filter(idx => wordMatches.includes(idx));
      }
    });

    // Remove duplicates and get actual items
    const uniqueIndices = [...new Set(matchingIndices)];
    const searchResults = uniqueIndices
      .slice(0, maxResults)
      .map(idx => searchIndex.items[idx])
      .filter(Boolean);

    // Sort results by relevance
    searchResults.sort((a, b) => {
      const aExact = a.searchText.includes(normalizedQuery) ? 1 : 0;
      const bExact = b.searchText.includes(normalizedQuery) ? 1 : 0;
      return bExact - aExact;
    });

    console.log(`Search for "${query}" returned ${searchResults.length} results`);
    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
  }, [searchIndex, maxResults]);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 200),
    [performSearch]
  );

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange?.(e);
    debouncedSearch(newValue);
  }, [onChange, debouncedSearch]);

  const handleItemSelect = useCallback((item) => {
    onSelect?.(item);
    setIsOpen(false);
    setResults([]);
  }, [onSelect]);

  const handleFocus = () => {
    if (results.length > 0 && value.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (globalLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-center p-3 bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-400">Loading CS data...</span>
        </div>
      </div>
    );
  }

  if (globalError) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-center p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm">Failed to load CS data</span>
        </div>
      </div>
    );
  }

  if (!searchIndex) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-center p-3 bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-400">Preparing search...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={100}
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className={`absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 overflow-y-auto z-50 shadow-xl ${
          showLargeView ? 'max-h-96' : 'max-h-80'
        }`}>
          {results.map(item => (
            <OptimizedSearchResultItem
              key={`${item.id}-${item.name}`}
              item={item}
              type={type}
              onClick={() => handleItemSelect(item)}
              showLargeView={showLargeView}
              intersectionObserver={intersectionObserver.current}
            />
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && results.length === 0 && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 p-4 z-50">
          <p className="text-gray-400 text-center">No {type} found matching "{value}"</p>
        </div>
      )}
    </div>
  );
};

// Enhanced SearchResultItem with smart image loading
const OptimizedSearchResultItem = React.memo(({ item, type, onClick, showLargeView = false, intersectionObserver }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  // Setup intersection observer for this image
  useEffect(() => {
    const imgElement = imgRef.current;
    if (imgElement && intersectionObserver) {
      // Set data-src for lazy loading
      imgElement.dataset.src = item.image;
      intersectionObserver.observe(imgElement);

      return () => {
        if (imgElement) {
          intersectionObserver.unobserve(imgElement);
        }
      };
    }
  }, [item.image, intersectionObserver]);

  const getRarityColor = (rarity, rarityColor) => {
    return rarityColor || '#6B7280';
  };

  const getMetadataText = () => {
    switch (type) {
      case 'skins':
      case 'liquids':
        return [item.weapon, item.category, item.pattern].filter(Boolean);
      case 'agents':
        return [item.team].filter(Boolean);
      case 'stickers':
        return [item.tournamentEvent, item.tournamentTeam, item.type].filter(Boolean);
      case 'cases':
        return [item.type, item.firstSaleDate].filter(Boolean);
      default:
        return [];
    }
  };

  const metadata = getMetadataText();
  const imageSize = showLargeView ? 'w-16 h-16' : 'w-12 h-12';
  const paddingSize = showLargeView ? 'p-4' : 'p-3';

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (e) => {
    setImageLoading(false);
    setImageError(true);
    // Only set fallback once to prevent infinite loops
    if (!e.target.dataset.fallback) {
      e.target.dataset.fallback = 'true';
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMjQgMjBWMjgiIHN0cm9rZT0iIzZCNzM4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4K';
    }
  };

  return (
    <div 
      className={`flex items-center ${paddingSize} hover:bg-gray-700 cursor-pointer transition-colors`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={`relative ${imageSize} ${showLargeView ? 'mr-4' : 'mr-3'} flex-shrink-0 bg-gray-700 rounded overflow-hidden`}>
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          ref={imgRef}
          alt={item.name}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-white font-medium truncate ${showLargeView ? 'text-base' : 'text-sm'}`}>
          {item.name}
        </p>
        {metadata.length > 0 && (
          <div className={`flex items-center space-x-2 ${showLargeView ? 'text-sm mt-1' : 'text-xs'}`}>
            {metadata.map((text, index) => (
              <React.Fragment key={text}>
                {index > 0 && <span className="text-gray-500">•</span>}
                <span className="text-gray-400">{text}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div className={`flex items-center gap-1 ${showLargeView ? 'mt-2' : 'mt-1'}`}>
          {item.stattrak && (
            <span className={`inline-block px-1 py-0.5 bg-orange-600 text-white rounded ${
              showLargeView ? 'text-xs' : 'text-xs'
            }`}>
              StatTrak™
            </span>
          )}
          {item.souvenir && (
            <span className={`inline-block px-1 py-0.5 bg-yellow-600 text-white rounded ${
              showLargeView ? 'text-xs' : 'text-xs'
            }`}>
              Souvenir
            </span>
          )}
        </div>
      </div>
      {item.rarity && (
        <div className="flex-shrink-0 ml-2">
          <span 
            className={`px-2 py-1 rounded text-white font-medium ${
              showLargeView ? 'text-sm' : 'text-xs'
            }`}
            style={{ backgroundColor: getRarityColor(item.rarity, item.rarityColor) }}
          >
            {item.rarity}
          </span>
        </div>
      )}
    </div>
  );
});

OptimizedSearchResultItem.displayName = 'OptimizedSearchResultItem';

export default CSItemSearch;