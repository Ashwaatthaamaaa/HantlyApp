// File: components/ForgotPasswordModal.tsx
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from '@/constants/Api';

// --- Base URL ---
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
  buttonDisabledBg: '#AAAAAA',
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
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset state when modal is closed or opened
  useEffect(() => {
    if (visible) {
      setStep('enterEmail');
      // Keep email populated if user re-opens quickly after error
      // setEmail('');
      setIsPartner(false); // Default to user
      setNewPassword('');
      setOtp('');
      setIsLoading(false); // Reset loading state
    }
  }, [visible]);

  // --- Step 1 Logic: Check Existence then Send Reset Link/OTP ---
  const handleSendResetLink = async () => {
    const trimmedEmail = email.trim();

    // 1. Client-side email format validation
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
        Alert.alert('Invalid Email Format', 'Please enter a valid email address.');
        setEmail(''); // Clear field on format error
        return;
    }
    // ** END VALIDATION **

    setIsLoading(true);
    const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
    const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`;
    console.log(`--- Checking Existence (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${detailUrl}`);

    try {
        // 2. Check if user/company exists
        const detailResponse = await fetch(detailUrl);
        const detailResponseText = await detailResponse.text(); // Get text for logging/errors
        console.log(`Existence Check Response Status: ${detailResponse.status}`);
        console.log(`Existence Check Raw Response Text: ${detailResponseText}`);

        let userExists = false;
        if (detailResponse.ok) { // Check if response status is 2xx
            try {
                const detailData = JSON.parse(detailResponseText);
                // Check for indicators of a valid user/company
                // Assuming API returns user/company details on success
                // and specific structure (like userId:0, emailId:null) or non-200 status for non-existent
                if (isPartner) {
                     // Check if pCompId exists and email matches
                     userExists = !!detailData && typeof detailData.pCompId === 'number' && detailData.pCompId !== 0 && detailData.emailId === trimmedEmail;
                } else {
                    // Check if userId exists and email matches (based on user provided example for non-existent)
                    userExists = !!detailData && typeof detailData.userId === 'number' && detailData.userId !== 0 && detailData.emailId === trimmedEmail;
                }
            } catch (parseError) {
                console.error("Error parsing detail response JSON:", parseError);
                // Treat as user not found if JSON parsing fails on a successful HTTP response
                userExists = false;
            }
        } // If status is not OK (e.g., 404), userExists will remain false

        if (!userExists) {
            Alert.alert('Error', "No account found for this email address.");
            setEmail(''); // Clear email field
            setIsLoading(false);
            return; // Stop processing
        }

        // 3. If user exists, proceed with Forgot Password API call
        console.log(`Account exists. Proceeding with Forgot Password for ${trimmedEmail}`);
        const forgotEndpoint = isPartner ? '/api/Company/ForgotPassword' : '/api/User/ForgotPassword';
        const forgotUrl = `${BASE_URL}${forgotEndpoint}`;
        const forgotRequestBody = JSON.stringify(trimmedEmail);

        const forgotResponse = await fetch(forgotUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: forgotRequestBody,
        });
        const forgotResponseText = await forgotResponse.text(); // Get text for logging/errors
        console.log(`Forgot Password Response Status: ${forgotResponse.status}`);
        console.log(`Forgot Password Raw Response Text: ${forgotResponseText}`);

        if (forgotResponse.ok) {
            Alert.alert(
                'Request Sent',
                'If an account exists for this email, password reset instructions (or OTP) have been sent.'
            );
            setStep('resetPassword'); // Move to next step
        } else {
            // Handle potential errors during the actual forgot password call
            let errorMessage = `Failed to send password reset request (Status: ${forgotResponse.status})`;
             try {
                 const errorJson = JSON.parse(forgotResponseText);
                 errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || forgotResponseText || errorMessage;
             } catch (e) { errorMessage = forgotResponseText || errorMessage } // Use raw text if not JSON
            Alert.alert('Error', errorMessage);
            setEmail(''); // Clear field on the second API call error as well
        }

    } catch (error: any) {
        // Catch errors from either fetch call (existence check or forgot password)
        console.error("Error during forgot password process:", error);
        Alert.alert('Error', `An error occurred. Please check your connection and try again.`);
        setEmail(''); // Clear field on any fetch/network error
    } finally {
        setIsLoading(false);
    }
  };

  // --- Step 2 Logic: Reset Password (remains the same) ---
  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !newPassword || !otp) {
        Alert.alert('Missing Information', 'Please enter the OTP and your new password.');
        return;
    }
     if (newPassword.length < 8) {
         Alert.alert('Password Too Short', 'New password must be at least 8 characters.');
         return;
     }

    setIsLoading(true);
    const endpoint = isPartner ? '/api/Company/ResetPassword' : '/api/User/ResetPassword';
    const url = `${BASE_URL}${endpoint}`;
    const requestBody = { emailId: trimmedEmail, token: otp, newPassword: newPassword };
    console.log(`--- Attempting Password Reset (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${url}`);
    console.log(`Request Body: ${JSON.stringify(requestBody)}`);

    try {
        const response = await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', },
             body: JSON.stringify(requestBody),
        });
        const responseText = await response.text();
        console.log(`Reset Password Response Status: ${response.status}`);
        console.log(`Reset Password Raw Response Text: ${responseText}`);

        if (response.ok) {
            Alert.alert('Success', 'Your password has been reset successfully.', [{ text: 'OK', onPress: onClose }]);
        } else {
              let errorMessage = `Password reset failed (Status: ${response.status})`;
              if (responseText) {
                 try {
                     const errorJson = JSON.parse(responseText);
                     errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || responseText;
                 } catch (e) { errorMessage = responseText || errorMessage }
             }
            Alert.alert('Error', errorMessage);
             // setOtp(''); // Optionally clear fields on reset error too
             // setNewPassword('');
        }
     } catch (error: any) {
         console.error("Error resetting password:", error);
         Alert.alert('Error', `Could not reset password. Please try again. ${error.message}`);
     } finally {
        setIsLoading(false);
     }
  };

  // --- Render Content based on Step (remains the same) ---
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
              editable={!isLoading}
             />
          </View>
          <TouchableOpacity
             style={styles.checkboxContainer}
             onPress={() => !isLoading && setIsPartner(!isPartner)}
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
            Password reset instructions will be sent to your email address if the account exists.
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
         <View style={[styles.inputContainer, styles.disabledInputContainer]}>
            <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
          </View>
           <TouchableOpacity style={styles.checkboxContainer} disabled={true}>
             <MaterialCommunityIcons name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={COLORS.placeholder}/>
             <Text style={[styles.checkboxLabel, styles.disabledText]}>Partner account</Text>
           </TouchableOpacity>
           <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Enter Otp" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholderTextColor={COLORS.placeholder} editable={!isLoading}/>
          </View>
           <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="New Password (min 8 chars)" value={newPassword} onChangeText={setNewPassword} secureTextEntry={true} placeholderTextColor={COLORS.placeholder} editable={!isLoading}/>
          </View>
          <Text style={styles.infoText}>
            Enter the OTP sent to your email and set a new password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
             {isLoading ? ( <ActivityIndicator size="small" color={COLORS.buttonText} /> ) : ( <Text style={styles.actionButtonText}>Reset Password</Text> )}
          </TouchableOpacity>
        </>
      );
    }
    return null;
  };

  // --- Modal JSX (remains the same) ---
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
         <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isLoading}>
              <Ionicons name="close" size={28} color={COLORS.textSecondary} />
             </TouchableOpacity>
          </View>
          <View style={styles.contentArea}>
             {renderStepContent()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- Styles (remain the same) ---
const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', alignItems: 'center', },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, overflow: 'hidden', paddingBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, position: 'relative', },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', },
  closeButton: { padding: 5, position: 'absolute', right: 10, top: 10, },
  contentArea: { paddingHorizontal: 20, paddingTop: 20, },
  subtitle: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 15, textAlign: 'center', },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10, height: 50, },
  disabledInputContainer: { backgroundColor: '#F8F8F8', opacity: 0.7, },
  input: { flex: 1, height: '100%', fontSize: 16, color: COLORS.textPrimary, },
  disabledInput: { color: COLORS.textSecondary, },
  clearIcon: { paddingLeft: 10, },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, alignSelf: 'flex-start', },
  checkboxLabel: { marginLeft: 8, fontSize: 14, color: COLORS.textPrimary, },
  disabledText: { color: COLORS.textSecondary, opacity: 0.7, },
  infoText: { fontSize: 12, color: COLORS.accent, textAlign: 'center', marginVertical: 10, paddingHorizontal: 10, lineHeight: 16, },
  actionButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 15, minHeight: 50, justifyContent: 'center', },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, },
  actionButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
});