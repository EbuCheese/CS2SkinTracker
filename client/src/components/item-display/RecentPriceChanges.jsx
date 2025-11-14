import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, ListFilterPlus, ListFilter, ChartNoAxesColumn, Loader2} from 'lucide-react';
import { ImageWithLoading } from '@/components/ui';
import { useItemFormatting } from '@/hooks/util';

// Memoized sub-component for individual investment items
const InvestmentItem = React.memo(({ 
  investment, 
  formatPrice,
  displayName,
  subtitle,
  isNew = false,
  isPriceLoading = false,
  isWatchlistItem = false 
}) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200 ${isNew ? 'animate-slide-in-from-top' : ''}`}>
      {/* Left side: Image and item details */}
      <div className="flex items-center space-x-4">
        {/* Image container with loading states */}
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 relative">
          <ImageWithLoading
            src={investment.image_url}
            alt={displayName(investment)}
            customFallback={
              <span className="text-xs font-medium text-white">
                {investment.name.substring(0, 2).toUpperCase()}
              </span>
            }
          />
        </div>

        {/* Item information */}
        <div className="min-w-0 flex-1">
          {/* Item name with optional skin name */}
          <h3 className="font-medium text-white truncate">
            {displayName(investment)}
          </h3>
          {/*  Conditional subtitle based on item type */}
          <p className="text-sm text-gray-400">
            {isWatchlistItem ? (
              // Watchlist subtitle: show condition and marketplace
              <>
                {investment.condition && <span>{investment.condition}</span>}
                {investment.condition && investment.current_marketplace && <span> • </span>}
                {investment.current_marketplace && (
                  <span className="text-blue-400">{investment.current_marketplace.toUpperCase()}</span>
                )}
              </>
            ) : (
              // Portfolio subtitle: existing logic with quantity
              subtitle(investment)
            )}
          </p>
        </div>
      </div>
      
      {/* Right side */}
      <div className="text-right flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium flex items-center space-x-1">
            {isPriceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              <span>{formatPrice(investment.current_price)}</span>
            )}
            {isPriceLoading && (
              <div className="relative group">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  Loading current price...
                </div>
              </div>
            )}
          </span>
          
          {!isPriceLoading && !isNaN(investment.changePercent) && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              investment.trend === 'up'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {investment.trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(investment.changePercent).toFixed(1)}%</span>
            </div>
          )}
          
          {isPriceLoading && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
              <span>---%</span>
            </div>
          )}
        </div>
        {/* Label based on item type */}
        <p className="text-sm text-gray-400">
          from {formatPrice(investment.buy_price)}
          {isWatchlistItem && <span className="text-gray-500"> (baseline)</span>}
        </p>
      </div>
    </div>
  );
});

// Memoized pagination component for navigating through multiple pages of results
const PaginationControls = React.memo(({ 
  currentPage, 
  totalPages, 
  onPrevious, 
  onNext, 
  onPageClick 
}) => {
  // Calculate which page numbers to show (max 3 pages)
  // Logic ensures current page stays in view when possible
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
      let pageIndex;
      if (totalPages <= 3) {
        // Show all pages if 3 or fewer total
        pageIndex = i;
      } else if (currentPage === 0) {
        // Show first 3 pages when on first page
        pageIndex = i;
      } else if (currentPage === totalPages - 1) {
        // Show last 3 pages when on last page
        pageIndex = totalPages - 3 + i;
      } else {
        // Show current page in middle with one page on each side
        pageIndex = currentPage - 1 + i;
      }
      return pageIndex;
    });
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center mt-4 space-x-2 pt-4 border-t border-gray-700/50">
      {/* Previous page button */}
      <button
        onClick={onPrevious}
        disabled={currentPage === 0}
        className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* Page number buttons */}
      {pageNumbers.map((pageIndex) => (
        <button
          key={pageIndex}
          onClick={() => onPageClick(pageIndex)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
            currentPage === pageIndex
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
          }`}
        >
          {pageIndex + 1} {/* Display 1-based page numbers to users */}
        </button>
      ))}
      
      {/* Next page button */}
      <button
        onClick={onNext}
        disabled={currentPage === totalPages - 1}
        className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
});

