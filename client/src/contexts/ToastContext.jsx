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

  // INVESTMENT-SPECIFIC METHODS WITH METADATA SUPPORT

  const fullSaleCompleted = (itemName, quantity, formattedSaleValue, formattedProfitLoss, options = {}) => {
    return addToast({
      type: 'sale',
      title: 'Full Sale Completed',
      message: itemName,
      metadata: {
        saleAmount: `${formattedSaleValue} sale`,
        profitLoss: `${formattedProfitLoss} p/l`,
        quantity: `${quantity}x sold`
      },
      duration: 5000,
      ...options
    });
  };

  const partialSaleCompleted = (itemName, soldQty, totalQty, formattedSaleValue, formattedProfitLoss, options = {}) => {
    return addToast({
      type: 'sale',
      title: 'Partial Sale Completed',
      message: itemName,
      metadata: {
        saleAmount: `${formattedSaleValue} sale`,
        profitLoss: `${formattedProfitLoss} p/l`,
        quantity: `${soldQty} of ${totalQty + soldQty} sold`
      },
      duration: 5000,
      ...options
    });
  };

  const itemAdded = (itemName, quantity, formattedBuyPrice, options = {}) => {
    return addToast({
      type: 'add',
      title: 'Item Added',
      message: itemName,
      metadata: {
        amount: `${formattedBuyPrice} each`,
        item: `${quantity}x added`
      },
      duration: 5000,
      ...options
    });
  };

  const itemDeleted = (itemName, quantity = null, options = {}) => {
  return addToast({
    type: 'delete',
    title: 'Item Deleted',
    message: itemName,
    metadata: quantity ? {
      quantity: `${quantity}x deleted`
    } : null,
    duration: 5000,
    ...options
  });
};

  const saleRecordDeleted = (itemName, quantity = null, options = {}) => {
  return addToast({
    type: 'delete', 
    title: 'Sale Record Deleted',
    message: itemName,
    metadata: quantity ? {
      quantity: `${quantity}x deleted`
    } : null,
    duration: 5000,
    ...options
  });
};

  const itemUpdated = (itemName, options = {}) => {
    return addToast({
      type: 'success',
      title: 'Item Updated',
      message: itemName,
      metadata: null,
      duration: 5000,
      ...options
    });
  };

  const saleRecordUpdated = (itemName, options = {}) => {
    return addToast({
      type: 'success',
      title: 'Sale Record Updated',
      message: itemName,
      metadata: null,
      duration: 5000,
      ...options
    });
  };

  const saleReverted = (itemName, quantity, formattedSaleValueLost, wasNewInvestment, { wasOriginalDatePreserved = true, ...options } = {}) => {
    return addToast({
      type: 'revert',
      title: wasNewInvestment ? 'Investment Recreated' : 'Investment Restored',
      message: itemName,
      metadata: {
        saleAmount: `${formattedSaleValueLost} sale reversed`,
        quantity: `${quantity}x restored`
      },
      duration: 5000,
      ...options
    });
  };

// WATCHLIST-SPECIFIC TOAST METHODS

const itemRemovedFromWatchlist = (itemName, options = {}) => {
  return addToast({
    type: 'delete',
    title: 'Removed from Watchlist',
    message: itemName,
    metadata: null, 
    duration: 4000,
    ...options
  });
};

const itemAddedToWatchlist = (itemName, options = {}) => {
  return addToast({
    type: 'add',
    title: 'Added to Watchlist',
    message: itemName,
    metadata: null, 
    duration: 4000,
    ...options
  });
};

const bulkRemovedFromWatchlist = (count, options = {}) => {
  return addToast({
    type: 'delete',
    title: 'Removed from Watchlist',
    message: `${count} item${count > 1 ? 's' : ''} removed`,
    metadata: null, 
    duration: 4000,
    ...options
  });
};

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
    fullSaleCompleted,
    partialSaleCompleted,
    itemAdded,
    itemDeleted,
    saleRecordDeleted,
    itemUpdated,
    saleRecordUpdated,
    saleReverted,
    itemRemovedFromWatchlist,
    itemAddedToWatchlist,
    bulkRemovedFromWatchlist
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
};