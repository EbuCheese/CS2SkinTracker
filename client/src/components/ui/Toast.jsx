// Toast.jsx - Enhanced version with recommended improvements
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, X, Plus, Trash2, Info, DollarSign, TrendingUp, TrendingDown, CornerUpLeft } from 'lucide-react';

import { useToast } from '@/contexts/ToastContext';

// Helper function to determine profit/loss color
const getProfitLossColor = (profitLoss) => {
  if (profitLoss.startsWith('+')) return 'text-emerald-400';
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
          bg: 'from-emerald-900/90 via-green-900/90 to-emerald-900/90', // Increased opacity 80% → 90%
          border: 'border-emerald-500/40', // Increased opacity 30% → 40%
          glow: 'shadow-emerald-500/30', // Increased intensity 25% → 30%
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          titleColor: 'text-emerald-100',
          progressColor: 'bg-emerald-400',
          iconBg: 'bg-emerald-500/25' // Increased opacity 20% → 25%
        };
      case 'error':
        return {
          bg: 'from-red-900/90 via-rose-900/90 to-red-900/90',
          border: 'border-red-500/40',
          glow: 'shadow-red-500/30',
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          titleColor: 'text-red-100',
          progressColor: 'bg-red-400',
          iconBg: 'bg-red-500/25'
        };
      case 'warning':
        return {
          bg: 'from-amber-900/90 via-yellow-900/90 to-amber-900/90', // Changed yellow to amber for consistency
          border: 'border-amber-500/40',
          glow: 'shadow-amber-500/30',
          icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
          titleColor: 'text-amber-100',
          progressColor: 'bg-amber-400',
          iconBg: 'bg-amber-500/25'
        };
      case 'add':
        return {
          bg: 'from-blue-900/90 via-indigo-900/90 to-blue-900/90',
          border: 'border-blue-500/40',
          glow: 'shadow-blue-500/30',
          icon: <Plus className="w-5 h-5 text-blue-400" />,
          titleColor: 'text-blue-100',
          progressColor: 'bg-blue-400',
          iconBg: 'bg-blue-500/25'
        };
      case 'sale':
        return {
          bg: 'from-emerald-900/90 via-teal-900/90 to-emerald-900/90',
          border: 'border-emerald-500/40',
          glow: 'shadow-emerald-500/30',
          icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
          titleColor: 'text-emerald-100',
          progressColor: 'bg-emerald-400',
          iconBg: 'bg-emerald-500/25'
        };
      case 'delete':
        return {
          bg: 'from-slate-900/90 via-gray-900/90 to-slate-900/90', // Changed to slate for better consistency
          border: 'border-slate-500/40',
          glow: 'shadow-slate-500/30',
          icon: <Trash2 className="w-5 h-5 text-slate-400" />,
          titleColor: 'text-slate-100',
          progressColor: 'bg-slate-400',
          iconBg: 'bg-slate-500/25'
        };
        case 'revert':
  return {
    bg: 'from-amber-900/90 via-orange-900/90 to-amber-900/90',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/30',
    icon: <CornerUpLeft className="w-5 h-5 text-amber-400" />,
    titleColor: 'text-amber-100',
    progressColor: 'bg-amber-400',
    iconBg: 'bg-amber-500/25'
  };

      case 'info':
        return {
          bg: 'from-purple-900/90 via-violet-900/90 to-purple-900/90',
          border: 'border-purple-500/40',
          glow: 'shadow-purple-500/30',
          icon: <Info className="w-5 h-5 text-purple-400" />,
          titleColor: 'text-purple-100',
          progressColor: 'bg-purple-400',
          iconBg: 'bg-purple-500/25'
        };
      default:
        return {
          bg: 'from-slate-900/90 via-gray-900/90 to-slate-900/90',
          border: 'border-slate-500/40',
          glow: 'shadow-slate-500/30',
          icon: <Info className="w-5 h-5 text-slate-400" />,
          titleColor: 'text-slate-100',
          progressColor: 'bg-slate-400',
          iconBg: 'bg-slate-500/25'
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
        max-w-md w-full relative overflow-hidden
        hover:scale-[1.02] hover:shadow-3xl transition-transform
      `}
    >
      {/* Enhanced progress bar with better height and rounded corners */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 rounded-b-xl overflow-hidden">
          <div 
            className={`h-full ${styles.progressColor} transition-all duration-75 ease-linear opacity-80`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Subtle animated background pattern - reduced opacity for less distraction */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
      </div>
      
      <div className="flex items-start space-x-3 relative z-10">
        {/* Enhanced icon with subtle border */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center mt-0.5 shadow-lg border border-white/5`}>
          {styles.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title with improved typography */}
          {toast.title && (
            <div className={`font-semibold ${styles.titleColor} text-sm mb-1.5 leading-tight tracking-wide`}>
              {toast.title}
            </div>
          )}
          
          {/* Main message with better spacing */}
          <div className="text-gray-200 text-sm leading-relaxed font-medium mb-2.5">
            {toast.message}
          </div>
          
          {/* Enhanced metadata display with borders and trend icons */}
          {toast.metadata && (
            <div className="flex items-center gap-2 text-xs">
              {/* Sale amount with subtle border */}
              {toast.metadata.saleAmount && (
                <span className="px-2.5 py-1 bg-gray-800/60 border border-gray-600/30 rounded-md text-gray-300 flex-shrink-0 font-medium">
                  {toast.metadata.saleAmount}
                </span>
              )}
              
              {/* Profit/Loss with trend icons and enhanced styling */}
              {toast.metadata.profitLoss && (
                <span className={`px-2.5 py-1 bg-gray-900/70 border border-gray-600/30 rounded-md font-semibold flex-shrink-0 flex items-center gap-1 ${getProfitLossColor(toast.metadata.profitLoss)}`}>
                  {toast.metadata.profitLoss.startsWith('+') ? 
                    <TrendingUp className="w-3 h-3" /> : 
                    toast.metadata.profitLoss.startsWith('-') ? 
                    <TrendingDown className="w-3 h-3" /> : null
                  }
                  {toast.metadata.profitLoss}
                </span>
              )}
              
              {/* Quantity with border */}
              {toast.metadata.quantity && (
                <span className="px-2.5 py-1 bg-gray-800/60 border border-gray-600/30 rounded-md text-gray-300 flex-shrink-0 font-medium">
                  {toast.metadata.quantity}
                </span>
              )}
              
              {/* Legacy fields for backward compatibility - also with borders */}
              {toast.metadata.item && !toast.metadata.quantity && (
                <span className="px-2.5 py-1 bg-gray-800/60 border border-gray-600/30 rounded-md text-gray-300 flex-shrink-0 font-medium">
                  {toast.metadata.item}
                </span>
              )}
              
              {toast.metadata.amount && !toast.metadata.saleAmount && !toast.metadata.profitLoss && (
                <span className={`px-2.5 py-1 bg-gray-900/70 border border-gray-600/30 rounded-md font-semibold flex-shrink-0 ${getProfitLossColor(toast.metadata.amount)}`}>
                  {toast.metadata.amount}
                </span>
              )}
            </div>
          )}

          {/* Result/action info for revert operations */}
          {toast.metadata?.result && (
            <span className="px-2.5 py-1 bg-gray-800/60 border border-gray-600/30 rounded-md text-gray-300 flex-shrink-0 font-medium text-xs">
              {toast.metadata.result}
            </span>
          )}

          {/* Legacy metadata support (for backward compatibility) - also with border */}
          {!toast.metadata && toast.amount && (
            <div className="mt-2 text-xs text-gray-400">
              <span className="px-2.5 py-1 bg-gray-800/60 border border-gray-600/30 rounded-md">
                {toast.amount}
              </span>
            </div>
          )}
        </div>
        
        {/* Enhanced close button with hover border */}
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-all duration-200 p-2 rounded-lg hover:bg-white/10 group border border-transparent hover:border-white/10"
        >
          <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component (unchanged)
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