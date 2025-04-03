import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import ForgotPasswordModal from '@/components/ForgotPasswordModal'; // Import the modal

// Approximate Colors based on Login.png - Replace with exact Figma values
const COLORS = {
  background: '#FEFBF6',
  textPrimary: '#333333',
  textSecondary: '#666666',
  accent: '#D4AF37',
  buttonPrimaryBg: '#333333',
  buttonPrimaryText: '#FFFFFF',
  lightButtonBg: '#F0F0F0',
  borderColor: '#E0E0E0',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPartner, setIsPartner] = useState<boolean>(false);

  // State to control Forgot Password Modal visibility
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);

  const handleLogin = () => {
    console.log('Attempting login with:', { email, password, isPartner });
    Alert.alert('Login Attempt', `Email: ${email}\nPassword: ${password}\nPartner: ${isPartner}`);
    // router.replace('/(tabs)/home');
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    Alert.alert('Social Login', `Login with ${provider} (Not Implemented)`);
  };

  // Updated: Function to open the modal
  const handleForgotPassword = () => {
     setIsForgotModalVisible(true); // Open the modal
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header Toggle */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/register')}>
             <Text style={[styles.headerText, styles.headerInactive]}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={[styles.headerText, styles.headerActive]}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Email Input */}
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput style={styles.input} placeholder="Eg namaemail@emailkamu.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textSecondary}/>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="•••• ••••" value={password} onChangeText={setPassword} secureTextEntry={true} placeholderTextColor={COLORS.textSecondary}/>
        </View>

        {/* Forgot Password Link - Now triggers the modal */}
         <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forget Password?</Text>
         </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Social Login Buttons */}
        <View style={styles.socialLoginContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('google')}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>Login with</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('apple')}>
                <Ionicons name="logo-apple" size={20} color="#000000" />
                 <Text style={styles.socialButtonText}>Login with</Text>
            </TouchableOpacity>
        </View>

        {/* Login as Partner (Link to Partner Registration) */}
        <TouchableOpacity style={styles.partnerLoginContainer} onPress={() => router.push('/register-partner')}>
            <MaterialCommunityIcons name={'checkbox-blank-outline'} size={20} color={COLORS.accent} />
            <Text style={styles.partnerLoginText}>Login as partner</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Forgot Password Modal Component Integration */}
      <ForgotPasswordModal
          visible={isForgotModalVisible}
          onClose={() => setIsForgotModalVisible(false)}
      />

    </SafeAreaView>
  );
}

// --- Styles (Approximated from Login.png) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 50,
    paddingHorizontal: 40,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '500',
  },
  headerActive: {
    color: COLORS.accent,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
    paddingBottom: 4,
  },
  headerInactive: {
    color: COLORS.textSecondary,
  },
  inputGroup: {
      marginBottom: 20,
  },
  label: {
      fontSize: 14,
      color: COLORS.textPrimary,
      marginBottom: 8,
      fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 30,
    marginTop: -10,
  },
  loginButton: {
    backgroundColor: COLORS.buttonPrimaryBg,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButtonText: {
    color: COLORS.buttonPrimaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightButtonBg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  socialButtonText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  partnerLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLoginText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});