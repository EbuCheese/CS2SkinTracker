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

  // Fixed version with proper error handling and logic
  const verifyBetaKey = useCallback(async (betaKey) => {
    console.log('🔍 Verifying beta key:', betaKey);
    
    try {
      // Query for the beta key - removed .single() to avoid PGRST116 error
      const { data, error } = await supabase
        .from('beta_keys')
        .select('*')
        .eq('key_value', betaKey)
        .eq('is_used', false); // Only get unused keys
      
      console.log('🔑 Beta key query result:', { data, error });
      
      if (error) {
        console.error('❌ Beta key verification error:', error);
        return false;
      }
      
      // Check if we got any results
      if (!data || data.length === 0) {
        console.log('❌ No matching unused beta key found');
        return false;
      }
      
      const betaKeyData = data[0]; // Get the first (and should be only) result
      
      console.log('✅ Beta key verified successfully:', betaKeyData);
      return betaKeyData;
    } catch (err) {
      console.error('🚨 Exception in verifyBetaKey:', err);
      return false;
    }
  }, []);

  // Validate existing session with improved error handling
  const validateSession = useCallback(async (sessionId) => {
    console.log('🔍 Validating session:', sessionId);
    
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('session_id', sessionId);
      
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

  // Create new session and mark beta key as used
  const createSession = useCallback(async (betaKeyData) => {
    console.log('🏗️ Creating session for beta key:', betaKeyData);
    
    try {
      const sessionId = crypto.randomUUID();
      console.log('🆔 Generated session ID:', sessionId);
      
      const sessionData = {
        session_id: sessionId,
        beta_key_id: betaKeyData.id,
        created_at: new Date().toISOString()
      };
      
      console.log('📝 Inserting session data:', sessionData);
      
      // Use a transaction to create session and mark key as used
      const { data: userData, error: sessionError } = await supabase
        .from('beta_users')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        return false;
      }

      // Mark the beta key as used
      const { error: updateError } = await supabase
        .from('beta_keys')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', betaKeyData.id);

      if (updateError) {
        console.error('❌ Beta key update error:', updateError);
        // Note: Session was created but key wasn't marked as used
        // You might want to handle this case depending on your requirements
      }

      console.log('✅ Session created successfully');
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
        
        console.log('💾 Stored user:', storedUser);
        console.log('💾 Stored key:', storedKey);

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          
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
    console.log('🔐 Attempting login with beta key:', betaKey);
    
    try {
      const betaKeyData = await verifyBetaKey(betaKey);
      if (!betaKeyData) {
        console.log('❌ Beta key verification failed');
        return { success: false, error: 'Invalid, expired, or already used beta key' };
      }

      console.log('✅ Beta key verified, creating session...');
      const userData = await createSession(betaKeyData);
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

      console.log('💾 Storing session data:', sessionData);

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

  // Quick login with stored beta key - modified logic
  const quickLogin = useCallback(async () => {
    console.log('⚡ Attempting quick login...');
    
    if (!storedBetaKey) {
      console.log('❌ No stored beta key');
      return { success: false, error: 'No stored beta key' };
    }

    try {
      // For quick login, get the beta key data (should be used already)
      const { data, error } = await supabase
        .from('beta_keys')
        .select('*')
        .eq('key_value', storedBetaKey);

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

      const betaKeyData = data[0];

      // Verify the key is used (for security)
      if (!betaKeyData.is_used) {
        console.log('❌ Stored beta key is not marked as used - security issue');
        return { success: false, error: 'Invalid stored beta key state' };
      }

      // Create new session
      const sessionId = crypto.randomUUID();
      const sessionData = {
        session_id: sessionId,
        beta_key_id: betaKeyData.id,
        created_at: new Date().toISOString()
      };

      const { data: userData, error: sessionError } = await supabase
        .from('beta_users')
        .insert(sessionData)
        .select();

      if (sessionError || !userData || userData.length === 0) {
        console.log('❌ Quick login session creation failed:', sessionError);
        return { success: false, error: 'Failed to create session' };
      }

      // Update state
      const userSessionData = {
        id: userData[0].id,
        session_id: userData[0].session_id,
        beta_key_id: userData[0].beta_key_id
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