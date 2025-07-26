import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { 
  useItemForm, 
  useImageUpload, 
  useFormSubmission, 
  useFormLogic 
} from '@/hooks/item-forms';
import {
  VariantBadge,
  ImageUploadSection,
  QuantitySelector,
  ConditionSelector
} from '@/components/forms/SharedFormComponents';
import {
  ItemSelectionSection,
  SelectedItemDisplay,
  CraftNameInput,
  BuyPriceInput
} from '@/components/forms/FormSections';

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

  // from useFormLogic hook - handles escape key, backdrop click, and form submission
  const { handleBackdropClick, handleSubmit } = useFormLogic({
    onClose,
    submitting,
    isFormValid,
    formData,
    userSession,
    type: currentCategory,
    onAdd,
    submitForm
  });

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

  // Render craft-specific form sections
  const renderCraftSections = () => (
    <>
      <ItemSelectionSection
        type={currentCategory}
        searchType="liquids"
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
        compact={true}
      />

      <SelectedItemDisplay
        formData={formData}
        type={currentCategory}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
        compact={true}
      />

      <ConditionSelector
        selectedCondition={formData.condition}
        onConditionChange={handleConditionChange}
        required={true}
      />

      <CraftNameInput
        formData={formData}
        handleFormDataChange={handleFormDataChange}
      />

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
        compact={true}
      />
    </>
  );

  // Render standard item form sections
  const renderStandardSections = () => (
    <>
      <ItemSelectionSection
        type={currentCategory}
        searchType={selectedCategory}
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        compact={true}
      />

      <SelectedItemDisplay
        formData={formData}
        type={currentCategory}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
        compact={true}
      />

      {currentCategory === 'Liquids' && (
        <ConditionSelector
          selectedCondition={formData.condition}
          onConditionChange={handleConditionChange}
          required={true}
        />
      )}

      {(currentCategory === 'Cases' || currentCategory === 'Liquids') && (
        <QuantitySelector
          quantity={formData.quantity}
          onQuantityChange={handleQuantityChange}
          compact={true}
        />
      )}
    </>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto ${className}`}>
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

            {currentCategory === 'Crafts' ? renderCraftSections() : renderStandardSections()}
            
            <BuyPriceInput
              formData={formData}
              handleFormDataChange={handleFormDataChange}
              compact={true}
            />

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
                    <span>Add {currentCategory} Item</span>
                    {formData.quantity > 1 && (
                      <span className="text-orange-200">({formData.quantity}x)</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

QuickAddItemForm.displayName = 'QuickAddItemForm';
export default QuickAddItemForm;