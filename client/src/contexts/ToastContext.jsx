// contexts/ToastContext.js
import React, { createContext, useContext, useState } from 'react';

// Create the Toast Context
const ToastContext = createContext();

// Custom hook to use toast functionality
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: 4000, // Default 4 seconds
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const removeAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods for different toast types
  const success = (message, title = 'Success', options = {}) => 
    addToast({ type: 'success', title, message, ...options });

  const error = (message, title = 'Error', options = {}) => 
    addToast({ type: 'error', title, message, ...options });

  const warning = (message, title = 'Warning', options = {}) => 
    addToast({ type: 'warning', title, message, ...options });

  const info = (message, title = '', options = {}) => 
    addToast({ type: 'info', title, message, ...options });

  // Investment-specific methods matching your app's domain
  const itemAdded = (itemName, options = {}) => 
    addToast({ 
      type: 'add', 
      title: 'Item Added', 
      message: `"${itemName}" has been added to your portfolio`, 
      ...options 
    });

  const itemSold = (itemName, quantity, saleValue, options = {}) => 
    addToast({ 
      type: 'sale', 
      title: 'Sale Completed', 
      message: `Sold ${quantity}x "${itemName}" for $${saleValue.toFixed(2)}`, 
      ...options 
    });

  const itemDeleted = (itemName, options = {}) => 
    addToast({ 
      type: 'delete', 
      title: 'Item Deleted', 
      message: `"${itemName}" has been removed from your portfolio`, 
      ...options 
    });

  const itemUpdated = (itemName, options = {}) => 
    addToast({ 
      type: 'success', 
      title: 'Item Updated', 
      message: `"${itemName}" has been updated successfully`, 
      ...options 
    });

  // Context value with all toast functionality
  const contextValue = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    itemAdded,
    itemSold,
    itemDeleted,
    itemUpdated
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
};