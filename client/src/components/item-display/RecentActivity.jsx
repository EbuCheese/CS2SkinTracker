import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Plus, DollarSign } from 'lucide-react';
import { ImageWithLoading } from '@/components/ui';
import { useItemFormatting } from '@/hooks/util';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  const [visibleItemsWithoutScroll, setVisibleItemsWithoutScroll] = useState(3);
  const containerRef = useRef(null);
  const headerRef = useRef(null);

  const { displayName, simpleDisplayName, subtitle } = useItemFormatting();

  // Calculate how many items would fit without scrolling (for optimistic display)
  const calculateVisibleItems = useCallback(() => {
    if (!containerRef.current || !headerRef.current || recentActivity.length === 0) {
      return;
    }

    const containerHeight = containerRef.current.offsetHeight;
    const headerHeight = headerRef.current.offsetHeight;
    const availableHeight = containerHeight - headerHeight - 48; // padding and margins

    const itemHeight = 100 + 12; // 100px min height + 12px gap
    const maxItemsThatFit = Math.floor(availableHeight / itemHeight);
    const actualItemCount = Math.min(recentActivity.length, Math.max(maxItemsThatFit, 1));
    
    setVisibleItemsWithoutScroll(actualItemCount);
  }, [recentActivity.length]);

  // Setup resize handling
  useEffect(() => {
    const timeoutId = setTimeout(calculateVisibleItems, 50);

    const handleResize = () => {
      calculateVisibleItems();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateVisibleItems]);

  // Memoize activity processing - process all 12 items for scrolling
  const processedActivities = useMemo(() => {
  return recentActivity.map(activity => ({
    ...activity,
    processedSubtitle: subtitle(activity, { 
      quantityField: activity.type === 'sale' ? 'quantity_sold' : 'quantity',
      conditionField: activity.type === 'sale' ? 'item_condition' : 'condition',
      showQuantity: true
    }),
    // Now that sold items have the correct field names, displayName hook should work
    displayTitle: displayName(activity)
  }));
}, [recentActivity, subtitle, displayName]);

// Debug: Add this to see what fields your activity objects actually have
console.log('Activity object fields:', recentActivity[0] && Object.keys(recentActivity[0]));

  // Determine if we need scrolling based on optimistic calculation
  const needsScrolling = recentActivity.length > visibleItemsWithoutScroll;

  return (
    <div 
      ref={containerRef}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-full flex flex-col"
      style={{ height: '940px' }} // Keep your fixed height
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
          <div className={`flex flex-col space-y-3 ${needsScrolling ? 'flex-1 overflow-y-auto pr-2' : 'flex-1'}`}>
            {processedActivities.map((activity, index) => {
              const formattedDate = (() => {
                if (!activity.date || isNaN(activity.date.getTime())) {
                  return 'Unknown date';
                }
                return activity.date.toLocaleDateString('en-US', {
                  month: 'short', 
                  day: 'numeric', 
                  hour: 'numeric', 
                  minute: '2-digit'
                });
              })();

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
                    style={{ minHeight: '100px' }}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
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
                      
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activityIconBg}`}>
                        {activity.type === 'purchase' ? (
                          <Plus className="w-5 h-5" />
                        ) : (
                          <DollarSign className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate text-base">
                          {activity.displayTitle}
                        </h3>
                        {activity.processedSubtitle && (
                          <p className="text-gray-400 truncate text-sm">
                            {activity.processedSubtitle}
                          </p>
                        )}
                        <p className="text-gray-500 text-sm">
                          {formattedDate}
                        </p>
                      </div>
                    </div>
                  
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className={`font-medium text-base ${amountColor}`}>
                        {activity.type === 'purchase' ? '-' : '+'}{formatPrice(Math.abs(activity.amount))}
                      </span>
                      <p className="text-gray-400 capitalize text-sm">
                        {activity.type}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
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