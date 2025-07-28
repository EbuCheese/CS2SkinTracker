import React, { memo, useMemo } from 'react';
import { Upload, Loader2, Plus, Minus } from 'lucide-react';

// Displays a colored badge indicating the variant type of a CS2 item.
export const VariantBadge = memo(({ stattrak, souvenir }) => {
  // StatTrak™ items get orange badge with highest priority
  if (stattrak) {
    return (
      <span className="inline-block px-2 py-0.5 bg-orange-600 text-white rounded text-xs mt-1 mr-1">
        StatTrak™
      </span>
    );
  }
  
  // Souvenir items get yellow badge with second priority
  if (souvenir) {
    return (
      <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white rounded text-xs mt-1">
        Souvenir
      </span>
    );
  }
  
  // Default to normal variant with blue badge
  return (
    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-xs mt-1">
      Normal
    </span>
  );
});

// Provides drag-and-drop and click-to-upload functionality for custom item images
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
  compact = false // Default to full-size layout
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
      {/* Hidden file input - triggered by label clicks */}
      <input
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
        id="image-upload"
        disabled={uploadingImage}
      />
      
      {/* Loading state during image processing */}
      {uploadingImage ? (
        <div className="flex flex-col items-center">
          <Loader2 className={`text-orange-500 mb-2 animate-spin ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>Processing image...</span>
        </div>
      ) : customImageUrl ? (
        /* Image preview state with options to change or remove */
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
        /* Default upload prompt state */
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

// Provides increment/decrement buttons and direct input for selecting item quantities.
export const QuantitySelector = memo(({ quantity, onQuantityChange, compact = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
    <div className={`flex items-center ${compact ? 'space-x-3' : 'justify-center space-x-4'}`}>
      {/* Decrement button */}
      <button
        type="button"
        onClick={() => onQuantityChange(-1)}
        className={`bg-gray-700 hover:bg-gray-600 rounded${compact ? '' : '-full'} flex items-center justify-center text-white transition-colors ${
          compact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
      >
        <Minus className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>

      {/* Direct input with validation - converts absolute value to delta for consistency */}
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

      {/* Increment button */}
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
    {/* Show current quantity feedback in full-size mode only */}
    {!compact && (
      <p className="text-gray-400 text-xs text-center mt-2">Current quantity: {quantity}</p>
    )}
  </div>
));

// Allows users to select between different item variants (Normal, StatTrak™, Souvenir).
export const VariantControls = memo(({
  hasStatTrak,
  hasSouvenir,
  selectedVariant,
  onVariantChange,
  type = 'Item' // 'Item' or 'Skin' for different labels
}) => {
  // Memoize variant list to prevent unnecessary recalculations
  const variants = useMemo(() => {
    // Always include normal variant as the base option
    const baseVariants = [
      { key: 'normal', label: 'Normal', bgColor: 'bg-blue-600' }
    ];
   
    // Add StatTrak™ option if available for this item
    if (hasStatTrak) {
      baseVariants.push({ key: 'stattrak', label: 'StatTrak™', bgColor: 'bg-orange-600' });
    }
   
    // Add Souvenir option if available for this item
    if (hasSouvenir) {
      baseVariants.push({ key: 'souvenir', label: 'Souvenir', bgColor: 'bg-yellow-600' });
    }
   
    return baseVariants;
  }, [hasStatTrak, hasSouvenir]);

  // Don't render the component if no special variants are available
  // This prevents showing a single "Normal" button which would be redundant
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
                ? `${bgColor} text-white` // Active state with variant-specific color
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500' // Inactive state
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

// Provides selection interface for CS2 weapon skin conditions.
export const ConditionSelector = memo(({ selectedCondition, onConditionChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Condition {required && <span className="text-red-400">*</span>}
    </label>
    {/* Button grid for condition selection using standard CS:GO abbreviations */}
    <div className="flex items-center gap-2 flex-wrap">
      {CONDITION_OPTIONS.map(({ short, full }) => (
        <button
          key={short}
          type="button"
          onClick={() => onConditionChange(full)}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedCondition === full
              ? 'bg-blue-600 text-white' // Active condition
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500' // Inactive conditions
          }`}
        >
          {short}
        </button>
      ))}
    </div>
    {/* Show selected condition feedback with full name for clarity */}
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