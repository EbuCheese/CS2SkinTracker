// components/LoadingSpinner.js - Reusable loading component
import React from 'react';
import { TrendingUp } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo with pulse animation */}
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 animate-pulse">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
        
        {/* Loading message */}
        <p className="text-gray-400 text-lg">{message}</p>
        
        {/* Dots animation */}
        <div className="flex justify-center space-x-1 mt-3">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;