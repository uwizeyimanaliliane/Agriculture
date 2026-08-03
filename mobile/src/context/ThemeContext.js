import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);
const THEME_KEY = '@agrilink_theme';

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved !== null) setIsDarkMode(saved === 'dark');
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  const toggleTheme = async () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode
      ? {
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          textSecondary: '#94a3b8',
          border: '#334155',
          primary: '#22c55e',
          accent: '#f97316',
          card: '#1e293b',
          input: '#334155',
        }
      : {
          background: '#f8fafc',
          surface: '#ffffff',
          text: '#0f172a',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          primary: '#16a34a',
          accent: '#ea580c',
          card: '#ffffff',
          input: '#f1f5f9',
        },
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, themeLoaded: loaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
