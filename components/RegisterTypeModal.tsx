import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView, // Use SafeAreaView for better handling on different devices
} from 'react-native';
import { t } from '@/config/i18n'; // Ensure this line is present
// import { Ionicons } from '@expo/vector-icons'; // Optional: for a close icon if needed
// import { t } from '@/config/i18n'; // Assuming you have this setup

// Mock t function for example purposes if not available in this environment



// Approximate Colors - Adjust based on your theme/design system
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#555555',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)', // Darker backdrop
  borderColor: '#E0E0E0',
  buttonPartnerBg: '#6C757D', // Example: Greyish for Partner
  buttonUserBg: '#007BFF',    // Example: Blue for User
  buttonText: '#FFFFFF',
  closeButton: '#AAAAAA',
};

// Props definition for the modal
interface RegisterTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPartner: () => void;
  onSelectUser: () => void;
}

const RegisterTypeModal: React.FC<RegisterTypeModalProps> = ({
  visible,
  onClose,
  onSelectPartner,
  onSelectUser,
}) => {
  return (
    <Modal
      animationType="fade" // Or "slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // Allows closing with back button on Android
    >
      <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Optional Close Button */}
          {/* <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={28} color={COLORS.closeButton} />
          </TouchableOpacity> */}

          <Text style={styles.title}>{t('rtm_title')}</Text>
          <Text style={styles.subtitle}>{t('rtm_subtitle')}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.buttonPartnerBg }]} // Example color
              onPress={onSelectPartner}
            >
              <Text style={styles.buttonText}>{t('rtm_partner_button')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.buttonUserBg }]} // Example color
              onPress={onSelectUser}
            >
              <Text style={styles.buttonText}>{t('rtm_user_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 25, // Generous padding
    paddingTop: 30,
    width: '85%', // Adjust width as needed
    maxWidth: 350, // Maximum width for the modal
    alignItems: 'center', // Center items inside modal
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative', // For absolute positioning of close button if added
  },
  // Style for optional close button
  // closeButton: {
  //   position: 'absolute',
  //   top: 10,
  //   right: 10,
  // },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center', // Ensure title is centered
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 30, // Space before buttons
    textAlign: 'center', // Ensure subtitle is centered
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distributes space around buttons
    width: '100%', // Make container take full width of modalContent
  },
  button: {
    paddingVertical: 12,
    // MODIFICATION: Reduced horizontal padding to prevent overflow
    paddingHorizontal: 15, // Was 25
    borderRadius: 6,
    // MODIFICATION: Reduced horizontal margin
    marginHorizontal: 8, // Was 10. This is the margin on each side of a button.
                         // So, space between buttons will be 2 * 8 = 16px if justifyContent was 'center'.
                         // With 'space-around', this margin contributes to the button's footprint.
    alignItems: 'center',
    elevation: 2, // Subtle shadow for buttons
    // Potentially add flexShrink if text can be very long, or consider flex: 1 for equal width
    // flexShrink: 1,
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center', // Ensure button text is centered
  },
});

export default RegisterTypeModal;
