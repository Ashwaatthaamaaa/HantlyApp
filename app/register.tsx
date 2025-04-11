// File: app/register.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import SelectModal from '@/components/MultiSelectModal';

// --- Define Types ---
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ApiDataItem { id: string; name: string; }
interface ApiResponse { statusCode: number; statusMessage: string; }

import { BASE_URL } from '@/constants/Api';
// --------------------

// --- Base URL ---
// -----------------

// --- Colors ---
const COLORS = {
    background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
    placeholder: '#AAAAAA', accent: '#555555', error: '#D9534F',
    borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
    buttonDisabledBg: '#AAAAAA',
};

export default function RegisterScreen() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [nameTouched, setNameTouched] = useState<boolean>(false);
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(true); // Start true
  const [countyError, setCountyError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  // --- Fetch County List with Logging ---
  useEffect(() => {
    console.log("RegisterScreen: Fetching counties..."); // Log fetch start
    const fetchCounties = async () => {
        setIsLoadingCounties(true); // Ensure loading starts true
        setCountyError(null);
        const url = `${BASE_URL}/api/County/GetCountyList`;
        try {
            const response = await fetch(url);
            console.log(`RegisterScreen: County fetch response status: ${response.status}`); // Log status
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) { throw new Error("Received non-JSON response for Counties"); }
            const data: CountyMaster[] = await response.json();
            const formattedData: ApiDataItem[] = data.map(c => ({ id: c.countyId.toString(), name: c.countyName }));
            console.log(`RegisterScreen: Counties fetched successfully, count: ${formattedData.length}`); // Log success count
            setCounties(formattedData);
        } catch (error: any) {
            console.error("RegisterScreen: Failed fetch counties:", error); // Log error
            setCountyError(`Failed to load Counties: ${error.message}`);
        } finally {
             console.log("RegisterScreen: Finished county fetch, setting isLoadingCounties to false."); // Log finish
            setIsLoadingCounties(false);
        }
    };
    fetchCounties();
  }, []); // Empty dependency array: runs only once on mount

  // --- Fetch Municipality Logic ---
  const fetchMunicipalities = useCallback(async (countyId: string) => {
      setIsLoadingMunicipalities(true); setMunicipalityError(null); setMunicipalities([]);
      const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`;
      try {
          const response = await fetch(url);
          if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
          const contentType = response.headers.get("content-type");
           if (contentType?.includes("application/json")) {
              const data: MunicipalityMaster[] = await response.json();
              const formattedData: ApiDataItem[] = data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName }));
              setMunicipalities(formattedData);
          } else { throw new Error("Received non-JSON response for Municipalities"); }
      } catch (error: any) { console.error("Failed to fetch municipalities:", error); setMunicipalityError(`Failed municipalities: ${error.message}`); }
      finally { setIsLoadingMunicipalities(false); }
  }, []);

  // --- Effect to Trigger Municipality Fetch ---
  useEffect(() => {
    if (selectedCountyId) { fetchMunicipalities(selectedCountyId); }
    else { setMunicipalities([]); setSelectedMunicipalityId(null); setMunicipalityError(null); }
  }, [selectedCountyId, fetchMunicipalities]);

  // --- User Sign Up Logic ---
  const handleSignUp = async () => {
    setNameTouched(true); setEmailTouched(true);
    setPhoneTouched(true); setPasswordTouched(true);

    const isNameValid = !!name;
    const isEmailValid = !!email;
    const isPhoneValid = !!phone;
    const isPasswordValid = password.length >= 8;
    const isCountySelected = !!selectedCountyId;
    const isMunicipalitySelected = !!selectedMunicipalityId;

    // ** NEW: Email Format Validation **
    if (isEmailValid && !/\S+@\S+\.\S+/.test(email)) { // Check format only if email is not empty
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return; // Stop submission if format is invalid
    }
    // ** END NEW VALIDATION **

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isCountySelected || !isMunicipalitySelected) {
        Alert.alert('Missing Information', 'Please fill in all required fields correctly.');
        return;
    }
    if (!agreedToTerms) {
        Alert.alert('Terms Required', 'Please agree to the Terms of Service & Privacy Policy.');
        return;
    }

    setIsSigningUp(true);
    const requestBody = {
      username: name,
      password: password,
      active: true,
      mobileNumber: phone,
      emailId: email,
      contactPerson: name,
      countyId: parseInt(selectedCountyId!, 10),
      municipalityId: parseInt(selectedMunicipalityId!, 10)
    };
    const url = `${BASE_URL}/api/User/UserSignUp`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const responseText = await response.text();
        let responseData: ApiResponse | null = null;
        let message = '';
        try {
            responseData = JSON.parse(responseText);
            message = responseData?.statusMessage || '';
        } catch (e) {
            if (responseText && responseText.length < 150 && !responseText.trim().startsWith('<')) {
                message = responseText;
            }
        }

        if (response.ok) {
            Alert.alert('Sign Up Successful!', message || 'User registered successfully.', [{ text: 'OK', onPress: () => router.push('/login') }]);
        }
        else {
            Alert.alert('Sign Up Failed', message || `An error occurred (Status: ${response.status}).`);
        }
    } catch (error: any) {
        Alert.alert('Sign Up Error', `An unexpected error occurred: ${error.message}`);
    }
    finally {
        setIsSigningUp(false);
    }
  };

  // --- Modal Handlers & Display Text Logic ---
  const handleCountyConfirm = (selectedId: string | null) => setSelectedCountyId(selectedId);
  const handleMunicipalityConfirm = (selectedId: string | null) => setSelectedMunicipalityId(selectedId);
  const getSingleDisplayText = (id: string | null, data: ApiDataItem[], placeholder: string) => { return !id ? placeholder : (data.find(item => item.id === id)?.name ?? placeholder); };
  const isMunicipalityDisabled = !selectedCountyId || isLoadingMunicipalities || municipalityError !== null || (!isLoadingMunicipalities && municipalities.length === 0 && !municipalityError);
  const municipalityPlaceholder = !selectedCountyId ? 'Select County First' : isLoadingMunicipalities ? 'Loading Municipalities...' : municipalityError ? 'Error Loading' : municipalities.length === 0 ? 'No Municipalities Found' : 'Select Municipality';


  // *** Log state right before rendering ***
  console.log(`RegisterScreen Render State: isLoadingCounties=${isLoadingCounties}, countyError=${countyError}, counties.length=${counties.length}, isSigningUp=${isSigningUp}`);

  // --- JSX Structure ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isSigningUp}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
         <Text style={styles.headerTitle}>Register User</Text>
         <View style={styles.backButton} />
       </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Create your account here</Text>

        {/* Input Fields ... */}
         <View style={styles.inputContainer}><Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} onBlur={() => setNameTouched(true)} editable={!isSigningUp} /></View>
         {nameTouched && !name && <Text style={styles.requiredText}>Required</Text>}{!nameTouched && <View style={styles.requiredPlaceholder} />}
         <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" onBlur={() => setEmailTouched(true)} editable={!isSigningUp} /></View>
         {emailTouched && !email && <Text style={styles.requiredText}>Required</Text>}{!emailTouched && <View style={styles.requiredPlaceholder} />}
          <View style={styles.inputContainer}><Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} onBlur={() => setPhoneTouched(true)} editable={!isSigningUp} /><Text style={styles.lengthHint}>{phone.length}/10</Text></View>
         {phoneTouched && !phone && <Text style={styles.requiredText}>Required</Text>}{!phoneTouched && <View style={styles.requiredPlaceholder} />}
         <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Password (min 8 chars)" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} onBlur={() => setPasswordTouched(true)} editable={!isSigningUp}/><TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isSigningUp}><Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/></TouchableOpacity></View>
         {passwordTouched && password.length < 8 && <Text style={styles.requiredText}>Required (min 8 chars)</Text>}{!passwordTouched && <View style={styles.requiredPlaceholder} />}

        {/* County Selector with Logging onPress */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isLoadingCounties || countyError !== null || isSigningUp) && styles.disabledSelector ]}
            onPress={() => {
                 // Log conditions when pressed
                const canOpen = !isSigningUp && !isLoadingCounties && counties.length > 0 && !countyError;
                console.log(`County Selector Pressed. Conditions: !isSigningUp=${!isSigningUp}, !isLoadingCounties=${!isLoadingCounties}, counties.length>0=${counties.length > 0}, !countyError=${!countyError}. Can open = ${canOpen}`); // Log conditions
                if (canOpen) {
                    setIsCountyModalVisible(true);
                } else {
                    console.log("County Selector: Modal cannot be opened due to conditions."); // Log failure reason
                    if (countyError) Alert.alert("Error", "Could not load counties. Please try again later.");
                }
            }}
            disabled={isLoadingCounties || countyError !== null || isSigningUp}
        >
            <Text style={[styles.selectorText, !selectedCountyId && styles.placeholderText]}>
                {isLoadingCounties ? 'Loading Counties...' : countyError ? 'Error Loading Counties' : getSingleDisplayText(selectedCountyId, counties, 'Select County')}
            </Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {/* Display error below selector only when not loading */}
        {countyError && !isLoadingCounties && <Text style={styles.errorText}>{countyError}</Text>}

        {/* Municipality Selector */}
        <TouchableOpacity style={[styles.selectorContainer, (isMunicipalityDisabled || isSigningUp) && styles.disabledSelector]} onPress={() => !isSigningUp && !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled || isSigningUp}>
             <Text style={[styles.selectorText, !selectedMunicipalityId && styles.placeholderText]}>{getSingleDisplayText(selectedMunicipalityId, municipalities, municipalityPlaceholder)}</Text>
            {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {/* Display error below selector only when not loading */}
        {municipalityError && !isLoadingMunicipalities && <Text style={styles.errorText}>{municipalityError}</Text>}

        {/* Terms Agreement */}
         <TouchableOpacity style={styles.termsContainer} onPress={() => !isSigningUp && setAgreedToTerms(!agreedToTerms)} disabled={isSigningUp}>
           <MaterialCommunityIcons name={agreedToTerms ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={24} color={agreedToTerms ? COLORS.accent : COLORS.textSecondary}/>
           <Text style={styles.termsText}>I agree to the <Text style={styles.linkText}>Terms of Service</Text> & <Text style={styles.linkText}>Privacy Policy</Text></Text>
         </TouchableOpacity>

         {/* Sign Up Button */}
         <TouchableOpacity style={[styles.signUpButton, (isSigningUp || !agreedToTerms) && styles.buttonDisabled]} onPress={handleSignUp} disabled={isSigningUp || !agreedToTerms}>
            {isSigningUp ? <ActivityIndicator size="small" color={COLORS.buttonText} /> : <Text style={styles.signUpButtonText}>Sign Up</Text>}
         </TouchableOpacity>

      </ScrollView>

      {/* Modals */}
      <SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedId={selectedCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={handleCountyConfirm} />
      <SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedId={selectedMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={handleMunicipalityConfirm} />

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor },
  backButton: { padding: 5, width: 34, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  container: { flexGrow: 1, paddingHorizontal: 25, paddingVertical: 20 },
  subtitle: { textAlign: 'center', color: COLORS.textSecondary, marginBottom: 30, fontSize: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 10, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 16, color: COLORS.textPrimary },
  requiredText: { color: COLORS.error, fontSize: 12, marginTop: 4, marginBottom: 12, height: 15 },
  requiredPlaceholder: { height: 15, marginTop: 4, marginBottom: 12 },
  lengthHint: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 5 },
  eyeIcon: { paddingLeft: 10 },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 5 },
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flexShrink: 1, paddingRight: 10 },
  placeholderText: { color: COLORS.placeholder },
  disabledSelector: { backgroundColor: '#F0F0F0', opacity: 0.7 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingRight: 10 },
  termsText: { marginLeft: 10, fontSize: 14, color: COLORS.textSecondary, flexShrink: 1 },
  linkText: { fontWeight: 'bold', color: COLORS.accent },
  signUpButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, minHeight: 50, justifyContent: 'center' },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg },
  signUpButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold' },
  errorText: { // Style for error messages below selectors
      color: COLORS.error, fontSize: 12, marginTop: 0, marginBottom: 15, alignSelf: 'flex-start', marginLeft: 5,
  },
});