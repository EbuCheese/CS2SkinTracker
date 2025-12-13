import { useCallback, useEffect } from 'react';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { convertToUSD, ensureFreshRates } from '@/hooks/util/currency';

export const useFormLogic = ({ 
  onClose, 
  submitting, 
  isFormValid, 
  formData, 
  userSession, 
  type, 
  onAdd, 
  submitForm 
}) => {
  const { currency } = useUserSettings();
  // Consolidate escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !submitting && onClose) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  // Consolidate backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !submitting && onClose) {
      onClose();
    }
  }, [onClose, submitting]);

  // Consolidate form submission
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      alert('Please fill in all required fields');
      return;
    }

    // Ensure exchange rates are fresh before conversion
    await ensureFreshRates();

    // Convert user's input price to USD for storage
    const userInputPrice = parseFloat(formData.buy_price);
    const priceInUSD = convertToUSD(userInputPrice, currency);

    // Create updated formData with USD price
    const formDataWithUSD = {
      ...formData,
      buy_price: priceInUSD, // USD for storage
    };

    // Submit with converted data
    await submitForm(formDataWithUSD, userSession, type, onAdd, onClose);
  }, [isFormValid, formData, userSession, type, onAdd, onClose, submitForm, currency]);

  return {
    handleBackdropClick,
    handleSubmit
  };
};