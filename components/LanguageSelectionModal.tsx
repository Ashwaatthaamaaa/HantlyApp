import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert, // Import Alert for error handling
} from 'react-native';
import { t } from '@/config/i18n';
import i18n from '@/config/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

// --- Define storage key ---
const LOCALE_STORAGE_KEY = 'user-app-locale';

// --- Colors (Consistent with theme) ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)',
  buttonBg: '#696969',
  buttonText: '#FFFFFF',
};

// --- Props definition ---
interface LanguageSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (language: 'en' | 'sv') => void; // Can keep this if parent needs notification
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
}) => {

  const handleSelect = async (language: 'en' | 'sv') => {
    try {
      console.log(`Setting locale to: ${language}`);
      // 1. Update the i18n instance locale
      i18n.locale = language;

      // 2. Save the selected language to AsyncStorage
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, language);
      console.log(`Locale '${language}' saved to AsyncStorage.`);

      // 3. Close the modal and notify parent (if needed)
      onSelectLanguage(language);
      onClose();

      // --- Important Note on UI Updates ---
      // Changing i18n.locale might not automatically re-render all components
      // that use the t() function in your app. If the UI doesn't update immediately,
      // you might need to:
      // a) Trigger a re-render of your root component.
      // b) Manage the locale in a React Context and have components subscribe to it.
      // c) Use a state management library that handles locale changes.
      // For now, we've set the locale; further steps depend on observed behavior.

    } catch (error) {
      console.error("Failed to save locale:", error);
      Alert.alert("Error", "Could not save language preference.");
      // Optionally, you might want to revert i18n.locale or handle the error differently
      onClose(); // Close modal even if saving fails
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{t('Language')}</Text> {/* Use t() for title */}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('en')}
            >
              {/* Text inside button should ideally also be translated if needed */}
              {/* For now, keeping as is */}
              <Text style={styles.buttonText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('sv')}
            >
              <Text style={styles.buttonText}>Swedish</Text>
            </TouchableOpacity>
          </View>
          {/* Add a dedicated close/cancel button */}
          <TouchableOpacity onPress={onClose} style={styles.closeAction}>
             <Text style={styles.closeText}>{t('Close')}</Text> {/* Use t() */}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// --- Styles --- (Added styles for closeAction/closeText)
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 25,
    paddingTop: 30,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 25, // Increased space after title
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25, // Space before close action
  },
  button: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    minWidth: 90,
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeAction: {
    marginTop: 15, // Add margin if using this button
    padding: 10,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  }
});

export default LanguageSelectionModal;