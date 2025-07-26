import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { X, Plus, Loader2, Search, FileText, Upload, Minus } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { CSItemSearch } from '@/components/search';
import { VariantControls, ConditionSelector } from '@/components/forms';
import { useItemForm, useImageUpload, useFormSubmission } from '@/hooks/item-forms';

const CATEGORIES = [
  { value: 'liquids', label: 'Liquids', description: 'Weapon skins, knives, gloves' },
  { value: 'cases', label: 'Cases', description: 'Weapon cases and capsules' },
  { value: 'crafts', label: 'Crafts', description: 'Custom weapon crafts' },
  { value: 'agents', label: 'Agents', description: 'Player character agents' },
  { value: 'stickers', label: 'Stickers', description: 'Weapon stickers' },
  { value: 'keychains', label: 'Keychains', description: 'Weapon keychains (charms)' },
  { value: 'graffiti', label: 'Graffiti', description: 'Graffiti sprays' },
  { value: 'patches', label: 'Patches', description: 'Agent patches' }
];

// Auto-detect item type based on search results
const detectItemType = (searchType) => {
  const typeMapping = {
    'liquids': 'Liquids',
    'cases': 'Cases',
    'agents': 'Agents',
    'stickers': 'Stickers',
    'keychains': 'Keychains',
    'graffiti': 'Graffiti',
    'patches': 'Patches',
    'crafts': 'Crafts'
  };
  
  return typeMapping[searchType] || 'Liquids';
};

// Memoized sub-components
const VariantBadge = memo(({ stattrak, souvenir }) => {
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

const ImageUploadSection = memo(({ 
  isDragOver, 
  uploadingImage, 
  customImageUrl, 
  imageUrl,
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onImageUpload, 
  onRemoveImage 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">Upload Custom Image (Optional)</label>
    <div 
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        isDragOver 
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
          <Loader2 className="w-8 h-8 text-orange-500 mb-2 animate-spin" />
          <span className="text-xs text-gray-400">Processing image...</span>
        </div>
      ) : customImageUrl ? (
        <div className="flex flex-col items-center">
          <img 
            src={customImageUrl} 
            alt="Custom preview" 
            className="w-32 h-20 object-contain rounded mb-2" 
          />
          <span className="text-xs text-green-400 mb-2">Custom image uploaded</span>
          <label htmlFor="image-upload" className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer">
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
          <Upload className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-xs text-gray-400">Click to upload or drag & drop</span>
          <span className="text-xs text-gray-500 mt-1">
            {imageUrl ? 'Overrides base skin image' : 'No base image selected'}
          </span>
        </label>
      )}
    </div>
  </div>
));

const QuantitySelector = memo(({ quantity, onQuantityChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
    <div className="flex items-center space-x-3">
      <button
        type="button"
        onClick={() => onQuantityChange(-1)}
        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min="1"
        max="9999"
        value={quantity}
        onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1) - quantity)}
        className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center text-sm focus:border-orange-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onQuantityChange(1)}
        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
));

const QuickAddItemForm = memo(({ onClose, onAdd, userSession, className = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState(''); // Category selection state
  const [searchValue, setSearchValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { submitting, handleSubmit: submitForm } = useFormSubmission(supabase);

  const currentCategory = useMemo(() => detectItemType(selectedCategory), [selectedCategory]);

  // from useItemForm hook
  const {
      formData,
      dispatch,
      isFormValid,
      handleFormDataChange,
      handleItemSelect,
      handleSkinSelect,
      handleVariantChange,
      handleConditionChange,
      handleQuantityChange,
      resetForm
    } = useItemForm(currentCategory, selectedCategory);

    // from useImageUpload
    const {
      uploadingImage,
      isDragOver,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleImageUpload,
      handleRemoveImage
    } = useImageUpload(dispatch, formData);

  // close form with esc key
  useEffect(() => {
  const handleEscapeKey = (event) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  };

  // Add event listener when component mounts
  document.addEventListener('keydown', handleEscapeKey);

  // Cleanup event listener when component unmounts
  return () => {
    document.removeEventListener('keydown', handleEscapeKey);
  };
}, [onClose]);

  // Reset form when category changes
  useEffect(() => {
    dispatch({ type: 'RESET' });
    setSearchValue('');
    setShowForm(false);
  }, [selectedCategory]);

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    setShowForm(true);
  }, []);

const handleSearchChange = useCallback((e) => {
  const value = e.target.value;
  setSearchValue(value);
  
  // Update form data name for search component and reset selection state
  dispatch({ 
    type: 'UPDATE_FIELD', 
    field: 'name', 
    value: value,
    currentCategory 
  });
}, [currentCategory]);

const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      alert('Please fill in all required fields');
      return;
    }
    await submitForm(formData, userSession, currentCategory, onAdd, onClose);
  }, [isFormValid, formData, userSession, currentCategory, onAdd, onClose, submitForm]);

  const handleReset = useCallback(() => {
  setSelectedCategory('');
  dispatch({ type: 'RESET' });
  setSearchValue('');
  setShowForm(false);
}, []);

  const handleBack = useCallback(() => {
    setSelectedCategory('');
    setShowForm(false);
  }, []);

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Plus className="w-5 h-5 mr-2 mt-1" />
          Quick Add Item
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {!selectedCategory ? (
        // Category Selection Screen
        <div className="space-y-6">
          <p className="text-gray-300 text-sm mb-4">Select a category to get started:</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(category => (
              <button
                key={category.value}
                onClick={() => handleCategorySelect(category.value)}
                className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-lg transition-all duration-200 text-left group"
              >
                <h4 className="text-white font-medium mb-1 group-hover:text-orange-400 transition-colors">
                  {category.label}
                </h4>
                <p className="text-gray-400 text-xs">{category.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Form Screen
        <div className="space-y-6">
          {/* Back button and category indicator */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-orange-400 hover:text-orange-300 text-sm flex items-center transition-colors"
            >
              ← Back to categories
            </button>
            <span className="text-gray-400 text-sm">
              Adding: {CATEGORIES.find(c => c.value === selectedCategory)?.label}
            </span>
          </div>

          {/* Crafts Section */}
          {currentCategory === 'Crafts' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Base Skin <span className="text-red-400">*</span>
                </label>
                <CSItemSearch
                  type="liquids"
                  placeholder="Search base skins..."
                  value={formData.skin_name}
                  onChange={(e) => handleFormDataChange('skin_name', e.target.value)}
                  onSelect={handleSkinSelect}
                  className="w-full"
                  showLargeView={true}
                  maxResults={15}
                  excludeSpecialItems={true}
                />
              </div>

              {formData.image_url && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Selected Base Skin</label>
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={formData.image_url} 
                      alt={formData.skin_name}
                      className="w-16 h-16 object-contain bg-gray-700 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{formData.skin_name}</p>
                      <p className="text-gray-400 text-sm">Base skin selected</p>
                      <VariantBadge stattrak={formData.stattrak} souvenir={formData.souvenir} />
                    </div>
                  </div>
                  
                  <VariantControls
                    hasStatTrak={formData.hasStatTrak}
                    hasSouvenir={formData.hasSouvenir}
                    selectedVariant={formData.selectedVariant || formData.variant}
                    onVariantChange={handleVariantChange}
                    type="Skin"
                  />
                </div>
              )}

              <ConditionSelector
                selectedCondition={formData.condition}
                onConditionChange={handleConditionChange}
                required={true}
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Craft Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your custom craft name"
                  value={formData.name}
                  onChange={(e) => handleFormDataChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                  required
                  maxLength={100}
                />
                <p className="text-gray-400 text-xs mt-1">Give your craft a unique name</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Craft Details (Optional)</span>
                  </div>
                </label>
                <textarea
                  placeholder="Add craft details (e.g., 4x Katowice 2014, specific sticker placements, float value, etc.)"
                  value={formData.notes}
                  onChange={(e) => handleFormDataChange('notes', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
              </div>

              <ImageUploadSection
                isDragOver={isDragOver}
                uploadingImage={uploadingImage}
                customImageUrl={formData.custom_image_url}
                imageUrl={formData.image_url}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
              />
            </>
          ) : (
            <>
              {/* Regular Item Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search {currentCategory} <span className="text-red-400">*</span>
                </label>
                <CSItemSearch
                  type={selectedCategory}
                  placeholder={`Search ${currentCategory.toLowerCase()}...`}
                  value={searchValue}
                  onChange={handleSearchChange}
                  onSelect={handleItemSelect}
                  className="w-full"
                  showLargeView={true}
                  maxResults={15}
                />
              </div>

              {/* Selected Item Display */}
              {formData.name && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Selected Item</label>
                  <div className="flex items-center space-x-3 mb-3">
                    {formData.image_url && (
                      <img 
                        src={formData.image_url} 
                        alt={formData.name}
                        className="w-16 h-16 object-contain bg-gray-700 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">{formData.name}</p>
                      <p className="text-gray-400 text-sm">Ready to add</p>
                      <VariantBadge stattrak={formData.stattrak} souvenir={formData.souvenir} />
                    </div>
                  </div>
                  
                  <VariantControls
                    hasStatTrak={formData.hasStatTrak}
                    hasSouvenir={formData.hasSouvenir}
                    selectedVariant={formData.selectedVariant || formData.variant}
                    onVariantChange={handleVariantChange}
                    type="Item"
                  />
                  
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Notes (Optional)</span>
                      </div>
                    </label>
                    <textarea
                      placeholder="Add any additional details (e.g., 95% fade, 0.16 float, special stickers, etc.)"
                      value={formData.notes}
                      onChange={(e) => handleFormDataChange('notes', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none text-sm"
                      rows={2}
                      maxLength={300}
                    />
                    <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
                  </div>
                </div>
              )}

              {/* Condition Selector for Liquids */}
              {currentCategory === 'Liquids' && (
                <ConditionSelector
                  selectedCondition={formData.condition}
                  onConditionChange={handleConditionChange}
                  required={true}
                />
              )}

              {/* Quantity for Cases and Liquids */}
              {(currentCategory === 'Cases' || currentCategory === 'Liquids') && (
                <QuantitySelector
                  quantity={formData.quantity}
                  onQuantityChange={handleQuantityChange}
                />
              )}
            </>
          )}

          {/* Buy Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buy Price <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="999999"
                placeholder="0.00"
                value={formData.buy_price}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'buy_price', value: e.target.value })}
                className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors text-sm"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors font-medium text-sm"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

QuickAddItemForm.displayName = 'QuickAddItemForm';
export default QuickAddItemForm;