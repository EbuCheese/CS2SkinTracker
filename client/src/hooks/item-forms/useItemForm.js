import { useReducer, useCallback, useMemo, useState } from 'react';

const INITIAL_FORM_DATA = {
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

const formDataReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      const newState = { ...state, [action.field]: action.value };
      
      // Reset selection state when user types in search fields
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
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

const validateForm = (formData, currentCategory) => {
  const baseValidation = formData.buy_price &&
    !isNaN(parseFloat(formData.buy_price)) &&
    parseFloat(formData.buy_price) > 0 &&
    formData.quantity >= 1;

  if (currentCategory === 'Crafts') {
    return baseValidation &&
           formData.skin_name?.trim() &&
           formData.isSkinSelected &&
           formData.condition &&
           formData.name.trim();
  } else {
    return baseValidation &&
           formData.name.trim() &&
           formData.isItemSelected &&
           (!['Liquids'].includes(currentCategory) || formData.condition);
  }
};

export const useItemForm = (currentCategory, selectedCategory) => {
  const [formData, dispatch] = useReducer(formDataReducer, INITIAL_FORM_DATA);
  
  const isFormValid = useMemo(() => 
    validateForm(formData, currentCategory, selectedCategory), 
    [formData, currentCategory, selectedCategory]
  );

  const handleFormDataChange = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_FIELD', field, value, currentCategory });
  }, [currentCategory]);

  const handleItemSelect = useCallback((item, categoryMap) => {
    dispatch({
      type: 'SET_ITEM_SELECTED',
      payload: {
        name: item.name,
        image_url: item.image || '',
        type: currentCategory?.toLowerCase(),
        detectedCategory: currentCategory,
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',
        hasStatTrak: item.hasStatTrak || false,
        hasSouvenir: item.hasSouvenir || false,
        isItemSelected: true,
        selectedItemId: item.id || item.name
      }
    });
  }, [currentCategory]);

  const handleSkinSelect = useCallback((item) => {
    dispatch({
      type: 'SET_ITEM_SELECTED',
      payload: {
        skin_name: item.name,
        image_url: formData.custom_image_url || item.image || '',
        stattrak: false,
        souvenir: false,
        selectedVariant: 'normal',
        variant: 'normal',
        hasStatTrak: item.hasStatTrak || false,
        hasSouvenir: item.hasSouvenir || false,
        isSkinSelected: true,
        selectedSkinId: item.id || item.name,
        base_image_url: item.image || ''
      }
    });
  }, [formData.custom_image_url]);

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

  const handleConditionChange = useCallback((condition) => {
    dispatch({ type: 'UPDATE_FIELD', field: 'condition', value: condition });
  }, []);

  const handleQuantityChange = useCallback((delta) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'quantity',
      value: Math.max(1, Math.min(9999, formData.quantity + delta))
    });
  }, [formData.quantity]);

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