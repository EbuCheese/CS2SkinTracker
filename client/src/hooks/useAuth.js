// hooks/useAuth.js - Fixed version with better error handling
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

  // Secure beta key verification using security definer function
  const verifyBetaKey = useCallback(async (betaKey) => {
    console.log('🔍 Verifying beta key:', betaKey);
    
    try {
      // Use the secure function instead of direct table access
      const { data, error } = await supabase
        .rpc('verify_beta_key', { key_value: betaKey });
      
      console.log('🔑 Beta key verification result:', { data, error });
      
      if (error) {
        console.error('❌ Beta key verification error:', error);
        return false;
      }
      
      // The function returns an array with one object
      if (!data || data.length === 0) {
        console.log('❌ No data returned from verification');
        return false;
      }
      
      const result = data[0];
      if (!result.is_valid || !result.key_id) {
        console.log('❌ Beta key is invalid or already used');
        return false;
      }
      
      console.log('✅ Beta key verified successfully');
      return { id: result.key_id };
    } catch (err) {
      console.error('🚨 Exception in verifyBetaKey:', err);
      return false;
    }
  }, []);

  // Validate existing session using secure function
  const validateSession = useCallback(async (sessionId) => {
    console.log('🔍 Validating session:', sessionId);
    
    try {
      // Use the secure function to get session data
      const { data, error } = await supabase
        .rpc('get_user_session', { user_session_id: sessionId });
      
      console.log('👤 Session validation result:', { data, error });
      
      if (error) {
        console.error('❌ Session validation error:', error);
        return false;
      }
      
      if (!data || data.length === 0) {
        console.log('❌ No matching session found');
        return false;
      }
      
      console.log('✅ Session validated successfully');
      return data[0];
    } catch (err) {
      console.error('🚨 Exception in validateSession:', err);
      return false;
    }
  }, []);

  // Create new session and mark beta key as used securely
  const createSession = useCallback(async (betaKey, betaKeyId) => {
    console.log('🏗️ Creating session for beta key ID:', betaKeyId);
    
    try {
      // First, mark the beta key as used using secure function
      const { data: keyUpdateResult, error: keyError } = await supabase
        .rpc('use_beta_key', { key_value: betaKey });
      
      console.log('🔑 Key usage result:', { keyUpdateResult, keyError });
      
      if (keyError) {
        console.error('❌ Failed to mark beta key as used:', keyError);
        return false;
      }
      
      if (!keyUpdateResult || keyUpdateResult.length === 0) {
        console.error('❌ No result from use_beta_key function');
        return false;
      }
      
      const keyResult = keyUpdateResult[0];
      if (!keyResult.success) {
        console.error('❌ Beta key could not be marked as used');
        return false;
      }
      
      // Generate session ID
      const sessionId = crypto.randomUUID();
      console.log('🆔 Generated session ID:', sessionId);
      
      // Create the session
      const sessionData = {
        session_id: sessionId,
        beta_key_id: keyResult.key_id,
        created_at: new Date().toISOString()
      };
      
      console.log('📝 Inserting session data:', sessionData);
      
      const { data: userData, error: sessionError } = await supabase
        .from('beta_users')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        return false;
      }

      console.log('✅ Session created successfully:', userData);
      return userData;
    } catch (err) {
      console.error('🚨 Exception in createSession:', err);
      return false;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 Initializing auth...');
      
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
        const storedKey = localStorage.getItem(STORAGE_KEYS.BETA_KEY);
        
        console.log('💾 Stored user:', storedUser ? 'exists' : 'none');
        console.log('💾 Stored key:', storedKey ? 'exists' : 'none');

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data session ID:', userData.session_id);
          
          // Validate existing session
          const isValidSession = await validateSession(userData.session_id);
          
          if (isValidSession) {
            console.log('✅ Valid session found, logging in user');
            setUserSession(userData);
            setHasValidBetaKey(true);
            if (storedKey) {
              setStoredBetaKey(storedKey);
              setHasStoredBetaKey(true);
            }
          } else {
            console.log('❌ Invalid session, clearing user but keeping beta key');
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
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [validateSession]);

  // Login with beta key
  const loginWithBetaKey = useCallback(async (betaKey) => {
    console.log('🔐 Attempting login with beta key');
    
    try {
      const betaKeyData = await verifyBetaKey(betaKey);
      if (!betaKeyData) {
        console.log('❌ Beta key verification failed');
        return { success: false, error: 'Invalid, expired, or already used beta key' };
      }

      console.log('✅ Beta key verified, creating session...');
      const userData = await createSession(betaKey, betaKeyData.id);
      if (!userData) {
        console.log('❌ Session creation failed');
        return { success: false, error: 'Failed to create session' };
      }

      // Update state
      const sessionData = {
        id: userData.id,
        session_id: userData.session_id,
        beta_key_id: userData.beta_key_id
      };

      console.log('💾 Storing session data');

      setUserSession(sessionData);
      setHasValidBetaKey(true);
      setStoredBetaKey(betaKey);
      setHasStoredBetaKey(true);

      // Persist to storage
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));
      localStorage.setItem(STORAGE_KEYS.BETA_KEY, betaKey);

      console.log('🎉 Login successful!');
      return { success: true };
    } catch (error) {
      console.error('🚨 Login error:', error);
      return { success: false, error: error.message };
    }
  }, [verifyBetaKey, createSession]);

  // Quick login with stored beta key - fixed version
  const quickLogin = useCallback(async () => {
    console.log('⚡ Attempting quick login...');
    
    if (!storedBetaKey) {
      console.log('❌ No stored beta key');
      return { success: false, error: 'No stored beta key' };
    }

    try {
      // For quick login, we assume the beta key is already used
      // We just need to find the existing beta_key_id and create a new session
      const { data, error } = await supabase
        .rpc('verify_beta_key', { key_value: storedBetaKey });

      console.log('🔑 Beta key lookup result:', { data, error });

      if (error) {
        console.error('❌ Error looking up beta key:', error);
        localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
        setStoredBetaKey(null);
        setHasStoredBetaKey(false);
        return { success: false, error: 'Failed to verify stored beta key' };
      }

      if (!data || data.length === 0) {
        console.log('❌ Stored beta key no longer exists');
        localStorage.removeItem(STORAGE_KEYS.BETA_KEY);
        setStoredBetaKey(null);
        setHasStoredBetaKey(false);
        return { success: false, error: 'Beta key no longer exists' };
      }

      const keyId = data[0].key_id;
      if (!keyId) {
        console.log('❌ Invalid key data');
        return { success: false, error: 'Invalid key data' };
      }

      // Create new session (beta key should already be used for quick login)
      const sessionId = crypto.randomUUID();
      const sessionData = {
        session_id: sessionId,
        beta_key_id: keyId,
        created_at: new Date().toISOString()
      };

      console.log('📝 Creating quick login session:', sessionData);

      const { data: userData, error: sessionError } = await supabase
        .from('beta_users')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.log('❌ Quick login session creation failed:', sessionError);
        return { success: false, error: 'Failed to create session' };
      }

      // Update state
      const userSessionData = {
        id: userData.id,
        session_id: userData.session_id,
        beta_key_id: userData.beta_key_id
      };

      setUserSession(userSessionData);
      setHasValidBetaKey(true);

      // Update storage
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(userSessionData));

      console.log('🎉 Quick login successful!');
      return { success: true };
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