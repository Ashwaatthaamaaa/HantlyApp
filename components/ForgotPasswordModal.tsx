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
// const BASE_URL = '...'; // Already imported from constants
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
    const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail'; // [cite: 933]
    const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`; // [cite: 933]
    console.log(`--- Checking Existence (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${detailUrl}`);
    try {
        // 2. Check if user/company exists
        const detailResponse = await fetch(detailUrl); // [cite: 935]
        const detailResponseText = await detailResponse.text(); // [cite: 935]
        console.log(`Existence Check Response Status: ${detailResponse.status}`); // [cite: 935]
        console.log(`Existence Check Raw Response Text: ${detailResponseText}`); // [cite: 936]

        let userExists = false;
        if (detailResponse.ok) { // [cite: 937]
            try {
                const detailData = JSON.parse(detailResponseText); // [cite: 937]
                if (isPartner) {
                     userExists = !!detailData && typeof detailData.pCompId === 'number' && detailData.pCompId !== 0 && detailData.emailId === trimmedEmail; // [cite: 939]
                } else {
                    userExists = !!detailData && typeof detailData.userId === 'number' && detailData.userId !== 0 && detailData.emailId === trimmedEmail; // [cite: 940]
                }
            } catch (parseError) {
                console.error("Error parsing detail response JSON:", parseError); // [cite: 942]
                userExists = false; // [cite: 942]
            }
        }

        if (!userExists) {
            Alert.alert('Error', "No account found for this email address."); // [cite: 943]
            setEmail(''); // [cite: 944]
            setIsLoading(false);
            return; // [cite: 945]
        }

        // 3. If user exists, proceed with Forgot Password API call
        console.log(`Account exists. Proceeding with Forgot Password for ${trimmedEmail}`); // [cite: 945]
        const forgotEndpoint = isPartner ? '/api/Company/ForgotPassword' : '/api/User/ForgotPassword'; // [cite: 946]
        const forgotUrl = `${BASE_URL}${forgotEndpoint}`; // [cite: 947]
        const forgotRequestBody = JSON.stringify(trimmedEmail); // [cite: 947]
        const forgotResponse = await fetch(forgotUrl, { // [cite: 947]
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: forgotRequestBody,
        });
        const forgotResponseText = await forgotResponse.text(); // [cite: 948]
        console.log(`Forgot Password Response Status: ${forgotResponse.status}`); // [cite: 948]
        console.log(`Forgot Password Raw Response Text: ${forgotResponseText}`); // [cite: 949]

        // ###################################
        // ## CODE CHANGE AS PER REQUEST ##
        // ###################################
        if (forgotResponse.ok) {
            // --- MODIFIED ALERT ---
            Alert.alert(
                'Success', // Changed title
                'OTP successfully sent to the registered email.' // Changed message
            );
            // --- END MODIFICATION ---
            setStep('resetPassword'); // Move to next step [cite: 950]
        } else {
            // Handle potential errors during the actual forgot password call
            let errorMessage = `Failed to send password reset request (Status: ${forgotResponse.status})`; // [cite: 951]
            try {
                 const errorJson = JSON.parse(forgotResponseText); // [cite: 952]
                 errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || forgotResponseText || errorMessage; // [cite: 952]
             } catch (e) { errorMessage = forgotResponseText || errorMessage } // [cite: 953]
            Alert.alert('Error', errorMessage); // [cite: 954]
            setEmail(''); // Clear field on the second API call error as well [cite: 954]
        }
        // ###################################
        // ## END OF CODE CHANGE          ##
        // ###################################

    } catch (error: any) {
        // Catch errors from either fetch call (existence check or forgot password)
        console.error("Error during forgot password process:", error); // [cite: 955]
        Alert.alert('Error', `An error occurred. Please check your connection and try again.`); // [cite: 955]
        setEmail(''); // [cite: 956]
    } finally {
        setIsLoading(false); // [cite: 957]
    }
  };

  // --- Step 2 Logic: Reset Password ---
  const handleResetPassword = async () => { // [cite: 957]
    const trimmedEmail = email.trim(); // [cite: 957]
    if (!trimmedEmail || !newPassword || !otp) { // [cite: 958]
        Alert.alert('Missing Information', 'Please enter the OTP and your new password.'); // [cite: 958]
        return; // [cite: 959]
    }
     if (newPassword.length < 8) { // [cite: 959]
         Alert.alert('Password Too Short', 'New password must be at least 8 characters.'); // [cite: 959]
         return; // [cite: 960]
     }

    setIsLoading(true);
    const endpoint = isPartner ? '/api/Company/ResetPassword' : '/api/User/ResetPassword'; // [cite: 960]
    const url = `${BASE_URL}${endpoint}`; // [cite: 960]
    const requestBody = { emailId: trimmedEmail, token: otp, newPassword: newPassword }; // [cite: 961]
    console.log(`--- Attempting Password Reset (${isPartner ? 'Partner' : 'User'}) ---`); // [cite: 962]
    console.log(`URL: ${url}`); // [cite: 962]
    console.log(`Request Body: ${JSON.stringify(requestBody)}`); // [cite: 962]
    try {
        const response = await fetch(url, { // [cite: 963]
             method: 'POST',
             headers: { 'Content-Type': 'application/json', },
             body: JSON.stringify(requestBody),
        });
        const responseText = await response.text(); // [cite: 964]
        console.log(`Reset Password Response Status: ${response.status}`); // [cite: 964]
        console.log(`Reset Password Raw Response Text: ${responseText}`); // [cite: 965]
        if (response.ok) { // [cite: 965]
            Alert.alert('Success', 'Your password has been reset successfully.', [{ text: 'OK', onPress: onClose }]); // [cite: 965]
        } else {
              let errorMessage = `Password reset failed (Status: ${response.status})`; // [cite: 966]
              if (responseText) { // [cite: 967]
                 try {
                     const errorJson = JSON.parse(responseText); // [cite: 967]
                     errorMessage = errorJson.statusMessage || errorJson.title || errorJson.detail || responseText; // [cite: 968]
                 } catch (e) { errorMessage = responseText || errorMessage } // [cite: 969]
             }
            Alert.alert('Error', errorMessage); // [cite: 970]
        }
     } catch (error: any) {
         console.error("Error resetting password:", error); // [cite: 972]
         Alert.alert('Error', `Could not reset password. Please try again. ${error.message}`); // [cite: 972]
     } finally {
        setIsLoading(false); // [cite: 973]
     }
  };

  // --- Render Content based on Step ---
  const renderStepContent = () => { // [cite: 973]
    if (step === 'enterEmail') { // [cite: 973]
      return (
        <>
          <Text style={styles.subtitle}>Enter your email address</Text> {/* [cite: 973] */}
          <View style={styles.inputContainer}> {/* [cite: 973] */}
            <TextInput
               style={styles.input} // [cite: 974]
               placeholder="Email Address" // [cite: 974]
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.placeholder}
              editable={!isLoading} // [cite: 974]
            />
          </View>
          <TouchableOpacity
             style={styles.checkboxContainer} // [cite: 975]
             onPress={() => !isLoading && setIsPartner(!isPartner)} // [cite: 975]
             disabled={isLoading} // [cite: 975]
          >
            <MaterialCommunityIcons
               name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'} // [cite: 976]
              size={24}
              color={isLoading ? COLORS.textSecondary : (isPartner ? COLORS.buttonBg : COLORS.textSecondary)} // [cite: 977]
            />
            <Text style={[styles.checkboxLabel, isLoading && styles.disabledText]}>Partner account</Text> {/* [cite: 977] */}
          </TouchableOpacity>
          <Text style={styles.infoText}> {/* [cite: 977] */}
            Password reset instructions will be sent to your email address if the account exists.
          </Text>
          <TouchableOpacity
             style={[styles.actionButton, isLoading && styles.buttonDisabled]} // [cite: 978]
             onPress={handleSendResetLink} // [cite: 978]
             disabled={isLoading} // [cite: 978]
           >
             {isLoading ? ( // [cite: 979]
                <ActivityIndicator size="small" color={COLORS.buttonText} /> // [cite: 979]
             ) : (
                <Text style={styles.actionButtonText}>Ok</Text> // [cite: 979]
             )}
          </TouchableOpacity>
        </>
      );
    }

    if (step === 'resetPassword') { // [cite: 980]
      return (
        <>
         <View style={[styles.inputContainer, styles.disabledInputContainer]}> {/* [cite: 980] */}
            <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} /> {/* [cite: 980] */}
          </View>
           <TouchableOpacity style={styles.checkboxContainer} disabled={true}> {/* [cite: 980] */}
             <MaterialCommunityIcons name={isPartner ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={COLORS.placeholder}/> {/* [cite: 980] */}
             <Text style={[styles.checkboxLabel, styles.disabledText]}>Partner account</Text> {/* [cite: 981] */}
           </TouchableOpacity>
           <View style={styles.inputContainer}> {/* [cite: 981] */}
            <TextInput style={styles.input} placeholder="Enter Otp" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholderTextColor={COLORS.placeholder} editable={!isLoading}/> {/* [cite: 981] */}
          </View>
           <View style={styles.inputContainer}> {/* [cite: 981] */}
            <TextInput style={styles.input} placeholder="New Password (min 8 chars)" value={newPassword} onChangeText={setNewPassword} secureTextEntry={true} placeholderTextColor={COLORS.placeholder} editable={!isLoading}/> {/* [cite: 981] */}
          </View>
          <Text style={styles.infoText}> {/* [cite: 982] */}
            Enter the OTP sent to your email and set a new password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.buttonDisabled]} // [cite: 983]
            onPress={handleResetPassword} // [cite: 983]
            disabled={isLoading} // [cite: 983]
          >
             {isLoading ? ( // [cite: 984]
              <ActivityIndicator size="small" color={COLORS.buttonText} /> // [cite: 984]
              ) : (
                 <Text style={styles.actionButtonText}>Reset Password</Text> // [cite: 984]
                 )}
          </TouchableOpacity>
        </>
      );
    }
    return null; // [cite: 985]
  };

  // --- Modal JSX ---
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}> {/* [cite: 985] */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}> {/* [cite: 985] */}
         <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} /> {/* [cite: 985] */}
        <View style={styles.modalContent}> {/* [cite: 985] */}
          <View style={styles.header}> {/* [cite: 985] */}
            <Text style={styles.title}>Forgot password?</Text> {/* [cite: 985] */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isLoading}> {/* [cite: 986] */}
              <Ionicons name="close" size={28} color={COLORS.textSecondary} /> {/* [cite: 986] */}
             </TouchableOpacity>
          </View>
          <View style={styles.contentArea}> {/* [cite: 986] */}
             {renderStepContent()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal> // [cite: 987]
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', alignItems: 'center', }, // [cite: 987]
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, overflow: 'hidden', paddingBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, }, // [cite: 987]
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, position: 'relative', }, // [cite: 987]
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', }, // [cite: 987]
  closeButton: { padding: 5, position: 'absolute', right: 10, top: 10, }, // [cite: 987]
  contentArea: { paddingHorizontal: 20, paddingTop: 20, }, // [cite: 988]
  subtitle: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 15, textAlign: 'center', }, // [cite: 988]
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10, height: 50, }, // [cite: 988]
  disabledInputContainer: { backgroundColor: '#F8F8F8', opacity: 0.7, }, // [cite: 988]
  input: { flex: 1, height: '100%', fontSize: 16, color: COLORS.textPrimary, }, // [cite: 988]
  disabledInput: { color: COLORS.textSecondary, }, // [cite: 988]
  // clearIcon: { paddingLeft: 10, }, // [cite: 988] - Commented out as not used
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, alignSelf: 'flex-start', }, // [cite: 988]
  checkboxLabel: { marginLeft: 8, fontSize: 14, color: COLORS.textPrimary, }, // [cite: 988]
  disabledText: { color: COLORS.textSecondary, opacity: 0.7, }, // [cite: 989]
  infoText: { fontSize: 12, color: COLORS.accent, textAlign: 'center', marginVertical: 10, paddingHorizontal: 10, lineHeight: 16, }, // [cite: 989]
  actionButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 15, minHeight: 50, justifyContent: 'center', }, // [cite: 989]
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, }, // [cite: 989]
  actionButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, // [cite: 990]
});