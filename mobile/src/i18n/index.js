import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import en from './en';
import rw from './rw';
import fr from './fr';

const translations = { en, rw, fr };
const LANG_KEY = '@agrilink_language';

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('en');
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved && translations[saved]) setLocale(saved);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (user?.preferredLanguage && translations[user.preferredLanguage]) {
      setLocale(user.preferredLanguage);
    }
  }, [user?.preferredLanguage]);

  const changeLanguage = useCallback(async (lang) => {
    if (!translations[lang]) return;
    setLocale(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch (_) {}
  }, []);

  const lookup = (lang, path) => {
    const keys = path.split('.');
    let result = translations[lang];
    for (const key of keys) {
      if (result && result[key] !== undefined) result = result[key];
      else return undefined;
    }
    return result;
  };

  const t = (path) => {
    const local = lookup(locale, path);
    if (typeof local === 'string') return local;
    const fallback = lookup('en', path);
    return typeof fallback === 'string' ? fallback : path;
  };

  return (
    <I18nContext.Provider value={{ t, locale, changeLanguage, loaded }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
