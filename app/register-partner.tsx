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
  Image,
  ActivityIndicator, // Added
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Use the SelectModal component we modified earlier
import SelectModal from '@/components/MultiSelectModal'; // Adjust path if needed
import * as ImagePicker from 'expo-image-picker';

// --- Define Types based on OpenAPI Spec ---
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; /* Add other fields if needed */ } // Assuming Service type
interface ApiDataItem { id: string; name: string; }

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';
// -----------------

// --- Placeholder Data (Services only, others will be fetched) ---
const dummyServiceCategories: ApiDataItem[] = [ { id: 's1', name: 'Cleaning' }, { id: 's2', name: 'Carpenter' }, { id: 's3', name: 'Painter' }, { id: 's4', name: 'Electrician' }, { id: 's5', name: 'Plumber' }];
// ---------------------------------------------------------


// --- Approximate Colors ---
const COLORS = { /* ... Same as before ... */
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
  placeholder: '#AAAAAA', accent: '#555555', headerBg: '#696969', headerText: '#FFFFFF',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
  logoButtonBg: '#F0F0F0', linkText: '#696969',
};


export default function RegisterPartnerScreen() {
  const router = useRouter();

  // Form state
  const [companyName, setCompanyName] = useState<string>('');
  const [regNumber, setRegNumber] = useState<string>('');
  const [companyLogoUri, setCompanyLogoUri] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  // Selection state (arrays for multi-select)
  const [selectedCountyIds, setSelectedCountyIds] = useState<string[]>([]);
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Modal visibility state
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);

  // Fetched Data State
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const [countyError, setCountyError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);

  // Add state for services if fetched, otherwise use dummy data for now
  const [services, setServices] = useState<ApiDataItem[]>(dummyServiceCategories); // Using dummy for now
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [serviceError, setServiceError] = useState<string | null>(null);


  // --- Fetch County List (on mount) ---
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
      } catch (error: any) { console.error("Failed fetch counties:", error); setCountyError(`Failed: ${error.message}`); }
      finally { setIsLoadingCounties(false); }
    };
    fetchCounties();
  }, []);

  // --- Fetch Municipalities based on Selected Counties ---
  const fetchMunicipalitiesForCounties = useCallback(async (countyIds: string[]) => {
    if (countyIds.length === 0) {
        setMunicipalities([]);
        setSelectedMunicipalityIds([]); // Clear selection if counties are cleared
        setMunicipalityError(null);
        return; // Exit if no counties selected
    }

    setIsLoadingMunicipalities(true);
    setMunicipalityError(null);
    setMunicipalities([]); // Clear previous results while fetching

    // Create an array of fetch promises
    const fetchPromises = countyIds.map(countyId => {
        const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`;
        console.log(`Workspaceing municipalities for county ${countyId} from: ${url}`);
        return fetch(url).then(async (response) => {
             console.log(`Muni Response Status for ${countyId}:`, response.status);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status} ${response.statusText} for CountyId ${countyId}`); }
            const contentType = response.headers.get("content-type");
             if (contentType?.includes("application/json")) {
                 return response.json() as Promise<MunicipalityMaster[]>;
             } else { const textData = await response.text(); console.error("Received non-JSON:", textData); throw new Error(`Received non-JSON for CountyId ${countyId}`); }
        });
    });

    try {
        const results = await Promise.all(fetchPromises);
        // Flatten the array of arrays, map to ApiDataItem, and remove duplicates
        const allMunicipalities = results.flat();
        const uniqueMunicipalitiesMap = new Map<string, ApiDataItem>();
        allMunicipalities.forEach(m => {
            const idStr = m.municipalityId.toString();
            if (!uniqueMunicipalitiesMap.has(idStr)) {
                uniqueMunicipalitiesMap.set(idStr, { id: idStr, name: m.municipalityName });
            }
        });
        const uniqueFormattedData = Array.from(uniqueMunicipalitiesMap.values());
        console.log("Combined unique municipalities:", uniqueFormattedData);
        setMunicipalities(uniqueFormattedData);

        // Filter out any selected municipalities that are no longer valid for the new county set
        setSelectedMunicipalityIds(prevIds => prevIds.filter(id => uniqueMunicipalitiesMap.has(id)));

    } catch (error: any) {
        console.error("Failed to fetch one or more municipality lists:", error);
        setMunicipalityError(`Failed municipalities: ${error.message}`);
        setMunicipalities([]); // Clear data on error
        setSelectedMunicipalityIds([]); // Clear selection on error
    } finally {
        setIsLoadingMunicipalities(false);
    }
  // Only include BASE_URL if it could change, which it doesn't here.
  }, []); // useCallback dependencies


  // --- Effect to trigger municipality fetch ---
  useEffect(() => {
    fetchMunicipalitiesForCounties(selectedCountyIds);
  }, [selectedCountyIds, fetchMunicipalitiesForCounties]);


  // --- Image Picker Logic ---
  const handlePickLogo = async () => { /* ... Same as before ... */
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required','...'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) { setCompanyLogoUri(result.assets[0].uri); }
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedIds: string[]) => setSelectedCountyIds(selectedIds);
  const handleMunicipalityConfirm = (selectedIds: string[]) => setSelectedMunicipalityIds(selectedIds);
  const handleServiceConfirm = (selectedIds: string[]) => setSelectedServiceIds(selectedIds);

  // --- Display Text (Multi-select) ---
  const getMultiDisplayText = (ids: string[], data: ApiDataItem[], placeholder: string) => {
    if (ids.length === 0) return placeholder;
    if (ids.length === 1) return data.find(item => item.id === ids[0])?.name ?? placeholder;
    return `${ids.length} selected`; // Example: Show count for multiple items
  };

  // Determine if Municipality selector should be enabled
  const isMunicipalityDisabled = selectedCountyIds.length === 0 || isLoadingMunicipalities || municipalityError !== null;
  const municipalityPlaceholder = selectedCountyIds.length === 0 ? 'Select County First' :
                                 isLoadingMunicipalities ? 'Loading Municipalities...' :
                                 municipalityError ? 'Error Loading' :
                                 'Select Municipality';


  // --- Sign Up Handler ---
  const handleSignUp = () => { /* ... Needs actual API call with multipart/form-data ... */
      console.log('Attempting Partner Sign Up:', { companyName, regNumber, description, phone, email, /* password hidden */ companyLogoUri, selectedCountyIds, selectedMunicipalityIds, selectedServiceIds });
      Alert.alert('Partner Sign Up Attempt', `Company: ${companyName}`);
      // API call logic using FormData for multipart/form-data needed here
      // Include LogoImage if companyLogoUri is not null
      // Send selected IDs arrays
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.headerText} /></TouchableOpacity>
         <Text style={styles.headerTitle}>Register As Partner</Text>
         <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>

        {/* --- Form Fields (Visible Part from Images) --- */}
        <View style={styles.inputContainer}><Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Company Name" value={companyName} onChangeText={setCompanyName} placeholderTextColor={COLORS.placeholder}/></View>
        <View style={styles.inputContainer}><Ionicons name="briefcase-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Registration Number" value={regNumber} onChangeText={setRegNumber} placeholderTextColor={COLORS.placeholder}/></View>
        <View style={styles.logoContainer}><Image source={companyLogoUri ? { uri: companyLogoUri } : require('@/assets/images/icon.png')} style={styles.logoPreview}/><TouchableOpacity style={styles.logoButton} onPress={handlePickLogo}><Text style={styles.logoButtonText}>Company Logo</Text></TouchableOpacity></View>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Company Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholderTextColor={COLORS.placeholder}/>

        {/* --- Selectors --- */}
        {/* County Selector */}
         <TouchableOpacity style={styles.selectorContainer} onPress={() => !isLoadingCounties && counties.length > 0 && setIsCountyModalVisible(true)} disabled={isLoadingCounties || countyError !== null}>
            <Text style={[styles.selectorText, selectedCountyIds.length === 0 && styles.placeholderText]}>{isLoadingCounties ? 'Loading Counties...' : getMultiDisplayText(selectedCountyIds, counties, 'Select County')}</Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
         </TouchableOpacity>
         {countyError && <Text style={styles.errorText}>{countyError}</Text>}

         {/* Municipality Selector */}
        <TouchableOpacity style={[styles.selectorContainer, isMunicipalityDisabled && styles.disabledSelector]} onPress={() => !isMunicipalityDisabled && municipalities.length > 0 && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled}>
            <Text style={[styles.selectorText, selectedMunicipalityIds.length === 0 && styles.placeholderText]}>
                {/* Show appropriate text based on state */}
                {getMultiDisplayText(selectedMunicipalityIds, municipalities, municipalityPlaceholder)}
            </Text>
            {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
         {municipalityError && <Text style={styles.errorText}>{municipalityError}</Text>}

         {/* Service Category Selector (Still uses dummy data) */}
        <TouchableOpacity style={styles.selectorContainer} onPress={() => !isLoadingServices && services.length > 0 && setIsServiceModalVisible(true)} disabled={isLoadingServices || serviceError !== null}>
            <Text style={[styles.selectorText, selectedServiceIds.length === 0 && styles.placeholderText]}>{isLoadingServices ? 'Loading Services...' : getMultiDisplayText(selectedServiceIds, services, 'Choose Service Category')}</Text>
            {isLoadingServices ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {serviceError && <Text style={styles.errorText}>{serviceError}</Text>}


        {/* --- Phone, Email, Password --- */}
        <View style={styles.inputContainer}><Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.placeholder}/></View>
        <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder}/></View>
        <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.placeholder}/><TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}><Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/></TouchableOpacity></View>
        {/* No Confirm Password */}

        {/* --- Sign Up Button --- */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>Sign up</Text>
        </TouchableOpacity>

        {/* --- Bottom Sign In Link --- */}
         <View style={styles.bottomLinkContainer}>
           <Text style={styles.bottomText}>Already have a partner account? </Text>
           <TouchableOpacity onPress={() => router.push('/login')}>
             <Text style={styles.bottomLink}>Sign In</Text>
           </TouchableOpacity>
         </View>

      </ScrollView>

       {/* --- Modals --- */}
       {/* Use mode="multi" and multi-select props/callbacks */}
       <SelectModal mode="multi" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedIds={selectedCountyIds} onClose={() => setIsCountyModalVisible(false)} onConfirmMulti={handleCountyConfirm} />
       <SelectModal mode="multi" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedIds={selectedMunicipalityIds} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmMulti={handleMunicipalityConfirm} />
       <SelectModal mode="multi" visible={isServiceModalVisible} title="Choose Service Category" data={services} initialSelectedIds={selectedServiceIds} onClose={() => setIsServiceModalVisible(false)} onConfirmMulti={handleServiceConfirm} />

    </SafeAreaView>
  );
}

// --- Styles ---
// Ensure all needed styles from previous versions are included
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, backgroundColor: COLORS.headerBg },
  backButton: { padding: 5, width: 34, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.headerText },
  container: { flexGrow: 1, paddingHorizontal: 25, paddingVertical: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 10, height: 50, marginBottom: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 16, color: COLORS.textPrimary },
  eyeIcon: { paddingLeft: 10 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 10, marginBottom: 15, borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#FFFFFF', fontSize: 16, color: COLORS.textPrimary },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  logoPreview: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, marginRight: 15, backgroundColor: COLORS.logoButtonBg },
  logoButton: { backgroundColor: COLORS.logoButtonBg, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor },
  logoButtonText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 15 },
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flexShrink: 1, paddingRight: 10 },
  placeholderText: { color: COLORS.placeholder },
  disabledSelector: { backgroundColor: '#F0F0F0' },
  signUpButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  signUpButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold' },
  bottomLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  bottomText: { fontSize: 14, color: COLORS.textSecondary },
  bottomLink: { fontSize: 14, color: COLORS.linkText, fontWeight: 'bold', marginLeft: 5 },
  errorText: { color: COLORS.error, fontSize: 12, textAlign: 'center', marginTop: -10, marginBottom: 10},
});