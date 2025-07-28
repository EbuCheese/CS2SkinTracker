import { useReducer, useCallback, useMemo, useState } from 'react';

// Initial form state for item creation/editing
const INITIAL_FORM_DATA = {
  // Basic item information
  name: '',
  skin_name: '',
  condition: '',
  variant: 'normal',
  buy_price: '',
  quantity: 1,
  image_url: '',
  base_image_url: '',
  custom_image_url: '',
  notes: '',
  type: '',
  detectedCategory: '',
  isItemSelected: false,        
  isSkinSelected: false,        
  selectedItemId: null,         
  selectedSkinId: null
};

// Reducer for managing form state with complex selection logic
const formDataReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      const newState = { ...state, [action.field]: action.value };
      
      // Reset item selection state when user manually types in name field
      // This ensures selection state stays in sync with manual input
      if (action.field === 'name' && action.currentCategory !== 'Crafts') {
        return {
          ...newState,
          isItemSelected: false,
          selectedItemId: null,
          image_url: '',
          hasStatTrak: false,
          hasSouvenir: false
        };
      }
      
      // Reset skin selection state when user manually types in skin name
      if (action.field === 'skin_name') {
        return {
          ...newState,
          isSkinSelected: false,
          selectedSkinId: null,
          image_url: '',
          hasStatTrak: false,
          hasSouvenir: false
        };
      }
      
      return newState;
    case 'RESET':
      return INITIAL_FORM_DATA;
    case 'SET_ITEM_SELECTED':
      // Merge the payload with current state for item/skin selection
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// Validates form data based on category-specific requirements
const validateForm = (formData, currentCategory) => {
  // Base validation: price and quantity must be valid
  const baseValidation = formData.buy_price &&
    !isNaN(parseFloat(formData.buy_price)) &&
    parseFloat(formData.buy_price) > 0 &&
    formData.quantity >= 1;

  // Category-specific validation
  if (currentCategory === 'Crafts') {
    // Crafts require skin selection and condition
    return baseValidation &&
           formData.skin_name?.trim() &&
           formData.isSkinSelected &&
           formData.condition &&
           formData.name.trim();
  } else {
    // Other categories require item selection
    // Some categories (like Liquids) also require condition
    return baseValidation &&
           formData.name.trim() &&
           formData.isItemSelected &&
           (!['Liquids'].includes(currentCategory) || formData.condition);
  }
};

// Custom hook for managing item form state and operations
export const useItemForm = (currentCategory, selectedCategory) => {
  const [formData, dispatch] = useReducer(formDataReducer, INITIAL_FORM_DATA);
  
  // Memoized form validation to prevent unnecessary recalculations
  const isFormValid = useMemo(() => 
    validateForm(formData, currentCategory, selectedCategory), 
    [formData, currentCategory, selectedCategory]
  );

  // Generic form field update handler
  const handleFormDataChange = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_FIELD', field, value, currentCategory });
  }, [currentCategory]);

  // Handles item selection from dropdown/search results
  const handleItemSelect = useCallback((item, categoryMap) => {
    dispatch({
      type: 'SET_ITEM_SELECTED',
      payload: {
        name: item.name,
        image_url: item.image || '',
        type: currentCategory?.toLowerCase(),
        detectedCategory: currentCategory,

        // Reset variant state to defaults
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',

        // Set capability flags from item data
        hasStatTrak: item.hasStatTrak || false,
        hasSouvenir: item.hasSouvenir || false,

        // Set selection state
        isItemSelected: true,
        selectedItemId: item.id || item.name
      }
    });
  }, [currentCategory]);

  // Handles skin selection for craft items
  const handleSkinSelect = useCallback((item) => {
    dispatch({
      type: 'SET_ITEM_SELECTED',
      payload: {
        skin_name: item.name,
        image_url: formData.custom_image_url || item.image || '',

        // Reset variant state
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',

        // Set capability flags
        hasStatTrak: item.hasStatTrak || false,
        hasSouvenir: item.hasSouvenir || false,

        // Set selection state
        isSkinSelected: true,
        selectedSkinId: item.id || item.name,
        base_image_url: item.image || ''
      }
    });
  }, [formData.custom_image_url]);

  // Updates item variant (normal, stattrak, souvenir)
  const handleVariantChange = useCallback((variant) => {
    dispatch({
      type: 'SET_ITEM_SELECTED',
      payload: {
        stattrak: variant === 'stattrak',
        souvenir: variant === 'souvenir',
        selectedVariant: variant,
        variant: variant
      }
    });
  }, []);

  // Updates item condition (Factory New, Minimal Wear, etc.)
  const handleConditionChange = useCallback((condition) => {
    dispatch({ type: 'UPDATE_FIELD', field: 'condition', value: condition });
  }, []);

  // Handles quantity increment/decrement with bounds checking
  const handleQuantityChange = useCallback((delta) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'quantity',
      value: Math.max(1, Math.min(9999, formData.quantity + delta))
    });
  }, [formData.quantity]);

  // Resets form to initial state
  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
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
  };
};