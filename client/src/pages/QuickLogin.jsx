// pages/QuickLogin.js - Optimized with better error handling
import React, { useState } from 'react';
import { TrendingUp, LogIn, Key, RefreshCw } from 'lucide-react';

const QuickLogin = ({ onQuickLogin, onNewBetaKey, storedBetaKey }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleQuickLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    
    try {
      const result = await onQuickLogin();
      
      if (!result.success) {
        setError(result.error || 'Failed to log in. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const maskBetaKey = (key) => {
    if (!key || key.length < 8) return key;
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400">Continue with your beta access</p>
        </div>

        {/* Quick Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
          {/* Stored Beta Key Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <Key className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Saved Beta Key</span>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
              <code className="text-sm text-white font-mono">{maskBetaKey(storedBetaKey)}</code>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleQuickLogin}
              disabled={isLoggingIn}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 ${
                isLoggingIn
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02]'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Continue with Beta Access</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={onNewBetaKey}
              disabled={isLoggingIn}
              className="w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Use Different Beta Key</span>
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your beta key is securely stored on this device only
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-orange-300">Beta Access Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickLogin;