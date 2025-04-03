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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MultiSelectModal from '@/components/MultiSelectModal'; // Import the modal component (adjust path if needed)

// Approximate Colors - Replace with exact Figma values
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  placeholder: '#AAAAAA',
  accent: '#555555',
  error: '#D9534F',
  borderColor: '#E0E0E0',
  buttonBg: '#696969',
  buttonText: '#FFFFFF',
};

// --- Placeholder Data (Replace with actual fetched data) ---
const dummyCounties = [
  { id: 'c1', name: 'Stockholms län' },
  { id: 'c2', name: 'Uppsala län' },
  { id: 'c3', name: 'Södermanlands län' },
  { id: 'c4', name: 'Jönköpings län' },
  { id: 'c5', name: 'Kronobergs län' },
  { id: 'c6', name: 'Kalmar län' },
  { id: 'c7', name: 'Gotlands län' },
];
const dummyMunicipalities = [
  { id: 'm1', name: 'Stockholm City' },
  { id: 'm2', name: 'Uppsala Town' },
  { id: 'm3', name: 'Södertälje' },
  { id: 'm4', name: 'Jönköping Central' },
  // Add more based on selected county later
];
// ---------------------------------------------------------

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedCountyIds, setSelectedCountyIds] = useState<string[]>([]); // Store selected IDs
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]); // Store selected IDs
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  // State for modal visibility
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);


  const handleSignUp = () => {
    // Placeholder for validation and actual sign-up logic
    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Service & Privacy Policy.');
      return;
    }
    // Log selected IDs for now
    console.log('Attempting Sign Up:', { name, email, phone, password, selectedCountyIds, selectedMunicipalityIds });
    Alert.alert('Sign Up Attempt', `Name: ${name}\nEmail: ${email}\nAgreed: ${agreedToTerms}\nCounties: ${selectedCountyIds.join(', ')}\nMunicipalities: ${selectedMunicipalityIds.join(', ')}`);
    // On success: router.replace('/(tabs)/home'); or router.push('/login');
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedIds: string[]) => {
      setSelectedCountyIds(selectedIds);
      // Fetch/filter municipalities based on selected counties here if needed
  };

  const handleMunicipalityConfirm = (selectedIds: string[]) => {
      setSelectedMunicipalityIds(selectedIds);
  };

  // --- Display Text for Selectors ---
   const getDisplayText = (ids: string[], data: { id: string, name: string }[], placeholder: string) => {
     if (ids.length === 0) return placeholder;
     // Find names corresponding to IDs - inefficient for large lists, optimize later
     const names = ids.map(id => data.find(item => item.id === id)?.name).filter(Boolean);
     return names.join(', ');
   };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register User</Text>
        <View style={styles.backButton} /> {/* Dummy view for spacing */}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Create your account here</Text>

        {/* --- Input Fields --- */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} placeholderTextColor={COLORS.placeholder} />
        </View>
        <Text style={styles.requiredText}>Required</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder} />
        </View>
        <Text style={styles.requiredText}>Required</Text>

         <View style={styles.inputContainer}>
           <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
           <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} placeholderTextColor={COLORS.placeholder} />
           <Text style={styles.lengthHint}>{phone.length}/10</Text>
         </View>
         <Text style={styles.requiredText}>Required</Text>

         <View style={styles.inputContainer}>
           <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
           <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.placeholder}/>
           <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
             <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/>
           </TouchableOpacity>
           <Text style={styles.lengthHint}>{password.length}/8</Text>
         </View>
         <Text style={styles.requiredText}>Required</Text>

        {/* --- Selectors --- */}
        {/* County Selector */}
        <TouchableOpacity style={styles.selectorContainer} onPress={() => setIsCountyModalVisible(true)}>
           <Text style={[styles.selectorText, selectedCountyIds.length === 0 && styles.placeholderText]}>
              {getDisplayText(selectedCountyIds, dummyCounties, 'Select County')}
           </Text>
           <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Municipality Selector */}
        <TouchableOpacity style={styles.selectorContainer} onPress={() => setIsMunicipalityModalVisible(true)}>
           <Text style={[styles.selectorText, selectedMunicipalityIds.length === 0 && styles.placeholderText]}>
             {getDisplayText(selectedMunicipalityIds, dummyMunicipalities, 'Select Municipality')}
           </Text>
           <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Terms Agreement */}
        <TouchableOpacity style={styles.termsContainer} onPress={() => setAgreedToTerms(!agreedToTerms)}>
          <MaterialCommunityIcons name={agreedToTerms ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={24} color={agreedToTerms ? COLORS.accent : COLORS.textSecondary}/>
          <Text style={styles.termsText}>I agree to the <Text style={styles.linkText}>Terms of Service</Text> & <Text style={styles.linkText}>Privacy Policy</Text></Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- Modals --- */}
      <MultiSelectModal
          visible={isCountyModalVisible}
          title="Select County"
          data={dummyCounties} // Use actual data later
          initialSelectedIds={selectedCountyIds}
          onClose={() => setIsCountyModalVisible(false)}
          onConfirm={handleCountyConfirm}
      />

       <MultiSelectModal
          visible={isMunicipalityModalVisible}
          title="Select Municipality"
          data={dummyMunicipalities} // Use actual data later (filtered by county?)
          initialSelectedIds={selectedMunicipalityIds}
          onClose={() => setIsMunicipalityModalVisible(false)}
          onConfirm={handleMunicipalityConfirm}
       />

    </SafeAreaView>
  );
}

// --- Styles (Approximated from image 18(1).png) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  backButton: {
      padding: 5, // Hit area for back button
      width: 34, // To balance the title centering
      alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 30,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50, // Fixed height for inputs
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%', // Fill container height
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  requiredText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12, // Space below required text
  },
  lengthHint: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginLeft: 5,
  },
   eyeIcon: {
     paddingLeft: 10,
   },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20, // Space between selectors
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flexShrink: 1, // Allow text to shrink/wrap if needed
    paddingRight: 10, // Prevent text overlapping icon
  },
  placeholderText: {
      color: COLORS.placeholder,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20, // Space around terms
  },
  termsText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    flexShrink: 1, // Allow text to wrap
  },
  linkText: { // Style for links within terms text
      fontWeight: 'bold',
      color: COLORS.accent,
      // textDecorationLine: 'underline', // Add underline if needed
  },
  signUpButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Space above button
  },
  signUpButtonText: {
    color: COLORS.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});