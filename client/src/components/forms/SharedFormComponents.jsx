import React, { memo, useMemo } from 'react';
import { Upload, Loader2, Plus, Minus } from 'lucide-react';

// Move VariantBadge to shared components
export const VariantBadge = memo(({ stattrak, souvenir }) => {
  if (stattrak) {
    return (
      <span className="inline-block px-2 py-0.5 bg-orange-600 text-white rounded text-xs mt-1 mr-1">
        StatTrak™
      </span>
    );
  }
  
  if (souvenir) {
    return (
      <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white rounded text-xs mt-1">
        Souvenir
      </span>
    );
  }
  
  return (
    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-xs mt-1">
      Normal
    </span>
  );
});

// Consolidate ImageUploadSection with responsive sizing
export const ImageUploadSection = memo(({ 
  isDragOver, 
  uploadingImage, 
  customImageUrl, 
  imageUrl,
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onImageUpload, 
  onRemoveImage,
  compact = false // Add compact mode for QuickAdd
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Upload Custom Image (Optional)
    </label>
    <div 
      className={`border-2 border-dashed rounded-lg text-center transition-colors ${
        compact ? 'p-4' : 'p-6'
      } ${isDragOver 
        ? 'border-orange-500 bg-orange-500/10' 
        : 'border-orange-500/30 hover:border-orange-500/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
        id="image-upload"
        disabled={uploadingImage}
      />
      
      {uploadingImage ? (
        <div className="flex flex-col items-center">
          <Loader2 className={`text-orange-500 mb-2 animate-spin ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>Processing image...</span>
        </div>
      ) : customImageUrl ? (
        <div className="flex flex-col items-center">
          <img 
            src={customImageUrl} 
            alt="Custom preview" 
            className={`object-contain rounded mb-2 ${compact ? 'w-32 h-20' : 'w-96 h-40'}`}
          />
          <span className={`text-green-400 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>Custom image uploaded</span>
          <label htmlFor="image-upload" className={`text-orange-400 hover:text-orange-300 cursor-pointer ${compact ? 'text-xs' : 'text-sm'}`}>
            Click to change image
          </label>
          <button
            type="button"
            onClick={onRemoveImage}
            className="text-xs text-gray-500 hover:text-gray-400 mt-1"
          >
            Remove custom image
          </button>
        </div>
      ) : (
        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
          <Upload className={`text-orange-500 mb-2 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>Click to upload or drag & drop</span>
          <span className="text-xs text-gray-500 mt-1">
            {imageUrl ? 'Overrides base skin image' : 'No base image selected'}
          </span>
        </label>
      )}
    </div>
  </div>
));

// Consolidate QuantitySelector with responsive sizing
export const QuantitySelector = memo(({ quantity, onQuantityChange, compact = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
    <div className={`flex items-center ${compact ? 'space-x-3' : 'justify-center space-x-4'}`}>
      <button
        type="button"
        onClick={() => onQuantityChange(-1)}
        className={`bg-gray-700 hover:bg-gray-600 rounded${compact ? '' : '-full'} flex items-center justify-center text-white transition-colors ${
          compact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
      >
        <Minus className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>
      <input
        type="number"
        min="1"
        max="9999"
        value={quantity}
        onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1) - quantity)}
        className={`bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:border-orange-500 focus:outline-none transition-colors ${
          compact 
            ? 'w-16 px-2 py-1 text-sm' 
            : 'w-20 px-3 py-2'
        }`}
      />
      <button
        type="button"
        onClick={() => onQuantityChange(1)}
        className={`bg-gray-700 hover:bg-gray-600 rounded${compact ? '' : '-full'} flex items-center justify-center text-white transition-colors ${
          compact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
      >
        <Plus className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>
    </div>
    {!compact && (
      <p className="text-gray-400 text-xs text-center mt-2">Current quantity: {quantity}</p>
    )}
  </div>
));

// Variant controls for StatTrak and Souvenir selection
export const VariantControls = memo(({
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

// Condition selector for weapon skins
const CONDITION_OPTIONS = [
  { short: 'FN', full: 'Factory New' },
  { short: 'MW', full: 'Minimal Wear' },
  { short: 'FT', full: 'Field-Tested' },
  { short: 'WW', full: 'Well-Worn' },
  { short: 'BS', full: 'Battle-Scarred' }
];

export const ConditionSelector = memo(({ selectedCondition, onConditionChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Condition {required && <span className="text-red-400">*</span>}
    </label>
    <div className="flex items-center gap-2 flex-wrap">
      {CONDITION_OPTIONS.map(({ short, full }) => (
        <button
          key={short}
          type="button"
          onClick={() => onConditionChange(full)}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedCondition === full
              ? 'bg-blue-600 text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {short}
        </button>
      ))}
    </div>
    {selectedCondition && (
      <p className="text-gray-400 text-xs mt-2">Selected: {selectedCondition}</p>
    )}
  </div>
));

// Set display names for debugging
VariantBadge.displayName = 'VariantBadge';
ImageUploadSection.displayName = 'ImageUploadSection';
QuantitySelector.displayName = 'QuantitySelector';
VariantControls.displayName = 'VariantControls';
ConditionSelector.displayName = 'ConditionSelector';