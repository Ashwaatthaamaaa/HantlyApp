import { I18n } from 'i18n-js';
// Adjust paths based on your actual structure
import { en } from '@/constants/translations/en';
import { sv } from '@/constants/translations/sv';
import * as SecureStore from 'expo-secure-store';
import { EventEmitter } from 'events';

// Create event emitter for language change notifications
export const langEventEmitter = new EventEmitter();
export const LANGUAGE_CHANGE_EVENT = 'languageChanged';

// Initialize i18n
const i18n = new I18n({
  en, // English translations (with lowercase keys)
  sv, // Swedish translations (with lowercase keys)
});

// Set the initial locale
i18n.locale = 'en';

// Enable fallback mechanism
i18n.enableFallback = true;
// If 'sv' is selected and a key is missing, it will fallback to 'en'

// Load saved locale from storage
const loadSavedLocale = async () => {
  try {
    const savedLocale = await SecureStore.getItemAsync('language');
    if (savedLocale) {
      i18n.locale = savedLocale;
      // Emit event for initial load
      langEventEmitter.emit(LANGUAGE_CHANGE_EVENT, savedLocale);
    }
  } catch (error) {
    console.error('Error loading saved locale:', error);
  }
};

// Load saved locale on initialization
loadSavedLocale();

// Define the case-insensitive translation function
export const t = (key: string, config?: object) => {
  const lowerCaseKey = key.toLowerCase();
  // Ensure defaultValue is separate from the spread config
  return i18n.t(lowerCaseKey, {
    defaultValue: key, // Provide the original key as defaultValue
    ...config, // Spread the rest of the config (like { count: ... })
  });
};

// Function to change locale and save to storage
export const setLocale = async (locale: string) => {
  try {
    await SecureStore.setItemAsync('language', locale);
    i18n.locale = locale;
    // Emit event for language change
    langEventEmitter.emit(LANGUAGE_CHANGE_EVENT, locale);
  } catch (error) {
    console.error('Error saving locale:', error);
    throw error;
  }
};

// Export the i18n instance for changing the locale
export default i18n;