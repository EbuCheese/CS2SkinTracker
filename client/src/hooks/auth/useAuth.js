// hooks/useAuth.js - Streamlined revocation logic
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

// Storage keys for localStorage persistence
const STORAGE_KEYS = {
  USER_SESSION: 'beta_user',
  BETA_KEY: 'beta_key'
};

export const useAuth = () => {
  // Core auth states
  const [userSession, setUserSession] = useState(null);
  const [hasValidBetaKey, setHasValidBetaKey] = useState(false);
  const [hasStoredBetaKey, setHasStoredBetaKey] = useState(false);
  const [storedBetaKey, setStoredBetaKey] = useState(null);

  // Loading, error, message states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revocationMessage, setRevocationMessage] = useState(null);

  // Helper function to set revocation alert messages
  const setRevocationAlert = useCallback((type, title, message) => {
    setRevocationMessage({ type, title, message });
  }, []);

  // Clears revocation message and performs cleanup if key was revoked
  const clearRevocationMessage = useCallback(() => {
    const wasRevoked = revocationMessage?.type === 'revoked';
    setRevocationMessage(null);
    
    // Clean up revoked key from storage to prevent reuse attempts
    if (wasRevoked) {
      localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      setStoredBetaKey(null);
      setHasStoredBetaKey(false);
    }
  }, [revocationMessage]);

  // Handles complete cleanup when a beta key is revoked
  const handleRevokedKey = useCallback((title, message) => {
    console.log('🚫 Handling revoked key cleanup');
    
    // Clear all authentication data from localStorage
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
    
    // Reset all auth state to logged-out state
    setUserSession(null);
    setHasValidBetaKey(false);
    setStoredBetaKey(null);
    setHasStoredBetaKey(false);
    
    // Show revocation message to user
    setRevocationAlert('revoked', title, message);
  }, [setRevocationAlert]);

  // Check if current stored key is revoked
  const isStoredKeyRevoked = revocationMessage?.type === 'revoked';

  // Debug: Check table structure using direct table queries
  const checkTableStructure = useCallback(async () => {
    try {
      console.log('🔍 Checking table structures...');
      
      const { data: betaKeysTest, error: betaKeysError } = await supabase
        .from('beta_keys')
        .select('*')
        .limit(0);
      
      console.log('📊 beta_keys structure test:', { betaKeysTest, betaKeysError });
      
      const { data: betaUsersTest, error: betaUsersError } = await supabase
        .from('beta_users')
        .select('*')
        .limit(0);
      
      console.log('📊 beta_users structure test:', { betaUsersTest, betaUsersError });
      
    } catch (error) {
      console.error('❌ Error checking table structure:', error);
    }
  }, []);

  // Validates an existing session with the backend
  const validateSession = useCallback(async (sessionId) => {
    console.log('🔍 Validating session:', sessionId);
    
    try {
      // Call Supabase function to validate session
      const { data, error } = await supabase
        .rpc('validate_session', { input_session_id: sessionId });
      
      console.log('👤 Session validation result:', { data, error });
      
      if (error) {
        console.log('❌ Session validation error:', error);
        return false;
      }
      
      // Session is valid - return session data
      if (data && data.valid) {
        return data.session;
      }
      
      // Handle case where session is invalid due to key revocation
      if (data && !data.valid && data.error === 'Beta key has been revoked') {
        handleRevokedKey(
          'Beta Access Revoked',
          'Your beta access has been revoked. Please contact support if you believe this is an error.'
        );
      }
      
      return false;
    } catch (err) {
      console.error('🚨 Exception in validateSession:', err);
      return false;
    }
  }, [handleRevokedKey]);

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 Initializing auth...');
      
      // Debug: Check database connectivity
      await checkTableStructure();
      
      try {
        // Retrieve stored authentication data
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
        const storedKey = localStorage.getItem(STORAGE_KEYS.BETA_KEY);
        
        console.log('💾 Stored user:', storedUser ? 'exists' : 'none');
        console.log('💾 Stored key:', storedKey ? 'exists' : 'none');

        if (storedUser) {
          // We have a stored session - validate it
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          
          const validSession = await validateSession(userData.session_id);
          
          if (validSession) {
            // Session is still valid - restore full auth state
            console.log('✅ Session is still valid');
            setUserSession(userData);
            setHasValidBetaKey(true);
            if (storedKey) {
              setStoredBetaKey(storedKey);
              setHasStoredBetaKey(true);
            }
          } else {
            // Session invalid - keep stored key if not revoked for potential reuse
            console.log('❌ Session is no longer valid');
            if (storedKey && !revocationMessage) {
              setStoredBetaKey(storedKey);
              setHasStoredBetaKey(true);
            }
          }
        } else if (storedKey) {
          console.log('🔑 No session but beta key found');
          setStoredBetaKey(storedKey);
          setHasStoredBetaKey(true);
        } else {
          // No stored data - fresh user
          console.log('🆕 New user - no stored data');
        }
      } catch (error) {
        // Error during initialization - clear potentially corrupted data
        console.error('🚨 Auth initialization error:', error);
        localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      } finally {
        // Always finish loading state
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkTableStructure, validateSession, revocationMessage]);

