import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

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
  data = null // For passing additional data like salePreview
}) => {
  if (!isOpen) return null;

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

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={type === 'confirm' ? undefined : onClose} // Prevent accidental closes on confirm dialogs
      />
      
      {/* Modal content */}
      <div className={`relative bg-gray-800 ${styles.border} rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto transition-colors shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
            {title}
          </h3>
          {type !== 'confirm' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="text-gray-300 mb-6">
          {type === 'note' ? (
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {message}
            </div>
          ) : type === 'confirm' && data ? (
            // Special handling for sale confirmation
            <div>
              <p className="mb-2">{message}</p>
              <div className="bg-gray-700/50 p-3 rounded">
                <div>Total sale value: ${data.totalSaleValue?.toFixed(2)}</div>
                <div className={data.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                  Profit/Loss: {data.profitLoss >= 0 ? '+' : ''}${data.profitLoss?.toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-line">
              {message}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          {type === 'confirm' ? (
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
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmText}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`w-full px-4 py-2 ${styles.confirmButton} text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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