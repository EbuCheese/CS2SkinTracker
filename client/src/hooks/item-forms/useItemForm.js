import { useReducer, useCallback, useMemo, useRef } from 'react';

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
  itemType: '',
  detectedCategory: '',
  isItemSelected: false,        
  isSkinSelected: false,        
  selectedItemId: null,         
  selectedSkinId: null,
  
  // Variant flags
  stattrak: false,
  souvenir: false,
  selectedVariant: 'normal',
  hasStatTrak: false,
  hasSouvenir: false
};

// Action types for better type safety and debugging
const ACTION_TYPES = {
  UPDATE_FIELD: 'UPDATE_FIELD',
  RESET: 'RESET',
  SET_ITEM_SELECTED: 'SET_ITEM_SELECTED',
  SET_SKIN_SELECTED: 'SET_SKIN_SELECTED',
  RESET_SELECTION: 'RESET_SELECTION',
  BULK_UPDATE: 'BULK_UPDATE'
};

// Helper function to reset selection state
const resetSelectionState = (resetItem = true, resetSkin = true) => {
  const updates = {};
  
  if (resetItem) {
    updates.isItemSelected = false;
    updates.selectedItemId = null;
  }
  
  if (resetSkin) {
    updates.isSkinSelected = false;
    updates.selectedSkinId = null;
  }
  
  // Always reset variant state when resetting selections
  return {
    ...updates,
    image_url: '',
    hasStatTrak: false,
    hasSouvenir: false,
    stattrak: false,
    souvenir: false,
    selectedVariant: 'normal',
    variant: 'normal'
  };
};

// Enhanced reducer with better separation of concerns
const formDataReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_FIELD: {
      const { field, value, currentCategory } = action;
      const newState = { ...state, [field]: value };
      
      // Reset item selection state when user manually types in name field
      if (field === 'name' && currentCategory !== 'Crafts') {
        return { ...newState, ...resetSelectionState(true, false) };
      }
      
      // Reset skin selection state when user manually types in skin name
      if (field === 'skin_name') {
        return { ...newState, ...resetSelectionState(false, true) };
      }
      
      return newState;
    }
    
    case ACTION_TYPES.RESET:
      return { ...INITIAL_FORM_DATA };
    
    case ACTION_TYPES.SET_ITEM_SELECTED:
      return { ...state, ...action.payload };
    
    case ACTION_TYPES.SET_SKIN_SELECTED:
      return { ...state, ...action.payload };
    
    case ACTION_TYPES.RESET_SELECTION: {
      const { resetItem = true, resetSkin = true } = action.payload || {};
      return { ...state, ...resetSelectionState(resetItem, resetSkin) };
    }
    
    case ACTION_TYPES.BULK_UPDATE:
      return { ...state, ...action.payload };
    
    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
};

