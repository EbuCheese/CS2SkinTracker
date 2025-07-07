import React, { memo, useMemo } from 'react';

const VariantControls = memo(({ 
  hasStatTrak, 
  hasSouvenir, 
  selectedVariant, 
  onVariantChange,
  type = 'Item' // 'Item' or 'Skin' for different labels
}) => {
  const variants = useMemo(() => {
    const baseVariants = [
      { key: 'normal', label: 'Normal', bgColor: 'bg-blue-600' }
    ];
    
    if (hasStatTrak) {
      baseVariants.push({ key: 'stattrak', label: 'StatTrak™', bgColor: 'bg-orange-600' });
    }
    
    if (hasSouvenir) {
      baseVariants.push({ key: 'souvenir', label: 'Souvenir', bgColor: 'bg-yellow-600' });
    }
    
    return baseVariants;
  }, [hasStatTrak, hasSouvenir]);

  // Don't render if no variants available
  if (!hasStatTrak && !hasSouvenir) return null;

  return (
    <div className="border-t border-gray-600 pt-3">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {type} Variant
      </label>
      <div className="flex items-center gap-2">
        {variants.map(({ key, label, bgColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => onVariantChange(key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedVariant === key
                ? `${bgColor} text-white`
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-gray-400 text-xs mt-2">
        Select the variant you want to add to your inventory
      </p>
    </div>
  );
});

VariantControls.displayName = 'VariantControls';

export default VariantControls;