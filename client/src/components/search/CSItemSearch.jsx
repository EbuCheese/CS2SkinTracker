import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { useCSData } from '@/contexts/CSDataContext';
import { useAdvancedDebounce } from '@/hooks/util';
import { ImageWithLoading } from '@/components/ui';

const getTypeDisplayName = (type) => {
  const displayMap = {
    'music_kits': 'Music Kits',
    'liquids': 'Liquids',
    'cases': 'Cases',
    'stickers': 'Stickers',
    'agents': 'Agents',
    'keychains': 'Keychains',
    'graffiti': 'Graffiti',
    'patches': 'Patches',
    'highlights': 'Highlights',
    'all': 'items'
  };
  return displayMap[type] || type;
};

// CSItemSearch Component - Advanced search interface for CS2 items
const CSItemSearch = ({ 
  type = 'all', 
  placeholder, 
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

  const defaultPlaceholder = placeholder || `Search ${getTypeDisplayName(type)}...`;

  // Process and filter data for the current item type
  const typeData = useMemo(() => {
  if (type === 'all') {
    // null check for unifiedSearchIndex
    if (!unifiedSearchIndex) return null;
    
    // Filter out collections from unified search
    const filteredUnifiedIndex = {
      items: unifiedSearchIndex.items.filter(item => item.itemType !== 'collections'),
      searchIndex: new Map()
    };
    
    // Rebuild search index without collections
    filteredUnifiedIndex.items.forEach((item, index) => {
      item.searchTokens.forEach(token => {
        if (!filteredUnifiedIndex.searchIndex.has(token)) {
          filteredUnifiedIndex.searchIndex.set(token, []);
        }
        filteredUnifiedIndex.searchIndex.get(token).push(index);
      });
    });
    
    return filteredUnifiedIndex;
  }

  const rawData = getSearchIndexForType(type);
  
  // Return null if no data (will show loading state)
  if (!rawData) return null;
  
  // Return unfiltered data if no filtering needed
  if (!excludeSpecialItems) {
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

  const normalizedQuery = query.toLowerCase()
    .replace(/[★]/g, 'star')
    .replace(/[|]/g, ' ')
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
  const { items, searchIndex } = typeData;
  
  const itemScores = new Map();

  // PHASE 1: Direct name matching for phrase queries
  if (queryWords.length > 1) { // Multi-word query
    items.forEach((item, idx) => {
      // Check baseName and all variant names
      const namesToCheck = [
        item.baseName?.toLowerCase(),
        item.name?.toLowerCase(),
        ...Array.from(item.variants?.values() || []).map(v => v.name?.toLowerCase())
      ].filter(Boolean);
      
      namesToCheck.forEach(name => {
        // Exact phrase match in name
        if (name.includes(normalizedQuery)) {
          const currentScore = itemScores.get(idx) || 0;
          // Add score based on how early in the name the match appears
          const matchPosition = name.indexOf(normalizedQuery);
          const positionBonus = matchPosition === 0 ? 200 : 100; // Boost if starts with query
          itemScores.set(idx, currentScore + 500 + positionBonus);
        }
      });
    });
  }

  // PHASE 2: Token-based matching for individual words
  queryWords.forEach((word, wordIndex) => {
    
    for (let [token, indices] of searchIndex) {
      let score = 0;
      
      if (token === word) {
        score = 100; // Exact match
      } else if (token === `^${word}`) {
        score = 90; // Word starts with
      } else if (token.startsWith(word)) {
        score = 50; // Token starts with query
      } else if (token.includes(word)) {
        score = 20; // Partial match
      }
      
      if (score > 0) {
        indices.forEach(idx => {
          const currentScore = itemScores.get(idx) || 0;
          itemScores.set(idx, currentScore + score);
        });
      }
    }
  });

  // Sort by score descending and take top results
  const rankedResults = Array.from(itemScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([idx]) => items[idx])
    .filter(Boolean);

  console.log(`Search for "${query}" returned ${rankedResults.length} results`);
  setResults(rankedResults);
  setIsOpen(rankedResults.length > 0);
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
    const isHighlight = item.itemType === 'highlights';
    const requiresVariantPreSelection = item.requiresVariantPreSelection || false;
    
    const finalVariant = isHighlight ? 'souvenir' : variant;
    
    const selectedItem = item.variants.get(finalVariant) || 
                        item.variants.get('normal') || 
                        Array.from(item.variants.values())[0];

    const itemWithVariant = {
      ...selectedItem,
      // Ensure the name is the full variant name from the database
      name: selectedItem.name, // This includes "StatTrak™" prefix if stattrak
      selectedVariant: finalVariant,
      hasStatTrak: !isHighlight && !requiresVariantPreSelection && Boolean(item.hasStatTrak),
      hasSouvenir: !isHighlight && !requiresVariantPreSelection && Boolean(item.hasSouvenir),
      baseName: item.baseName,
      itemType: item.itemType,
      actualSelectedVariant: finalVariant,
      requiresVariantPreSelection: requiresVariantPreSelection,
      isMusicKit: item.isMusicKit,
      isMusicKitBox: item.isMusicKitBox,
      id: selectedItem.id
    };
    
    onSelect?.(itemWithVariant);
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
          placeholder={defaultPlaceholder}
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
  const { lookupMaps } = useCSData();
  
  const currentVariant = selectedVariant || 'normal';
  const currentVariantItem = item.variants.get(currentVariant) || 
                           item.variants.get('normal') || 
                           Array.from(item.variants.values())[0];

  const getRarityColor = (rarity, rarityColor) => {
    return rarityColor || '#6B7280';
  };

  const metadata = item.metadata || [];
  const imageSize = showLargeView ? 'w-16 h-16' : 'w-12 h-12';
  const paddingSize = showLargeView ? 'p-4' : 'p-3';
  const availableVariants = Array.from(item.variants.keys());

  // Check if this is a skin
  const isSkin = item.itemType === 'skins' || 
                 currentVariantItem?.category === 'Rifles' || 
                 currentVariantItem?.category === 'Pistols' ||
                 currentVariantItem?.category === 'SMGs' ||
                 currentVariantItem?.category === 'Heavy' ||
                 currentVariantItem?.category === 'Knives' ||
                 currentVariantItem?.category === 'Gloves';
  
  // Check if this is a knife or glove (special items that come from cases, not collections)
  const isKnifeOrGlove = currentVariantItem?.category === 'Knives' || 
                         currentVariantItem?.category === 'Gloves';
  
  // Resolve collections and crates for regular skins
  const sources = useMemo(() => {
  if (!isSkin || isKnifeOrGlove) {
    return { items: [], all: [], total: 0 };
  }
  
  const allSources = [];
  
  // Helper to check if collection name matches case name (e.g., "Falchion Collection" vs "Falchion Case")
  const isRedundantCollectionCase = (collectionName, caseName) => {
    const collectionBase = collectionName.replace(/\s*(Collection|Set)$/i, '').toLowerCase();
    const caseBase = caseName.replace(/\s*(Case|Package)$/i, '').toLowerCase();
    return collectionBase === caseBase;
  };
  
  // STEP 1: Process collections
  if (currentVariantItem?.collections?.length > 0) {
    currentVariantItem.collections.forEach(collectionId => {
      const collection = lookupMaps.collectionsById.get(collectionId);
      if (!collection) return;
      
      // Find all cases/packages that contain this collection
      const relatedCases = [];
      let hasRedundantCase = false;
      
      if (currentVariantItem.crates?.length > 0) {
        currentVariantItem.crates.forEach(crateId => {
          const crate = lookupMaps.casesById.get(crateId);
          if (crate && collection.crates?.includes(crateId)) {
            relatedCases.push(crate);
            
            // Check if this case is redundant with collection name
            if (isRedundantCollectionCase(collection.name, crate.name)) {
              hasRedundantCase = true;
            }
          }
        });
      }
      
      // If collection has only one case and they have the same name, skip the collection
      // and just show the case instead
      if (hasRedundantCase && relatedCases.length === 1) {
        allSources.push({
          type: 'case',
          data: relatedCases[0],
          isRedundantWithCollection: true
        });
      } else {
        // Show collection
        const isDropOnly = !collection.crates || collection.crates.length === 0;
        allSources.push({
          type: 'collection',
          data: collection,
          relatedCases: relatedCases,
          isDropOnly: isDropOnly
        });
      }
    });
  }
  
  // STEP 2: Add any cases that aren't already accounted for
  if (currentVariantItem?.crates?.length > 0) {
    const accountedCaseIds = new Set();
    
    // Mark all cases we already included
    allSources.forEach(source => {
      if (source.type === 'collection' && source.relatedCases) {
        source.relatedCases.forEach(crate => accountedCaseIds.add(crate.id));
      } else if (source.type === 'case' && source.isRedundantWithCollection) {
        accountedCaseIds.add(source.data.id);
      }
    });
    
    // Add any remaining cases
    currentVariantItem.crates.forEach(crateId => {
      if (!accountedCaseIds.has(crateId)) {
        const crate = lookupMaps.casesById.get(crateId);
        if (crate) {
          allSources.push({
            type: 'case',
            data: crate
          });
        }
      }
    });
  }
  
  return {
    items: allSources.slice(0, 1),
    all: allSources,
    total: allSources.length
  };
}, [isSkin, isKnifeOrGlove, currentVariantItem?.collections, currentVariantItem?.crates, lookupMaps]);

// Enhanced source resolver for all item types (non-skins)
const itemSource = useMemo(() => {
  if (isSkin || !currentVariantItem) return null;

  let sources = [];

  // Prioritize cases
  if (currentVariantItem.crates?.length > 0) {
    sources = currentVariantItem.crates
      .map(id => lookupMaps.casesById.get(id))
      .filter(Boolean);
  }

  // Reverse lookup for patches/music_kits
  if (sources.length === 0 && lookupMaps.itemToCases?.has(currentVariantItem.id)) {
    const caseIds = lookupMaps.itemToCases.get(currentVariantItem.id);
    sources = caseIds
      .map(id => lookupMaps.casesById.get(id))
      .filter(Boolean);
  }

  // Only check collections if no cases found
  if (sources.length === 0 && currentVariantItem.collections?.length > 0) {
    sources = currentVariantItem.collections
      .map(id => lookupMaps.collectionsById.get(id))
      .filter(Boolean)
      // Only show drop-only collections
      .filter(col => !col.crates || col.crates.length === 0);
  }

  if (sources.length === 0) return null;

  return {
    primaryName: sources[0]?.name,
    allNames: sources.map(s => s.name),
    total: sources.length
  };
}, [isSkin, currentVariantItem, lookupMaps]);

  // Resolve cases for knives/gloves (they're in containsRare)
  const cases = useMemo(() => {
    if (!isKnifeOrGlove || !currentVariantItem?.crates?.length) {
      return { items: [], all: [], total: 0 };
    }
    const allCases = currentVariantItem.crates
      .map(id => lookupMaps.casesById.get(id))
      .filter(Boolean);
    
    return {
      items: allCases.slice(0, 1),
      all: allCases,  // Keep all for tooltip
      total: allCases.length
    };
  }, [isKnifeOrGlove, currentVariantItem?.crates, lookupMaps.casesById]);


  const requiresVariantPreSelection = item.requiresVariantPreSelection || false;

  // For music items, clicking should use the currently selected variant
  const handleItemMouseDown = useCallback((e) => {
    if (!e.target.closest('button')) {
      e.preventDefault();
      // For music items, pass the selected variant; for others, pass current
      onClick(requiresVariantPreSelection ? currentVariant : currentVariant);
    }
  }, [onClick, currentVariant, requiresVariantPreSelection]);

  if (!currentVariantItem) {
    return null;
  }

  return (
    <div 
      className={`${paddingSize} hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0`}
      onMouseDown={handleItemMouseDown}
    >
      <div className="flex items-center">
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

        <div className="flex-1 min-w-0">
          <p className={`text-white font-medium truncate ${showLargeView ? 'text-base' : 'text-sm'}`}>
            {currentVariantItem.name}
          </p>

          {/* Show category AND collection/case for skins */}
          {(isSkin || metadata.length > 0 || itemSource) && (
            <div className={`flex items-center space-x-2 ${showLargeView ? 'text-sm mt-1' : 'text-xs'}`}>
              {isSkin ? (
                <>
                  {/* Show category first */}
                  {currentVariantItem.category && (
                    <span className="text-gray-400">{currentVariantItem.category}</span>
                  )}
                  
                  {/* Knives/gloves show cases */}
                  {isKnifeOrGlove ? (
                    cases.items.length > 0 && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span 
                          className="text-gray-400 truncate" 
                          title={
                            cases.total > 1
                              ? cases.all.map(c => c.name).join('\n')
                              : cases.items[0].name
                          }
                        >
                          {cases.items[0].name}
                          {cases.total > 1 && (
                            <span className="text-gray-500 ml-1">+{cases.total - 1}</span>
                          )}
                        </span>
                      </>
                    )
                  ) : (
                    /* Regular skins show collections AND crates */
                    sources.items.length > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span 
                        className="text-gray-400 truncate" 
                        title={(() => {
                          const firstSource = sources.items[0];
                          
                          // For drop-only collections, no tooltip needed
                          if (firstSource.type === 'collection' && firstSource.isDropOnly) {
                            return firstSource.data.name;
                          }
                          
                          // For collections with cases, show "Found in:" tooltip
                          if (firstSource.type === 'collection' && firstSource.relatedCases?.length > 0) {
                            return `Found in:\n• ${firstSource.relatedCases.map(c => c.name).join('\n• ')}`;
                          }
                          
                          // For multiple sources, show all
                          if (sources.total > 1) {
                            return `Found in:\n• ${sources.all.map(s => s.data.name).join('\n• ')}`;
                          }
                          
                          // Single case/source
                          return firstSource.data.name;
                        })()}
                      >
                        {(() => {
                          const firstSource = sources.items[0];
                          
                          if (firstSource.type === 'collection') {
                            let displayText = firstSource.data.name;
                            
                            // Only show +X if there are related cases (don't count for drop-only)
                            if (firstSource.relatedCases && firstSource.relatedCases.length > 0) {
                              displayText += ` +${firstSource.relatedCases.length}`;
                            }
                            
                            return displayText;
                          } else {
                            // Case (either standalone or redundant with collection)
                            let displayText = firstSource.data.name;
                            if (sources.total > 1) {
                              displayText += ` +${sources.total - 1}`;
                            }
                            return displayText;
                          }
                        })()}
                      </span>
                    </>
                  )
                  )}
                </>
              ): (
                <>
                  {/* Show regular metadata with tooltip for long text */}
                  {metadata.map((text, index) => {
                    // Check if this is a long description (likely from highlights)
                    const isLongDescription = text.length > 60;
                    
                    return (
                      <React.Fragment key={`${text}-${index}`}>
                        {index > 0 && <span className="text-gray-500">•</span>}
                        <span 
                          className="text-gray-400 truncate" 
                          title={isLongDescription ? text : undefined}
                        >
                          {text}
                        </span>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Then show source (collection/case) */}
                  {itemSource && (
                    <>
                      {metadata.length > 0 && <span className="text-gray-500">•</span>}
                      <span
                        className="text-gray-400 truncate"
                        title={
                          itemSource.total > 1
                            ? itemSource.allNames.join('\n') 
                            : itemSource.primaryName
                        }
                      >
                        {itemSource.primaryName}
                        {itemSource.total > 1 && (
                          <span className="text-gray-500 ml-1">+{itemSource.total - 1}</span>
                        )}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

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

      {/* Variant Selection Buttons - ALWAYS show if variants exist */}
      {availableVariants.length > 1 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
          <span className="text-xs text-gray-400 mr-2">
            {requiresVariantPreSelection ? 'Select:' : 'Variant:'}
          </span>
          {availableVariants.map(variant => {
            const variantItem = item.variants.get(variant);
            
            let variantLabel = variant === 'normal' ? 'Normal' : 
                              variant === 'stattrak' ? 'StatTrak™' : 
                              'Souvenir';
                        
            return (
              <button
                key={variant}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (requiresVariantPreSelection) {
                    // For music items, selecting variant should immediately trigger selection
                    onVariantChange(variant);
                    // Small delay to ensure state updates
                    setTimeout(() => onClick(variant), 50);
                  } else {
                    // For regular items, just update the preview
                    onVariantChange(variant);
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  currentVariant === variant
                    ? variant === 'stattrak' 
                      ? 'bg-orange-600 text-white' 
                      : variant === 'souvenir'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {variantLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

OptimizedSearchResultItem.displayName = 'OptimizedSearchResultItem';

export default CSItemSearch;