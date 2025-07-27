import React, { useState } from 'react';
import { User, LogOut, Shield, Calendar, Key, IdCardLanyard, AlertTriangle, X, Eye, EyeOff, Copy, Check } from 'lucide-react';

const AccountPage = ({ userSession, onLogout, onRevoke }) => {
  // State management for loading states and UI controls
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Retrieve beta key from localStorage with fallback
  const betaKey = localStorage.getItem('beta_key') || 'N/A';

  // Handles user logout with optional beta key clearing
  const handleLogout = async (clearBetaKey = false) => {
    setIsLoggingOut(true);
    // Add a small delay for better UX
    setTimeout(() => {
      onLogout(clearBetaKey);
    }, 1000);
  };

  // Initiates the beta key revocation confirmation flow
  const handleRevokeClick = () => {
    setShowRevokeConfirm(true);
  };

  // Confirms and executes beta key revocation
  const handleRevokeConfirm = async () => {
    setIsRevoking(true);
    setShowRevokeConfirm(false);
    
    try {
      const result = await onRevoke();
      if (result.success) {
        // The revoke function handles clearing all state
        console.log('Beta key revoked successfully');
      } else {
        console.error('Failed to revoke beta key:', result.error);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Error revoking beta key:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  // Cancels the beta key revocation process
  const handleRevokeCancel = () => {
    setShowRevokeConfirm(false);
  };

  // Toggles the visibility of sensitive account fields
  const toggleFieldVisibility = () => {
    setShowFields(!showFields);
  };

  // Copies text to clipboard and provides visual feedback
  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Masks sensitive values for security display
  const maskValue = (value, showFull = false) => {
    if (!value || value === 'N/A') return 'N/A';
    if (showFull || showFields) return value;
    return '••••••••••••••••';
  };

  // Reusable copy button component with success feedback
  const CopyButton = ({ text, fieldName }) => (
    <button
      onClick={() => copyToClipboard(text, fieldName)}
      className="p-1 text-gray-400 hover:text-orange-400 transition-colors duration-200"
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header Section */}
        <div className="text-center mb-8">
          {/* Avatar Circle with User Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          {/* Page Title and Description */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            Account Settings
          </h1>
          <p className="text-gray-400">Manage your SkinTracker beta account</p>
        </div>

        {/* Account Information Display Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6 shadow-xl">
        {/* Card Header with Toggle Visibility Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Beta Account Information</h2>
            </div>
            {/* Toggle button for showing/hiding sensitive fields */}
            <button
              onClick={toggleFieldVisibility}
              className="p-2 text-gray-400 hover:text-orange-400 transition-colors duration-200 rounded-lg hover:bg-gray-700/30"
              title={showFields ? "Hide fields" : "Show fields"}
            >
              {showFields ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Account Information Fields Grid */}
          <div className="space-y-4">

            {/* Session ID Field */}
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Session ID</p>
                  <p className="text-white font-medium font-mono text-sm">
                    {maskValue(userSession?.session_id)}
                  </p>
                </div>
              </div>
              <CopyButton text={userSession?.session_id || ''} fieldName="session_id" />
            </div>
            
            {/* User ID Field */}
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">User ID</p>
                  <p className="text-white font-medium font-mono text-sm">
                    {maskValue(userSession?.id)}
                  </p>
                </div>
              </div>
              <CopyButton text={userSession?.id || ''} fieldName="user_id" />
            </div>
            
            {/* Beta Key Field (from localStorage) */}
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <div className="flex items-center space-x-3">
                <Key className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Beta Key</p>
                  <p className="text-white font-medium font-mono text-sm">
                    {maskValue(betaKey)}
                  </p>
                </div>
              </div>
              <CopyButton text={betaKey} fieldName="beta_key" />
            </div>
            
            {/* Beta Key ID Field (from session) */}
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <div className="flex items-center space-x-3">
                <IdCardLanyard className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Beta Key ID</p>
                  <p className="text-white font-medium font-mono text-sm">
                    {maskValue(userSession?.beta_key_id)}
                  </p>
                </div>
              </div>
              <CopyButton text={userSession?.beta_key_id || ''} fieldName="beta_key_id" />
            </div>
          </div>
        </div>

        {/* Account Actions Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Account Actions</h2>
          
          <div className="space-y-4">

            {/* Quick Sign Out */}
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Sign Out</h3>
                  <p className="text-gray-400 text-sm">
                    Sign out but keep your beta key saved for quick re-login.
                  </p>
                </div>
                {/* Quick Sign Out Button */}
                <button
                  onClick={() => handleLogout(false)} // Don't clear beta key
                  disabled={isLoggingOut || isRevoking}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isLoggingOut || isRevoking
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-orange-500/25'
                  }`}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Quick Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Beta Key Revocation Action */}
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>Revoke Key</span>
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Permanently revoke your beta key and clear all saved data.
                  </p>
                  {/* Warning Messages */}
                  <p className="text-red-300 text-sm mt-2 font-medium">
                    Warning: Your beta key will be permanently deactivated
                  </p>
                  <p className="text-red-300 text-sm font-medium">
                    and you'll need a new one for future access.
                  </p>
                </div>
                {/* Revoke Key Button */}
                <button
                  onClick={handleRevokeClick}
                  disabled={isLoggingOut || isRevoking}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isLoggingOut || isRevoking
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-900/50 hover:bg-red-800/70 text-red-200 border border-red-600/50 hover:border-red-500/70'
                  }`}
                >
                  {isRevoking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Revoke Access</span>
                    </>
                  )}
                </button>
              </div>

              {/* Revocation Confirmation Modal */}
              {showRevokeConfirm && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center p-4">
                  <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl">

                    {/* Modal Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Confirm Key Revocation</h3>
                    </div>
                    
                    {/* Warning Content */}
                    <div className="space-y-3 mb-6">
                      <p className="text-gray-300 text-sm">
                        <strong>Warning:</strong> This action cannot be undone.
                      </p>
                      {/* Consequences List */}
                      <ul className="text-red-300 text-sm space-y-1 list-disc list-inside bg-red-900/20 p-3 rounded border border-red-500/30">
                        <li>Your beta key will be permanently deactivated</li>
                        <li>All saved account data will be cleared</li>
                        <li>You'll need a new beta key to access the app again</li>
                        <li>This action is irreversible</li>
                      </ul>
                    </div>

                    {/* Modal Action Buttons */}
                    <div className="flex space-x-3">
                      {/* Cancel Button */}
                      <button
                        onClick={handleRevokeCancel}
                        disabled={isRevoking}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      {/* Confirm Revocation Button */}
                      <button
                        onClick={handleRevokeConfirm}
                        disabled={isRevoking}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isRevoking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Revoking...</span>
                          </>
                        ) : (
                          <span>Yes, Revoke Key</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Beta Version Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Beta Version - Limited Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;