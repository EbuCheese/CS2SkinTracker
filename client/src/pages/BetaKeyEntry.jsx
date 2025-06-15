import React, { useState } from 'react';
import { TrendingUp, Key, Lock, Mail, ArrowRight, CheckCircle, AlertCircle, Bug } from 'lucide-react';

const BetaKeyEntry = ({ onSuccess, supabase }) => {
  const [betaKey, setBetaKey] = useState('');
  const [email, setEmail] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const handleBetaKeySubmit = async (e) => {
    e.preventDefault();
    if (!betaKey.trim()) {
      setError('Please enter a beta key');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    setDebugInfo('');
    
    try {
      // Debug: Log the key being searched for
      const searchKey = betaKey.trim();
      setDebugInfo(prev => prev + `Searching for key: "${searchKey}"\n`);

      // Check if beta key exists and is not used
      const { data: keyData, error: keyError } = await activeSupabase
        .from('beta_keys')
        .select('*')
        .eq('key_value', searchKey)
        .eq('is_used', false)
        .single();

      // Debug: Log the query result
      setDebugInfo(prev => prev + `Query result - Data: ${JSON.stringify(keyData)}, Error: ${JSON.stringify(keyError)}\n`);

      if (keyError) {
        if (keyError.code === 'PGRST116') {
          // No rows returned
          setDebugInfo(prev => prev + `No matching key found or key already used\n`);
          
          // Let's check if the key exists at all (regardless of is_used status)
          const { data: anyKeyData, error: anyKeyError } = await activeSupabase
            .from('beta_keys')
            .select('*')
            .eq('key_value', searchKey);
          
          setDebugInfo(prev => prev + `Checking if key exists at all: ${JSON.stringify(anyKeyData)}\n`);
          
          if (anyKeyData && anyKeyData.length > 0) {
            setError('This beta key has already been used');
          } else {
            setError('Invalid beta key');
          }
        } else {
          setDebugInfo(prev => prev + `Database error: ${keyError.message}\n`);
          setError('Database error: ' + keyError.message);
        }
        setIsVerifying(false);
        return;
      }

      if (!keyData) {
        setError('Invalid or already used beta key');
        setIsVerifying(false);
        return;
      }

      setDebugInfo(prev => prev + `Valid key found: ${keyData.id}\n`);

      // Generate a session ID for this user
      const sessionId = generateSessionId();
      setDebugInfo(prev => prev + `Generated session ID: ${sessionId}\n`);

      // Create a beta user record
      const { data: userData, error: userError } = await activeSupabase
        .from('beta_users')
        .insert([{
          beta_key_id: keyData.id,
          session_id: sessionId
        }])
        .select()
        .single();

      setDebugInfo(prev => prev + `User creation result - Data: ${JSON.stringify(userData)}, Error: ${JSON.stringify(userError)}\n`);

      if (userError) {
        setError('Failed to create user session: ' + userError.message);
        setIsVerifying(false);
        return;
      }

      // Mark the beta key as used
      const { error: updateError } = await activeSupabase
        .from('beta_keys')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', keyData.id);

      if (updateError) {
        setDebugInfo(prev => prev + `Failed to mark key as used: ${JSON.stringify(updateError)}\n`);
        console.error('Failed to mark key as used:', updateError);
      } else {
        setDebugInfo(prev => prev + `Key marked as used successfully\n`);
      }

      // Store user info for session persistence (using a mock since localStorage isn't available)
      const userInfo = {
        id: userData.id,
        session_id: sessionId,
        beta_key: searchKey
      };
      
      setDebugInfo(prev => prev + `Session info: ${JSON.stringify(userInfo)}\n`);
      setDebugInfo(prev => prev + `SUCCESS: User authenticated!\n`);

      // Success - call the onSuccess callback
      if (onSuccess) {
        onSuccess(userData);
      } else {
        setError('');
        alert('Success! Beta key verified successfully.');
      }

    } catch (err) {
      console.error('Beta key verification error:', err);
      setDebugInfo(prev => prev + `Catch error: ${err.message}\n`);
      setError('Failed to verify beta key. Please try again.');
      setIsVerifying(false);
    }
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

  // Mock supabase for demonstration when real supabase is not available
  const mockSupabase = {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          eq: (column2, value2) => ({
            single: async () => {
              // Simulate checking for demo keys
              const demoKeys = [
                { id: '1', key_value: 'DEMO-KEY-123', is_used: false },
                { id: '2', key_value: 'TEST-BETA-456', is_used: false },
                { id: '3', key_value: 'BETA2025-001', is_used: false }
              ];
              
              const foundKey = demoKeys.find(k => k.key_value === value && !k.is_used);
              
              if (foundKey) {
                return { data: foundKey, error: null };
              } else {
                return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
              }
            }
          })
        })
      }),
      insert: (data) => ({
        select: () => ({
          single: async () => {
            return { 
              data: { 
                id: 'user-' + Math.random().toString(36).substr(2, 9),
                ...data[0]
              }, 
              error: null 
            };
          }
        })
      }),
      update: (data) => ({
        eq: (column, value) => async () => ({ error: null })
      })
    })
  };

  // Check if supabase is provided, if not show error or use mock
  const activeSupabase = supabase || mockSupabase;
  
  // Add supabase check at the beginning of handleBetaKeySubmit
  if (!supabase) {
    setDebugInfo(prev => prev + `WARNING: No Supabase client provided, using mock data\n`);
  }

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
          <p className="text-gray-400 text-lg">Counter-Strike Investment App</p>
        </div>

        {/* Supabase Setup Warning */}
        {!supabase && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium mb-1">Supabase Not Connected</h4>
                <p className="text-yellow-200 text-sm mb-2">
                  No Supabase client detected. Demo mode is active with mock data.
                </p>
                <p className="text-yellow-200 text-xs">
                  To connect to your real database, pass a configured Supabase client as a prop.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Toggle */}
        <div className="mb-4 text-center">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <Bug className="w-4 h-4" />
            <span>{showDebug ? 'Hide' : 'Show'} Debug Info</span>
          </button>
        </div>

        {/* Debug Panel */}
        {showDebug && debugInfo && (
          <div className="mb-4 bg-gray-900/70 border border-gray-600 rounded-lg p-4">
            <h4 className="text-yellow-400 font-medium mb-2">Debug Information:</h4>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-32">
              {debugInfo}
            </pre>
          </div>
        )}

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
                      onClick={() => handleBetaKeySubmit({ preventDefault: () => {} })}
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

                  {/* Demo Keys */}
                  <div className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Demo Keys (for testing):</p>
                    <div className="flex flex-wrap gap-2">
                      {['DEMO-KEY-123', 'TEST-BETA-456', 'BETA2025-001'].map(key => (
                        <button
                          key={key}
                          onClick={() => setBetaKey(key)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
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