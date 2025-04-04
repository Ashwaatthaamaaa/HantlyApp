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
  ActivityIndicator, // Added
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- Base URL ---
const BASE_URL = 'https://3.110.124.83';
// -----------------

// API Response Type (Generic Success/Error)
interface ApiResponse {
    statusCode: number;
    statusMessage: string;
}
// --------------------


// Approximate Colors - Replace with exact Figma values if different
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
  buttonDisabledBg: '#AAAAAA', // Added
  error: '#D9534F',
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
  const [otp, setOtp] = useState<string>(''); // OTP is the 'token' in ResetPasswordModel

  // *** State for API call loading status ***
  const [isLoading, setIsLoading] = useState<boolean>(false);


  // Reset state when modal is closed or opened
  useEffect(() => {
    if (visible) {
      setStep('enterEmail');
      // Reset fields when modal becomes visible
      // setEmail(''); // Keep email? Let's keep it for now if user re-opens quickly
      setIsPartner(false); // Default to user
      setNewPassword('');
      setOtp('');
      setIsLoading(false); // Reset loading state
    }
  }, [visible]);

  // --- Step 1 Logic: Send Reset Link/OTP ---
  const handleSendResetLink = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const endpoint = isPartner ? '/api/Company/ForgotPassword' : '/api/User/ForgotPassword';
    const url = `${BASE_URL}${endpoint}`;

    console.log(`--- Sending Forgot Password Request (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${url}`);
    // Spec indicates request body is just the email string, JSON encoded
    const requestBody = JSON.stringify(trimmedEmail);
    console.log(`Request Body: ${requestBody}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Accept': 'text/plain', // Optional: Server might respond non-JSON on success
        },
        body: requestBody,
      });

       console.log(`Response Status: ${response.status}`);
       const responseText = await response.text(); // Read response text
       console.log(`Raw Response Text: ${responseText}`);

      if (response.ok) { // Assume 2xx status means success as per spec
        Alert.alert(
            'Request Sent',
            'If an account exists for this email, password reset instructions (or OTP) have been sent.'
        );
        setStep('resetPassword'); // Move to next step
      } else {
        // Handle potential errors (e.g., 404 Not Found if email doesn't exist)
         let errorMessage = `Failed to send request (Status: ${response.status})`;
         // Try to parse response text for a more specific message if needed
         // e.g., if API returns specific error messages in plain text or simple JSON
         if (responseText) {
             errorMessage = responseText; // Use raw text if available
             try {
                 const errorJson = JSON.parse(responseText);
                 errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || responseText;
             } catch (e) {/* Ignore parsing error, stick with raw text */}
         }
         Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error("Error sending reset link:", error);
      Alert.alert('Error', `Could not send reset request. Please check your connection and try again. ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2 Logic: Reset Password ---
  const handleResetPassword = async () => {
    const trimmedEmail = email.trim(); // Need email again for reset API
    if (!trimmedEmail || !newPassword || !otp) {
        Alert.alert('Missing Information', 'Please enter the OTP and your new password.');
        return;
    }
     if (newPassword.length < 8) { // Add password length check if desired
         Alert.alert('Password Too Short', 'New password must be at least 8 characters.');
         return;
     }

    setIsLoading(true);
    const endpoint = isPartner ? '/api/Company/ResetPassword' : '/api/User/ResetPassword';
    const url = `${BASE_URL}${endpoint}`;

    // Request body based on ResetPasswordModel
    const requestBody = {
      emailId: trimmedEmail,
      token: otp, // The OTP entered by the user acts as the token
      newPassword: newPassword,
    };

    console.log(`--- Attempting Password Reset (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${url}`);
    console.log(`Request Body: ${JSON.stringify(requestBody)}`);

     try {
        const response = await fetch(url, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(requestBody),
        });

         console.log(`Response Status: ${response.status}`);
         const responseText = await response.text(); // Read response text
         console.log(`Raw Response Text: ${responseText}`);

        if (response.ok) { // Assume 2xx status means success
            Alert.alert(
                'Success',
                'Your password has been reset successfully.',
                [{ text: 'OK', onPress: onClose }] // Close modal on success
            );
        } else {
             // Handle errors (e.g., invalid OTP/token, password policy violation)
              let errorMessage = `Password reset failed (Status: ${response.status})`;
             if (responseText) {
                 errorMessage = responseText; // Use raw text if available
                 try {
                     const errorJson = JSON.parse(responseText);
                     errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || responseText;
                 } catch (e) {/* Ignore parsing error, stick with raw text */}
             }
            Alert.alert('Error', errorMessage);
        }
     } catch (error: any) {
         console.error("Error resetting password:", error);
         Alert.alert('Error', `Could not reset password. Please try again. ${error.message}`);
     } finally {
        setIsLoading(false);
     }
  };

  // --- Render Content based on Step ---
  const renderStepContent = () => {
    if (step === 'enterEmail') {
      return (
        <>
          <Text style={styles.subtitle}>Enter your email address</Text>
          <View style={styles.inputContainer}>
            <TextInput
               style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.placeholder}
              editable={!isLoading} // Disable when loading
            />
          </View>
          <TouchableOpacity
             style={styles.checkboxContainer}
             onPress={() => !isLoading && setIsPartner(!isPartner)} // Disable when loading
             disabled={isLoading}
          >
            <MaterialCommunityIcons
              name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={isLoading ? COLORS.textSecondary : (isPartner ? COLORS.buttonBg : COLORS.textSecondary)}
            />
            <Text style={[styles.checkboxLabel, isLoading && styles.disabledText]}>Partner account</Text>
          </TouchableOpacity>
          <Text style={styles.infoText}>
            Password reset instructions will be sent to your email address.
          </Text>
          <TouchableOpacity
             style={[styles.actionButton, isLoading && styles.buttonDisabled]}
             onPress={handleSendResetLink}
             disabled={isLoading}
           >
             {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
             ) : (
                <Text style={styles.actionButtonText}>Ok</Text>
             )}
          </TouchableOpacity>
        </>
      );
    }

    if (step === 'resetPassword') {
      return (
        <>
         {/* Display Email (non-editable) */}
         <View style={[styles.inputContainer, styles.disabledInputContainer]}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email} // Show the email used in step 1
              editable={false}
              placeholderTextColor={COLORS.placeholder}
            />
             {/* Optional: Button to go back? Or rely on modal close */}
             {/* <TouchableOpacity onPress={() => setStep('enterEmail')} disabled={isLoading}>
                 <Ionicons name="arrow-back-circle-outline" size={24} color={COLORS.textSecondary} style={styles.clearIcon} />
             </TouchableOpacity> */}
          </View>
           {/* Display Partner Status (non-editable) */}
           <TouchableOpacity style={styles.checkboxContainer} disabled={true}>
             <MaterialCommunityIcons
               name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'}
               size={24}
               color={COLORS.placeholder}
             />
             <Text style={[styles.checkboxLabel, styles.disabledText]}>Partner account</Text>
           </TouchableOpacity>

          {/* Enter OTP */}
           <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Otp"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholderTextColor={COLORS.placeholder}
              editable={!isLoading}
            />
          </View>

          {/* New Password */}
           <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={true}
              placeholderTextColor={COLORS.placeholder}
               editable={!isLoading}
            />
          </View>

          <Text style={styles.infoText}>
            Enter the OTP sent to your email and set a new password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
             {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
             ) : (
                <Text style={styles.actionButtonText}>Reset Password</Text>
             )}
          </TouchableOpacity>
        </>
      );
    }
    return null;
  };

  // --- Modal JSX ---
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={styles.modalBackdrop}
      >
         {/* Ensure status bar content is visible */}
         <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isLoading}>
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
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: 'hidden', // Keep content within rounded borders
    paddingBottom: 20, // Padding at the bottom of modal content area
    elevation: 5, // Android shadow
     shadowColor: '#000', // iOS shadow
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    position: 'relative',
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
    top: 10, // Adjust positioning as needed
  },
  contentArea: {
     paddingHorizontal: 20,
      paddingTop: 20, // Space below header
  },
  subtitle: {
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
      opacity: 0.7,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  disabledInput: {
      color: COLORS.textSecondary,
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
      opacity: 0.7,
  },
  infoText: {
      fontSize: 12,
      color: COLORS.accent,
      textAlign: 'center',
      marginVertical: 10,
      paddingHorizontal: 10,
      lineHeight: 16, // Improve readability
  },
  actionButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    minHeight: 50, // Ensure space for indicator
    justifyContent: 'center',
  },
  buttonDisabled: {
      backgroundColor: COLORS.buttonDisabledBg,
  },
  actionButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});