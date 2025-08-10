import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Plus, DollarSign } from 'lucide-react';
import { ImageWithLoading } from '@/components/ui';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  const [visibleItems, setVisibleItems] = useState(3);
  const [cardHeight, setCardHeight] = useState('auto');
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const timeoutRef = useRef(null);

  // Calculate how many items can fit based on available container height
  // Balances between showing more items vs maintaining readable card sizes
  const calculateOptimalLayout = useCallback(() => {
    if (!containerRef.current || !headerRef.current) return;

    const containerHeight = containerRef.current.offsetHeight;
    const headerHeight = headerRef.current.offsetHeight;
    const availableHeight = containerHeight - headerHeight - 48;

    if (recentActivity.length === 0) {
      setVisibleItems(0);
      return;
    }

    const minCardHeight = 80;
    const maxCardHeight = 120;
    const spacing = 16;

    let optimalItems = 1;
    let optimalHeight = maxCardHeight;

    // Find the sweet spot between number of items and card readability
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
  }, [recentActivity.length]);

  // Debounce resize events to prevent excessive recalculations
  const handleResize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(calculateOptimalLayout, 100);
  }, [calculateOptimalLayout]);

  useEffect(() => {
    calculateOptimalLayout();

    window.addEventListener('resize', handleResize);
    
    // Create ResizeObserver only once to avoid multiple observers
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(calculateOptimalLayout);
    }
    
    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (resizeObserverRef.current && containerRef.current) {
        resizeObserverRef.current.unobserve(containerRef.current);
      }
    };
  }, [calculateOptimalLayout, handleResize]);

  // Cleanup ResizeObserver on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Memoize layout calculations
  const { isCompact, isVeryCompact } = useMemo(() => ({
    isCompact: cardHeight < 100,
    isVeryCompact: cardHeight < 85
  }), [cardHeight]);

  // Memoize visible activities to prevent unnecessary recalculation
  const visibleActivities = useMemo(() => 
    recentActivity.slice(0, visibleItems),
    [recentActivity, visibleItems]
  );

  // Memoize activity processing to avoid recalculating subtitles on every render
  const processedActivities = useMemo(() => {
    return visibleActivities.map(activity => {
      // Build subtitle once and cache it
      const condition = activity.item_condition || activity.condition;
      const variant = activity.item_variant || activity.variant;
      const quantity = activity.quantity_sold || activity.quantity || 1;
      
      // Build condition text
      const conditionText = condition && condition.toLowerCase() !== 'unknown' && condition.toLowerCase() !== ''
        ? condition
        : '';
      
      // Build variant abbreviation
      const variantText = variant && variant.toLowerCase() !== 'normal'
        ? ` (${variant.toLowerCase() === 'stattrak' ? 'ST' : 
              variant.toLowerCase() === 'souvenir' ? 'SV' : 
              variant})`
        : '';
      
      // Combine parts
      const parts = [];
      if (conditionText) {
        parts.push(`${conditionText}${variantText}`);
      } else if (variantText) {
        parts.push(variantText.trim());
      }
      parts.push(`Qty: ${quantity}`);
      
      return {
        ...activity,
        processedSubtitle: parts.join(' • ')
      };
    });
  }, [visibleActivities]);

  // Memoize date formatting options
  const dateOptions = useMemo(() => ({
    compact: { month: 'short', day: 'numeric' },
    normal: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  }), []);

  return (
    <div 
      ref={containerRef}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col"
      style={{ minHeight: '600px' }}
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
     
      <div className="flex-1 flex flex-col h-full">
        {recentActivity.length > 0 ? (
          <>
            <div className="flex-1 flex flex-col" style={{ gap: '12px' }}>
              {processedActivities.map((activity, index) => {
                // Calculate date format inline (this is fine since it's lightweight)
                const formattedDate = (() => {
                  if (!activity.date || isNaN(activity.date.getTime())) {
                    return 'Unknown date';
                  }
                  return activity.date.toLocaleDateString('en-US', 
                    isCompact ? dateOptions.compact : dateOptions.normal
                  );
                })();

                // Direct style calculations (these are fine - very fast)
                const activityIconBg = activity.type === 'purchase' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-green-500/20 text-green-400';

                const amountColor = activity.type === 'purchase' ? 'text-red-400' : 'text-green-400';

                return (
                  <div 
                    key={`${activity.type}-${activity.id || index}`}
                    className="flex-1"
                    style={{ minHeight: `${Math.floor(cardHeight)}px` }}
                  >
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200"
                      style={{ minHeight: `${cardHeight}px` }}
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* ImageWithLoading and custom fallback */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          <ImageWithLoading
                            src={activity.image_url}
                            alt={activity.title}
                            customFallback={
                              <span className="text-sm font-medium text-white">
                                {activity.title.substring(0, 2).toUpperCase()}
                              </span>
                            }
                          />
                        </div>
                        
                        {/* Activity Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activityIconBg}`}>
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
                              {activity.processedSubtitle}
                            </p>
                          )}
                          <p className={`text-gray-500 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                            {formattedDate}
                          </p>
                        </div>
                      </div>
                    
                      {/* Amount */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className={`font-medium ${isCompact ? 'text-sm' : 'text-base'} ${amountColor}`}>
                          {activity.type === 'purchase' ? '-' : '+'}{formatPrice(Math.abs(activity.amount))}
                        </span>
                        {!isVeryCompact && (
                          <p className={`text-gray-400 capitalize ${isCompact ? 'text-xs' : 'text-sm'}`}>
                            {activity.type}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer with additional info */}
            {recentActivity.length > visibleItems && (
              <div className="mt-4 pt-4 border-t border-gray-600/30 flex-shrink-0">
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
          </>
        ) : (
          <div className="text-center py-8 text-gray-400 flex-1 flex flex-col justify-center mb-12">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-xl text-gray-400">No recent activity</p>
            <p className="text-md text-gray-500">Items will appear here when adding investments</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;