import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Plus, DollarSign } from 'lucide-react';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  const [visibleItems, setVisibleItems] = useState(3);
  const [cardHeight, setCardHeight] = useState('auto');
  const [imageStates, setImageStates] = useState({}); // Persistent image states
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const timeoutRef = useRef(null);
  const imageStateInitialized = useRef(new Set()); // Track initialized states

  // Optimized image loading handlers - use functional updates to avoid stale closures
  const handleImageLoad = useCallback((activityId) => {
    setImageStates(prev => {
      if (prev[activityId]?.loading === false) return prev; // Avoid unnecessary updates
      return {
        ...prev,
        [activityId]: { loading: false, error: false }
      };
    });
  }, []);

  const handleImageError = useCallback((activityId) => {
    setImageStates(prev => {
      if (prev[activityId]?.error === true) return prev; // Avoid unnecessary updates
      return {
        ...prev,
        [activityId]: { loading: false, error: true }
      };
    });
  }, []);

  const getImageState = useCallback((activityId) => {
    return imageStates[activityId] || { loading: true, error: false };
  }, [imageStates]);

  // More efficient image state initialization - only initialize new items
  useEffect(() => {
    let hasNewStates = false;
    const newImageStates = {};
    
    recentActivity.forEach(activity => {
      const activityId = activity.id || activity.title;
      if (activity.image_url && !imageStateInitialized.current.has(activityId)) {
        newImageStates[activityId] = { loading: true, error: false };
        imageStateInitialized.current.add(activityId);
        hasNewStates = true;
      }
    });
    
    if (hasNewStates) {
      setImageStates(prev => ({ ...prev, ...newImageStates }));
    }
  }, [recentActivity]);

  // Cleanup tracking for removed activities
  useEffect(() => {
    const activeIds = new Set(recentActivity.map(activity => activity.id || activity.title));
    const currentIds = Array.from(imageStateInitialized.current);
    
    // Remove states for activities that no longer exist
    const idsToRemove = currentIds.filter(id => !activeIds.has(id));
    if (idsToRemove.length > 0) {
      setImageStates(prev => {
        const newStates = { ...prev };
        idsToRemove.forEach(id => delete newStates[id]);
        return newStates;
      });
      idsToRemove.forEach(id => imageStateInitialized.current.delete(id));
    }
  }, [recentActivity]);

  // Memoize the calculation function to prevent recreation on every render
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

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(calculateOptimalLayout, 100);
  }, [calculateOptimalLayout]);

  useEffect(() => {
    calculateOptimalLayout();

    window.addEventListener('resize', handleResize);
    
    // Create ResizeObserver only once
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
              {visibleActivities.map((activity, index) => {
                const activityId = activity.id || activity.title;
                const imageState = getImageState(activityId);
                
                // Direct calculation without useMemo to avoid hook order issues
                const formattedDate = (() => {
                  if (!activity.date || isNaN(activity.date.getTime())) {
                    return 'Unknown date';
                  }
                  return activity.date.toLocaleDateString('en-US', 
                    isCompact ? dateOptions.compact : dateOptions.normal
                  );
                })();

                // Direct style calculations
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
                        {/* Optimized image container */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 relative">
                          {/* Loading Spinner - only show if loading and not error */}
                          {imageState.loading && !imageState.error && activity.image_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          
                          {/* Image */}
                          {activity.image_url && (
                            <img
                              src={activity.image_url}
                              alt={activity.title}
                              className={`w-full h-full object-contain transition-opacity duration-200 ${
                                imageState.loading ? 'opacity-0' : 'opacity-100'
                              }`}
                              onLoad={() => handleImageLoad(activityId)}
                              onError={() => handleImageError(activityId)}
                              loading="lazy"
                            />
                          )}
                          
                          {/* Fallback for no image or error */}
                          {(!activity.image_url || imageState.error) && !imageState.loading && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {activity.title.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
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
                              {activity.subtitle && activity.subtitle.toLowerCase() !== 'unknown' 
                                ? (() => {
                                    const parts = activity.subtitle.split(' • ');
                                    const condition = parts[0];
                                    const qtyPart = parts.find(part => part.startsWith('Qty:')) || `Qty: ${activity.quantity || 1}`;
                                    
                                    const variant = (activity.variant || activity.item_variant) && 
                                                (activity.variant || activity.item_variant).toLowerCase() !== 'normal' 
                                    ? ` (${(activity.variant || activity.item_variant).toLowerCase() === 'stattrak' ? 'ST' : 
                                          (activity.variant || activity.item_variant).toLowerCase() === 'souvenir' ? 'SV' : 
                                          (activity.variant || activity.item_variant)})`
                                    : '';
                                      
                                    return `${condition}${variant} • ${qtyPart}`;
                                  })()
                                : `Qty: ${activity.quantity || 1}`
                              }
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
          <div className="text-center py-8 text-gray-400 flex-1 flex flex-col justify-center">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;