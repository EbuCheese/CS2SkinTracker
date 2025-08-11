import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Plus, DollarSign } from 'lucide-react';
import { ImageWithLoading } from '@/components/ui';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  const [visibleItems, setVisibleItems] = useState(3);
  const [cardHeight, setCardHeight] = useState(120); // Default to max height
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const timeoutRef = useRef(null);

  // Calculate how many items can fit based on available container height
  const calculateOptimalLayout = useCallback(() => {
    if (!containerRef.current || !headerRef.current || recentActivity.length === 0) {
      return;
    }

    // Handle empty state separately
    if (recentActivity.length === 0) {
      setVisibleItems(0);
      return;
    }

    const containerHeight = containerRef.current.offsetHeight;
    const headerHeight = headerRef.current.offsetHeight;
    const availableHeight = containerHeight - headerHeight - 48; // padding and margins

    const minCardHeight = 80;
    const maxCardHeight = 120;
    const spacing = 12; // gap between items

    // Calculate how many items can actually fit, then limit by available items
  const maxItemsThatFit = Math.floor((availableHeight + spacing) / (minCardHeight + spacing));
  const actualItemCount = Math.min(recentActivity.length, Math.max(maxItemsThatFit, 1));
  setVisibleItems(actualItemCount);

    if (actualItemCount === 0) return;

    // Calculate optimal card height
    const totalSpacing = (actualItemCount - 1) * spacing;
    const heightPerCard = (availableHeight - totalSpacing) / actualItemCount;
    
    // Constrain to reasonable bounds
    const finalHeight = Math.min(Math.max(heightPerCard, minCardHeight), maxCardHeight);
    setCardHeight(finalHeight);

  }, [recentActivity.length]);

  // Debounce resize events to prevent excessive recalculations
  const handleResize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(calculateOptimalLayout, 200);
  }, [calculateOptimalLayout]);

  useEffect(() => {
  // Add a small delay to let DOM settle after prop changes
  const initialLayoutTimer = setTimeout(() => {
    calculateOptimalLayout();
  }, 50);

  window.addEventListener('resize', handleResize);
  
  if (!resizeObserverRef.current) {
    resizeObserverRef.current = new ResizeObserver((entries) => {
      // Only recalculate if the container actually changed size significantly
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (height > 100) { // Only trigger if container has meaningful height
          handleResize();
        }
      }
    });
  }
  
  if (containerRef.current) {
    resizeObserverRef.current.observe(containerRef.current);
  }

  return () => {
    clearTimeout(initialLayoutTimer);
    window.removeEventListener('resize', handleResize);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [handleResize]);

  // Cleanup ResizeObserver on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
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
        className="flex items-center justify-between mb-6 flex-shrink-0"
      >
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="text-sm text-gray-400">
          {recentActivity.length === 0 ? 'No transactions' : `${recentActivity.length} transaction${recentActivity.length !== 1 ? 's' : ''}`}
        </div>
      </div>
     
      <div className="flex-1 flex flex-col overflow-hidden">
        {recentActivity.length > 0 ? (
          <div className="flex flex-col space-y-3 flex-shrink-0">
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
                  key={`${activity.type}-${activity.id || activity.investment_id || index}-${activity.date?.getTime()}`}
                  className="flex-shrink-0"
                >
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200"
                    style={{ minHeight: `${Math.floor(cardHeight)}px` }}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* ImageWithLoading and custom fallback */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        <ImageWithLoading
                          src={activity.image_url}
                          alt={activity.title}
                          customFallback={
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {activity.title?.substring(0, 2).toUpperCase() || 'CS'}
                              </span>
                            </div>
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
                        {!isVeryCompact && activity.processedSubtitle && (
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-xl font-medium text-gray-400 mb-2">No recent activity</p>
              <p className="text-gray-500">Items will appear here when adding investments</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;