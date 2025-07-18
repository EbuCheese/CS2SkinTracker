import React, { useState, useEffect, useRef } from 'react';
import { Activity, Plus, DollarSign } from 'lucide-react';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  const [visibleItems, setVisibleItems] = useState(3);
  const [cardHeight, setCardHeight] = useState('auto');
  const containerRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const calculateOptimalLayout = () => {
      if (!containerRef.current || !headerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const headerHeight = headerRef.current.offsetHeight;
      const availableHeight = containerHeight - headerHeight - 48; // 48px for padding/margins

      if (recentActivity.length === 0) {
        setVisibleItems(0);
        return;
      }

      // Calculate how many items can fit with different card heights
      const minCardHeight = 80; // Increased minimum height for w-16 h-16 images
      const maxCardHeight = 120; // Maximum for readability
      const spacing = 16; // Space between cards

      let optimalItems = 1;
      let optimalHeight = maxCardHeight;

      // Try different numbers of items to find the best fit
      for (let items = 1; items <= Math.min(recentActivity.length, 8); items++) {
        const totalSpacing = (items - 1) * spacing;
        const heightPerCard = (availableHeight - totalSpacing) / items;
        
        if (heightPerCard >= minCardHeight) {
          optimalItems = items;
          optimalHeight = Math.min(heightPerCard, maxCardHeight);
        }
      }

      setVisibleItems(optimalItems);
      setCardHeight(optimalHeight);
    };

    // Initial calculation
    calculateOptimalLayout();

    // Recalculate on window resize
    const handleResize = () => {
      setTimeout(calculateOptimalLayout, 100); // Debounce
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(calculateOptimalLayout);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [recentActivity.length]);

  // Determine layout mode based on card height
  const isCompact = cardHeight < 100;
  const isVeryCompact = cardHeight < 85;

  return (
    <div 
      ref={containerRef}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col"
      style={{ minHeight: '600px' }} // Match approximate height of PortfolioHealthPieChart
    >
      <div 
        ref={headerRef}
        className="flex items-center justify-between mb-6"
      >
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="text-sm text-gray-400">
          {visibleItems > 0 ? `${visibleItems} of ${recentActivity.length}` : `${recentActivity.length} transactions`}
        </div>
      </div>
     
      <div className="flex-1 flex flex-col justify-between">
        {recentActivity.length > 0 ? (
          <div className="space-y-3 flex-1">
            {recentActivity.slice(0, visibleItems).map((activity, index) => (
              <div 
                key={`${activity.type}-${activity.id || index}`} 
                className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200"
                style={{ minHeight: `${cardHeight}px` }}
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Fixed size image - w-16 h-16 */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                    {activity.image_url ? (
                      <img
                        src={activity.image_url}
                        alt={activity.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full ${activity.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                      <span className="text-sm font-medium text-white">
                        {activity.title.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Activity Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'purchase'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {activity.type === 'purchase' ? (
                      <Plus className="w-5 h-5" />
                    ) : (
                      <DollarSign className="w-5 h-5" />
                    )}
                  </div>
                  
                  {/* Activity Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-medium text-white truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                      {activity.title}
                    </h3>
                    {!isVeryCompact && (
                      <p className={`text-gray-400 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                        {activity.subtitle}
                      </p>
                    )}
                    <p className={`text-gray-500 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                      {activity.date && !isNaN(activity.date.getTime()) ?
                        activity.date.toLocaleDateString('en-US', 
                          isCompact ? 
                            { month: 'short', day: 'numeric' } :
                            { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
                        ) : 'Unknown date'
                      }
                    </p>
                  </div>
                </div>
               
                {/* Amount */}
                <div className="text-right flex-shrink-0 ml-4">
                  <span className={`font-medium ${isCompact ? 'text-sm' : 'text-base'} ${
                    activity.type === 'purchase' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {activity.type === 'purchase' ? '-' : '+'}{formatPrice(Math.abs(activity.amount))}
                  </span>
                  {!isVeryCompact && (
                    <p className={`text-gray-400 capitalize ${isCompact ? 'text-xs' : 'text-sm'}`}>
                      {activity.type}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 flex-1 flex flex-col justify-center">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
        
        {/* Footer with additional info */}
        {recentActivity.length > visibleItems && (
          <div className="mt-4 pt-4 border-t border-gray-600/30">
            <div className="flex items-center justify-between">
              <button className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors">
                View all activity →
              </button>
              <span className="text-xs text-gray-500">
                +{recentActivity.length - visibleItems} more
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;