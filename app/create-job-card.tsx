// File: app/create-job-card.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView, // Ensure imported
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SelectModal from '@/components/MultiSelectModal';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

// --- Define Types ---
interface ApiDataItem { id: string; name: string; }
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; }
// Type for profile data (subset needed here) - adjust if structure differs
interface UserProfileInfo { userName?: string; /* other fields if needed */ }
interface PartnerProfileInfo { companyName?: string; contactPerson?: string; /* other fields */ }


// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030'; // Use updated URL
// -----------------

// --- Colors (Consistent with theme) ---
const COLORS = {
  background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#666666',
  placeholder: '#AAAAAA', accent: '#696969', headerBg: '#FFFFFF',
  headerText: '#333333', error: '#D9534F', borderColor: '#E0E0E0',
  buttonBg: '#696969', buttonText: '#FFFFFF', buttonDisabledBg: '#AAAAAA',
  imagePickerBg: '#FFFFFF', imagePickerBorder: '#CCCCCC', tagBg: '#E0E0E0',
  tagText: '#333333', tagIcon: '#555555',
};
// --------------------

export default function CreateJobCardScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Get session info (includes id, type, email)

  // --- State Variables ---
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);

  // Data fetched for selectors
  const [services, setServices] = useState<ApiDataItem[]>([]); // Stores {id, name} for services
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);

  // Loading/Error states for fetched data
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [countyError, setCountyError] = useState<string | null>(null);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);

  // Modal visibility
  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false); // For Save button state
  const [userName, setUserName] = useState<string>(''); // To store user/contact name

  // --- Fetch Initial Data (Services, Counties, User Name) ---
  useEffect(() => {
    // Fetch Services
    const fetchServices = async () => {
        setIsLoadingServices(true); setServiceError(null);
        const url = `${BASE_URL}/api/Service/GetServiceList`;
        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`Service fetch failed: ${response.status}`); }
            const data: ServiceMaster[] = await response.json();
            setServices(data.map(s => ({ id: s.serviceId.toString(), name: s.serviceName })));
        } catch (error: any) { console.error("Service fetch failed:", error); setServiceError(error.message); }
        finally { setIsLoadingServices(false); }
    };

    // Fetch Counties
    const fetchCounties = async () => {
        setIsLoadingCounties(true); setCountyError(null);
        const url = `${BASE_URL}/api/County/GetCountyList`;
        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`County fetch failed: ${response.status}`); }
            const data: CountyMaster[] = await response.json();
            setCounties(data.map(c => ({ id: c.countyId.toString(), name: c.countyName })));
        } catch (error: any) { console.error("County fetch failed:", error); setCountyError(error.message); }
        finally { setIsLoadingCounties(false); }
    };

    // Fetch User/Partner Name for 'ReportingPerson' field
