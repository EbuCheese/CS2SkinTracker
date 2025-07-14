import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const RecentPriceChanges = ({ investments = [] }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  // Format price utility
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Get recent price changes sorted by most changed
  const priceChanges = useMemo(() => {
    return investments
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
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [investments]);

  // Pagination calculations
  const totalPages = Math.ceil(priceChanges.length / itemsPerPage);
  const currentPageItems = priceChanges.slice(
    currentPage * itemsPerPage, 
    (currentPage + 1) * itemsPerPage
  );

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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl mb-8 p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Biggest Price Changes</h2>
        <div className="text-sm text-gray-400">
          {priceChanges.length} active items
        </div>
      </div>
      
      <div className="space-y-4">
        {currentPageItems.map((investment) => (
          <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
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
              <div>
                <h3 className="font-medium text-white">
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
            
            <div className="text-right">
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 space-x-2">
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
  );
};

export default RecentPriceChanges;