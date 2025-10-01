// contexts/UserSettingsContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';

const UserSettingsContext = createContext();

export const UserSettingsProvider = ({ children, userSession }) => {
  const [settings, setSettings] = useState(() => {
    // Try sessionStorage first, fallback to defaults
    const stored = sessionStorage.getItem('user_settings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    }
    
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Future settings 
      // theme: 'light',
      // currency: 'USD',
      // etc.
    };
  });

  useEffect(() => {
    if (userSession?.id) {
      loadSettings();
    }
  }, [userSession?.id]);

  const loadSettings = async () => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_settings', { p_user_id: userSession.id });
    
    console.log('Raw settings response:', { data, error });
    
    if (error) {
      console.error('Error loading settings:', error);
      return;
    }
    
    // data IS the JSON object from your RPC function
    if (data?.success) {
      const preferred = data.preferred_marketplace || 'csfloat';
      const fallbacks = data.fallback_marketplaces || ['steam', 'buff163', 'skinport'];
      
      const newSettings = {
        timezone: data.timezone || settings.timezone,
        marketplacePriority: [preferred, ...fallbacks]
      };
      
      console.log('Loaded settings:', newSettings);
      
      setSettings(newSettings);
      sessionStorage.setItem('user_settings', JSON.stringify(newSettings));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      sessionStorage.setItem('user_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateSettings = (updates) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      sessionStorage.setItem('user_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <UserSettingsContext.Provider value={{ 
      settings, 
      updateSetting, 
      updateSettings,
      // Convenience getters for common settings
      timezone: settings.timezone 
    }}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => useContext(UserSettingsContext);