// Main component that displays recent price changes for investments
const RecentPriceChanges = React.memo(({ 
  investments = [], 
  watchlist = [],
  itemStates = new Map(),
  viewMode = 'portfolio',
  onViewModeChange }) => {

  const [currentPage, setCurrentPage] = useState(0); // pagination state
  const [showAll, setShowAll] = useState(false); // toggle state for top 10 vs all items
  const [sortOrder, setSortOrder] = useState('most'); // state for sorting by 'most' or 'least'
  
  // Determine which data to use based on view mode
  const activeData = viewMode === 'portfolio' ? investments : watchlist;

  const { displayName, subtitle } = useItemFormatting();

  // Configuration constants
  const itemsPerPage = 5;
  const maxItemsToShow = showAll ? investments.length : 10;

  // Create shared price formatter to avoid recreating on each render
  // Uses Intl.NumberFormat for consistent currency formatting
  const priceFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }), []);

  // Memoized price formatting function to prevent unnecessary re-renders of child components
  const formatPrice = useCallback((price) => {
    return priceFormatter.format(price);
  }, [priceFormatter]);

  // Get recent price changes with sorting - optimized for early exit on filtering
    const priceChanges = useMemo(() => {
    if (!activeData.length) return [];
    
    const changes = [];
    
    if (viewMode === 'portfolio') {
      // portfolio logic
      for (let i = 0; i < activeData.length; i++) {
        const inv = activeData[i];
        const quantity = parseFloat(inv.quantity);
        
        if (quantity <= 0) continue;
        
        const currentPrice = parseFloat(inv.current_price);
        const buyPrice = parseFloat(inv.buy_price);
        
        if (!currentPrice || currentPrice <= 0 || !buyPrice || buyPrice <= 0) continue;
        
        const changePercent = ((currentPrice - buyPrice) / buyPrice) * 100;
        
        changes.push({
          ...inv,
          changePercent,
          changeAmount: currentPrice - buyPrice,
          trend: changePercent >= 0 ? 'up' : 'down'
        });
      }
    } else {
      // Watchlist logic
      for (let i = 0; i < activeData.length; i++) {
        const item = activeData[i];
        
        const currentPrice = parseFloat(item.current_price);
        const baselinePrice = parseFloat(item.baseline_price);
        
        if (!currentPrice || !baselinePrice || currentPrice <= 0 || baselinePrice <= 0) continue;
        
        const changePercent = parseFloat(item.price_change_percent) || 0;
        
        changes.push({
          id: item.id,
          name: item.name,
          skin_name: item.skin_name || null,
          image_url: item.image_url,
          current_price: currentPrice,
          buy_price: baselinePrice,
          quantity: 1,
          changePercent,
          changeAmount: parseFloat(item.price_change) || 0,
          trend: changePercent >= 0 ? 'up' : 'down',
          condition: item.condition,
          variant: item.variant,
          current_marketplace: item.current_marketplace, 
          isWatchlistItem: true 
        });
      }
    }
    
    changes.sort((a, b) => {
      const comparison = Math.abs(b.changePercent) - Math.abs(a.changePercent);
      return sortOrder === 'most' ? comparison : -comparison;
    });
    
    return changes.slice(0, maxItemsToShow);
  }, [activeData, viewMode, maxItemsToShow, sortOrder]);

  // Calculate pagination data separately to avoid recalculating when only page changes
  // Determines total pages needed and items to show on current page
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(priceChanges.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, priceChanges.length);
    const currentPageItems = priceChanges.slice(startIndex, endIndex);
    
    return { totalPages, currentPageItems };
  }, [priceChanges, currentPage, itemsPerPage]);

  const { totalPages, currentPageItems } = paginationData;

  // Toggles between showing all items vs top 10
  const handleShowAllToggle = useCallback(() => {
    setShowAll(prev => !prev);
    setCurrentPage(0);
  }, []);

  // Toggles sort order between most changed and least changed
  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'most' ? 'least' : 'most');
    setCurrentPage(0);
  }, []);

  // Navigate to previous page
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  // Navigate to next page
  const handleNextPage = useCallback(() => {
  setCurrentPage(prev => {
    const currentTotalPages = Math.ceil(priceChanges.length / itemsPerPage);
    return Math.min(currentTotalPages - 1, prev + 1);
  });
}, [priceChanges.length, itemsPerPage]);

  // Navigate to specific page by clicking page number
  const handlePageClick = useCallback((pageIndex) => {
    setCurrentPage(pageIndex);
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl mb-8 p-6 border border-gray-700/50 h-[700px] flex flex-col">
      {/* Header with new toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Recent Price Changes</h2>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-700/50 rounded-lg p-1 border border-gray-600/50">
            <button
              onClick={() => onViewModeChange('portfolio')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                viewMode === 'portfolio'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => onViewModeChange('watchlist')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                viewMode === 'watchlist'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Watchlist
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Active items counter */}
          <div className="text-sm text-gray-400">
            {priceChanges.length} active items
          </div>
          
          {/* Sort order toggle button */}
          <button
            onClick={handleSortToggle}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-white transition-all duration-200 text-sm border border-gray-600/50 hover:border-gray-500/50"
          >
            {sortOrder === 'most' ? (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>Most Changed</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                <span>Least Changed</span>
              </>
            )}
          </button>
          
          {/* Show All/Top 10 toggle - only shown when there are more than 10 items */}
          {investments.length > 10 && (
            <div className="relative">
              <button
                onClick={handleShowAllToggle}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${
                  showAll 
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30' 
                    : 'bg-gray-700/60 border-gray-600/50 text-gray-300 hover:bg-gray-600/60 hover:text-white hover:border-gray-500/50'
                }`}
              >
                {showAll ? (
                  <>
                    <ListFilterPlus className="w-4 h-4" />
                    <span>All Items</span>
                  </>
                ) : (
                  <>
                    <ListFilter className="w-4 h-4" />
                    <span>Top 10</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content area - uses flexbox to fill available space */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Conditional rendering: either show items or centered empty state */}
        {currentPageItems.length === 0 ? (
          // Empty state - centered in the entire available space
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartNoAxesColumn className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-400 mb-2">No price changes to display</h3>
              <p className="text-gray-500 max-w-md">Items will appear here when adding investments</p>
            </div>
          </div>
        ) : (
          <>
            {/* Investment items list */}
            <div className="space-y-4 flex-grow">
              {currentPageItems.map((investment) => {
                const itemState = itemStates.get(investment.id) || { isNew: false, isPriceLoading: false };
                return (
                  <InvestmentItem 
                    key={investment.id}
                    investment={investment}
                    formatPrice={formatPrice}
                    displayName={displayName}
                    subtitle={subtitle}
                    isNew={itemState.isNew}
                    isPriceLoading={itemState.isPriceLoading}
                    isWatchlistItem={investment.isWatchlistItem || false}
                  />
                );
              })}
            </div>

            {/* Pagination controls - pinned to bottom of container */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                onPageClick={handlePageClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

InvestmentItem.displayName = 'InvestmentItem';
PaginationControls.displayName = 'PaginationControls';
RecentPriceChanges.displayName = 'RecentPriceChanges';

export default RecentPriceChanges;