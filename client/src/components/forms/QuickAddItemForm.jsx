import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Loader2, Lightbulb } from 'lucide-react';
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
import { useScrollLock } from '@/hooks/util';

// Main Modal form for quickly adding items to inventory
const QuickAddItemForm = memo(({ onClose, onAdd, userSession, className = '' }) => {
  const navigate = useNavigate();
  // Apply scroll lock when modal is rendered (always open when this component exists)
  useScrollLock(true);

  const [searchValue, setSearchValue] = useState(''); // Search input state for item selection
  const { submitting, handleSubmit: submitForm } = useFormSubmission(supabase); // Form submission state and handler

  const handleNavigateToCrafts = () => {
    onClose(); // Close the modal first
    navigate('/investments', { state: { openAddForm: true, tab: 'Crafts' } });
  };

  // always use 'all'
  const currentCategory = 'All';

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
  } = useItemForm(currentCategory, 'all');

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

  // Handles search input changes for item selection
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

  return (
  <div 
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={handleBackdropClick}
  >
    <div className={`bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto ${className}`}>

      {/* Modal header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Plus className="w-5 h-5 mr-2 mt-1" />
          Quick Add Item
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* conditional rendering with direct form */}
      <div className="space-y-6">
        {/* Unified search - no category needed */}
        <ItemSelectionSection
          type="All"
          searchType="all"  // 'all' to search unified index
          formData={formData}
          handleFormDataChange={handleFormDataChange}
          handleItemSelect={handleItemSelect}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          compact={true}
        />

        {/* Display selected item with variant controls */}
        <SelectedItemDisplay
          formData={formData}
          type="All"
          handleVariantChange={handleVariantChange}
          handleFormDataChange={handleFormDataChange}
          compact={true}
        />

        {/* Condition selector - show when itemType is 'skins' */}
        {formData.itemType === 'skins' && (
          <ConditionSelector
            selectedCondition={formData.condition}
            onConditionChange={handleConditionChange}
            required={true}
            minFloat={formData.minFloat}
            maxFloat={formData.maxFloat}
          />
        )}

        {/* Quantity selector - show for most items */}
        {formData.itemType !== 'agents' && (
          <QuantitySelector
            quantity={formData.quantity}
            onQuantityChange={handleQuantityChange}
            compact={true}
          />
        )}

        {/* Buy price input */}
        <BuyPriceInput
          formData={formData}
          handleFormDataChange={handleFormDataChange}
          compact={true}
        />

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
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
              {formData.quantity > 1 && (
                <span className="text-orange-200">({formData.quantity}x)</span>
              )}
            </>
          )}
        </button>
        {/* Craft Info Nav Button */}
        <div className="pt-4 border-t border-gray-700/50">
            <div className="flex items-start space-x-1.5 text-xs text-gray-400">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5" />
              <div>
                <span>Want to add a custom craft? </span>
                <button
                  onClick={handleNavigateToCrafts}
                  className="text-orange-400 hover:text-orange-300 underline transition-colors"
                >
                  Go to Crafts section
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>
);
});

QuickAddItemForm.displayName = 'QuickAddItemForm';
export default QuickAddItemForm;