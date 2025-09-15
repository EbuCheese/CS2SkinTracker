// MarketplacePriorityManager.jsx
import React, { useState } from 'react';
import { Store, Settings, RotateCcw, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const marketplaceOptions = [
  { value: 'csfloat', label: 'CSFloat', color: 'text-zinc-300', popularity: 1 },
  { value: 'buff163', label: 'Buff163', color: 'text-amber-400', popularity: 2 },
  { value: 'skinport', label: 'Skinport', color: 'text-sky-500', popularity: 3 },
  { value: 'steam', label: 'Steam', color: 'text-blue-500', popularity: 4 },
];

// Smart defaults based on popularity
const getSmartDefaults = () => {
  return marketplaceOptions
    .sort((a, b) => a.popularity - b.popularity)
    .map(option => option.value);
};

const MarketplacePriorityManager = ({ marketplacePriority, onChange, className = '' }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(marketplacePriority.length > 0 && 
    JSON.stringify(marketplacePriority) !== JSON.stringify(getSmartDefaults()));

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newPriority = [...marketplacePriority];
    const draggedItem = newPriority[draggedIndex];
    newPriority.splice(draggedIndex, 1);
    newPriority.splice(dropIndex, 0, draggedItem);
    
    onChange(newPriority);
    setDraggedIndex(null);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newPriority = [...marketplacePriority];
    [newPriority[index - 1], newPriority[index]] = [newPriority[index], newPriority[index - 1]];
    onChange(newPriority);
  };

  const moveDown = (index) => {
    if (index === marketplacePriority.length - 1) return;
    const newPriority = [...marketplacePriority];
    [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
    onChange(newPriority);
  };

  const resetToDefaults = () => {
    onChange(getSmartDefaults());
    setShowAdvanced(false);
  };

  const handleQuickSelect = (marketplace) => {
    // Move selected marketplace to top, keep rest in current order
    const newPriority = [marketplace, ...marketplacePriority.filter(m => m !== marketplace)];
    onChange(newPriority);
  };

  const getMarketplaceInfo = (value) => {
    return marketplaceOptions.find(option => option.value === value);
  };

  const isUsingDefaults = JSON.stringify(marketplacePriority) === JSON.stringify(getSmartDefaults());

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Store className="w-5 h-5 text-green-400" />
          <label className="block text-sm font-medium text-gray-300">
            Marketplace Priority
          </label>
        </div>
        <div className="flex items-center space-x-2">
          {!isUsingDefaults && (
            <button
              onClick={resetToDefaults}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-orange-400 rounded transition-colors duration-200"
              title="Reset to recommended order"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded transition-colors duration-200"
          >
            <Settings className="w-3 h-3" />
            <span>{showAdvanced ? 'Simple' : 'Advanced'}</span>
          </button>
        </div>
      </div>

      {!showAdvanced ? (
        // Simple Mode: Quick selection with smart defaults
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-3">
            Choose your preferred marketplace for. Others will be used as fallbacks in recommended order.
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {marketplaceOptions.map((option, index) => {
              const isSelected = marketplacePriority[0] === option.value;
              const info = getMarketplaceInfo(option.value);
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleQuickSelect(option.value)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-orange-600/20 border-orange-500/50 shadow-lg shadow-orange-500/10' 
                      : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-600/40 hover:border-gray-500/40'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${info?.color || 'text-white'}`}>
                      {info?.label}
                    </span>
                    {index === 0 && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 mt-1 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show current order preview */}
          <div className="mt-4 p-3 bg-gray-900/30 rounded-lg border border-gray-700/30">
            <p className="text-xs text-gray-400 mb-2">Current Priority Order:</p>
            <div className="flex items-center space-x-2">
              {marketplacePriority.map((marketplace, index) => {
                const info = getMarketplaceInfo(marketplace);
                return (
                  <React.Fragment key={marketplace}>
                    <span className={`text-sm ${index === 0 ? 'font-semibold text-orange-400' : 'text-gray-300'}`}>
                      {info?.label}
                    </span>
                    {index < marketplacePriority.length - 1 && (
                      <span className="text-gray-500">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Advanced Mode: Full drag and drop control
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-3">
            Drag to reorder. First marketplace is primary, others are fallbacks in order.
          </p>
          
          <div className="space-y-2">
            {marketplacePriority.map((marketplace, index) => {
              const info = getMarketplaceInfo(marketplace);
              return (
                <div
                  key={marketplace}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-move transition-all duration-200 ${
                    index === 0 
                      ? 'bg-orange-600/10 border-orange-500/30 shadow-md' 
                      : 'bg-gray-700/30 border-gray-600/30'
                  } hover:bg-gray-600/40 ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        index === 0 
                          ? 'bg-orange-500/20 text-orange-400' 
                          : 'bg-gray-600/50 text-gray-400'
                      }`}>
                        {index === 0 ? 'Primary' : `#${index + 1}`}
                      </span>
                      <span className={`font-medium ${info?.color || 'text-white'}`}>
                        {info?.label || marketplace}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === marketplacePriority.length - 1}
                      className="p-1 text-gray-400 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-3">
        {showAdvanced 
          ? "Primary marketplace is tried first. If unavailable, fallbacks are used in order."
          : "We'll automatically set the best fallback order based on marketplace reliability."
        }
      </p>
    </div>
  );
};

export default MarketplacePriorityManager;
export { getSmartDefaults, marketplaceOptions };