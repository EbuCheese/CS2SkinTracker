// CSItemSearch.jsx - Updated to use custom useAdvancedDebounce hook
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { useCSData } from '@/contexts/CSDataContext';
import { useAdvancedDebounce } from '@/hooks/util';
import { ImageWithLoading } from '@/components/ui';

// CSItemSearch Component - Advanced search interface for CS2 items
const CSItemSearch = ({ 
  type = 'all', 
  placeholder = 'Search items...', 
  onSelect, 
  value = '',
  onChange,
  maxResults = 20,
  className = '',
  disabled = false,
  showLargeView = false,
  excludeSpecialItems = false,
  maxHeight = '320px'
}) => {
  // Context and state management
  const { searchIndices, unifiedSearchIndex, loading: globalLoading, error: globalError, getSearchIndexForType } = useCSData();
  const [results, setResults] = useState([]); // Current search results
  const [isOpen, setIsOpen] = useState(false); // Dropdown visibility
  const [selectedVariant, setSelectedVariant] = useState({}); // Variant selection per item

  // Process and filter data for the current item type
  const typeData = useMemo(() => {
    if (type === 'all') {
      return unifiedSearchIndex; // Use unified index
    }

    const rawData = getSearchIndexForType(type);
    
    // Return unfiltered data if no filtering needed
    if (!rawData || !excludeSpecialItems) {
      return rawData;
    }

    // Filter out knives and gloves (items starting with ★)
    const filteredItems = rawData.items.filter(item => {
      // Validate item structure
      if (!item || typeof item !== 'object') return false;
      
      const baseName = item.baseName || '';
      const name = item.name || '';
      
      // Filter out items that start with ★ (knives and gloves)
      return !baseName.startsWith('★') && !name.startsWith('★');
    });

    // Rebuild the search index with filtered items
    const newSearchIndex = new Map();
    filteredItems.forEach((item, index) => {
      item.searchTokens.forEach(token => {
        if (!newSearchIndex.has(token)) {
          newSearchIndex.set(token, []);
        }
        newSearchIndex.get(token).push(index);
      });
    });

    return {
      items: filteredItems,
      searchIndex: newSearchIndex
    };
  }, [type, searchIndices, unifiedSearchIndex, getSearchIndexForType, excludeSpecialItems]);

  // Enhanced search function using preprocessed inverted index
  const performSearch = useCallback((query) => {
    if (!query || !typeData || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Normalize query for consistent searching
    const normalizedQuery = query.toLowerCase()
      .replace(/[★]/g, 'star')
      .replace(/[|]/g, ' ')
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into individual search terms (minimum 2 characters)
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
    const { items, searchIndex } = typeData;
    let matchingIndices = [];

    // Use the inverted index for efficient searching
    queryWords.forEach((word, wordIndex) => {
      const wordMatches = [];
      
      // Look for exact matches and partial matches in the inverted index
      for (let [token, indices] of searchIndex) {
        if (token === word) {
          // Exact match - highest priority
          wordMatches.push(...indices);
        } else if (token.includes(word) || word.includes(token)) {
          // Partial match - lower priority
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
      .map(idx => items[idx])
      .filter(Boolean);

    // Sort results by relevance (exact matches first)
    searchResults.sort((a, b) => {
      const aExact = a.searchTokens.some(token => token === normalizedQuery) ? 1 : 0;
      const bExact = b.searchTokens.some(token => token === normalizedQuery) ? 1 : 0;
      return bExact - aExact;
    });

    console.log(`Search for "${query}" returned ${searchResults.length} results`);
    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
  }, [typeData, maxResults]);

  // Debounced search function to prevent excessive API calls
  const { debouncedFunction: debouncedSearch } = useAdvancedDebounce(
    performSearch, 
    200, 
    { trailing: true }, // Only execute on trailing edge
    [performSearch] // Dependencies
  );

  // Handle input changes with debounced search
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange?.(e);
    debouncedSearch(newValue);
  }, [onChange, debouncedSearch]);

  // Handle item selection with variant support
const handleItemSelect = useCallback((item, variant = 'normal') => {
  // Get the appropriate variant item from the Map
  const selectedItem = item.variants.get(variant) || item.variants.get('normal') || Array.from(item.variants.values())[0];
  
  // Check if this is any music kit box (normal or StatTrak)
  const isMusicKitBox = selectedItem.name?.includes('Music Kit Box');
  
  // Add variant info to the selected item for form handling
  const itemWithVariant = {
    ...selectedItem,
    selectedVariant: variant,
    hasStatTrak: item.variants.has('stattrak') && !isMusicKitBox, // Disable variants for all music kit boxes
    hasSouvenir: item.variants.has('souvenir') && !isMusicKitBox, // Disable variants for all music kit boxes
    baseName: item.baseName,
    itemType: item.itemType
  };
  
  onSelect?.(itemWithVariant);

  // Close dropdown and clear results
  setIsOpen(false);
  setResults([]);
  setSelectedVariant({});
}, [onSelect]);

  // Handle variant selection for individual items
  const handleVariantChange = useCallback((itemId, variant) => {
    setSelectedVariant(prev => ({
      ...prev,
      [itemId]: variant
    }));
  }, []);

  // Event handlers for dropdown management
  const handleFocus = () => {
    if (results.length > 0 && value.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay closing to allow for click events
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Loading state
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

  // Error state
  if (globalError) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-center p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm">Failed to load CS data</span>
        </div>
      </div>
    );
  }

  // Data preparation state
  if (!typeData) {
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
      {/* Search Input */}
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
        <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 overflow-y-auto z-50 shadow-xl"
        style={{ maxHeight }}
        >
          {results.map(item => (
            <OptimizedSearchResultItem
              key={item.id}
              item={item}
              type={type}
              selectedVariant={selectedVariant[item.id] || 'normal'}
              onVariantChange={(variant) => handleVariantChange(item.id, variant)}
              onClick={(variant) => handleItemSelect(item, variant)}
              showLargeView={showLargeView}
              
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

// OptimizedSearchResultItem - Individual search result item component
const OptimizedSearchResultItem = React.memo(({ 
  item, 
  type, 
  selectedVariant, 
  onVariantChange, 
  onClick, 
  showLargeView = false, 
}) => {
  const currentVariant = selectedVariant || 'normal';
  
  // Get the current variant item from the Map
  const currentVariantItem = item.variants.get(currentVariant) || 
                           item.variants.get('normal') || 
                           Array.from(item.variants.values())[0];

  // Get rarity color with fallback
  const getRarityColor = (rarity, rarityColor) => {
    return rarityColor || '#6B7280';
  };

  // Extract metadata and set responsive sizing
  const metadata = item.metadata || [];
  const imageSize = showLargeView ? 'w-16 h-16' : 'w-12 h-12';
  const paddingSize = showLargeView ? 'p-4' : 'p-3';

  // Get available variants from the Map
  const availableVariants = Array.from(item.variants.keys());

  // Event handlers
  const handleVariantButtonClick = useCallback((e, variant) => {
    e.preventDefault();
    e.stopPropagation();
    onVariantChange(variant);
  }, [onVariantChange]);

  // Use onMouseDown and attach to the entire container, not just flex div
  const handleItemMouseDown = useCallback((e) => {
    // Only trigger if we're not clicking on a variant button
    if (!e.target.closest('button')) {
      e.preventDefault();
      onClick(currentVariant);
    }
  }, [onClick, currentVariant]);

  // Skip rendering if no variant item found
  if (!currentVariantItem) {
    return null;
  }

  return (
    // Move the mouseDown handler to the entire container
    <div 
      className={`${paddingSize} hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0`}
      onMouseDown={handleItemMouseDown}
    >
      {/* Main item content - Remove the mouseDown handler from here */}
      <div className="flex items-center">
        {/* Item Image */}
        <div className={`relative ${imageSize} ${showLargeView ? 'mr-4' : 'mr-3'} flex-shrink-0 bg-gray-700 rounded overflow-hidden`}>
          <ImageWithLoading
            src={currentVariantItem?.image}
            alt={item.baseName}
            lazy={true}
            customFallback={
              <span className="text-xs font-medium text-white">
                {item.baseName?.substring(0, 2)?.toUpperCase() || '??'}
              </span>
            }
          />
        </div>

        {/* Item Information */}
        <div className="flex-1 min-w-0">
          {/* Item Name */}
          <p className={`text-white font-medium truncate ${showLargeView ? 'text-base' : 'text-sm'}`}>
            {currentVariantItem.name}
          </p>

          {/* Item Metadata */}
          {metadata.length > 0 && (
            <div className={`flex items-center space-x-2 ${showLargeView ? 'text-sm mt-1' : 'text-xs'}`}>
              {metadata.map((text, index) => (
                <React.Fragment key={`${text}-${index}`}>
                  {index > 0 && <span className="text-gray-500">•</span>}
                  <span className="text-gray-400">{text}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Rarity Badge */}
        {currentVariantItem.rarity && (
          <div className="flex-shrink-0 ml-2">
            <span 
              className={`px-2 py-1 rounded text-white font-medium ${
                showLargeView ? 'text-sm' : 'text-xs'
              }`}
              style={{ backgroundColor: getRarityColor(currentVariantItem.rarity, currentVariantItem.rarityColor) }}
            >
              {currentVariantItem.rarity}
            </span>
          </div>
        )}
      </div>

      {/* Variant Selection Buttons */}
      {availableVariants.length > 1 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
          <span className="text-xs text-gray-400 mr-2">Variant:</span>
          {availableVariants.map(variant => (
            <button
              key={variant}
              onMouseDown={(e) => handleVariantButtonClick(e, variant)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentVariant === variant
                  ? variant === 'stattrak' 
                    ? 'bg-orange-600 text-white' 
                    : variant === 'souvenir'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {variant === 'normal' ? 'Normal' : 
               variant === 'stattrak' ? 'StatTrak™' : 
               'Souvenir'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

OptimizedSearchResultItem.displayName = 'OptimizedSearchResultItem';

export default CSItemSearch;