// Inside useEffect in app/create-job-card.tsx
const fetchUserName = async () => {
    setUserName(''); // Reset name initially
    if (session && session.email) {
      const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
      const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`;
      console.log(`Workspaceing reporting name from: ${detailUrl}`);
      try {
        const response = await fetch(detailUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Received profile data for name:', JSON.stringify(data, null, 2));

        // Extract the appropriate name field
        let fetchedName = '';
        if (session.type === 'partner') {
          // For partner, check contactPerson or companyName (adjust if needed based on GetCompanyDetail response)
          fetchedName = data?.contactPerson || data?.companyName;
        } else {
          // --- Corrected name extraction for user ---
          fetchedName = data?.username; // Use lowercase 'u'
          // -----------------------------------------
        }

        if (fetchedName) {
          setUserName(fetchedName);
          console.log(`Successfully set reporting name to: ${fetchedName}`);
        } else {
          throw new Error(`Name field ('${session.type === 'partner' ? 'contactPerson/companyName' : 'username'}') not found or empty in API response.`);
        }

      } catch (error: any) {
        console.error("Failed to fetch user/company name:", error);
        setUserName('');
        Alert.alert("Error Fetching Details", `Could not fetch necessary user/company details for reporting person: ${error.message}`);
      }
    } else {
         console.log("No session found, cannot fetch user name.");
         setUserName('');
    }
  };
    fetchServices();
    fetchCounties();
    fetchUserName(); // Fetch name when session changes as well
  }, [session]); // Rerun if session changes

  // --- Fetch Municipalities based on Selected County ---
  const fetchMunicipalities = useCallback(async (countyId: string) => {
      setIsLoadingMunicipalities(true); setMunicipalityError(null); setMunicipalities([]);
      const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`;
      try {
          const response = await fetch(url);
          if (!response.ok) { throw new Error(`Municipality fetch failed: ${response.status}`); }
          const data: MunicipalityMaster[] = await response.json();
          setMunicipalities(data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName })));
      } catch (error: any) { console.error("Failed to fetch municipalities:", error); setMunicipalityError(error.message); }
      finally { setIsLoadingMunicipalities(false); }
  }, []);

  useEffect(() => {
    if (selectedCountyId) { fetchMunicipalities(selectedCountyId); }
    else { setMunicipalities([]); setSelectedMunicipalityId(null); setMunicipalityError(null); }
  }, [selectedCountyId, fetchMunicipalities]);


  // --- Image Picker Logic ---
  const handleChooseImage = async () => {
      if (selectedImages.length >= 3) { Alert.alert("Limit Reached", "You can select a maximum of 3 images."); return; }
      Alert.alert( "Select Image Source", "",
        [ { text: "Camera", onPress: async () => {
              const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
              if (permissionResult.granted === false) { Alert.alert("Permission Required", "Camera access is needed to take photos."); return; }
              try {
                const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
                if (!result.canceled && result.assets) { setSelectedImages(prev => [...prev, result.assets[0]]); }
              } catch (error) { console.error("launchCameraAsync Error:", error); Alert.alert('Camera Error', 'Could not open camera.'); } } },
          { text: "Library", onPress: async () => {
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (permissionResult.granted === false) { Alert.alert("Permission Required", "Media library access is needed to choose photos."); return; }
              try {
                  let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7, });
                  if (!result.canceled && result.assets) {
                     const newImages = result.assets.slice(0, 3 - selectedImages.length); setSelectedImages(prev => [...prev, ...newImages]); }
              } catch (error) { console.error("launchImageLibraryAsync Error:", error); Alert.alert('Library Error', 'Could not open image library.'); } } },
          { text: "Cancel", style: "cancel" }, ] );
  };
  const handleRemoveImage = (uriToRemove: string) => {
      setSelectedImages(prev => prev.filter(img => img.uri !== uriToRemove));
  };

  // --- Modal Handlers ---
  const handleServiceConfirm = (selectedIds: string[]) => { setSelectedServiceIds(selectedIds); };
  const handleCountyConfirm = (selectedId: string | null) => { if (selectedCountyId !== selectedId) { setSelectedCountyId(selectedId); setSelectedMunicipalityId(null); } };
  const handleMunicipalityConfirm = (selectedId: string | null) => { setSelectedMunicipalityId(selectedId); };

  // --- Helper to get names from IDs ---
  const getSelectedNames = (ids: string[], data: ApiDataItem[]): string[] => { const selectedMap = new Map(data.map(item => [item.id, item.name])); return ids.map(id => selectedMap.get(id)).filter((name): name is string => !!name); };

// Updated handleSave function for app/create-job-card.tsx

