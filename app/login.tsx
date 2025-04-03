import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

// API Response Type
interface ApiResponse {
    statusCode: number;
    statusMessage: string;
    // Add other potential fields like token if needed upon successful login
}
// --------------------

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';
// -----------------

// --- Colors ---
const COLORS = {
  background: '#FEFBF6', textPrimary: '#333333', textSecondary: '#666666',
  accent: '#D4AF37', buttonPrimaryBg: '#333333', buttonPrimaryText: '#FFFFFF',
  lightButtonBg: '#F0F0F0', borderColor: '#E0E0E0', buttonDisabledBg: '#AAAAAA',
  error: '#D9534F',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPartner, setIsPartner] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Updated Login Handler ---
  const handleLogin = async () => {
    const trimmedEmail = email.trim(); // Trim whitespace
    const trimmedPassword = password; // Passwords might intentionally have whitespace

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    const endpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
    const url = `${BASE_URL}${endpoint}`;

    // *** Construct request body - including active: true ***
    const requestBody = {
      emailId: trimmedEmail,
      password: trimmedPassword,
      active: true, // Added to match curl command example
    };

    console.log(`--- Attempting Login (${isPartner ? 'Partner' : 'User'}) ---`);
    console.log(`URL: ${url}`);
    console.log(`Request Body Sent: ${JSON.stringify(requestBody)}`); // Log the exact body

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Accept': 'application/json, text/plain', // Optional: Be explicit about acceptable response types
        },
        body: JSON.stringify(requestBody),
      });

      // Get raw response text first for debugging
      const responseText = await response.text();
      console.log(`Response Status: ${response.status}`);
      console.log(`Raw Response Text: ${responseText}`);

      // *** Refined Response Handling ***
      if (response.ok) { // Status 200-299
        let responseData: ApiResponse | null = null;
        let successMessage = 'Login Successful!'; // Default success message
        try {
            // Attempt to parse as JSON (expected success format)
            responseData = JSON.parse(responseText);
            console.log('Parsed Response Data:', responseData);
            if (responseData?.statusMessage) {
                successMessage = responseData.statusMessage;
            }
            // Add check for specific success status code if API uses it inside JSON body
            if (responseData?.statusCode && !(responseData.statusCode >= 200 && responseData.statusCode < 300)) {
                 // Treat as failure even if HTTP status is ok, if internal code indicates error
                 throw new Error(responseData.statusMessage || `API returned status code ${responseData.statusCode}`);
            }

        } catch (parseError) {
            // Handle cases where response is OK but not JSON or doesn't match ApiResponse
            console.warn("Could not parse successful response as JSON or unexpected format:", parseError);
            // If responseText is simple success message, could use it?
            if (responseText.toLowerCase().includes('success')) { // Example check
                successMessage = responseText;
            }
             // If we require a specific JSON structure on success, maybe treat parse error as failure?
             // Depending on API consistency, adjust this logic. For now, assume 2xx is success.
        }

        Alert.alert('Login Successful!', successMessage);
        // TODO: Handle successful login (e.g., store auth token, user data)
        router.replace('/(tabs)/home');

      } else { // Status 300+
        let errorMessage = `Login failed with status: ${response.status}`;
        try {
          // Attempt to parse error response as JSON (might contain ProblemDetails or ApiResponse)
          const errorData = JSON.parse(responseText);
           console.log('Parsed Error Data:', errorData);
          errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage;
        } catch (e) {
          // If error response is not JSON, use the raw text or default message
           errorMessage = responseText || errorMessage;
           console.log("Could not parse error response as JSON.");
        }
        Alert.alert('Login Failed', errorMessage);
      }

    } catch (error: any) {
      // Handle network errors or other exceptions
      console.error("Login Fetch/Processing Error:", error);
      Alert.alert('Login Error', `An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Other handlers remain the same ---
  const handleSocialLogin = (provider: 'google' | 'apple') => { /* ... */ };
  const handleForgotPassword = () => { if (!isLoading) setIsForgotModalVisible(true); };
  const handleNavigateRegister = () => { if (!isLoading) router.push('/register'); }


  // --- JSX (remains the same structure as previous) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header Toggle */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleNavigateRegister} disabled={isLoading}><Text style={[styles.headerText, styles.headerInactive]}>Create Account</Text></TouchableOpacity>
          <TouchableOpacity disabled={true}><Text style={[styles.headerText, styles.headerActive]}>Login</Text></TouchableOpacity>
        </View>

        <Text style={styles.welcomeText}>Welcome</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textSecondary} editable={!isLoading}/>
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
             <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
             <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.textSecondary} editable={!isLoading}/>
             <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isLoading}><Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/></TouchableOpacity>
        </View>

         {/* Checkbox and Forgot Password Row */}
        <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => !isLoading && setIsPartner(!isPartner)} disabled={isLoading}>
                <MaterialCommunityIcons name={isPartner ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={24} color={isPartner ? COLORS.accent : COLORS.textSecondary} />
                <Text style={styles.checkboxLabel}>Sign In as Partner</Text>
            </TouchableOpacity>
             <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}><Text style={styles.forgotPasswordText}>Forgot Password?</Text></TouchableOpacity>
         </View>

        {/* Sign In Button */}
        <TouchableOpacity style={[styles.loginButton, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator size="small" color={COLORS.buttonPrimaryText} /> : <Text style={styles.loginButtonText}>Sign In</Text>}
        </TouchableOpacity>

         {/* Separator */}
        <Text style={styles.separatorText}>Or</Text>

        {/* Link to Partner Registration Screen */}
        <TouchableOpacity style={styles.registerPartnerButton} onPress={() => !isLoading && router.push('/register-partner')} disabled={isLoading}>
            <Text style={styles.registerPartnerButtonText}>Register as Partner</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal visible={isForgotModalVisible} onClose={() => setIsForgotModalVisible(false)} />

    </SafeAreaView>
  );
}

// --- Styles (remain the same) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 35, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 40, paddingHorizontal: 40 },
  headerText: { fontSize: 18, fontWeight: '500', paddingBottom: 5 },
  headerActive: { color: COLORS.accent, fontWeight: 'bold', borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  headerInactive: { color: COLORS.textSecondary },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent, textAlign: 'left', marginBottom: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 55, marginBottom: 20 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 16, color: COLORS.textPrimary },
  eyeIcon: { paddingLeft: 10 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingHorizontal: 5 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { marginLeft: 8, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  forgotPasswordText: { fontSize: 14, color: COLORS.accent, fontWeight: '500' },
  loginButton: { backgroundColor: COLORS.buttonPrimaryBg, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 25, minHeight: 50, justifyContent: 'center' },
  loginButtonText: { color: COLORS.buttonPrimaryText, fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg },
  separatorText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14, marginBottom: 25 },
  registerPartnerButton: { backgroundColor: COLORS.lightButtonBg, paddingVertical: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderColor, marginBottom: 30 },
  registerPartnerButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
});