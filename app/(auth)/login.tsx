// File: app/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView, // Ensure SafeAreaView is imported
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// **** ADD useSegments import ****
import { Link, useRouter, useSegments } from 'expo-router';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useAuth } from '@/context/AuthContext';

// --- Colors ---
const COLORS = {
  background: '#FEFBF6', textPrimary: '#333333', textSecondary: '#666666',
  accent: '#D4AF37', buttonPrimaryBg: '#333333', buttonPrimaryText: '#FFFFFF',
  lightButtonBg: '#F0F0F0', borderColor: '#E0E0E0', buttonDisabledBg: '#AAAAAA',
  error: '#D9534F',
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  // **** GET SEGMENTS ****
  const segments = useSegments();
  // State variables
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPartner, setIsPartner] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);


  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    // Client-Side Validation
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        setEmail(''); setPassword(''); // Clear fields
        return;
    }
    if (trimmedPassword.length < 8) {
        Alert.alert('Password Too Short', 'Password must be at least 8 characters.');
        setEmail(''); setPassword(''); // Clear fields
        return;
    }

    console.log("[handleLogin] Calling signIn...");
    const success = await signIn(trimmedEmail, trimmedPassword, isPartner);
    console.log("[handleLogin] Received success status from signIn:", success);

    if (success) {
        console.log("[handleLogin] Success is true, navigating home...");
        // Navigate immediately on success
        router.replace('/(app)/(tabs)/home');
          } else {
        console.log("[handleLogin] Success is false, clearing fields and staying on page.");
        // **** ADDED SEGMENT LOG ****
        console.log("[handleLogin] Current route segments on failure:", segments);
        // Clear fields on API error
        setEmail('');
        setPassword('');
    }
  };

  // --- Other handlers ---
  const handleForgotPassword = () => { if (!isLoading) setIsForgotModalVisible(true); };
  const handleNavigateRegister = () => { if (!isLoading) router.push('/register'); };

  // --- JSX ---
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

// --- Styles ---
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