import React, { memo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';
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
import { 
  useItemForm, 
  useImageUpload, 
  useFormSubmission, 
  useFormLogic 
} from '@/hooks/item-forms';

// A modal form for adding different types of items to a user's inventory.
const AddItemForm = memo(({ type, onClose, onAdd, userSession }) => {
  // Form submission hook - handles the actual submission process
  const { submitting, handleSubmit: submitForm } = useFormSubmission(supabase);

  // from useItemform hook
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
  } = useItemForm(type, type);

  // from useImageUpload hook
  const {
    uploadingImage,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleImageUpload,
    handleRemoveImage
  } = useImageUpload(dispatch, formData);

  // from useFormLogic hook
  const { handleBackdropClick, handleSubmit } = useFormLogic({
    onClose,
    submitting,
    isFormValid,
    formData,
    userSession,
    type,
    onAdd,
    submitForm
  });

  // Renders form sections specific to craft items
  const renderCraftSections = () => (
    <>
      {/* Base Skin Selection - Crafts use existing skins as base */}
      <ItemSelectionSection
        type={type}
        searchType="liquids"
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
      />

      {/* Display Selected Base Skin with Variant Controls */}
      <SelectedItemDisplay
        formData={formData}
        type={type}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
      />

      {/* Condition Selector - Required for crafts */}
      <ConditionSelector
        selectedCondition={formData.condition}
        onConditionChange={handleConditionChange}
        required={true}
        minFloat={formData.minFloat}
        maxFloat={formData.maxFloat}
      />

      {/* Custom Craft Name Input - Crafts need unique names */}
      <CraftNameInput
        formData={formData}
        handleFormDataChange={handleFormDataChange}
      />

      {/* Image Upload Section - For custom craft images */}
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
  );

  // Renders form sections for standard item types (non-crafts)
  const renderStandardSections = () => {
  // Determine if this is a liquid item (either from Liquids tab or detected from All tab)
  const isLiquidItem = type === 'Liquids' || formData.itemType === 'skins';
  
  return (
    <>
      {/* Item Selection - Search in appropriate category */}
      <ItemSelectionSection
        type={type}
        searchType={type.toLowerCase()}
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
      />

      {/* Display Selected Item with Variant Controls */}
      <SelectedItemDisplay
        formData={formData}
        type={type}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
      />

      {/* Condition Selector - Show for Liquids tab OR when itemType is 'skins' */}
      {isLiquidItem && (
        <ConditionSelector
          selectedCondition={formData.condition}
          onConditionChange={handleConditionChange}
          required={true}
          minFloat={formData.minFloat}
          maxFloat={formData.maxFloat}
        />
      )}

      {/* Quantity Selector - For items that can be bought in bulk */}
      {type !== 'Crafts' && (
        <QuantitySelector
          quantity={formData.quantity}
          onQuantityChange={handleQuantityChange}
        />
      )}
    </>
  );
};

  // Main render
  return (
    /* Modal Backdrop - Handles click-outside-to-close behavior */
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Modal Content Container */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Add {type} Item</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Dynamic Form Content */}
        <div className="space-y-6">
          {/* Conditional Rendering Based on Item Type */}
          {type === 'Crafts' ? renderCraftSections() : renderStandardSections()}
          
          {/* Buy Price Input - Common to all item types */}
          <BuyPriceInput
            formData={formData}
            handleFormDataChange={handleFormDataChange}
          />
          
          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              // Loading State
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Adding Item...</span>
              </>
            ) : (
              // Normal State
              <>
                <span>Add {type} Item</span>
                {/* Show quantity indicator for multi-item additions */}
                {formData.quantity > 1 && (
                  <span className="text-orange-200">({formData.quantity}x)</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

AddItemForm.displayName = 'AddItemForm';
export default AddItemForm;