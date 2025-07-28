import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

// PopupManager - A versatile modal component for displaying various types of dialogs
const PopupManager = ({ 
  isOpen, 
  onClose, 
  type = 'info', 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  data = null, // For passing additional data like salePreview
  allowEscapeClose = true // New prop to control escape key behavior
}) => {
  // Handle escape key functionality
  useEffect(() => {
    // Early return if popup is closed or escape is disabled
    if (!isOpen || !allowEscapeClose) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        // For confirm dialogs, treat escape as cancel to prevent accidental confirmations
        if (type === 'confirm') {
          handleCancel();
        } else {
          // For other dialog types, simply close the popup
          onClose();
        }
      }
    };

    // Add event listener for escape key
    document.addEventListener('keydown', handleEscape);

    // Cleanup function to remove event listener
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, allowEscapeClose, type, onClose]);

  // Don't render anything if popup is closed
  if (!isOpen) return null;

  // Returns styling configuration based on popup type
  const getPopupStyles = () => {
    switch (type) {
      case 'error':
        return {
          border: 'border-red-500',
          titleColor: 'text-red-400',
          confirmButton: 'bg-red-600 hover:bg-red-700'
        };
      case 'success':
        return {
          border: 'border-green-500',
          titleColor: 'text-green-400',
          confirmButton: 'bg-green-600 hover:bg-green-700'
        };
      case 'confirm':
        return {
          border: 'border-gray-700',
          titleColor: 'text-white',
          confirmButton: 'bg-green-600 hover:bg-green-700'
        };
      case 'note':
        return {
          border: 'border-gray-600 hover:border-orange-500/30',
          titleColor: 'text-white',
          confirmButton: 'bg-gray-600 hover:bg-gray-700'
        };
      default:
        return {
          border: 'border-gray-700',
          titleColor: 'text-white',
          confirmButton: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const styles = getPopupStyles();

  // Handles confirm button click
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  // Handles cancel button click
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  // // Use React Portal to render the popup outside the normal component tree
  // This ensures proper z-index stacking and prevents parent container issues
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Semi-transparent backdrop with blur effect */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={type === 'confirm' ? undefined : onClose} // Prevent accidental closes on confirm dialogs
      />
      
      {/* Main modal content container */}
      <div className={`relative bg-gray-800 ${styles.border} rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto transition-colors shadow-2xl`}>

        {/* Header section with title and close button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
            {title}
          </h3>
          {/* Close button - hidden for confirm dialogs to prevent accidental closes */}
          {type !== 'confirm' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content section - varies based on popup type */}
        <div className="text-gray-300 mb-6">
          {type === 'note' ? (
            // Special formatting for note type - preserves whitespace and line breaks
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {message}
            </div>
          ) : type === 'confirm' && data ? (
            // Special handling for confirmation dialogs with additional data (e.g., sale preview)
            <div>
              <p className="mb-2">{message}</p>
              {/* Data preview section with styled background */}
              <div className="bg-gray-700/50 p-3 rounded">
                <div>Total sale value: ${data.totalSaleValue?.toFixed(2)}</div>
                {/* Conditional styling based on profit/loss */}
                <div className={data.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                  Profit/Loss: {data.profitLoss >= 0 ? '+' : '-'}${Math.abs(data.profitLoss)?.toFixed(2)} ({data.percentage}%)
                </div>
              </div>
            </div>
          ) : (
            // Default message formatting - preserves line breaks
            <div className="whitespace-pre-line">
              {message}
            </div>
          )}
        </div>

        {/* Button section - layout depends on dialog type */}
        <div className="flex space-x-3">
          {type === 'confirm' ? (
            // Two-button layout for confirmation dialogs
            <>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 ${styles.confirmButton} text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1`}
              >
                {/* Loading spinner appears when isLoading is true */}
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmText}</span>
              </button>
            </>
          ) : (
            // Single button layout for other dialog types
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`w-full px-4 py-2 ${styles.confirmButton} text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1`}
            >
              {/* Loading spinner appears when isLoading is true */}
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {/* Change default 'Confirm' text to 'OK' for single-button dialogs */}
              <span>{confirmText === 'Confirm' ? 'OK' : confirmText}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PopupManager;