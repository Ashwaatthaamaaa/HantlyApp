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
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MultiSelectModal from '@/components/MultiSelectModal'; // Adjust path if needed
import * as ImagePicker from 'expo-image-picker';

// --- Placeholder Data ---
const dummyCounties = [ { id: 'c1', name: 'Stockholms län' }, { id: 'c2', name: 'Uppsala län' }, { id: 'c3', name: 'Södermanlands län' }, { id: 'c4', name: 'Jönköpings län' }, { id: 'c5', name: 'Kronobergs län' }, { id: 'c6', name: 'Kalmar län' }, { id: 'c7', name: 'Gotlands län' }];
const dummyMunicipalities = [ { id: 'm1', name: 'Stockholm City' }, { id: 'm2', name: 'Uppsala Town' }, { id: 'm3', name: 'Södertälje' }, { id: 'm4', name: 'Jönköping Central' }];
const dummyServiceCategories = [ { id: 's1', name: 'Cleaning' }, { id: 's2', name: 'Carpenter' }, { id: 's3', name: 'Painter' }, { id: 's4', name: 'Electrician' }, { id: 's5', name: 'Plumber' }];
// ------------------------


// --- Approximate Colors ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  placeholder: '#AAAAAA',
  accent: '#555555', // Darker grey/brownish from design
  headerBg: '#696969', // Header background seems darker grey/brown
  headerText: '#FFFFFF',
  error: '#D9534F',
  borderColor: '#E0E0E0',
  buttonBg: '#696969', // Dark grey/brown button approximation
  buttonText: '#FFFFFF',
  logoButtonBg: '#F0F0F0',
  linkText: '#696969', // Link color at bottom
};


