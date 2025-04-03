import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
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
import SelectModal from '@/components/MultiSelectModal'; // Use the updated/renamed modal

// --- Define Types ---
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ApiDataItem { id: string; name: string; }

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';

// --- Approximate Colors ---
const COLORS = { /* ... Same as before ... */
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
  placeholder: '#AAAAAA', accent: '#555555', error: '#D9534F',
  borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
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

  // Selection state
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);

  // Modal visibility state
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);

  // State for fetched data and loading status
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const [countyError, setCountyError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);

  // --- Fetch County List (Runs once on mount) ---
  useEffect(() => {
    const fetchCounties = async () => { /* ... Same fetch logic as before ... */
        setIsLoadingCounties(true); setCountyError(null);
        const url = `${BASE_URL}/api/County/GetCountyList`; console.log(`Workspaceing counties from: ${url}`);
        try {
            const response = await fetch(url); console.log("County Response Status:", response.status);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`); }
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                const data: CountyMaster[] = await response.json(); console.log("Counties fetched:", data);
                const formattedData: ApiDataItem[] = data.map(c => ({ id: c.countyId.toString(), name: c.countyName })); setCounties(formattedData);
            } else { const textData = await response.text(); console.error("Received non-JSON:", textData); throw new Error(`Received non-JSON: ${textData}`); }
        } catch (error: any) { console.error("Failed fetch counties:", error); setCountyError(`Failed: ${error.message}`); Alert.alert('Error', `Failed counties: ${error.message}`); }
        finally { setIsLoadingCounties(false); }
    };
    fetchCounties();
  }, []); // Empty array: runs only once

  // --- Fetch Municipality Logic (using useCallback) ---
  const fetchMunicipalities = useCallback(async (countyId: string) => {
      setIsLoadingMunicipalities(true);
      setMunicipalityError(null);
      setMunicipalities([]); // Clear previous results before fetching new ones

      const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`;
      console.log(`Workspaceing municipalities from: ${url}`);
      try {
          const response = await fetch(url);
          console.log("Municipality Response Status:", response.status);
          if (!response.ok) { throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`); }
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
              const data: MunicipalityMaster[] = await response.json();
              console.log(`Municipalities for county ${countyId}:`, data);
              const formattedData: ApiDataItem[] = data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName }));
              setMunicipalities(formattedData);
          } else { const textData = await response.text(); console.error("Received non-JSON:", textData); throw new Error(`Received non-JSON: ${textData}`); }
      } catch (error: any) {
          console.error("Failed to fetch municipalities:", error);
          setMunicipalityError(`Failed municipalities: ${error.message}`);
      } finally {
          setIsLoadingMunicipalities(false);
      }
  // Include BASE_URL in useCallback dependencies if it could ever change (it's constant here, so not strictly needed)
  }, []); // Empty dependency array for useCallback, as it doesn't depend on component state/props directly


  // --- Effect to Trigger Municipality Fetch ---
  useEffect(() => {
    if (selectedCountyId) {
      fetchMunicipalities(selectedCountyId);
    } else {
      // Clear municipality data if no county is selected
      setMunicipalities([]);
      setSelectedMunicipalityId(null); // Clear selection as well
      setMunicipalityError(null); // Clear any previous error
    }
  }, [selectedCountyId, fetchMunicipalities]); // Depend on selectedCountyId and the memoized fetch function


  // --- Sign Up Logic ---
  const handleSignUp = () => { /* ... Same as before ... */
     if (!agreedToTerms) { Alert.alert('Terms Required','Please agree...'); return; }
     console.log('Attempting Sign Up:', { name, email, phone, password, selectedCountyId, selectedMunicipalityId });
     Alert.alert('Sign Up Attempt', `Name: ${name}\nEmail: ${email}\nCountyId: ${selectedCountyId}\nMuniId: ${selectedMunicipalityId}`);
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedId: string | null) => {
      setSelectedCountyId(selectedId);
      // Municipality state will be cleared by the useEffect dependency change
  };
  const handleMunicipalityConfirm = (selectedId: string | null) => {
      setSelectedMunicipalityId(selectedId);
  };

  // --- Display Text ---
  const getSingleDisplayText = (id: string | null, data: ApiDataItem[], placeholder: string) => { /* ... Same as before ... */
     if (!id) return placeholder;
     const item = data.find(item => item.id === id);
     return item?.name ?? placeholder;
  };

  // Determine if Municipality selector should be enabled
  const isMunicipalityDisabled = !selectedCountyId || isLoadingMunicipalities || municipalityError !== null || (!isLoadingMunicipalities && municipalities.length === 0 && !municipalityError);
  const municipalityPlaceholder = !selectedCountyId ? 'Select County First' :
                                 isLoadingMunicipalities ? 'Loading Municipalities...' :
                                 municipalityError ? 'Error Loading' :
                                 municipalities.length === 0 ? 'No Municipalities Found' :
                                 'Select Municipality';


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
         <Text style={styles.headerTitle}>Register User</Text>
         <View style={styles.backButton} />
       </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Create your account here</Text>

        {/* --- Input Fields --- */}
        {/* ... (Same as before) ... */}
         <View style={styles.inputContainer}><Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} placeholderTextColor={COLORS.placeholder} /></View>
         <Text style={styles.requiredText}>Required</Text>
         <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder} /></View>
         <Text style={styles.requiredText}>Required</Text>
         <View style={styles.inputContainer}><Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} placeholderTextColor={COLORS.placeholder} /><Text style={styles.lengthHint}>{phone.length}/10</Text></View>
         <Text style={styles.requiredText}>Required</Text>
         <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.placeholder}/><TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}><Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/></TouchableOpacity><Text style={styles.lengthHint}>{password.length}/8</Text></View>
         <Text style={styles.requiredText}>Required</Text>


        {/* --- Selectors --- */}
        <TouchableOpacity style={styles.selectorContainer} onPress={() => !isLoadingCounties && counties.length > 0 && setIsCountyModalVisible(true)} disabled={isLoadingCounties || countyError !== null} >
            <Text style={[styles.selectorText, !selectedCountyId && styles.placeholderText]}>{isLoadingCounties ? 'Loading Counties...' : getSingleDisplayText(selectedCountyId, counties, 'Select County')}</Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {countyError && <Text style={styles.errorText}>{countyError}</Text>}

        <TouchableOpacity style={[styles.selectorContainer, isMunicipalityDisabled && styles.disabledSelector]} onPress={() => !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled}>
            <Text style={[styles.selectorText, !selectedMunicipalityId && styles.placeholderText]}>
                {getSingleDisplayText(selectedMunicipalityId, municipalities, municipalityPlaceholder)}
            </Text>
            {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {municipalityError && <Text style={styles.errorText}>{municipalityError}</Text>}


        {/* --- Terms Agreement & Sign Up Button --- */}
        {/* ... (Same as before) ... */}
         <TouchableOpacity style={styles.termsContainer} onPress={() => setAgreedToTerms(!agreedToTerms)}>
           <MaterialCommunityIcons name={agreedToTerms ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={24} color={agreedToTerms ? COLORS.accent : COLORS.textSecondary}/>
           <Text style={styles.termsText}>I agree to the <Text style={styles.linkText}>Terms of Service</Text> & <Text style={styles.linkText}>Privacy Policy</Text></Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
           <Text style={styles.signUpButtonText}>Sign Up</Text>
         </TouchableOpacity>

      </ScrollView>

      {/* --- Modals --- */}
      <SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedId={selectedCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={handleCountyConfirm} />
      <SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedId={selectedMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={handleMunicipalityConfirm} />

    </SafeAreaView>
  );
}

// --- Styles ---
// Styles remain the same as the previous version
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
  requiredText: { color: COLORS.error, fontSize: 12, marginTop: 4, marginBottom: 12 },
  lengthHint: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 5 },
  eyeIcon: { paddingLeft: 10 },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 20 },
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flexShrink: 1, paddingRight: 10 },
  placeholderText: { color: COLORS.placeholder },
  disabledSelector: { backgroundColor: '#F0F0F0' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  termsText: { marginLeft: 10, fontSize: 14, color: COLORS.textSecondary, flexShrink: 1 },
  linkText: { fontWeight: 'bold', color: COLORS.accent },
  signUpButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  signUpButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold' },
  errorText: { color: COLORS.error, fontSize: 12, textAlign: 'center', marginTop: -15, marginBottom: 15 },
});