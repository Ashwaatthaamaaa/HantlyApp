import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { t, setLocale } from '@/config/i18n';

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
  onSelectLanguage: (language: 'en' | 'sv') => void;
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
}) => {
  const handleSelect = async (language: 'en' | 'sv') => {
    try {
      console.log(`Setting locale to: ${language}`);
      await setLocale(language);
      onSelectLanguage(language);
      onClose();
    } catch (error) {
      console.error("Failed to save locale:", error);
      Alert.alert(t('error'), t('couldnotsavelanguage'));
      onClose();
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
          <Text style={styles.title}>{t('language')}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('en')}
            >
              <Text style={styles.buttonText}>{t('english')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('sv')}
            >
              <Text style={styles.buttonText}>{t('swedish')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeAction}>
             <Text style={styles.closeText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// --- Styles ---
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
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
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
    marginTop: 15,
    padding: 10,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  }
});

export default LanguageSelectionModal;