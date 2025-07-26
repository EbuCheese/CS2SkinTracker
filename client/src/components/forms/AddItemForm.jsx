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

const AddItemForm = memo(({ type, onClose, onAdd, userSession }) => {
  const { submitting, handleSubmit: submitForm } = useFormSubmission(supabase);

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

  // Render craft-specific form sections
  const renderCraftSections = () => (
    <>
      <ItemSelectionSection
        type={type}
        searchType="liquids"
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
      />

      <SelectedItemDisplay
        formData={formData}
        type={type}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
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
      />
    </>
  );

  // Render standard item form sections
  const renderStandardSections = () => (
    <>
      <ItemSelectionSection
        type={type}
        searchType={type.toLowerCase()}
        formData={formData}
        handleFormDataChange={handleFormDataChange}
        handleItemSelect={handleItemSelect}
        handleSkinSelect={handleSkinSelect}
      />

      <SelectedItemDisplay
        formData={formData}
        type={type}
        handleVariantChange={handleVariantChange}
        handleFormDataChange={handleFormDataChange}
      />

      {type === 'Liquids' && (
        <ConditionSelector
          selectedCondition={formData.condition}
          onConditionChange={handleConditionChange}
          required={true}
        />
      )}

      {(type === 'Liquids' || type === 'Cases') && (
        <QuantitySelector
          quantity={formData.quantity}
          onQuantityChange={handleQuantityChange}
        />
      )}
    </>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Add {type} Item</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          {type === 'Crafts' ? renderCraftSections() : renderStandardSections()}
          
          <BuyPriceInput
            formData={formData}
            handleFormDataChange={handleFormDataChange}
          />
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Adding Item...</span>
              </>
            ) : (
              <>
                <span>Add {type} Item</span>
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