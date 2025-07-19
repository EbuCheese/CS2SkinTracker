import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ListFilterPlus, ListFilter} from 'lucide-react';

const RecentPriceChanges = ({ investments = [] }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [sortOrder, setSortOrder] = useState('most'); // 'most' or 'least'
  
  // Fixed items per page
  const itemsPerPage = 5;
  const maxItemsToShow = showAll ? investments.length : 10; // Show top 10 when not showing all

  // Format price utility
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Get recent price changes with sorting
  const priceChanges = useMemo(() => {
    const changes = investments
      .filter(inv => parseFloat(inv.quantity) > 0) // Only include items with quantity > 0
      .map(inv => {
        const currentPrice = parseFloat(inv.current_price);
        const buyPrice = parseFloat(inv.buy_price);
        const changePercent = ((currentPrice - buyPrice) / buyPrice) * 100;
        
        return {
          ...inv,
          changePercent,
          changeAmount: currentPrice - buyPrice,
          trend: changePercent >= 0 ? 'up' : 'down'
        };
      })
      .sort((a, b) => {
        if (sortOrder === 'most') {
          return Math.abs(b.changePercent) - Math.abs(a.changePercent);
        } else {
          return Math.abs(a.changePercent) - Math.abs(b.changePercent);
        }
      });
    
    // Limit results based on showAll state
    return changes.slice(0, maxItemsToShow);
  }, [investments, maxItemsToShow, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(priceChanges.length / itemsPerPage);
  const currentPageItems = priceChanges.slice(
    currentPage * itemsPerPage, 
    (currentPage + 1) * itemsPerPage
  );

  // Reset to first page when toggling showAll or changing sort
  const handleShowAllToggle = () => {
    setShowAll(!showAll);
    setCurrentPage(0);
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'most' ? 'least' : 'most');
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
  };

  const handlePageClick = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

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
            <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                  {investment.image_url ? (
                    <img 
                      src={investment.image_url} 
                      alt={`${investment.name} | ${investment.skin_name}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full ${investment.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                    <span className="text-xs font-medium text-white">
                      {investment.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-white truncate">
                    {investment.name}{investment.skin_name && ` (${investment.skin_name})`}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {investment.condition && investment.condition.toLowerCase() !== 'unknown' 
                      ? `${investment.condition} • Qty: ${investment.quantity}`
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
          <div className="flex items-center justify-center mt-4 space-x-2 pt-4 border-t border-gray-700/50">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
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
              
              return (
                <button
                  key={pageIndex}
                  onClick={() => handlePageClick(pageIndex)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    currentPage === pageIndex
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  }`}
                >
                  {pageIndex + 1}
                </button>
              );
            })}
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentPriceChanges;