// hooks/useAuth.js - Streamlined revocation logic
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

const STORAGE_KEYS = {
  USER_SESSION: 'beta_user',
  BETA_KEY: 'beta_key'
};

export const useAuth = () => {
  const [userSession, setUserSession] = useState(null);
  const [hasValidBetaKey, setHasValidBetaKey] = useState(false);
  const [hasStoredBetaKey, setHasStoredBetaKey] = useState(false);
  const [storedBetaKey, setStoredBetaKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Simplified: Just track the revocation message
  const [revocationMessage, setRevocationMessage] = useState(null);

  // Helper function to set revocation message
  const setRevocationAlert = useCallback((type, title, message) => {
    setRevocationMessage({ type, title, message });
  }, []);

  // Simplified: Clear revocation message AND remove stored key if revoked
  const clearRevocationMessage = useCallback(() => {
    const wasRevoked = revocationMessage?.type === 'revoked';
    setRevocationMessage(null);
    
    // If this was a revocation message, also clear the stored key
    if (wasRevoked) {
      localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      setStoredBetaKey(null);
      setHasStoredBetaKey(false);
    }
  }, [revocationMessage]);

  // Simplified: Handle revoked key - just clear everything and show message
  const handleRevokedKey = useCallback((title, message) => {
    console.log('🚫 Handling revoked key cleanup');
    
    // Clear all stored data
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
    
    // Update state
    setUserSession(null);
    setHasValidBetaKey(false);
    setStoredBetaKey(null);
    setHasStoredBetaKey(false);
    
    // Set revocation message
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

  // Validate existing session using the function
  const validateSession = useCallback(async (sessionId) => {
    console.log('🔍 Validating session:', sessionId);
    
    try {
      const { data, error } = await supabase
        .rpc('validate_session', { input_session_id: sessionId });
      
      console.log('👤 Session validation result:', { data, error });
      
      if (error) {
        console.log('❌ Session validation error:', error);
        return false;
      }
      
      if (data && data.valid) {
        return data.session;
      }
      
      // If session is invalid due to revoked key, handle cleanup
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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 Initializing auth...');
      
      await checkTableStructure();
      
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
        const storedKey = localStorage.getItem(STORAGE_KEYS.BETA_KEY);
        
        console.log('💾 Stored user:', storedUser ? 'exists' : 'none');
        console.log('💾 Stored key:', storedKey ? 'exists' : 'none');

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          
          const validSession = await validateSession(userData.session_id);
          
          if (validSession) {
            console.log('✅ Session is still valid');
            setUserSession(userData);
            setHasValidBetaKey(true);
            if (storedKey) {
              setStoredBetaKey(storedKey);
              setHasStoredBetaKey(true);
            }
          } else {
            console.log('❌ Session is no longer valid');
            // Only set stored key if validation didn't fail due to revocation
            // (if it was revoked, handleRevokedKey would have cleared everything)
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
          console.log('🆕 New user - no stored data');
        }
      } catch (error) {
        console.error('🚨 Auth initialization error:', error);
        localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkTableStructure, validateSession, revocationMessage]);

const loginWithBetaKey = useCallback(async (betaKey) => {
  console.log('🔐 Attempting login with beta key:', betaKey.substring(0, 4) + '...');
  setError(null);
  
  // Clear any existing revocation message
  setRevocationMessage(null);

  try {
    console.log('📡 Calling create_beta_session function...');
    
    const { data, error } = await supabase
      .rpc('create_beta_session', { input_key_value: betaKey });
    
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
      console.log('✅ Login succeeded!');
      const sessionData = data.session;
      
      setUserSession(sessionData);
      setHasValidBetaKey(true);
      setStoredBetaKey(betaKey);
      setHasStoredBetaKey(true);

      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));
      localStorage.setItem(STORAGE_KEYS.BETA_KEY, betaKey);

      return { success: true };
    } else {
      console.log('❌ Login failed:', data?.error);
      console.log('📊 Full response data:', data);
      
      if (data?.error === 'Beta key has been revoked') {
        handleRevokedKey(
          'Beta Key Revoked',
          'This beta key has been revoked and is no longer valid. Please contact support or request a new beta key.'
        );
      }
      
      return { success: false, error: data?.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('🚨 Login exception:', error);
    console.error('🚨 Error stack:', error.stack);
    return { success: false, error: `Network error: ${error.message}` };
  }
}, [handleRevokedKey]);

  // Quick login with stored beta key
  const quickLogin = useCallback(async () => {
    if (!storedBetaKey || isStoredKeyRevoked) {
      console.log('❌ No stored beta key or key is revoked for quick login');
      return { success: false, error: isStoredKeyRevoked ? 'Beta key has been revoked' : 'No stored beta key' };
    }

    console.log('⚡ Quick login with stored key');
    
    try {
      const { data, error } = await supabase
        .rpc('quick_beta_login', { input_key_value: storedBetaKey });
      
      console.log('⚡ quick_beta_login result:', { data, error });
      
      if (error) {
        console.error('❌ Quick login error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      
      if (data && data.success) {
        console.log('✅ Quick login succeeded!');
        const sessionData = data.session;
        
        setUserSession(sessionData);
        setHasValidBetaKey(true);

        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));

        return { success: true };
      } else {
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

  // Revoke beta key
  const revokeBetaKey = useCallback(async () => {
    if (!storedBetaKey) {
      console.log('❌ No stored beta key to revoke');
      return { success: false, error: 'No beta key to revoke' };
    }

    console.log('🚫 Revoking beta key');
    
    try {
      const { data, error } = await supabase
        .rpc('revoke_beta_key', { input_key_value: storedBetaKey });
      
      console.log('🚫 revoke_beta_key result:', { data, error });
      
      if (error) {
        console.error('❌ Revoke error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      
      if (data && data.success) {
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

  // Logout
  const logout = useCallback((clearBetaKey = false) => {
    console.log('👋 Logging out, clearBetaKey:', clearBetaKey);
    
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    setUserSession(null);
    setHasValidBetaKey(false);
    setRevocationMessage(null);

    if (clearBetaKey) {
      localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
      setStoredBetaKey(null);
      setHasStoredBetaKey(false);
    }
  }, []);

  // Clear stored beta key
  const clearStoredBetaKey = useCallback(() => {
    console.log('🗑️ Clearing stored beta key');
    localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
    setStoredBetaKey(null);
    setHasStoredBetaKey(false);
    setRevocationMessage(null);
  }, []);

  return {
    userSession,
    hasValidBetaKey,
    hasStoredBetaKey,
    storedBetaKey,
    isLoading,
    revocationMessage,
    isStoredKeyRevoked,        // Computed from revocationMessage
    clearRevocationMessage,
    loginWithBetaKey,
    quickLogin,
    logout,
    clearStoredBetaKey,
    revokeBetaKey
  };
};