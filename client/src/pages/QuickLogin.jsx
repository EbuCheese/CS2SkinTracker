// pages/QuickLogin.js - Updated with improved revocation logic
import React, { useState } from 'react';
import { TrendingUp, LogIn, Key, RefreshCw, AlertTriangle, X } from 'lucide-react';

const QuickLogin = ({ onQuickLogin, onNewBetaKey, storedBetaKey, revocationMessage, isStoredKeyRevoked, onClearRevocationMessage }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [dismissedRevocation, setDismissedRevocation] = useState(false);

  const handleQuickLogin = async () => {
    // Don't attempt login if key is revoked
    if (isStoredKeyRevoked) {
      return;
    }

    setIsLoggingIn(true);
    setError('');
    
    try {
      const result = await onQuickLogin();
      
      if (!result.success) {
        // Don't show generic error if we have a revocation message
        if (result.error !== 'Beta key has been revoked') {
          setError(result.error || 'Failed to log in. Please try again.');
        }
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

  const showRevocationMessage = revocationMessage && !dismissedRevocation;

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

        {/* Revocation Message */}
        {showRevocationMessage && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg relative">
            <button
              onClick={() => {
                setDismissedRevocation(true);
                onClearRevocationMessage?.();
              }}
              className="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start space-x-3 pr-6">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-semibold text-sm mb-1">
                  {revocationMessage.title}
                </h3>
                <p className="text-red-300 text-sm leading-relaxed">
                  {revocationMessage.message}
                </p>
                {isStoredKeyRevoked && (
                  <p className="text-red-300 text-sm mt-2 font-medium">
                    Please use a different beta key to continue.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
          {/* Stored Beta Key Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <Key className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Saved Beta Key</span>
              {isStoredKeyRevoked && (
                <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded-full border border-red-500/30">
                  REVOKED
                </span>
              )}
            </div>
            <div className={`bg-gray-700/30 rounded-lg p-3 border ${
              isStoredKeyRevoked 
                ? 'border-red-500/30' 
                : 'border-gray-600/30'
            }`}>
              <code className={`text-sm font-mono ${
                isStoredKeyRevoked 
                  ? 'text-red-300 line-through' 
                  : 'text-white'
              }`}>
                {maskBetaKey(storedBetaKey)}
              </code>
            </div>
          </div>

          {/* Error Message (for non-revocation errors) */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleQuickLogin}
              disabled={isLoggingIn || isStoredKeyRevoked}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 ${
                isLoggingIn || isStoredKeyRevoked
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02]'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : isStoredKeyRevoked ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span>Beta Key Revoked</span>
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
              <span>
                {isStoredKeyRevoked ? 'Enter New Beta Key' : 'Use Different Beta Key'}
              </span>
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {isStoredKeyRevoked 
                ? 'This beta key is no longer valid'
                : 'Your beta key is securely stored on this device only'
              }
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