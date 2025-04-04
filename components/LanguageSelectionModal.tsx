// File: components/LanguageSelectionModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

// --- Colors (Consistent with theme) ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)',
  buttonBg: '#696969', // Match other buttons
  buttonText: '#FFFFFF',
};

interface LanguageSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (language: 'en' | 'sv') => void; // 'en' for English, 'sv' for Swedish
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
}) => {

  const handleSelect = (language: 'en' | 'sv') => {
    console.log(`Language selected: ${language}`); // Placeholder action
    onSelectLanguage(language);
    onClose(); // Close after selection
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
          <Text style={styles.title}>App Language</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('en')}
            >
              <Text style={styles.buttonText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect('sv')}
            >
              <Text style={styles.buttonText}>Swedish</Text>
            </TouchableOpacity>
          </View>
          {/* Optional: Add a close button if needed, or rely on backdrop press/onRequestClose */}
          {/* <TouchableOpacity onPress={onClose} style={styles.closeAction}>
             <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity> */}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    marginBottom: 10, // Space before optional close action
  },
  button: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    minWidth: 90, // Ensure buttons have some minimum width
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Optional close styles
  // closeAction: {
  //   marginTop: 15,
  // },
  // closeText: {
  //   fontSize: 16,
  //   color: COLORS.textPrimary,
  // }
});

export default LanguageSelectionModal;