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
    const { data } = await supabase
      .rpc('get_user_settings', { p_user_id: userSession.id });
    
    if (data?.success) {
      const newSettings = {
        timezone: data.timezone || settings.timezone,
        // Map other settings from DB response
      };
      
      setSettings(newSettings);
      sessionStorage.setItem('user_settings', JSON.stringify(newSettings));
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