export default function RegisterPartnerScreen() {
  const router = useRouter();

  // State for form fields
  const [companyName, setCompanyName] = useState<string>('');
  const [regNumber, setRegNumber] = useState<string>('');
  const [companyLogoUri, setCompanyLogoUri] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false); // Added state for visibility

  // State for selections
  const [selectedCountyIds, setSelectedCountyIds] = useState<string[]>([]);
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // State for modal visibility
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);

  // --- Image Picker Logic ---
  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setCompanyLogoUri(result.assets[0].uri);
    }
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedIds: string[]) => setSelectedCountyIds(selectedIds);
  const handleMunicipalityConfirm = (selectedIds: string[]) => setSelectedMunicipalityIds(selectedIds);
  const handleServiceConfirm = (selectedIds: string[]) => setSelectedServiceIds(selectedIds);

  // --- Display Text ---
  const getDisplayText = (ids: string[], data: { id: string, name: string }[], placeholder: string) => {
    if (ids.length === 0) return placeholder;
    const names = ids.map(id => data.find(item => item.id === id)?.name).filter(Boolean);
    return names.join(', ');
  };

  // --- Sign Up Handler ---
  const handleSignUp = () => {
      // Add validation for all fields
      console.log('Attempting Partner Sign Up:', { companyName, regNumber, description, phone, email, /* password hidden */ companyLogoUri, selectedCountyIds, selectedMunicipalityIds, selectedServiceIds });
      Alert.alert('Partner Sign Up Attempt', `Company: ${companyName}`);
      // API call here...
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register As Partner</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>

        {/* Company Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Company Name" value={companyName} onChangeText={setCompanyName} placeholderTextColor={COLORS.placeholder}/>
        </View>

        {/* Registration Number */}
        <View style={styles.inputContainer}>
          <Ionicons name="briefcase-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Registration Number" value={regNumber} onChangeText={setRegNumber} placeholderTextColor={COLORS.placeholder}/>
        </View>

        {/* Company Logo */}
        <View style={styles.logoContainer}>
             <Image
                 source={companyLogoUri ? { uri: companyLogoUri } : require('@/assets/images/icon.png')} // Use default icon or a dedicated placeholder asset
                 style={styles.logoPreview}
             />
            <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo}>
                <Text style={styles.logoButtonText}>Company Logo</Text>
            </TouchableOpacity>
        </View>

        {/* Company Description */}
        <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Company Description"
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={4}
            placeholderTextColor={COLORS.placeholder}
        />

        {/* --- Selectors --- */}
        <TouchableOpacity style={styles.selectorContainer} onPress={() => setIsCountyModalVisible(true)}>
           <Text style={[styles.selectorText, selectedCountyIds.length === 0 && styles.placeholderText]}>{getDisplayText(selectedCountyIds, dummyCounties, 'Select County')}</Text>
           <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.selectorContainer} onPress={() => setIsMunicipalityModalVisible(true)}>
           <Text style={[styles.selectorText, selectedMunicipalityIds.length === 0 && styles.placeholderText]}>{getDisplayText(selectedMunicipalityIds, dummyMunicipalities, 'Select Municipality')}</Text>
           <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.selectorContainer} onPress={() => setIsServiceModalVisible(true)}>
           <Text style={[styles.selectorText, selectedServiceIds.length === 0 && styles.placeholderText]}>{getDisplayText(selectedServiceIds, dummyServiceCategories, 'Choose Service Category')}</Text>
           <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
           <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
           <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.placeholder}/>
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
           <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
           <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder}/>
        </View>

        {/* Password Field */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible} // Use state here
            placeholderTextColor={COLORS.placeholder}
          />
          {/* Added visibility toggle */}
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
             <Ionicons
               name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
               size={24}
               color={COLORS.textSecondary}
               style={styles.eyeIcon}
             />
          </TouchableOpacity>
        </View>
        {/* Removed Confirm Password field based on final design */}

        {/* Sign Up Button */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>Sign up</Text>
        </TouchableOpacity>

        {/* Bottom Sign In Link */}
         <View style={styles.bottomLinkContainer}>
           {/* Text seems slightly off in image, using common pattern */}
           <Text style={styles.bottomText}>Already have a partner account? </Text>
           <TouchableOpacity onPress={() => router.push('/login')}>
             <Text style={styles.bottomLink}>Sign In</Text>
           </TouchableOpacity>
         </View>

      </ScrollView>

       {/* --- Modals --- */}
       <MultiSelectModal visible={isCountyModalVisible} title="Select County" data={dummyCounties} initialSelectedIds={selectedCountyIds} onClose={() => setIsCountyModalVisible(false)} onConfirm={handleCountyConfirm} />
       <MultiSelectModal visible={isMunicipalityModalVisible} title="Select Municipality" data={dummyMunicipalities} initialSelectedIds={selectedMunicipalityIds} onClose={() => setIsMunicipalityModalVisible(false)} onConfirm={handleMunicipalityConfirm} />
       <MultiSelectModal visible={isServiceModalVisible} title="Choose Service Category" data={dummyServiceCategories} initialSelectedIds={selectedServiceIds} onClose={() => setIsServiceModalVisible(false)} onConfirm={handleServiceConfirm} />

    </SafeAreaView>
  );
}


// --- Styles (Approximated from both images) ---
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
    // Removed border, using background color for separation
    backgroundColor: COLORS.headerBg,
  },
  backButton: {
      padding: 5,
      width: 34, // Balances title
      alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.headerText,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  textArea: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: COLORS.borderColor,
      borderRadius: 8,
      paddingHorizontal: 15,
      backgroundColor: '#FFFFFF',
      fontSize: 16,
      color: COLORS.textPrimary,
  },
  logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
  },
  logoPreview: {
      width: 60,
      height: 60,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.borderColor,
      marginRight: 15,
      backgroundColor: COLORS.logoButtonBg,
  },
  logoButton: {
      backgroundColor: COLORS.logoButtonBg,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.borderColor,
  },
  logoButtonText: {
      fontSize: 14,
      color: COLORS.textPrimary,
      fontWeight: '500',
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
    marginBottom: 15,
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flexShrink: 1,
    paddingRight: 10,
  },
  placeholderText: {
      color: COLORS.placeholder,
  },
  signUpButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25, // Space above button
    marginBottom: 20, // Space below button
  },
  signUpButtonText: {
    color: COLORS.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomLinkContainer: {
     flexDirection: 'row',
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 10, // Add some padding
   },
   bottomText: { // Text like "Already have an account?"
     fontSize: 14,
     color: COLORS.textSecondary, // Use secondary text color
   },
   bottomLink: { // Text like "Sign In"
     fontSize: 14,
     color: COLORS.linkText, // Use accent or specific link color
     fontWeight: 'bold',
     marginLeft: 5,
   },
});