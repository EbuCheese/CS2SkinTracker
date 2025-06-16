// hooks/useAuth.js - Fixed version
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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

  // Debug: Check table structure using direct table queries
  const checkTableStructure = useCallback(async () => {
    try {
      console.log('🔍 Checking table structures...');
      
      // Check beta_keys structure by trying to select columns
      const { data: betaKeysTest, error: betaKeysError } = await supabase
        .from('beta_keys')
        .select('*')
        .limit(0); // Get no rows, just structure
      
      console.log('📊 beta_keys structure test:', { betaKeysTest, betaKeysError });
      
      // Check beta_users structure
      const { data: betaUsersTest, error: betaUsersError } = await supabase
        .from('beta_users')
        .select('*')
        .limit(0); // Get no rows, just structure
      
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
      
      return false;
    } catch (err) {
      console.error('🚨 Exception in validateSession:', err);
      return false;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 Initializing auth...');
      
      // Check table structure for debugging
      await checkTableStructure();
      
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
        const storedKey = localStorage.getItem(STORAGE_KEYS.BETA_KEY);
        
        console.log('💾 Stored user:', storedUser ? 'exists' : 'none');
        console.log('💾 Stored key:', storedKey ? 'exists' : 'none');

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          
          // Validate the stored session
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
            console.log('❌ Session is no longer valid, clearing');
            localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
            if (storedKey) {
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
  }, [checkTableStructure, validateSession]);

  // Login with beta key - fixed version
  const loginWithBetaKey = useCallback(async (betaKey) => {
    console.log('🔐 Attempting login with beta key:', betaKey.substring(0, 4) + '...');
    
    try {
      // Try to create a new session with the beta key
      const { data, error } = await supabase
        .rpc('create_beta_session', { input_key_value: betaKey });
      
      console.log('🔑 create_beta_session result:', { data, error });
      
      if (error) {
        console.error('❌ Function error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      
      if (data && data.success) {
        console.log('✅ Login succeeded!');
        const sessionData = data.session;
        
        // Update state
        setUserSession(sessionData);
        setHasValidBetaKey(true);
        setStoredBetaKey(betaKey);
        setHasStoredBetaKey(true);

        // Persist to storage
        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));
        localStorage.setItem(STORAGE_KEYS.BETA_KEY, betaKey);

        return { success: true };
      } else {
        console.log('❌ Login failed:', data?.error);
        return { success: false, error: data?.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('🚨 Login error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Quick login with stored beta key
  const quickLogin = useCallback(async () => {
    if (!storedBetaKey) {
      console.log('❌ No stored beta key for quick login');
      return { success: false, error: 'No stored beta key' };
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
        
        // Update state
        setUserSession(sessionData);
        setHasValidBetaKey(true);

        // Persist to storage
        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));

        return { success: true };
      } else {
        console.log('❌ Quick login failed:', data?.error);
        return { success: false, error: data?.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('🚨 Quick login error:', error);
      return { success: false, error: error.message };
    }
  }, [storedBetaKey]);

  // Logout
  const logout = useCallback((clearBetaKey = false) => {
    console.log('👋 Logging out, clearBetaKey:', clearBetaKey);
    
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    setUserSession(null);
    setHasValidBetaKey(false);

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
  }, []);

  return {
    userSession,
    hasValidBetaKey,
    hasStoredBetaKey,
    storedBetaKey,
    isLoading,
    loginWithBetaKey,
    quickLogin,
    logout,
    clearStoredBetaKey
  };
};