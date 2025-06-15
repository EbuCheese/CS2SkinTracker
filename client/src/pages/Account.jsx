import React, { useState } from 'react';
import { User, LogOut, Shield, Calendar, Key, AlertTriangle, X } from 'lucide-react';

const AccountPage = ({ userSession, onLogout }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const handleLogout = async (clearBetaKey = false) => {
    setIsLoggingOut(true);
    // Add a small delay for better UX
    setTimeout(() => {
      onLogout(clearBetaKey);
    }, 1000);
  };

  const handleRevokeClick = () => {
    setShowRevokeConfirm(true);
  };

  const handleRevokeConfirm = () => {
    setShowRevokeConfirm(false);
    handleLogout(true);
  };

  const handleRevokeCancel = () => {
    setShowRevokeConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            Account Settings
          </h1>
          <p className="text-gray-400">Manage your SkinTracker beta account</p>
        </div>

        {/* Account Info Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">Beta Account Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <Key className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">User ID</p>
                  <p className="text-white font-medium">{userSession?.id || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <Calendar className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Session ID</p>
                  <p className="text-white font-medium font-mono text-sm">
                    {userSession?.session_id ? 
                      `${userSession.session_id.substring(0, 8)}...` : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <Shield className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Account Status</p>
                  <p className="text-green-400 font-medium">Beta Access Active</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <Key className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Beta Key ID</p>
                  <p className="text-white font-medium">{userSession?.beta_key_id || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Card */}
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
                <button
                  onClick={() => handleLogout(false)}
                  disabled={isLoggingOut}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isLoggingOut
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

            {/* Revoke Beta Key */}
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>Revoke Key</span>
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Permanently sign out and clear all saved data.
                  </p>
                  <p className="text-red-300 text-sm mt-2 font-medium">
                    Note: Your beta key will no longer work after signing out
                  </p>
                  <p className="text-red-300 text-sm font-medium">
                    you'll need to obtain a new beta key for future access.
                  </p>
                </div>
                <button
                  onClick={handleRevokeClick}
                  disabled={isLoggingOut}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isLoggingOut
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-900/50 hover:bg-red-800/70 text-red-200 border border-red-600/50 hover:border-red-500/70'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Revoke Access</span>
                </button>
              </div>

              {/* Confirmation Modal Overlay */}
              {showRevokeConfirm && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center p-4">
                  <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Confirm Key Revocation</h3>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <p className="text-gray-300 text-sm">
                        <strong>Warning:</strong> This action cannot be undone.
                      </p>
                      <ul className="text-red-300 text-sm space-y-1 list-disc list-inside bg-red-900/20 p-3 rounded border border-red-500/30">
                        <li>Your beta key will be permanently deactivated</li>
                        <li>All saved account data will be cleared</li>
                        <li>You'll need a new beta key to access the app again</li>
                      </ul>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleRevokeCancel}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRevokeConfirm}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                      >
                        Yes, Revoke Key
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Beta Notice */}
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