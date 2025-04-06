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
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SelectModal from '@/components/MultiSelectModal';
import { BASE_URL } from '@/constants/Api';
// Import ImagePicker
import * as ImagePicker from 'expo-image-picker';

// --- Define Types ---
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; imagePath?: string; imageContentType?: string; }
interface ApiDataItem { id: string; name: string; }
interface ApiResponse { statusCode: number; statusMessage: string; }
// Type for validation errors from API
interface ValidationErrors { [key: string]: string[]; }
interface ProblemDetails {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    errors?: ValidationErrors;
}
// --------------------

// --- Base URL ---
// -----------------

// --- Colors ---
const COLORS = { // Use your actual color constants
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
  placeholder: '#AAAAAA', accent: '#555555', headerBg: '#696969', headerText: '#FFFFFF',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
  logoButtonBg: '#F0F0F0', linkText: '#696969', buttonDisabledBg: '#AAAAAA',
};

export default function RegisterPartnerScreen() {
  const router = useRouter();

  // --- State variables ---
  const [companyName, setCompanyName] = useState<string>('');
  const [regNumber, setRegNumber] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [description, setDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [selectedCountyIds, setSelectedCountyIds] = useState<string[]>([]);
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const [countyError, setCountyError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);
  const [services, setServices] = useState<ApiDataItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  // --- Fetch County List ---
  useEffect(() => {
    const fetchCounties = async () => {
        setIsLoadingCounties(true); setCountyError(null);
        const url = `${BASE_URL}/api/County/GetCountyList`;
        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data: CountyMaster[] = await response.json();
            setCounties(data.map(c => ({ id: c.countyId.toString(), name: c.countyName })));
        } catch (error: any) { console.error("County fetch failed:", error); setCountyError(`County fetch failed: ${error.message}`); }
        finally { setIsLoadingCounties(false); }
    };
    fetchCounties();
  }, []);

  // --- Fetch Municipalities based on Selected Counties ---
  const fetchMunicipalitiesForCounties = useCallback(async (countyIds: string[]) => {
    if (countyIds.length === 0) { setMunicipalities([]); setSelectedMunicipalityIds([]); setMunicipalityError(null); return; }
    setIsLoadingMunicipalities(true); setMunicipalityError(null); setMunicipalities([]);
    const fetchPromises = countyIds.map(countyId => fetch(`${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`).then(res => res.ok ? res.json() : Promise.reject(new Error(`Muni fetch failed for ${countyId}`))));
    try {
        const results = await Promise.all(fetchPromises);
        const allMunicipalities: MunicipalityMaster[] = results.flat();
        const uniqueMunicipalitiesMap = new Map<string, ApiDataItem>();
        allMunicipalities.forEach(m => { const idStr = m.municipalityId.toString(); if (!uniqueMunicipalitiesMap.has(idStr)) { uniqueMunicipalitiesMap.set(idStr, { id: idStr, name: m.municipalityName }); } });
        setMunicipalities(Array.from(uniqueMunicipalitiesMap.values()));
        setSelectedMunicipalityIds(prevIds => prevIds.filter(id => uniqueMunicipalitiesMap.has(id)));
    } catch (error: any) { console.error("Municipality fetch failed:", error); setMunicipalityError(`Failed municipalities: ${error.message}`); setMunicipalities([]); setSelectedMunicipalityIds([]); }
    finally { setIsLoadingMunicipalities(false); }
  }, []);

  useEffect(() => { fetchMunicipalitiesForCounties(selectedCountyIds); }, [selectedCountyIds, fetchMunicipalitiesForCounties]);

   // --- Fetch Service List ---
   useEffect(() => {
    const fetchServices = async () => {
        setIsLoadingServices(true); setServiceError(null);
        const url = `${BASE_URL}/api/Service/GetServiceList`;
        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data: ServiceMaster[] = await response.json();
            setServices(data.map(s => ({ id: s.serviceId.toString(), name: s.serviceName })));
        } catch (error: any) { console.error("Service fetch failed:", error); setServiceError(`Service fetch failed: ${error.message}`); }
        finally { setIsLoadingServices(false); }
    };
    fetchServices();
  }, []);

  // --- Image Picker Logic ---
  const handlePickLogo = async () => {
    if (isSigningUp) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
    }
    try {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setCompanyLogo(result.assets[0]);
        }
    } catch (error) {
        console.error("handlePickLogo: Error launching image picker:", error);
        Alert.alert('Image Picker Error', 'Could not open image library.');
    }
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedIds: string[]) => setSelectedCountyIds(selectedIds);
  const handleMunicipalityConfirm = (selectedIds: string[]) => setSelectedMunicipalityIds(selectedIds);
  const handleServiceConfirm = (selectedIds: string[]) => setSelectedServiceIds(selectedIds);

  // --- Display Text (Multi-select) ---
  const getMultiDisplayText = (ids: string[], data: ApiDataItem[], placeholder: string) => {
    if (ids.length === 0) return placeholder;
    if (ids.length === 1) return data.find(item => item.id === ids[0])?.name ?? placeholder;
    return `${ids.length} selected`;
  };

  // --- Municipality Selector State Logic ---
  const isMunicipalityDisabled = selectedCountyIds.length === 0 || isLoadingMunicipalities || municipalityError !== null || (!isLoadingMunicipalities && municipalities.length === 0 && !municipalityError);
  const municipalityPlaceholder = selectedCountyIds.length === 0 ? 'Select County First' : isLoadingMunicipalities ? 'Loading Municipalities...' : municipalityError ? 'Error Loading' : municipalities.length === 0 ? 'No Municipalities Found' : 'Select Municipality';


   // --- Partner Sign Up Handler (FIXED) ---
   const handleSignUp = async () => {
    // --- Validation ---
    const requiredFields = [
        { value: companyName, name: "Company Name" },
        { value: companyLogo, name: "Company Logo" },
        { value: description, name: "Company Description" },
        { value: phone, name: "Phone Number" },
        { value: email, name: "Email" },
        { value: password, name: "Password" },
    ];
    const missingFields = requiredFields.filter(field => !field.value);
    const trimmedEmail = email.trim(); // Trim email for validation and use
    const trimmedPassword = password; // Keep password as is

    if (missingFields.length > 0) {
        Alert.alert('Missing Information', `Please provide: ${missingFields.map(f => f.name).join(', ')}`);
        return;
    }
    if (selectedCountyIds.length === 0) { Alert.alert('Missing Information', 'Please select at least one County.'); return; }
    if (selectedMunicipalityIds.length === 0) { Alert.alert('Missing Information', 'Please select at least one Municipality.'); return; }
    if (selectedServiceIds.length === 0) { Alert.alert('Missing Information', 'Please select at least one Service Category.'); return; }
    if (trimmedPassword.length < 8) { Alert.alert('Password Too Short', 'Password must be at least 8 characters.'); return; }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }

    // --- FormData Preparation ---
    setIsSigningUp(true);
    const formData = new FormData();
    formData.append('companyName', companyName);
    formData.append('registrationNumber', regNumber);
    formData.append('description', description);
    formData.append('contactPerson', companyName); // Revisit if contact person should be different
    formData.append('mobileNumber', phone);
    formData.append('emailId', trimmedEmail);
    formData.append('password', trimmedPassword);
    formData.append('active', 'true');
    // ** Add Username field using the trimmed email **
    formData.append('Username', trimmedEmail);

    // Append logo
    if (companyLogo) {
        const uriParts = companyLogo.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const fileName = companyLogo.fileName ?? `logo.${fileType}`;
        const logoFile = {
            uri: companyLogo.uri,
            name: fileName,
            type: companyLogo.mimeType ?? `image/${fileType}`,
        };
        formData.append('companyLogo', logoFile as any);
    }

    // Append arrays
    selectedCountyIds.forEach(id => formData.append('CountyId', id));
    selectedMunicipalityIds.forEach(id => formData.append('MunicipalityId', id));
    selectedServiceIds.forEach(id => formData.append('ServiceId', id));

    const url = `${BASE_URL}/api/Company/CompanySignUp`;
    console.log(`--- Attempting Partner Sign Up ---`);
    console.log(`URL: ${url}`);
    console.log('FormData Keys:', [...(formData as any)._parts.map((part: any[]) => part[0])].join(', ')); // Log keys

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        const responseText = await response.text();
        console.log(`Response Status: ${response.status}, Text: ${responseText}`);

        if (response.ok) {
            // Success handling (as before)
            let successMessage = 'Registration successful! Please log in.';
            try {
                const responseData: ApiResponse = JSON.parse(responseText);
                if (responseData?.statusMessage) {
                    successMessage = responseData.statusMessage;
                }
            } catch (e) {
                 console.warn("Could not parse success response as JSON:", e);
                 if (responseText && responseText.length < 150 && !responseText.trim().startsWith('<')) {
                    successMessage = responseText;
                 }
            }
            Alert.alert('Success!', successMessage, [
                { text: 'OK', onPress: () => router.replace('/login') }
            ]);
        } else {
            // Failure handling (as before)
            let errorTitle = 'Registration Failed';
            let errorMessage = `An error occurred (Status: ${response.status}).`;
            try {
                const errorData: ProblemDetails = JSON.parse(responseText);
                if (errorData.errors) {
                    errorTitle = errorData.title || 'Validation Errors';
                    errorMessage = "Please correct the following:\n" +
                        Object.entries(errorData.errors)
                            // ** Check if 'Username' error exists and provide specific feedback **
                            .map(([field, messages]) => {
                                if (field.toLowerCase() === 'username' && errorData.errors?.[field]?.includes("is already taken")) {
                                    return `- Email: This email is already registered as a partner. Try logging in.`;
                                }
                                return `- ${field}: ${(messages as string[]).join(', ')}`;
                            })
                            .join('\n');
                } else {
                    errorMessage = errorData.detail || errorData.title || responseText || errorMessage;
                    if (errorData.title && errorData.title !== errorTitle) {
                        errorTitle = errorData.title;
                    }
                }
            } catch (e) {
                console.warn("Could not parse error response as JSON:", e);
                if (responseText && responseText.length < 150 && !responseText.trim().startsWith('<')) {
                    errorMessage = responseText;
                }
            }
            Alert.alert(errorTitle, errorMessage);
        }
    } catch (error: any) {
        console.error("Partner Sign Up Error:", error);
        Alert.alert('Error', `An unexpected network or setup error occurred: ${error.message}`);
    } finally {
        setIsSigningUp(false);
    }
  };

  // --- JSX Structure (No changes needed here) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={() => !isSigningUp && router.back()} style={styles.backButton} disabled={isSigningUp}><Ionicons name="arrow-back" size={24} color={COLORS.headerText} /></TouchableOpacity>
         <Text style={styles.headerTitle}>Register As Partner</Text>
         <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Form Fields */}
        <View style={styles.inputContainer}><Ionicons name="business-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Company Name *" value={companyName} onChangeText={setCompanyName} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/></View>
        <View style={styles.inputContainer}><Ionicons name="briefcase-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Registration Number" value={regNumber} onChangeText={setRegNumber} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/></View>

        {/* Logo Picker */}
        <View style={styles.logoContainer}>
            <Image source={companyLogo?.uri ? { uri: companyLogo.uri } : require('@/assets/images/icon.png')} style={styles.logoPreview} />
            <TouchableOpacity style={[styles.logoButton, isSigningUp && styles.buttonDisabled]} onPress={handlePickLogo} disabled={isSigningUp}>
                <Text style={styles.logoButtonText}>{companyLogo ? 'Change Logo *' : 'Select Logo *'}</Text>
            </TouchableOpacity>
        </View>

        <TextInput style={[styles.input, styles.textArea]} placeholder="Company Description *" value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/>

        {/* Selectors */}
        <TouchableOpacity style={[styles.selectorContainer, (isLoadingCounties || countyError !== null || isSigningUp) && styles.disabledSelector ]} onPress={() => !isSigningUp && !isLoadingCounties && counties.length > 0 && !countyError && setIsCountyModalVisible(true)} disabled={isLoadingCounties || countyError !== null || isSigningUp}>
            <Text style={[styles.selectorText, selectedCountyIds.length === 0 && styles.placeholderText]}>{isLoadingCounties ? 'Loading Counties...' : countyError ? 'Error Loading Counties' : getMultiDisplayText(selectedCountyIds, counties, 'Select County *')}</Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {countyError && !isLoadingCounties && <Text style={styles.errorText}>{countyError}</Text>}

        <TouchableOpacity style={[styles.selectorContainer, (isMunicipalityDisabled || isSigningUp) && styles.disabledSelector]} onPress={() => !isSigningUp && !isMunicipalityDisabled && municipalities.length > 0 && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled || isSigningUp}>
            <Text style={[styles.selectorText, selectedMunicipalityIds.length === 0 && styles.placeholderText]}>{getMultiDisplayText(selectedMunicipalityIds, municipalities, municipalityPlaceholder + ' *')}</Text>
            {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {municipalityError && !isLoadingMunicipalities && <Text style={styles.errorText}>{municipalityError}</Text>}

        <TouchableOpacity style={[styles.selectorContainer, (isLoadingServices || serviceError !== null || isSigningUp) && styles.disabledSelector]} onPress={() => !isSigningUp && !isLoadingServices && services.length > 0 && !serviceError && setIsServiceModalVisible(true)} disabled={isLoadingServices || serviceError !== null || isSigningUp}>
            <Text style={[styles.selectorText, selectedServiceIds.length === 0 && styles.placeholderText]}>{isLoadingServices ? 'Loading Services...' : serviceError ? 'Error Loading Services' : getMultiDisplayText(selectedServiceIds, services, 'Choose Service Category *')}</Text>
            {isLoadingServices ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {serviceError && !isLoadingServices && <Text style={styles.errorText}>{serviceError}</Text>}


        {/* Phone, Email, Password */}
        <View style={styles.inputContainer}><Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Phone Number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/></View>
        <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/></View>
        <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Password (min 8 chars) *" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/><TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isSigningUp}><Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/></TouchableOpacity></View>

        {/* Sign Up Button */}
        <TouchableOpacity style={[styles.signUpButton, isSigningUp && styles.buttonDisabled]} onPress={handleSignUp} disabled={isSigningUp}>
            {isSigningUp ? <ActivityIndicator size="small" color={COLORS.buttonText} /> : <Text style={styles.signUpButtonText}>Sign up</Text>}
        </TouchableOpacity>

        {/* Bottom Sign In Link */}
         <View style={styles.bottomLinkContainer}>
           <Text style={styles.bottomText}>Already have a partner account? </Text>
           <TouchableOpacity onPress={() => !isSigningUp && router.push('/login')} disabled={isSigningUp}><Text style={styles.bottomLink}>Sign In</Text></TouchableOpacity>
         </View>

      </ScrollView>

       {/* Modals */}
       <SelectModal mode="multi" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedIds={selectedCountyIds} onClose={() => setIsCountyModalVisible(false)} onConfirmMulti={handleCountyConfirm} />
       <SelectModal mode="multi" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedIds={selectedMunicipalityIds} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmMulti={handleMunicipalityConfirm} />
       <SelectModal mode="multi" visible={isServiceModalVisible} title="Choose Service Category" data={services} initialSelectedIds={selectedServiceIds} onClose={() => setIsServiceModalVisible(false)} onConfirmMulti={handleServiceConfirm} />

    </SafeAreaView>
  );
}

// --- Styles (No changes needed here) ---
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
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 5 },
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flexShrink: 1, paddingRight: 10 },
  placeholderText: { color: COLORS.placeholder },
  disabledSelector: { backgroundColor: '#F0F0F0', opacity: 0.7 },
  signUpButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 25, minHeight: 50, justifyContent: 'center' },
  signUpButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, opacity: 0.7 },
  bottomLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  bottomText: { fontSize: 14, color: COLORS.textSecondary },
  bottomLink: { fontSize: 14, color: COLORS.linkText, fontWeight: 'bold', marginLeft: 5 },
  errorText: {
      color: COLORS.error,
      fontSize: 12,
      marginTop: 0,
      marginBottom: 10,
      alignSelf: 'flex-start',
      marginLeft: 5,
  },
});