// Enhanced validation with better error messaging
const validateForm = (formData, currentCategory) => {
  const errors = [];
  
  // Base validation: price and quantity
  const price = parseFloat(formData.buy_price);
  if (!formData.buy_price || isNaN(price) || price <= 0) {
    errors.push('Valid price is required');
  }
  
  if (formData.quantity < 1) {
    errors.push('Quantity must be at least 1');
  }
  
  if (currentCategory === 'All') {
    if (!formData.name.trim()) {
      errors.push('Item name is required');
    }
    if (!formData.isItemSelected) {
      errors.push('Please select an item from the dropdown');
    }
    // Require condition for liquid items (skins)
    if (formData.itemType === 'skins' && !formData.condition) {
      errors.push('Condition is required for weapon skins');
    }
  }

  // Category-specific validation
  if (currentCategory === 'Crafts') {
    if (!formData.skin_name?.trim()) {
      errors.push('Base skin selection is required');
    }
    if (!formData.isSkinSelected) {
      errors.push('Please select a skin from the dropdown');
    }
    if (!formData.condition) {
      errors.push('Condition is required for crafts');
    }
    if (!formData.name.trim()) {
      errors.push('Craft name is required');
    }
  } else {
    if (!formData.name.trim()) {
      errors.push('Item name is required');
    }
    if (!formData.isItemSelected) {
      errors.push('Please select an item from the dropdown');
    }
    if (['Liquids'].includes(currentCategory) && !formData.condition) {
      errors.push('Condition is required for this item type');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Custom hook for managing item form state and operations
export const useItemForm = (currentCategory, selectedCategory) => {
  const [formData, dispatch] = useReducer(formDataReducer, INITIAL_FORM_DATA);
  
  // Use ref to track if form has been touched
  const touchedRef = useRef(false);
  
  // Enhanced form validation with error details
  const validation = useMemo(() => 
    validateForm(formData, currentCategory), 
    [formData, currentCategory]
  );
  
  const isFormValid = validation.isValid;
  const validationErrors = validation.errors;

  // Generic form field update handler with touch tracking
  const handleFormDataChange = useCallback((field, value) => {
    touchedRef.current = true;
    dispatch({ 
      type: ACTION_TYPES.UPDATE_FIELD, 
      field, 
      value, 
      currentCategory 
    });
  }, [currentCategory]);

  // Enhanced item selection with better state management
  const handleItemSelect = useCallback((item, categoryMap) => {
    touchedRef.current = true;
    
    dispatch({
      type: ACTION_TYPES.SET_ITEM_SELECTED,
      payload: {
        name: item.name,
        image_url: item.image || '',
        type: currentCategory?.toLowerCase(),
        detectedCategory: currentCategory,
        itemType: item.itemType,
        
        // Reset variant state to defaults
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',
        
        // Set capability flags from item data
        hasStatTrak: Boolean(item.hasStatTrak),
        hasSouvenir: Boolean(item.hasSouvenir),
        
        // Set selection state
        isItemSelected: true,
        selectedItemId: item.id || item.name
      }
    });
  }, [currentCategory]);

  // Enhanced skin selection with separate action type
  const handleSkinSelect = useCallback((item) => {
    touchedRef.current = true;
    
    dispatch({
      type: ACTION_TYPES.SET_SKIN_SELECTED,
      payload: {
        skin_name: item.name,
        image_url: formData.custom_image_url || item.image || '',
        
        // Reset variant state
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',
        
        // Set capability flags
        hasStatTrak: Boolean(item.hasStatTrak),
        hasSouvenir: Boolean(item.hasSouvenir),
        
        // Set selection state
        isSkinSelected: true,
        selectedSkinId: item.id || item.name,
        base_image_url: item.image || ''
      }
    });
  }, [formData.custom_image_url]);

  // Enhanced variant change with validation
  const handleVariantChange = useCallback((variant) => {
    if (!['normal', 'stattrak', 'souvenir'].includes(variant)) {
      console.warn(`Invalid variant: ${variant}`);
      return;
    }
    
    touchedRef.current = true;
    
    dispatch({
      type: ACTION_TYPES.BULK_UPDATE,
      payload: {
        stattrak: variant === 'stattrak',
        souvenir: variant === 'souvenir',
        selectedVariant: variant,
        variant: variant
      }
    });
  }, []);

  // Enhanced condition change with validation
  const handleConditionChange = useCallback((condition) => {
    touchedRef.current = true;
    dispatch({ 
      type: ACTION_TYPES.UPDATE_FIELD, 
      field: 'condition', 
      value: condition,
      currentCategory 
    });
  }, [currentCategory]);

  // Enhanced quantity change with better bounds and validation
  const handleQuantityChange = useCallback((delta) => {
    const newQuantity = Math.max(1, Math.min(9999, formData.quantity + delta));
    
    if (newQuantity !== formData.quantity) {
      touchedRef.current = true;
      dispatch({
        type: ACTION_TYPES.UPDATE_FIELD,
        field: 'quantity',
        value: newQuantity,
        currentCategory
      });
    }
  }, [formData.quantity, currentCategory]);

  // Enhanced reset with optional callback
  const resetForm = useCallback((callback) => {
    touchedRef.current = false;
    dispatch({ type: ACTION_TYPES.RESET });
    callback?.();
  }, []);

  // Utility method to check if specific fields are valid
  const isFieldValid = useCallback((fieldName) => {
    // Simple field-specific validation
    switch (fieldName) {
      case 'buy_price':
        const price = parseFloat(formData.buy_price);
        return formData.buy_price && !isNaN(price) && price > 0;
      case 'quantity':
        return formData.quantity >= 1;
      case 'name':
        return formData.name.trim().length > 0;
      case 'condition':
        return Boolean(formData.condition);
      default:
        return true;
    }
  }, [formData]);

  // Method to get field-specific error message
  const getFieldError = useCallback((fieldName) => {
    if (!touchedRef.current) return null;
    
    switch (fieldName) {
      case 'buy_price':
        if (!isFieldValid('buy_price')) return 'Please enter a valid price';
        break;
      case 'name':
        if (!isFieldValid('name')) return 'Item name is required';
        break;
      case 'condition':
        if (['Liquids', 'Crafts'].includes(currentCategory) && !isFieldValid('condition')) {
          return 'Condition is required';
        }
        break;
    }
    return null;
  }, [isFieldValid, currentCategory]);

  // Batch update method for multiple fields
  const updateMultipleFields = useCallback((updates) => {
    touchedRef.current = true;
    dispatch({
      type: ACTION_TYPES.BULK_UPDATE,
      payload: updates
    });
  }, []);

  return {
    // State
    formData,
    isFormValid,
    validationErrors,
    isTouched: touchedRef.current,
    
    // Actions
    dispatch,
    handleFormDataChange,
    handleItemSelect,
    handleSkinSelect,
    handleVariantChange,
    handleConditionChange,
    handleQuantityChange,
    resetForm,
    updateMultipleFields,
    
    // Utilities
    isFieldValid,
    getFieldError
  };
};