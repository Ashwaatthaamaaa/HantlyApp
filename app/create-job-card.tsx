// File: app/create-job-card.tsx
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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'; // Import useLocalSearchParams
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SelectModal from '@/components/MultiSelectModal';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL } from '@/constants/Api';

// --- Define Types ---
interface ApiDataItem { id: string; name: string; }
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; }
interface UserProfileInfo { userName?: string; /* other fields if needed */ }
interface PartnerProfileInfo { companyName?: string; contactPerson?: string; /* other fields */ }

// --- Base URL ---
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
  const { session } = useAuth();
  // Get params passed via navigation
  const params = useLocalSearchParams<{ preselectedServiceId?: string; preselectedServiceName?: string }>();
  const preselectedServiceId = params.preselectedServiceId;
  const preselectedServiceName = params.preselectedServiceName; // Get name too for display

  // --- State Variables ---
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  // Initialize selectedServiceIds based on param, but wait for services to load
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

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');

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
            const formattedServices = data.map(s => ({ id: s.serviceId.toString(), name: s.serviceName }));
            setServices(formattedServices);
            // If a service was preselected via params, set it *after* services load
            if (preselectedServiceId) {
                 // Check if the preselected ID is valid within the fetched services
                 if (formattedServices.some(s => s.id === preselectedServiceId)) {
                     console.log(`Setting preselected service ID: ${preselectedServiceId}`);
                     setSelectedServiceIds([preselectedServiceId]);
                 } else {
                     console.warn(`Preselected service ID ${preselectedServiceId} not found in fetched services.`);
                 }
            }
        } catch (error: any) { console.error("Service fetch failed:", error); setServiceError(error.message); }
        finally { setIsLoadingServices(false); }
    };

    // Fetch Counties (remains the same)
    const fetchCounties = async () => { /* ... no changes ... */ setIsLoadingCounties(true); setCountyError(null); const url = `${BASE_URL}/api/County/GetCountyList`; try { const response = await fetch(url); if (!response.ok) { throw new Error(`County fetch failed: ${response.status}`); } const data: CountyMaster[] = await response.json(); setCounties(data.map(c => ({ id: c.countyId.toString(), name: c.countyName }))); } catch (error: any) { console.error("County fetch failed:", error); setCountyError(error.message); } finally { setIsLoadingCounties(false); } };

    // Fetch User/Partner Name (remains the same)
    const fetchUserName = async () => { /* ... no changes ... */ setUserName(''); if (session && session.email) { const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail'; const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`; console.log(`Workspaceing reporting name from: ${detailUrl}`); try { const response = await fetch(detailUrl); if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed: ${response.status} - ${errorText}`); } const data = await response.json(); console.log('Received profile data for name:', JSON.stringify(data, null, 2)); let fetchedName = ''; if (session.type === 'partner') { fetchedName = data?.contactPerson || data?.companyName; } else { fetchedName = data?.username; } if (fetchedName) { setUserName(fetchedName); console.log(`Successfully set reporting name to: ${fetchedName}`); } else { throw new Error(`Name field ('${session.type === 'partner' ? 'contactPerson/companyName' : 'username'}') not found or empty.`); } } catch (error: any) { console.error("Failed to fetch user/company name:", error); setUserName(''); Alert.alert("Error Fetching Details", `Could not fetch user/company details: ${error.message}`); } } else { console.log("No session found, cannot fetch user name."); setUserName(''); } };

    fetchServices(); // Fetch services first
    fetchCounties();
    fetchUserName();
  }, [session, preselectedServiceId]); // Add preselectedServiceId to dependency array


  // --- Fetch Municipalities based on Selected County (remains the same) ---
  const fetchMunicipalities = useCallback(async (countyId: string) => { /* ... no changes ... */ setIsLoadingMunicipalities(true); setMunicipalityError(null); setMunicipalities([]); const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`; try { const response = await fetch(url); if (!response.ok) { throw new Error(`Municipality fetch failed: ${response.status}`); } const data: MunicipalityMaster[] = await response.json(); setMunicipalities(data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName }))); } catch (error: any) { console.error("Failed to fetch municipalities:", error); setMunicipalityError(error.message); } finally { setIsLoadingMunicipalities(false); } }, []);
  useEffect(() => { if (selectedCountyId) { fetchMunicipalities(selectedCountyId); } else { setMunicipalities([]); setSelectedMunicipalityId(null); setMunicipalityError(null); } }, [selectedCountyId, fetchMunicipalities]);

  // --- Image Picker Logic (remains the same) ---
  const handleChooseImage = async () => { /* ... no changes ... */ if (selectedImages.length >= 3) { Alert.alert("Limit Reached", "You can select max 3 images."); return; } Alert.alert( "Select Image Source", "", [ { text: "Camera", onPress: async () => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Camera access needed."); return; } try { const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!r.canceled && r.assets) setSelectedImages(p => [...p, r.assets[0]]); } catch (e) { console.error("launchCameraAsync Error:", e); Alert.alert('Camera Error'); } } }, { text: "Library", onPress: async () => { const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Media library access needed."); return; } try { let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!r.canceled && r.assets) { const newImgs = r.assets.slice(0, 3 - selectedImages.length); setSelectedImages(p => [...p, ...newImgs]); } } catch (e) { console.error("launchImageLibraryAsync Error:", e); Alert.alert('Library Error'); } } }, { text: "Cancel", style: "cancel" }, ] ); };
  const handleRemoveImage = (uriToRemove: string) => { setSelectedImages(prev => prev.filter(img => img.uri !== uriToRemove)); };

  // --- Modal Handlers (remains the same) ---
  const handleServiceConfirm = (selectedIds: string[]) => { setSelectedServiceIds(selectedIds); };
  const handleCountyConfirm = (selectedId: string | null) => { if (selectedCountyId !== selectedId) { setSelectedCountyId(selectedId); setSelectedMunicipalityId(null); } }; // Reset municipality on county change
  const handleMunicipalityConfirm = (selectedId: string | null) => { setSelectedMunicipalityId(selectedId); };

  // --- Helper to get names from IDs (remains the same) ---
  const getSelectedNames = (ids: string[], data: ApiDataItem[]): string[] => { const selectedMap = new Map(data.map(item => [item.id, item.name])); return ids.map(id => selectedMap.get(id)).filter((name): name is string => !!name); };

  // --- Save Handler (remains the same, uses selectedServiceIds state) ---
  const handleSave = async () => { /* ... no changes needed here ... */ if (!session) { Alert.alert("Not Logged In", "Log in to create a job request.", [{ text: "Cancel" }, { text: "Log In", onPress: () => router.push('/login') }]); return; } if (!userName) { Alert.alert('Missing Information', 'Could not retrieve user name. Try again.'); return; } const trimmedDescription = description.trim(); let validationError = ''; if (selectedImages.length === 0) validationError = 'Please select at least one image.'; else if (selectedServiceIds.length === 0) validationError = 'Please select at least one service category.'; else if (!trimmedDescription) validationError = 'Please enter a description.'; else if (!selectedCountyId) validationError = 'Please select a county.'; else if (!selectedMunicipalityId) validationError = 'Please select a municipality.'; if (validationError) { Alert.alert('Missing Information', validationError); return; } setIsSaving(true); const formData = new FormData(); const serviceNamesMap = new Map(services.map(item => [item.id, item.name])); const selectedServiceNamesString = selectedServiceIds.map(id => serviceNamesMap.get(id)).filter(name => !!name).join(','); formData.append('ReportingDescription', trimmedDescription); formData.append('CountyId', selectedCountyId as string); formData.append('MunicipalityId', selectedMunicipalityId as string); formData.append('ReportingPerson', userName); formData.append('ToCraftmanType', selectedServiceNamesString); formData.append('Status', 'Created'); formData.append('TicketId', '1'); formData.append('OperationId', '1'); formData.append('City', 'NA'); formData.append('Address', 'NA'); formData.append('Pincode', '000000'); selectedImages.forEach((image, index) => { const uriParts = image.uri.split('.'); const fileType = uriParts[uriParts.length - 1]; const mimeType = image.mimeType ?? `image/${fileType}`; const fileName = image.fileName ?? `job_image_${index}.${fileType}`; formData.append('Images', { uri: image.uri, name: fileName, type: mimeType, } as any); }); console.log("--- Attempting to Save Job Card ---"); console.log("ReportingPerson:", userName); console.log("CountyId:", selectedCountyId); console.log("MunicipalityId:", selectedMunicipalityId); console.log("ToCraftmanType:", selectedServiceNamesString); const url = `${BASE_URL}/api/IssueTicket/IssueTicket`; try { const response = await fetch(url, { method: 'POST', body: formData }); const responseText = await response.text(); console.log("Save Response Status:", response.status); console.log("Save Response Text:", responseText); if (response.ok) { let successMessage = "Job card created successfully!"; let newTicketId = null; try { const result = JSON.parse(responseText); newTicketId = result?.statusCode; successMessage = result?.statusMessage || successMessage; if (newTicketId !== null && newTicketId !== undefined) { successMessage += ` Ticket ID: ${newTicketId}`; } else { console.warn("Success response received, but statusCode (TicketId) was missing."); } } catch (e) { console.error("Could not parse success response JSON:", e); } Alert.alert('Success', successMessage, [{ text: 'OK', onPress: () => router.back() }]); } else { let errorMessage = `Failed (Status: ${response.status})`; try { const errorData = JSON.parse(responseText); if (errorData.errors && typeof errorData.errors === 'object') { errorMessage = errorData.title || "Validation Errors:\n"; errorMessage += Object.entries(errorData.errors).map(([field, messages]) => `- ${field}: ${(messages as string[]).join(', ')}`).join('\n'); } else { errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage; } } catch (e) { errorMessage = responseText || errorMessage; } Alert.alert('Error Creating Job Card', errorMessage); } } catch (error: any) { console.error("Save Job Card Error:", error); Alert.alert('Error', `An unexpected network or setup error occurred: ${error.message}`); } finally { setIsSaving(false); } };
  // --- End Save Handler ---


  // --- Render Logic ---
  const isMunicipalityDisabled = !selectedCountyId || isLoadingMunicipalities || municipalityError !== null;
  const municipalityPlaceholder = !selectedCountyId ? 'Select County First' : isLoadingMunicipalities ? 'Loading...' : municipalityError ? 'Error Loading' : 'Select Municipality';

  // Get selected service names based on the state `selectedServiceIds`
  const serviceNamesMap = new Map(services.map(item => [item.id, item.name]));
  const selectedServiceNames = getSelectedNames(selectedServiceIds, services);

  // Determine if service selection should be disabled (optional, if preselected)
  const isServiceSelectionDisabled = !!preselectedServiceId; // Example: disable if preselected

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Create Job card',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
           // Ensure back button works correctly (should be default if header is shown)
           // headerBackTitleVisible: false, // Optional: if needed for iOS consistency
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
            // Apply disabled style if service selection is disabled (e.g., preselected)
            style={[
                styles.selectorContainer,
                (isLoadingServices || !!serviceError || isSaving || isServiceSelectionDisabled) && styles.disabledSelector
            ]}
            onPress={() => !isLoadingServices && !serviceError && !isSaving && !isServiceSelectionDisabled && setIsServiceModalVisible(true)}
            // Disable button press if loading, error, saving, or service is preselected
            disabled={isLoadingServices || !!serviceError || isSaving || isServiceSelectionDisabled}
            >
            {/* Show placeholder or preselected name */}
            <Text style={styles.selectorText}>
                {selectedServiceNames.length > 0
                    ? selectedServiceNames.join(', ') // Display selected names (will show preselected name now)
                    : 'Choose Service Category *'}
            </Text>
            {isLoadingServices ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {serviceError && !isLoadingServices && <Text style={styles.errorTextSmall}>{serviceError}</Text>}
         {/* Only show tags if *not* preselected and multiple selections are possible/made */}
         {/* Or always show tags if that's preferred */}
        {selectedServiceNames.length > 0 && !isServiceSelectionDisabled && ( // Example: hide tags if preselected
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
          placeholder="Description *"
          value={description} onChangeText={setDescription}
          multiline numberOfLines={4} placeholderTextColor={COLORS.placeholder} editable={!isSaving}/>
        {/* --- End Description --- */}


         {/* --- County Selector --- */}
         <TouchableOpacity
             style={[styles.selectorContainer, (isLoadingCounties || !!countyError || isSaving) && styles.disabledSelector]}
             onPress={() => !isLoadingCounties && !countyError && !isSaving && setIsCountyModalVisible(true)}
             disabled={isLoadingCounties || !!countyError || isSaving}
         >
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
            disabled={isMunicipalityDisabled || isSaving}
        >
             <Text style={[styles.selectorText, !selectedMunicipalityId && styles.placeholderText]}>
                {selectedCountyId && !isLoadingMunicipalities && !municipalityError && municipalities.length === 0 ?
                 'No Municipalities Found' : getSelectedNames([selectedMunicipalityId ?? ''], municipalities)[0] || municipalityPlaceholder + ' *'}
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
      {/* Prevent opening service modal if service is preselected */}
       <SelectModal
            mode="multi" // Or single if only one service allowed
            visible={isServiceModalVisible && !isServiceSelectionDisabled}
            title="Select Service Category"
            data={services}
            initialSelectedIds={selectedServiceIds}
            onClose={() => setIsServiceModalVisible(false)}
            onConfirmMulti={handleServiceConfirm}
            // onConfirmSingle={handleServiceConfirm} // If mode="single"
        />
       <SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedId={selectedCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={handleCountyConfirm} />
       <SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedId={selectedMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={handleMunicipalityConfirm} />
        {/* --- End Modals --- */}

    </SafeAreaView>
  );
}

// --- Styles ---
// Styles remain the same
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