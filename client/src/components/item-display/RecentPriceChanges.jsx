import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, ListFilterPlus, ListFilter} from 'lucide-react';

// Memoized sub-component for individual investment items
const InvestmentItem = React.memo(({ 
  investment, 
  formatPrice, 
  handleImageLoad, 
  handleImageError, 
  getImageState 
}) => {
  const imageState = getImageState(investment.id);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 relative">
          {/* Loading Spinner */}
          {imageState.loading && !imageState.error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Image */}
          {investment.image_url && (
            <img 
              src={investment.image_url} 
              alt={`${investment.name} | ${investment.skin_name}`}
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                imageState.loading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => handleImageLoad(investment.id)}
              onError={() => handleImageError(investment.id)}
              loading="lazy"
            />
          )}
          
          {/* Fallback for no image or error */}
          {(!investment.image_url || imageState.error) && !imageState.loading && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {investment.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate">
            {investment.name}{investment.skin_name && ` (${investment.skin_name})`}
          </h3>
          <p className="text-sm text-gray-400">
            {investment.condition && investment.condition.toLowerCase() !== 'unknown' 
              ? `${investment.condition}${investment.variant && investment.variant.toLowerCase() !== 'normal' ? ` (${investment.variant === 'stattrak' ? 'ST' : investment.variant === 'souvenir' ? 'SV' : investment.variant})` : ''} • Qty: ${investment.quantity}`
              : `Qty: ${investment.quantity}`
            }
          </p>
        </div>
      </div>
      
      <div className="text-right flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">
            {formatPrice(investment.current_price)}
          </span>
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
        </div>
        <p className="text-sm text-gray-400">
          from {formatPrice(investment.buy_price)}
        </p>
      </div>
    </div>
  );
});

// Memoized pagination component
const PaginationControls = React.memo(({ 
  currentPage, 
  totalPages, 
  onPrevious, 
  onNext, 
  onPageClick 
}) => {
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
      let pageIndex;
      if (totalPages <= 3) {
        pageIndex = i;
      } else if (currentPage === 0) {
        pageIndex = i;
      } else if (currentPage === totalPages - 1) {
        pageIndex = totalPages - 3 + i;
      } else {
        pageIndex = currentPage - 1 + i;
      }
      return pageIndex;
    });
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center mt-4 space-x-2 pt-4 border-t border-gray-700/50">
      <button
        onClick={onPrevious}
        disabled={currentPage === 0}
        className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
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
          {pageIndex + 1}
        </button>
      ))}
      
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

const RecentPriceChanges = React.memo(({ investments = [] }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [sortOrder, setSortOrder] = useState('most'); // 'most' or 'least'
  const [imageStates, setImageStates] = useState({});
  
  // Fixed items per page
  const itemsPerPage = 5;
  const maxItemsToShow = showAll ? investments.length : 10; // Show top 10 when not showing all

  // Create shared NumberFormat instance to avoid recreating it
  const priceFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }), []);

  // Format price utility - memoized with useCallback
  const formatPrice = useCallback((price) => {
    return priceFormatter.format(price);
  }, [priceFormatter]);

  // Handle image loading states - memoized callbacks
  const handleImageLoad = useCallback((investmentId) => {
    setImageStates(prev => ({
      ...prev,
      [investmentId]: { loading: false, error: false }
    }));
  }, []);

  const handleImageError = useCallback((investmentId) => {
    setImageStates(prev => ({
      ...prev,
      [investmentId]: { loading: false, error: true }
    }));
  }, []);

  const getImageState = useCallback((investmentId) => {
    return imageStates[investmentId] || { loading: true, error: false };
  }, [imageStates]);

  // Get recent price changes with sorting - optimized for early exit on filtering
  const priceChanges = useMemo(() => {
    // Early exit if no investments
    if (!investments.length) return [];
    
    const changes = [];
    
    // Process items in a single pass
    for (let i = 0; i < investments.length; i++) {
      const inv = investments[i];
      const quantity = parseFloat(inv.quantity);
      
      // Skip items with quantity <= 0 early
      if (quantity <= 0) continue;
      
      const currentPrice = parseFloat(inv.current_price);
      const buyPrice = parseFloat(inv.buy_price);
      const changePercent = ((currentPrice - buyPrice) / buyPrice) * 100;
      
      changes.push({
        ...inv,
        changePercent,
        changeAmount: currentPrice - buyPrice,
        trend: changePercent >= 0 ? 'up' : 'down'
      });
    }
    
    // Sort based on absolute change percentage
    changes.sort((a, b) => {
      const comparison = Math.abs(b.changePercent) - Math.abs(a.changePercent);
      return sortOrder === 'most' ? comparison : -comparison;
    });
    
    // Limit results based on showAll state
    return changes.slice(0, maxItemsToShow);
  }, [investments, maxItemsToShow, sortOrder]);

  // Pagination calculations - separate from main data processing
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(priceChanges.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, priceChanges.length);
    const currentPageItems = priceChanges.slice(startIndex, endIndex);
    
    return { totalPages, currentPageItems };
  }, [priceChanges, currentPage, itemsPerPage]);

  const { totalPages, currentPageItems } = paginationData;

  // Event handlers - memoized to prevent unnecessary re-renders
  const handleShowAllToggle = useCallback(() => {
    setShowAll(prev => !prev);
    setCurrentPage(0);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'most' ? 'least' : 'most');
    setCurrentPage(0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  const handlePageClick = useCallback((pageIndex) => {
    setCurrentPage(pageIndex);
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl mb-8 p-6 border border-gray-700/50 h-[700px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Price Changes</h2>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            {priceChanges.length} active items
          </div>
          
          {/* Sort Toggle */}
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
          
          {/* Show All Toggle */}
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
      
      {/* Content area that grows to fill space */}
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="space-y-3 flex-grow">
          {currentPageItems.map((investment) => (
            <InvestmentItem 
              key={investment.id}
              investment={investment}
              formatPrice={formatPrice}
              handleImageLoad={handleImageLoad}
              handleImageError={handleImageError}
              getImageState={getImageState}
            />
          ))}
          
          {/* Empty state when no items */}
          {currentPageItems.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No price changes to display</p>
                <p className="text-sm">Items will appear here as prices fluctuate</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - pinned to bottom */}
        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onPageClick={handlePageClick}
          />
        )}
      </div>
    </div>
  );
});

InvestmentItem.displayName = 'InvestmentItem';
PaginationControls.displayName = 'PaginationControls';
RecentPriceChanges.displayName = 'RecentPriceChanges';

export default RecentPriceChanges;