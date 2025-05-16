// File: app/register-partner.tsx
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
  Switch // Keep Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Keep Ionicons
import { useRouter } from 'expo-router';
import SelectModal from '@/components/MultiSelectModal';
import { BASE_URL } from '@/constants/Api';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/config/i18n'; // Import the translation function

// --- Define Types (from original) ---
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; imagePath?: string; imageContentType?: string; }
interface ApiDataItem { id: string; name: string | null; } // Allow null name as per MultiSelectModal
interface ApiResponse { statusCode: number; statusMessage: string; }
interface ValidationErrors { [key: string]: string[]; }
interface ProblemDetails { type?: string; title?: string; status?: number; detail?: string; errors?: ValidationErrors; }
// --- Base URL ---
// Imported from '@/constants/Api'

// --- Colors (from original) ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
  placeholder: '#AAAAAA', accent: '#555555', headerBg: '#696969', headerText: '#FFFFFF',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
  logoButtonBg: '#F0F0F0', linkText: '#696969', buttonDisabledBg: '#AAAAAA',
  switchThumb: '#FFFFFF', switchTrackTrue: '#696969', switchTrackFalse: '#CCCCCC',
  labelColor: '#666666', // Added for labels in original styles for switch
};

export default function RegisterPartnerScreen() {
  const router = useRouter();

  // --- State variables (mostly from original) ---
  const [companyName, setCompanyName] = useState<string>('');
  const [regNumber, setRegNumber] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [description, setDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [is24x7Enabled, setIs24x7Enabled] = useState<boolean>(false);
  const [selectedCountyIds, setSelectedCountyIds] = useState<string[]>([]);
  const [selectedMunicipalityIds, setSelectedMunicipalityIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);

  // Store full data for mapping IDs to names
  const [allCounties, setAllCounties] = useState<ApiDataItem[]>([]);
  const [allMunicipalities, setAllMunicipalities] = useState<ApiDataItem[]>([]);
  const [allServices, setAllServices] = useState<ApiDataItem[]>([]);

  // Renamed state variables for clarity
  const [isLoadingCountiesData, setIsLoadingCountiesData] = useState<boolean>(false);
  const [countyDataError, setCountyDataError] = useState<string | null>(null);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<ApiDataItem[]>([]); // Municipalities filtered by selected counties
  const [isLoadingMunicipalitiesData, setIsLoadingMunicipalitiesData] = useState<boolean>(false);
  const [municipalityDataError, setMunicipalityDataError] = useState<string | null>(null);
  const [isLoadingServicesData, setIsLoadingServicesData] = useState<boolean>(false);
  const [serviceDataError, setServiceDataError] = useState<string | null>(null);

  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  // --- Fetch County List ---
  useEffect(() => {
    const fetchCounties = async () => {
      setIsLoadingCountiesData(true); setCountyDataError(null);
      const url = `${BASE_URL}/api/County/GetCountyList`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CountyMaster[] = await response.json();
        const formattedCounties = data.map(c => ({ id: c.countyId.toString(), name: c.countyName }));
        setAllCounties(formattedCounties);
      } catch (error: any) {
        console.error("County fetch failed:", error);
        setCountyDataError(`County fetch failed: ${error.message}`);
      } finally {
        setIsLoadingCountiesData(false);
      }
    };
    fetchCounties();
  }, []);

  // --- Fetch Municipalities based on Selected Counties ---
  const fetchMunicipalitiesForCounties = useCallback(async (countyIds: string[]) => {
    if (countyIds.length === 0) {
      setFilteredMunicipalities([]);
      setAllMunicipalities([]); // Clear all municipalities too
      setSelectedMunicipalityIds([]);
      setMunicipalityDataError(null);
      return;
    }
    setIsLoadingMunicipalitiesData(true);
    setMunicipalityDataError(null);
    setFilteredMunicipalities([]); // Clear previous results while loading

    const fetchPromises = countyIds.map(countyId =>
      fetch(`${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Muni fetch failed for ${countyId}`)))
    );
    try {
      const results = await Promise.all(fetchPromises);
      const fetchedMunicipalities: MunicipalityMaster[] = results.flat();
      const uniqueMunicipalitiesMap = new Map<string, ApiDataItem>();
      fetchedMunicipalities.forEach(m => {
        const idStr = m.municipalityId.toString();
        // Ensure name is not null or empty for display
        if (!uniqueMunicipalitiesMap.has(idStr) && m.municipalityName) {
          uniqueMunicipalitiesMap.set(idStr, { id: idStr, name: m.municipalityName });
        }
      });
      const validMunicipalities = Array.from(uniqueMunicipalitiesMap.values());
      setFilteredMunicipalities(validMunicipalities); // Set the filtered list for the modal
      setAllMunicipalities(validMunicipalities); // Also update all municipalities available based on current county selection

      // Filter out selected municipalities that are no longer valid
      setSelectedMunicipalityIds(prevIds => prevIds.filter(id => uniqueMunicipalitiesMap.has(id)));
    } catch (error: any) {
      console.error("Municipality fetch failed:", error);
      setMunicipalityDataError(`Failed municipalities: ${error.message}`);
      setFilteredMunicipalities([]);
      setAllMunicipalities([]);
      setSelectedMunicipalityIds([]);
    } finally {
      setIsLoadingMunicipalitiesData(false);
    }
  }, []);

  useEffect(() => {
    fetchMunicipalitiesForCounties(selectedCountyIds);
  }, [selectedCountyIds, fetchMunicipalitiesForCounties]);

  // --- Fetch Service List ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServicesData(true); setServiceDataError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: ServiceMaster[] = await response.json();
        const formattedServices = data.map(s => ({ id: s.serviceId.toString(), name: s.serviceName }));
        setAllServices(formattedServices);
      } catch (error: any) {
        console.error("Service fetch failed:", error);
        setServiceDataError(`Service fetch failed: ${error.message}`);
      } finally {
        setIsLoadingServicesData(false);
      }
    };
    fetchServices();
  }, []);

  // --- Image Picker Logic ---
  const handlePickLogo = async () => {
      if (isSigningUp) return;
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert(t('permissionrequired_title'), t('medialibraryaccessneeded'));
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
          console.error("handlePickLogo Error:", error);
          Alert.alert(t('libraryerror'));
      }
  };

  // --- Modal Handlers ---
  const handleCountyConfirm = (selectedIds: string[]) => {
      setSelectedCountyIds(selectedIds);
  };
  const handleMunicipalityConfirm = (selectedIds: string[]) => {
      setSelectedMunicipalityIds(selectedIds);
  };
  const handleServiceConfirm = (selectedIds: string[]) => {
      setSelectedServiceIds(selectedIds);
  };

  // --- Placeholder Text Logic ---
  const isMunicipalitySelectorDisabled = selectedCountyIds.length === 0 || isLoadingMunicipalitiesData || municipalityDataError !== null || (!isLoadingMunicipalitiesData && filteredMunicipalities.length === 0 && !municipalityDataError);
  const municipalitySelectorPlaceholder = selectedCountyIds.length === 0
    ? t('selectcountyfirst')
    : isLoadingMunicipalitiesData
      ? t('loadingmunicipalities')
      : municipalityDataError
        ? t('errormunicipalities')
        : filteredMunicipalities.length === 0 && !isLoadingMunicipalitiesData
          ? t('nomunicipalities')
          : t('selectmunicipality'); // Default placeholder


  // --- Partner Sign Up Handler (Keep original logic, just ensure state vars used are correct) ---
   const handleSignUp = async () => {
    // Validation (Original logic with translated alerts)
    const requiredFields = [
        { value: companyName, name: t('companyname') },
        { value: companyLogo, name: t('companylogo') },
        { value: description, name: t('companydescription') },
        { value: phone, name: t('phonenumber') },
        { value: email, name: t('email') },
        { value: password, name: t('password') },
    ];
    const missingFields = requiredFields.filter(field => !field.value);
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (missingFields.length > 0) { Alert.alert(t('missinginfo'), t('provide', { fields: missingFields.map(f => f.name).join(', ') })); return; }
    if (selectedCountyIds.length === 0) { Alert.alert(t('missinginfo'), t('selectcounty')+"*"); return; }
    if (selectedMunicipalityIds.length === 0) { Alert.alert(t('missinginfo'), t('selectmunicipality')+"*"); return; }
    if (selectedServiceIds.length === 0) { Alert.alert(t('missinginfo'), t('selectservice')+"*"); return; }
    if (trimmedPassword.length < 8) { Alert.alert(t('passwordtooshorttitle'), t('passwordtooshort')); return; }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
        Alert.alert(t('invalidemailtitle'), t('invalidemail'));
        return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) { Alert.alert(t('invalidphonenumber'), t('enter10digitnumber')); return; }

    // --- FormData Preparation (Original logic) ---
    setIsSigningUp(true);
    const formData = new FormData();
    formData.append('CompanyName', companyName);
    formData.append('CompanyRegistrationNumber', regNumber);
    formData.append('CompanyPresentation', description);
    formData.append('ContactPerson', companyName); // Original used companyName
    formData.append('MobileNumber', phone);
    formData.append('EmailId', trimmedEmail);
    formData.append('Password', trimmedPassword);
    formData.append('Active', 'true');
    formData.append('Username', trimmedEmail); // Original used email as username
    formData.append('Is24X7', is24x7Enabled.toString()); // Use original state var

    // Append logo (Original logic)
    if (companyLogo) {
        const uriParts = companyLogo.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const fileName = companyLogo.fileName ?? `logo.${fileType}`;
        const logoFile = {
            uri: companyLogo.uri,
            name: fileName,
            type: companyLogo.mimeType ?? `image/${fileType}`, // Use mimeType from asset
        };
        formData.append('LogoImage', logoFile as any);
    }

    // Append arrays (Original logic)
    selectedCountyIds.forEach(id => formData.append('CountyIdList', id));
    selectedMunicipalityIds.forEach(id => formData.append('MunicipalityIdList', id));
    selectedServiceIds.forEach(id => formData.append('ServiceIdList', id));

    const url = `${BASE_URL}/api/Company/CompanySignUp`;
    console.log(`--- Attempting Partner Sign Up ---`);
    console.log(`URL: ${url}`);
    console.log('FormData Keys:', [...(formData as any)._parts.map((part: any[]) => part[0])].join(', '));
    console.log('Is24X7 value being sent:', is24x7Enabled.toString());

    // --- API Call and Response Handling (Original logic with translated alerts) ---
    try {
        const response = await fetch(url, { method: 'POST', body: formData, });
        const responseText = await response.text();
        console.log(`Response Status: ${response.status}, Text: ${responseText}`);
        if (response.ok) {
            let successMessage = t('registrationsuccessful');
            try { const responseData: ApiResponse = JSON.parse(responseText); if (responseData?.statusMessage) successMessage = responseData.statusMessage; }
            catch (e) { if (responseText && responseText.length < 150 && !responseText.trim().startsWith('<')) successMessage = responseText; }
            Alert.alert(t('success'), successMessage, [ { text: t('ok'), onPress: () => router.replace('/login') } ]);
        } else {
            let errorTitle = t('registrationfailed');
            let errorMessage = `${t('error')} (Status: ${response.status}).`;
            try {
                const errorData: ProblemDetails = JSON.parse(responseText);
                if (errorData.errors) {
                    errorTitle = errorData.title || t('validationerrors');
                    errorMessage = t('correctfollowing') + "\n" + Object.entries(errorData.errors).map(([field, messages]) => {
                        let translatedField = t(field.toLowerCase()) || field;
                        let translatedMessages = (messages as string[]).join(', ');
                        if (field.toLowerCase() === 'username' && errorData.errors?.[field]?.includes("is already taken")) {
                            return `- ${t('email')}: ${t('emailAlreadyRegistered')}`;
                        }
                        return `- ${translatedField}: ${translatedMessages}`;
                    }).join('\n');
                } else { errorMessage = errorData.detail || errorData.title || responseText || errorMessage; if (errorData.title && errorData.title !== errorTitle) errorTitle = errorData.title; }
            } catch (e) { if (responseText && responseText.length < 150 && !responseText.trim().startsWith('<')) errorMessage = responseText; }
            Alert.alert(errorTitle, errorMessage);
        }
    } catch (error: any) {
        console.error("Partner Sign Up Network/Setup Error:", error);
        Alert.alert(t('error'), t('unexpectednetworkerrorwithmessage', { message: error.message }));
    } finally {
        setIsSigningUp(false);
    }
   };
   // --- End Partner Sign Up Handler ---

  // --- JSX Structure (Updated for Chips removed) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header (Original structure) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => !isSigningUp && router.back()} style={styles.backButton} disabled={isSigningUp}>
            <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('registeraspartner')}</Text>
        <View style={styles.backButton} /> {/* Keep for spacing */}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Form Fields (Original structure) */}
        <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder={t('companyname') + ' *'} value={companyName} onChangeText={setCompanyName} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/>
        </View>
        <View style={styles.inputContainer}>
            <Ionicons name="briefcase-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder={t('registrationnumberplaceholder')} value={regNumber} onChangeText={setRegNumber} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/>
        </View>
        {/* Logo Picker (Original structure) */}
        <View style={styles.logoContainer}>
            <View
     style={[styles.logoPreview, {backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center'}]}>
     {!companyLogo?.uri && <Ionicons name="business-outline" size={30} color={COLORS.textSecondary} />}
     {companyLogo?.uri && <Image source={{ uri: companyLogo.uri }} style={{width: '100%', height: '100%', borderRadius: 8}} />}
</View>
             <TouchableOpacity style={[styles.logoButton, isSigningUp && styles.buttonDisabled]} onPress={handlePickLogo} disabled={isSigningUp}>
                <Text style={styles.logoButtonText}>{companyLogo ? t('changelogo') + ' *' : t('selectlogo') + ' *'}</Text>
             </TouchableOpacity>
        </View>
        <TextInput
             style={[styles.input, styles.textArea]} // Original included input style
             placeholder={t('companydescription') + ' *'}
             value={description}
             onChangeText={setDescription}
             multiline
             numberOfLines={4}
             placeholderTextColor={COLORS.placeholder}
             editable={!isSigningUp}/>

        {/* 24x7 Toggle Switch (Original structure) */}
         <View style={styles.switchContainer}>
            <Text style={styles.inputLabel}>{t('available24x7label')}</Text>
            <Switch
                trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.switchTrackTrue }}
                thumbColor={COLORS.switchThumb}
                ios_backgroundColor={COLORS.switchTrackFalse}
                onValueChange={setIs24x7Enabled}
                value={is24x7Enabled}
                disabled={isSigningUp}
            />
        </View>

        {/* --- County Selector --- */}
        <TouchableOpacity style={styles.selectorButton} onPress={() => !isSigningUp && setIsCountyModalVisible(true)} disabled={isSigningUp}>
          <Text style={styles.selectorText}>
            {selectedCountyIds.length > 0
              ? `${selectedCountyIds.length} items selected`
              : t('selectcounty')}
            </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {countyDataError && !isLoadingCountiesData && <Text style={styles.errorText}>{countyDataError}</Text>}


        {/* --- Municipality Selector --- */}
        <TouchableOpacity
          style={[styles.selectorButton, selectedCountyIds.length === 0 && styles.selectorButtonDisabled]}
          onPress={() => !isSigningUp && selectedCountyIds.length > 0 && setIsMunicipalityModalVisible(true)}
          disabled={isSigningUp || selectedCountyIds.length === 0}
        >
          <Text style={styles.selectorText}>
            {selectedMunicipalityIds.length > 0
              ? `${selectedMunicipalityIds.length} items selected`
              : municipalitySelectorPlaceholder}
             </Text>
          <Ionicons name="chevron-down" size={20} color={selectedCountyIds.length === 0 ? COLORS.placeholder : COLORS.textSecondary} />
        </TouchableOpacity>
        {municipalityDataError && !isLoadingMunicipalitiesData && <Text style={styles.errorText}>{municipalityDataError}</Text>}


        {/* --- Service Selector --- */}
        <TouchableOpacity style={styles.selectorButton} onPress={() => !isSigningUp && setIsServiceModalVisible(true)} disabled={isSigningUp}>
          <Text style={styles.selectorText}>
            {selectedServiceIds.length > 0
              ? `${selectedServiceIds.length} items selected`
              : t('selectservice')}
            </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {serviceDataError && !isLoadingServicesData && <Text style={styles.errorText}>{serviceDataError}</Text>}


        {/* --- Phone, Email, Password (Original structure) --- */}
        <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder={t('phonenumber') + ' *'} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.placeholder} editable={!isSigningUp} maxLength={10} />
        </View>
        <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder={t('email') + ' *'} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/>
        </View>
        <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder={t('passwordmin8chars') + ' *'} value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholderTextColor={COLORS.placeholder} editable={!isSigningUp}/>
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} disabled={isSigningUp}>
                <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textSecondary} style={styles.eyeIcon}/>
            </TouchableOpacity>
        </View>

        {/* Sign Up Button (Original structure) */}
        <TouchableOpacity style={[styles.signUpButton, isSigningUp && styles.buttonDisabled]} onPress={handleSignUp} disabled={isSigningUp}>
            {isSigningUp ? <ActivityIndicator size="small" color={COLORS.buttonText} /> : <Text style={styles.signUpButtonText}>{t('signup')}</Text>}
        </TouchableOpacity>

        {/* Bottom Sign In Link (Original structure) */}
         <View style={styles.bottomLinkContainer}>
            <Text style={styles.bottomText}>{t('alreadyhavepartneraccount')}</Text>
            <TouchableOpacity onPress={() => !isSigningUp && router.push('/login')} disabled={isSigningUp}>
                <Text style={styles.bottomLink}>{t('signin')}</Text>
            </TouchableOpacity>
         </View>

      </ScrollView>

       {/* --- Modals (Updated data sources) --- */}
       <SelectModal
           mode="multi"
           visible={isCountyModalVisible}
           title={t('selectcounty')}
           data={allCounties} // Use full list for modal
           initialSelectedIds={selectedCountyIds}
           onClose={() => setIsCountyModalVisible(false)}
           onConfirmMulti={handleCountyConfirm} />
       <SelectModal
           mode="multi"
           visible={isMunicipalityModalVisible}
           title={t('selectmunicipality')}
           data={filteredMunicipalities} // Use filtered list for modal
           initialSelectedIds={selectedMunicipalityIds}
           onClose={() => setIsMunicipalityModalVisible(false)}
           onConfirmMulti={handleMunicipalityConfirm} />
       <SelectModal
           mode="multi"
           visible={isServiceModalVisible}
           title={t('selectservice')}
           data={allServices} // Use full list for modal
           initialSelectedIds={selectedServiceIds}
           onClose={() => setIsServiceModalVisible(false)}
           onConfirmMulti={handleServiceConfirm} />

    </SafeAreaView>
  );
}

// --- Styles (Removed Chip styles) ---
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
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5, },
  inputLabel: { fontSize: 16, color: COLORS.labelColor, marginRight: 10, },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 5 }, // Reduced bottom margin
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flexShrink: 1, paddingRight: 10 },
  placeholderText: { color: COLORS.placeholder }, // Re-added placeholder style for consistency
  disabledSelector: { backgroundColor: '#F0F0F0', opacity: 0.7 },
  signUpButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 25, minHeight: 50, justifyContent: 'center' },
  signUpButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, opacity: 0.7 },
  bottomLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  bottomText: { fontSize: 14, color: COLORS.textSecondary },
  bottomLink: { fontSize: 14, color: COLORS.linkText, fontWeight: 'bold', marginLeft: 5 },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 2, marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5, }, // Adjusted margin

  // --- New styles for the selector buttons ---
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 50,
    marginBottom: 15, // Add margin below button now chips are gone
  },
  selectorButtonDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    color: COLORS.labelColor,
    marginBottom: 5,
    marginTop: 15,
  },
});