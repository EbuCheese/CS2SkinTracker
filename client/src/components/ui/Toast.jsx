// components/Toast.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, X, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { ToastContext, useToastProvider } from '../hooks/useToast';

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Slide in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-remove timer
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-800/90 border-green-600',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          titleColor: 'text-green-100'
        };
      case 'error':
        return {
          bg: 'bg-red-800/90 border-red-600',
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          titleColor: 'text-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-800/90 border-yellow-600',
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          titleColor: 'text-yellow-100'
        };
      case 'add':
        return {
          bg: 'bg-blue-800/90 border-blue-600',
          icon: <Plus className="w-5 h-5 text-blue-400" />,
          titleColor: 'text-blue-100'
        };
      case 'sale':
        return {
          bg: 'bg-emerald-800/90 border-emerald-600',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
          titleColor: 'text-emerald-100'
        };
      case 'delete':
        return {
          bg: 'bg-gray-800/90 border-gray-600',
          icon: <Trash2 className="w-5 h-5 text-gray-400" />,
          titleColor: 'text-gray-100'
        };
      default:
        return {
          bg: 'bg-gray-800/90 border-gray-600',
          icon: <AlertCircle className="w-5 h-5 text-gray-400" />,
          titleColor: 'text-gray-100'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        ${styles.bg} border rounded-lg p-3 mb-2 backdrop-blur-sm shadow-lg
        transform transition-all duration-300 ease-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className={`font-medium ${styles.titleColor} text-sm mb-1`}>
              {toast.title}
            </div>
          )}
          <div className="text-gray-200 text-sm">
            {toast.message}
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[10000] pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const toastApi = useToastProvider();

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <ToastContainer toasts={toastApi.toasts} removeToast={toastApi.removeToast} />
    </ToastContext.Provider>
  );
};