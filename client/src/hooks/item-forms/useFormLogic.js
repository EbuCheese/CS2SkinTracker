import { useCallback, useEffect } from 'react';

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
    await submitForm(formData, userSession, type, onAdd, onClose);
  }, [isFormValid, formData, userSession, type, onAdd, onClose, submitForm]);

  return {
    handleBackdropClick,
    handleSubmit
  };
};