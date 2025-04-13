import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setLocale } from '@/config/i18n';

type Language = 'en' | 'sv';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await SecureStore.getItemAsync('language');
        if (savedLanguage) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      await SecureStore.setItemAsync('language', lang);
      await setLocale(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
      throw error;
    }
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}; 