const handleSave = async () => {
    // 1. Check Login Status (Crucial - Ensure session.id and name are available if needed)
    if (!session) { // Check only for session existence, not necessarily ID if omitting UserId
       Alert.alert("Not Logged In", "You must be logged in to create a job request.", [
            { text: "Cancel", style: "cancel"},
            { text: "Log In", onPress: () => router.push('/login')}
       ]);
       return;
    }
     // Fetch user name if not already available (or handle if fetching failed)
     if (!userName) {
          Alert.alert('Missing Information', 'Could not retrieve user/company name for reporting. Please ensure profile details loaded correctly or try again.');
          return;
     }


    // 2. Frontend Validation (Based on UI fields)
    const trimmedDescription = description.trim();
    let validationError = '';
    if (selectedImages.length === 0) validationError = 'Please select at least one image.';
    else if (selectedServiceIds.length === 0) validationError = 'Please select at least one service category.';
    else if (!trimmedDescription) validationError = 'Please enter a description.';
    else if (!selectedCountyId) validationError = 'Please select a county.';
    else if (!selectedMunicipalityId) validationError = 'Please select a municipality.';
    // Removed explicit userName check here as it's checked above before starting save

    if (validationError) {
        Alert.alert('Missing Information', validationError);
        return;
    }

    setIsSaving(true);

    // 3. Prepare FormData according to the latest instructions
    const formData = new FormData();

    // Map selected Service IDs to Names and join
    const serviceNamesMap = new Map(services.map(item => [item.id, item.name]));
    const selectedServiceNamesString = selectedServiceIds
                                        .map(id => serviceNamesMap.get(id))
                                        .filter(name => !!name)
                                        .join(',');

    // Append fields based on the FINAL instructions
    formData.append('ReportingDescription', trimmedDescription);
    formData.append('CountyId', selectedCountyId as string);
    formData.append('MunicipalityId', selectedMunicipalityId as string);
    formData.append('ReportingPerson', userName); // User's name fetched previously
    formData.append('ToCraftmanType', selectedServiceNamesString); // Comma-separated names
    formData.append('Status', 'Created');
    formData.append('TicketId', '1'); // Hardcoded as 1
    formData.append('OperationId', '1'); // Hardcoded as 1
    formData.append('City', 'NA'); // Placeholder
    formData.append('Address', 'NA'); // Placeholder
    formData.append('Pincode', '000000'); // Placeholder

    // --- Fields to OMIT based on latest instructions ---
    // formData.append('UserId', session.id.toString()); // OMITTING UserId
    // formData.append('UserName', userName); // OMITTING UserName (Using ReportingPerson)
    // formData.append('UserEmailId', session.email); // OMITTING UserEmailId
    // formData.append('UserMobileNumber', '...'); // OMITTING UserMobileNumber
    // formData.append('CountyName', '...'); // OMITTING CountyName
    // formData.append('MunicipalityName', '...'); // OMITTING MunicipalityName
    // ... omit other non-essential fields like Review*, Company*, ClosingOTP, CreatedOn, UpdatedOn ...


    // Append Images (as requested)
    selectedImages.forEach((image, index) => {
      const uriParts = image.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const mimeType = image.mimeType ?? `image/${fileType}`;
      const fileName = image.fileName ?? `job_image_${index}.${fileType}`;
      formData.append('Images', { uri: image.uri, name: fileName, type: mimeType, } as any);
    });

    console.log("--- Attempting to Save Job Card (Final Instructions) ---");
    // Logging FormData is difficult for files, log other key fields if needed for debug
    console.log("ReportingPerson:", userName);
    console.log("CountyId:", selectedCountyId);
    console.log("MunicipalityId:", selectedMunicipalityId);
    console.log("ToCraftmanType:", selectedServiceNamesString);
    console.log("TicketId:", "1");
    console.log("OperationId:", "1");


    // 4. Make API Call
    const url = `${BASE_URL}/api/IssueTicket/IssueTicket`;
    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        const responseText = await response.text();
        console.log("Save Response Status:", response.status);
        console.log("Save Response Text:", responseText);

        if (response.ok) {
            let successMessage = "Job card created successfully!";
            let newTicketId = null;
            try {
                 // Parse the JSON response
                 const result = JSON.parse(responseText);
                 // Extract statusCode as the TicketId
                 newTicketId = result?.statusCode;
                 // Use statusMessage if available
                 successMessage = result?.statusMessage || successMessage;
                 // Add the extracted TicketId to the success message
                 if (newTicketId !== null && newTicketId !== undefined) {
                     successMessage += ` Ticket ID: ${newTicketId}`;
                 } else {
                     // Handle case where statusCode might be missing, though API returns it
                     console.warn("Success response received, but statusCode (TicketId) was missing.");
                 }

            } catch (e) {
                 console.error("Could not parse success response JSON:", e);
                 // Use default success message if parsing fails
            }
            Alert.alert('Success', successMessage, [{ text: 'OK', onPress: () => router.back() }]);
       } else {
             let errorMessage = `Failed (Status: ${response.status})`;
             try {
                  const errorData = JSON.parse(responseText);
                  if (errorData.errors && typeof errorData.errors === 'object') {
                      errorMessage = errorData.title || "Validation Errors:\n";
                      errorMessage += Object.entries(errorData.errors).map(([field, messages]) => `- ${field}: ${(messages as string[]).join(', ')}`).join('\n');
                  } else { errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage; }
             } catch (e) { errorMessage = responseText || errorMessage; }
             Alert.alert('Error Creating Job Card', errorMessage);
        }
    } catch (error: any) {
        console.error("Save Job Card Error:", error);
        Alert.alert('Error', `An unexpected network or setup error occurred: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };
  // --- End Save Handler ---


  // --- Render Logic ---
  const isMunicipalityDisabled = !selectedCountyId || isLoadingMunicipalities || municipalityError !== null;
  const municipalityPlaceholder = !selectedCountyId ? 'Select County First' : isLoadingMunicipalities ? 'Loading...' : municipalityError ? 'Error Loading' : 'Select Municipality';
  const serviceNamesMap = new Map(services.map(item => [item.id, item.name])); // Map for displaying names
  const selectedServiceNames = selectedServiceIds.map(id => serviceNamesMap.get(id)).filter(name => !!name);


  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Create Job card',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* --- Image Picker Section --- */}
        <TouchableOpacity
          style={[styles.imagePickerArea, selectedImages.length > 0 && styles.imagePickerAreaCompact]}
          onPress={handleChooseImage}
          disabled={isSaving || selectedImages.length >= 3}
        >
            <Ionicons name="images-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.imagePickerText}>Choose Images ({selectedImages.length}/3) *</Text>
        </TouchableOpacity>
        {selectedImages.length > 0 && (
          <View style={styles.thumbnailContainer}>
            {selectedImages.map((image) => (
              <View key={image.uri} style={styles.thumbnailWrapper}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.removeIcon} onPress={() => handleRemoveImage(image.uri)} disabled={isSaving}>
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {/* --- End Image Picker --- */}


         {/* --- Service Category --- */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isLoadingServices || !!serviceError || isSaving) && styles.disabledSelector]}
            onPress={() => !isLoadingServices && !serviceError && !isSaving && setIsServiceModalVisible(true)}
            disabled={isLoadingServices || !!serviceError || isSaving} >
            <Text style={styles.selectorText}>Choose Service Category *</Text>
            {isLoadingServices ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {serviceError && !isLoadingServices && <Text style={styles.errorTextSmall}>{serviceError}</Text>}
        {selectedServiceNames.length > 0 && (
            <View style={styles.tagContainer}>
                {selectedServiceNames.map((name, index) => (
                    <View key={selectedServiceIds[index]} style={styles.tag}>
                        <Text style={styles.tagText}>{name}</Text>
                        <TouchableOpacity onPress={() => { const newIds = selectedServiceIds.filter(id => id !== selectedServiceIds[index]); setSelectedServiceIds(newIds); }} style={styles.tagRemoveIcon} disabled={isSaving} >
                           <Ionicons name="close-circle-outline" size={16} color={COLORS.tagIcon} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        )}
         {/* --- End Service Category --- */}


        {/* --- Description --- */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *" // Added asterisk for required
          value={description} onChangeText={setDescription}
          multiline numberOfLines={4} placeholderTextColor={COLORS.placeholder} editable={!isSaving}/>
        {/* --- End Description --- */}


         {/* --- County Selector --- */}
         <TouchableOpacity
            style={[styles.selectorContainer, (isLoadingCounties || !!countyError || isSaving) && styles.disabledSelector]}
            onPress={() => !isLoadingCounties && !countyError && !isSaving && setIsCountyModalVisible(true)}
            disabled={isLoadingCounties || !!countyError || isSaving} >
            <Text style={[styles.selectorText, !selectedCountyId && styles.placeholderText]}>
                 {getSelectedNames([selectedCountyId ?? ''], counties)[0] || 'Select County *'}
             </Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
         {countyError && !isLoadingCounties && <Text style={styles.errorTextSmall}>{countyError}</Text>}
          {/* --- End County Selector --- */}


         {/* --- Municipality Selector --- */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isMunicipalityDisabled || isSaving) && styles.disabledSelector]}
            onPress={() => !isMunicipalityDisabled && !isSaving && setIsMunicipalityModalVisible(true)}
            disabled={isMunicipalityDisabled || isSaving} >
             <Text style={[styles.selectorText, !selectedMunicipalityId && styles.placeholderText]}>
                {selectedCountyId && !isLoadingMunicipalities && !municipalityError && municipalities.length === 0 ? 'No Municipalities Found' : getSelectedNames([selectedMunicipalityId ?? ''], municipalities)[0] || municipalityPlaceholder + ' *'}
             </Text>
             {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {municipalityError && !isLoadingMunicipalities && <Text style={styles.errorTextSmall}>{municipalityError}</Text>}
         {/* --- End Municipality Selector --- */}


        {/* --- Save Button --- */}
        <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSave} disabled={isSaving}>
           {isSaving ? <ActivityIndicator color={COLORS.buttonText} /> : <Text style={styles.saveButtonText}>Save</Text>}
        </TouchableOpacity>
         {/* --- End Save Button --- */}

      </ScrollView>

      {/* --- Modals --- */}
       <SelectModal mode="multi" visible={isServiceModalVisible} title="Select Service Category" data={services} initialSelectedIds={selectedServiceIds} onClose={() => setIsServiceModalVisible(false)} onConfirmMulti={handleServiceConfirm} />
       <SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedId={selectedCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={handleCountyConfirm} />
       <SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedId={selectedMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={handleMunicipalityConfirm} />
       {/* --- End Modals --- */}

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20, },
  imagePickerArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.imagePickerBorder, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 30, backgroundColor: COLORS.imagePickerBg, marginBottom: 10, },
   imagePickerAreaCompact: { paddingVertical: 15, },
  imagePickerText: { marginLeft: 10, fontSize: 16, color: COLORS.textSecondary, },
  thumbnailContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20, marginTop: 10, },
  thumbnailWrapper: { position: 'relative', marginRight: 10, marginBottom: 10, },
  thumbnail: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
  removeIcon: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.background, borderRadius: 12, },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 5, },
  selectorText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, marginRight: 10, },
  placeholderText: { color: COLORS.placeholder, },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 15, },
   tag: { flexDirection: 'row', backgroundColor: COLORS.tagBg, borderRadius: 15, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center', marginRight: 8, marginBottom: 8, },
   tagText: { fontSize: 14, color: COLORS.tagText, },
   tagRemoveIcon: { marginLeft: 5, },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, fontSize: 16, color: COLORS.textPrimary, marginBottom: 15, },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 15, marginBottom: 15, },
  saveButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 25, minHeight: 50, justifyContent: 'center', },
  saveButtonText: { color: COLORS.buttonText, fontSize: 18, fontWeight: 'bold', },
  disabledSelector: { backgroundColor: '#F0F0F0', opacity: 0.7, },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, },
  errorTextSmall: { color: COLORS.error, fontSize: 12, marginTop: 0, marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5, },
});