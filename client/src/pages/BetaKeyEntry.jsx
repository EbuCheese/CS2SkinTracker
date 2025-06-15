import React, { useState } from 'react';
import { TrendingUp, Key, ArrowRight, Mail, Users, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const BetaKeyEntry = ({ onSuccess }) => {
  const [betaKey, setBetaKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Request form state
  const [requestForm, setRequestForm] = useState({
    email: '',
    name: '',
    reason: ''
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!betaKey.trim()) {
      setError('Please enter a beta key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onSuccess(betaKey.trim());
      
      if (!result.success) {
        setError(result.error || 'Invalid or expired beta key');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestForm.email.trim() || !requestForm.name.trim()) {
      return;
    }

    setRequestLoading(true);

    // Simulate API call - replace with actual request logic
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setRequestSubmitted(true);
    } catch (err) {
      console.error('Request failed:', err);
    } finally {
      setRequestLoading(false);
    }
  };

  const updateRequestForm = (field, value) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
  };

  if (showRequestForm && !requestSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
              SkinTracker
            </h1>
            <p className="text-gray-400">Request Beta Access</p>
          </div>

          {/* Request Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
            <div className="mb-6">
              <label htmlFor="name" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-3">
                <Users className="w-4 h-4 text-orange-400" />
                <span>Full Name *</span>
              </label>
              <input
                id="name"
                type="text"
                value={requestForm.name}
                onChange={(e) => updateRequestForm('name', e.target.value)}
                placeholder="Enter your full name"
                disabled={requestLoading}
                className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-3">
                <Mail className="w-4 h-4 text-orange-400" />
                <span>Email Address *</span>
              </label>
              <input
                id="email"
                type="email"
                value={requestForm.email}
                onChange={(e) => updateRequestForm('email', e.target.value)}
                placeholder="your@email.com"
                disabled={requestLoading}
                className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="reason" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-3">
                <span>Why do you want beta access?</span>
              </label>
              <textarea
                id="reason"
                value={requestForm.reason}
                onChange={(e) => updateRequestForm('reason', e.target.value)}
                placeholder="Tell us about your interest in SkinTracker..."
                disabled={requestLoading}
                rows={4}
                className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={requestLoading || !requestForm.email.trim() || !requestForm.name.trim()}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 mb-4 ${
                requestLoading || !requestForm.email.trim() || !requestForm.name.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02]'
              }`}
            >
              {requestLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Request Beta Access</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Back to Key Entry */}
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="w-full py-3 px-4 text-gray-400 hover:text-white transition-colors duration-200 text-sm"
            >
              Already have a beta key? Enter it here
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>We'll review your request and send you a beta key if selected. This usually takes 1-3 business days.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (requestSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Request Submitted!</h1>
          <p className="text-gray-400 mb-8">
            Thanks for your interest in SkinTracker. We've received your beta access request and will review it shortly.
          </p>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl mb-6">
            <h3 className="text-white font-semibold mb-3">What happens next?</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>We'll review your application within 1-3 business days</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>If selected, you'll receive a beta key via email</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>Use your beta key to access SkinTracker</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowRequestForm(false);
              setRequestSubmitted(false);
              setRequestForm({ email: '', name: '', reason: '' });
            }}
            className="text-orange-400 hover:text-orange-300 transition-colors duration-200 text-sm"
          >
            Back to Beta Key Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            SkinTracker
          </h1>
          <p className="text-gray-400">Enter your beta key to continue</p>
        </div>

        {/* Beta Key Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
          <div className="mb-6">
            <label htmlFor="betaKey" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-3">
              <Key className="w-4 h-4 text-orange-400" />
              <span>Beta Access Key</span>
            </label>
            <input
              id="betaKey"
              type="text"
              value={betaKey}
              onChange={(e) => setBetaKey(e.target.value)}
              placeholder="Enter your beta key"
              disabled={isLoading}
              className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !betaKey.trim()}
            className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 mb-4 ${
              isLoading || !betaKey.trim()
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Access Beta</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Request Access Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowRequestForm(true)}
              className="text-orange-400 hover:text-orange-300 transition-colors duration-200 text-sm font-medium"
            >
              Don't have a beta key? Request access
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your beta key will be securely stored for quick access
            </p>
          </div>
                  </div>

      
        {/* Beta Info */}
        <div className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/30">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium text-sm mb-1">Limited Beta Access</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                SkinTracker is currently in private beta. We're working with a select group of users to refine the experience before our public launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaKeyEntry;