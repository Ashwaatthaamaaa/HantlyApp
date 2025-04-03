import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Approximate Colors - Replace with exact Figma values
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  placeholder: '#AAAAAA',
  accent: '#D4AF37', // Gold/Yellow from login screen for links/hints
  modalBackdrop: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#E0E0E0',
  buttonBg: '#696969', // Dark grey/brown button approximation
  buttonText: '#FFFFFF',
};

// Define the props for the component
interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalStep = 'enterEmail' | 'resetPassword';

export default function ForgotPasswordModal({
  visible,
  onClose,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<ModalStep>('enterEmail');
  const [email, setEmail] = useState<string>('');
  const [isPartner, setIsPartner] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');

  // Reset state when modal is closed or opened
  useEffect(() => {
    if (visible) {
      setStep('enterEmail');
      // Keep email? Or clear? Let's clear for now.
      // setEmail('');
      setIsPartner(false);
      setNewPassword('');
      setOtp('');
    }
  }, [visible]);

  // --- Step 1 Logic ---
  const handleSendResetLink = async () => {
    console.log('Sending reset link/OTP for:', { email, isPartner });
    // --- Placeholder for API call to request password reset ---
    try {
      // await api.sendResetRequest(email, isPartner); // Example API call
      Alert.alert('Request Sent', 'Password reset instructions/OTP sent to your email.');
      setStep('resetPassword'); // Move to next step on success
    } catch (error) {
      console.error("Error sending reset link:", error);
      Alert.alert('Error', 'Could not send reset request. Please try again.');
    }
  };

  // --- Step 2 Logic ---
  const handleResetPassword = async () => {
    console.log('Resetting password with:', { email, isPartner, newPassword, otp });
     // --- Placeholder for API call to reset password ---
     try {
        // await api.resetPasswordWithOtp(email, isPartner, otp, newPassword); // Example API call
        Alert.alert('Success', 'Your password has been reset successfully.');
        onClose(); // Close modal on success
     } catch (error) {
         console.error("Error resetting password:", error);
         Alert.alert('Error', 'Could not reset password. Please check OTP or try again.');
     }
  };

  // --- Render Content based on Step ---
  const renderStepContent = () => {
    if (step === 'enterEmail') {
      return (
        <>
          <Text style={styles.subtitle}>Enter your email address</Text>
          <View style={styles.inputContainer}>
            {/* Email input doesn't seem to have icon in this modal */}
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.placeholder}
            />
             {/* Optional clear button shown in step 2 - add here too? */}
          </View>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsPartner(!isPartner)}>
            <MaterialCommunityIcons
              name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={isPartner ? COLORS.buttonBg : COLORS.textSecondary} // Use button color when checked?
            />
            <Text style={styles.checkboxLabel}>Partner</Text>
          </TouchableOpacity>
          <Text style={styles.infoText}>
            Password reset link will be sent to your above email address
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleSendResetLink}>
            <Text style={styles.actionButtonText}>Ok</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (step === 'resetPassword') {
      return (
        <>
         {/* Email Display (non-editable?) */}
         <View style={[styles.inputContainer, styles.disabledInputContainer]}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false} // Make email non-editable in step 2
              placeholderTextColor={COLORS.placeholder}
            />
             {/* Clear button shown - maybe allows changing email? Let's make it non-functional */}
             <TouchableOpacity onPress={() => Alert.alert('Info', 'Email cannot be changed at this step.')}>
                <Ionicons name="close-circle" size={20} color={COLORS.placeholder} style={styles.clearIcon}/>
             </TouchableOpacity>
          </View>
           <TouchableOpacity style={styles.checkboxContainer} onPress={() => Alert.alert('Info', 'Account type cannot be changed now.')}>
             <MaterialCommunityIcons
               name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'}
               size={24}
               color={COLORS.placeholder} // Grey out checkbox
             />
             <Text style={[styles.checkboxLabel, styles.disabledText]}>Partner</Text>
           </TouchableOpacity>

          {/* New Password */}
           <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={true} // Assuming password should be hidden
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* Enter OTP */}
           <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Otp"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad" // Suggest numeric keyboard
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <Text style={styles.infoText}>
            Password reset link sent to email.
            {/* Maybe change text to "Enter OTP sent to email." */}
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleResetPassword}>
            <Text style={styles.actionButtonText}>Reset Password</Text>
          </TouchableOpacity>
        </>
      );
    }
    return null; // Should not happen
  };


  return (
    <Modal
      animationType="fade" // Fade looks better for modals usually
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={styles.modalBackdrop}
      >
         <StatusBar barStyle="dark-content" />
        {/* Use SafeAreaView potentially if content might go under status bar */}
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
             {renderStepContent()}
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%', // Modal width
    maxWidth: 400,
    maxHeight: '80%', // Avoid overly tall modals
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: 'hidden',
    paddingBottom: 20, // Padding at the bottom of modal content
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // Center title
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    position: 'relative', // For absolute positioning of close button
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  contentArea: {
      paddingHorizontal: 20,
      paddingTop: 20,
  },
  subtitle: {
      // Style for "Enter your email address" if needed
      fontSize: 16,
      color: COLORS.textPrimary,
      marginBottom: 15,
      textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    height: 50,
  },
  disabledInputContainer: { // Style to visually disable
      backgroundColor: '#F8F8F8',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  disabledInput: {
      color: COLORS.textSecondary, // Grey out text
  },
   clearIcon: {
     paddingLeft: 10,
   },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'flex-start', // Align checkbox to left
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  disabledText: {
      color: COLORS.textSecondary,
  },
  infoText: {
      fontSize: 12,
      color: COLORS.accent, // Use accent color for info text
      textAlign: 'center',
      marginVertical: 10,
      paddingHorizontal: 10,
  },
  actionButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15, // Space above button
  },
  actionButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});