// Toast.jsx - Enhanced with metadata styling
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, X, Plus, Trash2, Info, DollarSign } from 'lucide-react';

import { useToast } from '@/contexts/ToastContext';

// Helper function to determine profit/loss color
const getProfitLossColor = (profitLoss) => {
  if (profitLoss.startsWith('+')) return 'text-green-400';
  if (profitLoss.startsWith('-')) return 'text-red-400'; 
  return 'text-gray-300';
};

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(100);

  // Slide in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar animation and auto-remove timer
  useEffect(() => {
    if (toast.duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (toast.duration - elapsed) / toast.duration * 100);
        setProgress(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          handleRemove();
        }
      }, 50);
      
      return () => clearInterval(interval);
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
          bg: 'from-green-900/80 via-emerald-900/80 to-green-900/80',
          border: 'border-green-500/30',
          glow: 'shadow-green-500/25',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          titleColor: 'text-green-100',
          progressColor: 'bg-green-400',
          iconBg: 'bg-green-500/20'
        };
      case 'error':
        return {
          bg: 'from-red-900/80 via-rose-900/80 to-red-900/80',
          border: 'border-red-500/30',
          glow: 'shadow-red-500/25',
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          titleColor: 'text-red-100',
          progressColor: 'bg-red-400',
          iconBg: 'bg-red-500/20'
        };
      case 'warning':
        return {
          bg: 'from-yellow-900/80 via-amber-900/80 to-yellow-900/80',
          border: 'border-yellow-500/30',
          glow: 'shadow-yellow-500/25',
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          titleColor: 'text-yellow-100',
          progressColor: 'bg-yellow-400',
          iconBg: 'bg-yellow-500/20'
        };
      case 'add':
        return {
          bg: 'from-blue-900/80 via-indigo-900/80 to-blue-900/80',
          border: 'border-blue-500/30',
          glow: 'shadow-blue-500/25',
          icon: <Plus className="w-5 h-5 text-blue-400" />,
          titleColor: 'text-blue-100',
          progressColor: 'bg-blue-400',
          iconBg: 'bg-blue-500/20'
        };
      case 'sale':
        return {
          bg: 'from-emerald-900/80 via-teal-900/80 to-emerald-900/80',
          border: 'border-emerald-500/30',
          glow: 'shadow-emerald-500/25',
          icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
          titleColor: 'text-emerald-100',
          progressColor: 'bg-emerald-400',
          iconBg: 'bg-emerald-500/20'
        };
      case 'delete':
        return {
          bg: 'from-gray-900/80 via-slate-900/80 to-gray-900/80',
          border: 'border-gray-500/30',
          glow: 'shadow-gray-500/25',
          icon: <Trash2 className="w-5 h-5 text-gray-400" />,
          titleColor: 'text-gray-100',
          progressColor: 'bg-gray-400',
          iconBg: 'bg-gray-500/20'
        };
      case 'info':
        return {
          bg: 'from-purple-900/80 via-violet-900/80 to-purple-900/80',
          border: 'border-purple-500/30',
          glow: 'shadow-purple-500/25',
          icon: <Info className="w-5 h-5 text-purple-400" />,
          titleColor: 'text-purple-100',
          progressColor: 'bg-purple-400',
          iconBg: 'bg-purple-500/20'
        };
      default:
        return {
          bg: 'from-gray-900/80 via-slate-900/80 to-gray-900/80',
          border: 'border-gray-500/30',
          glow: 'shadow-gray-500/25',
          icon: <Info className="w-5 h-5 text-gray-400" />,
          titleColor: 'text-gray-100',
          progressColor: 'bg-gray-400',
          iconBg: 'bg-gray-500/20'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        bg-gradient-to-br ${styles.bg} ${styles.border} rounded-xl p-4 mb-3 
        backdrop-blur-md shadow-2xl ${styles.glow} border
        transform transition-all duration-300 ease-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        max-w-sm w-full relative overflow-hidden
        hover:scale-105 hover:shadow-3xl transition-transform
      `}
    >
      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/30">
          <div 
            className={`h-full ${styles.progressColor} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
      </div>
      
      <div className="flex items-start space-x-3 relative z-10">
        {/* Enhanced icon with background */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center mt-0.5 shadow-lg`}>
          {styles.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          {toast.title && (
            <div className={`font-semibold ${styles.titleColor} text-sm mb-1 leading-tight`}>
              {toast.title}
            </div>
          )}
          
          {/* Main message - item name */}
          <div className="text-gray-200 text-sm leading-relaxed font-medium mb-2">
            {toast.message}
          </div>
          
          {/* Enhanced metadata display with three separate cards */}
          {toast.metadata && (
            <div className="flex items-center flex-wrap gap-2 text-xs">
              {/* Sale amount - neutral gray */}
              {toast.metadata.saleAmount && (
                <span className="px-2 py-1 bg-gray-700/50 rounded-md text-gray-300 flex-shrink-0">
                  {toast.metadata.saleAmount}
                </span>
              )}
              
              {/* Profit/Loss with color coding - green/red */}
              {toast.metadata.profitLoss && (
                <span className={`px-2 py-1 bg-gray-800/60 rounded-md font-medium flex-shrink-0 ${getProfitLossColor(toast.metadata.profitLoss)}`}>
                  {toast.metadata.profitLoss}
                </span>
              )}
              
              {/* Quantity details - neutral gray */}
              {toast.metadata.quantity && (
                <span className="px-2 py-1 bg-gray-700/50 rounded-md text-gray-300 flex-shrink-0">
                  {toast.metadata.quantity}
                </span>
              )}
              
              {/* Legacy fields for backward compatibility */}
              {toast.metadata.item && !toast.metadata.quantity && (
                <span className="px-2 py-1 bg-gray-700/50 rounded-md text-gray-300 flex-shrink-0">
                  {toast.metadata.item}
                </span>
              )}
              
              {toast.metadata.amount && !toast.metadata.saleAmount && !toast.metadata.profitLoss && (
                <span className={`px-2 py-1 bg-gray-800/60 rounded-md font-medium flex-shrink-0 ${getProfitLossColor(toast.metadata.amount)}`}>
                  {toast.metadata.amount}
                </span>
              )}
            </div>
          )}
          
          {/* Legacy metadata support (for backward compatibility) */}
          {!toast.metadata && toast.amount && (
            <div className="mt-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-700/50 rounded-md">
                {toast.amount}
              </span>
            </div>
          )}
        </div>
        
        {/* Enhanced close button */}
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-all duration-200 p-2 rounded-lg hover:bg-gray-700/50 group"
        >
          <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();
  
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[10000] pointer-events-none">
      <div className="pointer-events-auto space-y-2">
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

export default ToastContainer;