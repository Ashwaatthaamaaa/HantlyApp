import { I18n } from 'i18n-js';
// Adjust paths based on your actual structure
import { en } from '@/constants/translations/en';
import { sv } from '@/constants/translations/sv';

// Initialize i18n
const i18n = new I18n({
  en, // English translations (with lowercase keys)
  sv, // Swedish translations (with lowercase keys)
});

// Set the initial locale. This should ideally be loaded from storage on app start.
i18n.locale = 'en';

// Enable fallback mechanism
i18n.enableFallback = true;
// If 'sv' is selected and a key is missing, it will fallback to 'en'

// Define the case-insensitive translation function
export const t = (key: string, config?: object) => {
  const lowerCaseKey = key.toLowerCase();
  // Provide the original key as defaultValue for fallback
  return i18n.t(lowerCaseKey, { ...config, defaultValue: key });
};

// Export the i18n instance for changing the locale
export default i18n;