// Primary login method using a beta key
const loginWithBetaKey = useCallback(async (betaKey) => {
  console.log('🔐 Attempting login with beta key:', betaKey.substring(0, 4) + '...');
  setError(null);
  
  // Clear any existing revocation message
  setRevocationMessage(null);

  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('🌍 Detected timezone:', userTimezone);
    console.log('📡 Calling create_beta_session function...');
    
    // Call Supabase function to create new session
    const { data, error } = await supabase
      .rpc('create_beta_session', {
        input_key_value: betaKey,
        user_timezone: userTimezone
      });
    
    console.log('🔑 create_beta_session raw response:', { 
      data, 
      error,
      dataType: typeof data,
      errorDetails: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null
    });
    
    if (error) {
      console.error('❌ Supabase function error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { 
        success: false, 
        error: `Database error: ${error.message}${error.details ? ` (${error.details})` : ''}` 
      };
    }
    
    if (data && data.success) {
      // Login successful - update state and store data
      console.log('✅ Login succeeded!');
      const sessionData = data.session;
      
      // Update React state
      setUserSession(sessionData);
      setHasValidBetaKey(true);
      setStoredBetaKey(betaKey);
      setHasStoredBetaKey(true);

      // Persist to localStorage for future sessions
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));
      localStorage.setItem(STORAGE_KEYS.BETA_KEY, betaKey);

      return { success: true };
    } else {
      // Login failed - handle specific error cases
      console.log('❌ Login failed:', data?.error);
      console.log('📊 Full response data:', data);
      
      // Special handling for revoked keys
      if (data?.error === 'Beta key has been revoked') {
        handleRevokedKey(
          'Beta Key Revoked',
          'This beta key has been revoked and is no longer valid. Please contact support or request a new beta key.'
        );
      }
      
      return { success: false, error: data?.error || 'Unknown error' };
    }
  } catch (error) {
    // Network or other unexpected errors
    console.error('🚨 Login exception:', error);
    console.error('🚨 Error stack:', error.stack);
    return { success: false, error: `Network error: ${error.message}` };
  }
}, [handleRevokedKey]);

  // Quick login with stored beta key
  const quickLogin = useCallback(async () => {
    // Pre-flight checks
    if (!storedBetaKey || isStoredKeyRevoked) {
      console.log('❌ No stored beta key or key is revoked for quick login');
      return { success: false, error: isStoredKeyRevoked ? 'Beta key has been revoked' : 'No stored beta key' };
    }

    console.log('⚡ Quick login with stored key');
    
    try {
      // Call optimized quick login function
      const { data, error } = await supabase
        .rpc('quick_beta_login', { input_key_value: storedBetaKey });
      
      console.log('⚡ quick_beta_login result:', { data, error });
      
      if (error) {
        console.error('❌ Quick login error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      
      if (data && data.success) {
        // Quick login successful
        console.log('✅ Quick login succeeded!');
        const sessionData = data.session;
        
        // Update state and refresh session storage
        setUserSession(sessionData);
        setHasValidBetaKey(true);
        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));

        return { success: true };
      } else {
        // Quick login failed - handle revocation
        console.log('❌ Quick login failed:', data?.error);
        
        if (data?.error === 'Beta key has been revoked') {
          handleRevokedKey(
            'Beta Access Revoked',
            'Your beta access has been revoked. Please contact support if you believe this is an error, or request a new beta key.'
          );
        }
        
        return { success: false, error: data?.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('🚨 Quick login error:', error);
      return { success: false, error: error.message };
    }
  }, [storedBetaKey, isStoredKeyRevoked, handleRevokedKey]);

  // Permanently Revoke the current beta key
  const revokeBetaKey = useCallback(async () => {
    if (!storedBetaKey) {
      console.log('❌ No stored beta key to revoke');
      return { success: false, error: 'No beta key to revoke' };
    }

    console.log('🚫 Revoking beta key');
    
    try {
      // Call revocation function
      const { data, error } = await supabase
        .rpc('revoke_beta_key', { input_key_value: storedBetaKey });
      
      console.log('🚫 revoke_beta_key result:', { data, error });
      
      if (error) {
        console.error('❌ Revoke error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      
      if (data && data.success) {
        // Revocation successful - trigger cleanup
        console.log('✅ Beta key revoked successfully');
        
        handleRevokedKey(
          'Beta Key Revoked',
          'Your beta key has been successfully revoked. You have been logged out.'
        );

        return { success: true };
      } else {
        console.log('❌ Revoke failed:', data?.error);
        return { success: false, error: data?.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('🚨 Revoke error:', error);
      return { success: false, error: error.message };
    }
  }, [storedBetaKey, handleRevokedKey]);

  // Log out the current user
  const logout = useCallback((clearBetaKey = false) => {
    console.log('👋 Logging out, clearBetaKey:', clearBetaKey);
    
    // Always clear session data
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    sessionStorage.removeItem('user_settings');
    setUserSession(null);
    setHasValidBetaKey(false);
    setRevocationMessage(null);

    // Optionally clear beta key for complete logout
    if (clearBetaKey) {
      localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      setStoredBetaKey(null);
      setHasStoredBetaKey(false);
    }
  }, []);

  // Clear stored beta key without logging out
  const clearStoredBetaKey = useCallback(() => {
    console.log('🗑️ Clearing stored beta key');
    localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
    setStoredBetaKey(null);
    setHasStoredBetaKey(false);
    setRevocationMessage(null);
  }, []);

  return {
    // Core auth state
    userSession,
    hasValidBetaKey,
    hasStoredBetaKey,
    storedBetaKey,
    isLoading,

    // Revocation handling
    revocationMessage,
    isStoredKeyRevoked,        
    clearRevocationMessage,

    // Authentication methods
    loginWithBetaKey,
    quickLogin,
    logout,
    clearStoredBetaKey,
    revokeBetaKey
  };
};