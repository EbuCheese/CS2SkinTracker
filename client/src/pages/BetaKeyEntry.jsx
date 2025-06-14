import React, { useState } from 'react';
import { TrendingUp, Key, Lock, Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

const BetaKeyEntry = ({ onSuccess }) => {
  const [betaKey, setBetaKey] = useState('');
  const [email, setEmail] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const handleBetaKeySubmit = (e) => {
    e.preventDefault();
    if (!betaKey.trim()) {
      setError('Please enter a beta key');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    // Simulate verification process
    setTimeout(() => {
      // For demo purposes, accept any key that's at least 6 characters
      if (betaKey.length >= 6) {
        // Success - call the onSuccess callback to unlock the main app
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError('Invalid beta key. Please check and try again.');
        setIsVerifying(false);
      }
    }, 1500);
  };

  const handleRequestAccess = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    // Simulate sending request
    setTimeout(() => {
      setRequestSent(true);
      setShowRequestForm(false);
      setEmail('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(239,68,68,0.1),transparent_50%)]" />
      
      <div className="relative max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/25 mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            SkinTracker
          </h1>
          <p className="text-gray-400 text-lg">Investment App</p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-8 shadow-2xl">
          {!requestSent ? (
            <>
              {!showRequestForm ? (
                <>
                  {/* Beta Key Entry Form */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Key className="w-8 h-8 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Enter Beta Key</h2>
                    <p className="text-gray-400">Welcome back! Enter your beta key to continue.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={betaKey}
                          onChange={(e) => setBetaKey(e.target.value)}
                          placeholder="Enter your beta key"
                          className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                          onKeyPress={(e) => e.key === 'Enter' && handleBetaKeySubmit(e)}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      onClick={handleBetaKeySubmit}
                      disabled={isVerifying}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Access App</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Request Access Link */}
                  <div className="mt-8 pt-6 border-t border-gray-700">
                    <p className="text-center text-gray-400 text-sm mb-4">
                      Don't have a beta key yet?
                    </p>
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="w-full text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Request Beta Access</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Request Access Form */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Request Beta Access</h2>
                    <p className="text-gray-400">Join our waitlist and we'll send you a beta key when available.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                          onKeyPress={(e) => e.key === 'Enter' && handleRequestAccess(e)}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      onClick={handleRequestAccess}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center space-x-2"
                    >
                      <span>Request Access</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Back to Login */}
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setShowRequestForm(false);
                        setError('');
                      }}
                      className="w-full text-gray-400 hover:text-white font-medium transition-colors duration-200"
                    >
                      ← Back to Beta Key Entry
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Request Sent!</h2>
                <p className="text-gray-400 mb-6">
                  We've received your request for beta access. You'll hear from us soon!
                </p>
                <button
                  onClick={() => {
                    setRequestSent(false);
                    setShowRequestForm(false);
                  }}
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200"
                >
                  ← Back to Beta Key Entry
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 SkinTracker. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default BetaKeyEntry;