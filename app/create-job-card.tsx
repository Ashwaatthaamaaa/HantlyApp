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
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SelectModal from '@/components/MultiSelectModal'; //

// --- Define Types ---
// Reuse types from existing code if applicable, define new ones as needed
interface ApiDataItem { id: string; name: string; }
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; countyName?: string; }
interface ServiceMaster { serviceId: number; serviceName: string; /* Add other fields if needed */ }
// --------------------

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030'; // [cite: 34]
// -----------------

// --- Colors (Referencing existing style patterns) ---
const COLORS = { // Use colors consistent with login.tsx, register.tsx etc.
  background: '#F8F8F8', // Example from home.tsx [cite: 295]
  textPrimary: '#333333', // Example from home.tsx [cite: 295]
  textSecondary: '#666666', // Example from home.tsx [cite: 295]
  placeholder: '#AAAAAA', // Example from register.tsx [cite: 218]
  accent: '#696969', // Example button color
  headerBg: '#FFFFFF', // Example from home.tsx
  headerText: '#333333',
  error: '#D9534F', // Example from register.tsx [cite: 218]
  borderColor: '#E0E0E0', // Example from home.tsx [cite: 295]
  buttonBg: '#696969', // Dark grey/brown button approximation [cite: 73, 218, 134-135]
  buttonText: '#FFFFFF', // [cite: 73, 218, 134-135]
  buttonDisabledBg: '#AAAAAA', // [cite: 73, 218, 134-135]
  imagePickerBg: '#FFFFFF',
  imagePickerBorder: '#CCCCCC',
  tagBg: '#E0E0E0',
  tagText: '#333333',
  tagIcon: '#555555',
};
// --------------------

export default function CreateJobCardScreen() {
  const router = useRouter();

  // --- State Variables ---
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);

  const [services, setServices] = useState<ApiDataItem[]>([]);
  const [counties, setCounties] = useState<ApiDataItem[]>([]);
  const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);

  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(false);

  const [serviceError, setServiceError] = useState<string | null>(null);
  const [countyError, setCountyError] = useState<string | null>(null);
  const [municipalityError, setMunicipalityError] = useState<string | null>(null);

  const [isServiceModalVisible, setIsServiceModalVisible] = useState<boolean>(false);
  const [isCountyModalVisible, setIsCountyModalVisible] = useState<boolean>(false);
  const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false); // For Save button state (future use)

  // --- Fetch Initial Data (Services, Counties) ---
  useEffect(() => {
    // Fetch Services
    const fetchServices = async () => {
        setIsLoadingServices(true); setServiceError(null);
        const url = `${BASE_URL}/api/Service/GetServiceList`; //
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
        const url = `${BASE_URL}/api/County/GetCountyList`; //
        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`County fetch failed: ${response.status}`); }
            const data: CountyMaster[] = await response.json();
            setCounties(data.map(c => ({ id: c.countyId.toString(), name: c.countyName })));
        } catch (error: any) { console.error("County fetch failed:", error); setCountyError(error.message); }
        finally { setIsLoadingCounties(false); }
    };

    fetchServices();
    fetchCounties();
  }, []);

  // --- Fetch Municipalities based on Selected County ---
  const fetchMunicipalities = useCallback(async (countyId: string) => {
      setIsLoadingMunicipalities(true); setMunicipalityError(null); setMunicipalities([]);
      const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`; //
      try {
          const response = await fetch(url);
          if (!response.ok) { throw new Error(`Municipality fetch failed: ${response.status}`); }
          const data: MunicipalityMaster[] = await response.json();
          setMunicipalities(data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName })));
      } catch (error: any) { console.error("Failed to fetch municipalities:", error); setMunicipalityError(error.message); }
      finally { setIsLoadingMunicipalities(false); }
  }, []);

  useEffect(() => {
    if (selectedCountyId) {
      fetchMunicipalities(selectedCountyId);
    } else {
      setMunicipalities([]); // Clear municipalities if county is deselected
      setSelectedMunicipalityId(null); // Clear selection
      setMunicipalityError(null);
    }
  }, [selectedCountyId, fetchMunicipalities]);

  // --- Image Picker Logic ---
  const handleChooseImage = async () => {
    if (selectedImages.length >= 3) {
      Alert.alert("Limit Reached", "You can select a maximum of 3 images.");
      return;
    }

    Alert.alert(
      "Select Image Source",
      "",
      [
        {
          text: "Camera",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert("Permission Required", "Camera access is needed to take photos.");
              return;
            }
            try {
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3], // Or your preferred aspect ratio
                quality: 0.7,
              });
              if (!result.canceled && result.assets) {
                setSelectedImages(prev => [...prev, result.assets[0]]);
              }
            } catch (error) {
               console.error("launchCameraAsync Error:", error);
               Alert.alert('Camera Error', 'Could not open camera.');
            }
          },
        },
        {
          text: "Library",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert("Permission Required", "Media library access is needed to choose photos.");
              return;
            }
            try {
                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                    // allowsMultipleSelection: true, // Enable if needed, adjust logic below
                    // selectionLimit: 3 - selectedImages.length, // Limit based on current count
                });
                if (!result.canceled && result.assets) {
                   // If allowsMultipleSelection is true, result.assets could have multiple items
                   const newImages = result.assets.slice(0, 3 - selectedImages.length); // Ensure limit isn't exceeded
                   setSelectedImages(prev => [...prev, ...newImages]);
                }
            } catch (error) {
                console.error("launchImageLibraryAsync Error:", error);
                Alert.alert('Library Error', 'Could not open image library.');
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleRemoveImage = (uriToRemove: string) => {
    setSelectedImages(prev => prev.filter(img => img.uri !== uriToRemove));
  };

  // --- Modal Handlers ---
  const handleServiceConfirm = (selectedIds: string[]) => {
      setSelectedServiceIds(selectedIds);
  };
  const handleCountyConfirm = (selectedId: string | null) => {
      if (selectedCountyId !== selectedId) {
          setSelectedCountyId(selectedId);
          setSelectedMunicipalityId(null); // Reset municipality when county changes
      }
  };
  const handleMunicipalityConfirm = (selectedId: string | null) => {
      setSelectedMunicipalityId(selectedId);
  };

  // --- Helper to get names from IDs ---
  const getSelectedNames = (ids: string[], data: ApiDataItem[]): string[] => {
      const selectedMap = new Map(data.map(item => [item.id, item.name]));
      return ids.map(id => selectedMap.get(id)).filter((name): name is string => !!name);
  };

  // --- Save Handler (Deferred) ---
  const handleSave = async () => {
    setIsSaving(true);
    // --- Validation (Example - Adapt as needed) ---
    if (selectedImages.length === 0) { Alert.alert('Missing Field', 'Please select at least one image.'); setIsSaving(false); return; }
    if (selectedServiceIds.length === 0) { Alert.alert('Missing Field', 'Please select at least one service category.'); setIsSaving(false); return; }
    if (!description.trim()) { Alert.alert('Missing Field', 'Please enter a description.'); setIsSaving(false); return; }
    if (!selectedCountyId) { Alert.alert('Missing Field', 'Please select a county.'); setIsSaving(false); return; }
    if (!selectedMunicipalityId) { Alert.alert('Missing Field', 'Please select a municipality.'); setIsSaving(false); return; }

    console.log("--- Saving Job Card (Frontend Only) ---");
    console.log("Images:", selectedImages.map(img => img.uri));
    console.log("Service IDs:", selectedServiceIds);
    console.log("Description:", description);
    console.log("County ID:", selectedCountyId);
    console.log("Municipality ID:", selectedMunicipalityId);

    // TODO: Implement actual API call here later
    // Construct FormData
    // const formData = new FormData();
    // selectedImages.forEach((image, index) => {
    //     const uriParts = image.uri.split('.');
    //     const fileType = uriParts[uriParts.length - 1];
    //     formData.append('Images', {
    //       uri: image.uri,
    //       name: `photo_${index}.${fileType}`,
    //       type: image.mimeType ?? `image/${fileType}`,
    //     } as any);
    // });
    // formData.append('ReportingDescription', description);
    // formData.append('CountyId', selectedCountyId);
    // formData.append('MunicipalityId', selectedMunicipalityId);
    // Add other required fields from API spec (UserId, ReportingPerson, etc.)
    // How to send Service IDs? Needs API clarification. Append each ID?
    // selectedServiceIds.forEach(id => formData.append('ServiceIdListFieldName', id)); // Replace ServiceIdListFieldName

    // try {
    //    const response = await fetch(`${BASE_URL}/api/IssueTicket/IssueTicket`, {
    //        method: 'POST',
    //        body: formData,
    //        headers: {
    //           // Content-Type is set automatically for FormData
    //           // Add Authorization header if needed
    //        },
    //    });
    //    const responseText = await response.text();
    //    if (response.ok) {
    //        Alert.alert('Success', 'Job card created successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    //    } else {
    //        Alert.alert('Error', `Failed to create job card: ${responseText || response.status}`);
    //    }
    // } catch (error: any) {
    //    Alert.alert('Error', `An error occurred: ${error.message}`);
    // } finally {
    //     setIsSaving(false);
    // }

    // --- Placeholder for frontend action ---
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    Alert.alert('Save Deferred', 'Save functionality will be implemented later.', [{ text: 'OK', onPress: () => router.back() }]);
    setIsSaving(false);
    // --- End Placeholder ---
  };

  // --- Render Logic ---
  const isMunicipalityDisabled = !selectedCountyId || isLoadingMunicipalities || municipalityError !== null;
  const municipalityPlaceholder = !selectedCountyId ? 'Select County First' : isLoadingMunicipalities ? 'Loading...' : municipalityError ? 'Error Loading' : 'Select Municipality';
  const selectedServiceNames = getSelectedNames(selectedServiceIds, services);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Create Job card',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
          // Add back button functionality if not using default stack nav header
          // headerLeft: () => (<TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" ... /></TouchableOpacity>),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Image Picker */}
        <TouchableOpacity
          style={[styles.imagePickerArea, selectedImages.length > 0 && styles.imagePickerAreaCompact]}
          onPress={handleChooseImage}
          disabled={isSaving || selectedImages.length >= 3}
        >
          <Ionicons name="images-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.imagePickerText}>Choose Images ({selectedImages.length}/3)</Text>
        </TouchableOpacity>

        {/* Selected Images Display */}
        {selectedImages.length > 0 && (
          <View style={styles.thumbnailContainer}>
            {selectedImages.map((image) => (
              <View key={image.uri} style={styles.thumbnailWrapper}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeIcon}
                  onPress={() => handleRemoveImage(image.uri)}
                  disabled={isSaving}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Service Category Selector */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isLoadingServices || !!serviceError || isSaving) && styles.disabledSelector]}
            onPress={() => !isLoadingServices && !serviceError && !isSaving && setIsServiceModalVisible(true)}
            disabled={isLoadingServices || !!serviceError || isSaving}
        >
             <Text style={styles.selectorText}>
                {isLoadingServices ? 'Loading Services...' : serviceError ? 'Error Loading Services' : 'Choose Service Category'}
             </Text>
             {isLoadingServices ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {serviceError && !isLoadingServices && <Text style={styles.errorTextSmall}>{serviceError}</Text>}

        {/* Selected Service Tags */}
        {selectedServiceNames.length > 0 && (
            <View style={styles.tagContainer}>
                {selectedServiceNames.map((name, index) => (
                    <View key={selectedServiceIds[index]} style={styles.tag}>
                        <Text style={styles.tagText}>{name}</Text>
                        <TouchableOpacity
                           onPress={() => {
                               const newIds = selectedServiceIds.filter(id => id !== selectedServiceIds[index]);
                               setSelectedServiceIds(newIds);
                           }}
                           style={styles.tagRemoveIcon}
                           disabled={isSaving}
                        >
                           <Ionicons name="close-circle-outline" size={16} color={COLORS.tagIcon} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        )}

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholderTextColor={COLORS.placeholder}
          editable={!isSaving}
        />

        {/* County Selector */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isLoadingCounties || !!countyError || isSaving) && styles.disabledSelector]}
            onPress={() => !isLoadingCounties && !countyError && !isSaving && setIsCountyModalVisible(true)}
            disabled={isLoadingCounties || !!countyError || isSaving}
        >
             <Text style={[styles.selectorText, !selectedCountyId && styles.placeholderText]}>
                 {isLoadingCounties ? 'Loading Counties...' : countyError ? 'Error Loading Counties' : getSelectedNames([selectedCountyId ?? ''], counties)[0] || 'Select County'}
             </Text>
            {isLoadingCounties ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
         {countyError && !isLoadingCounties && <Text style={styles.errorTextSmall}>{countyError}</Text>}


        {/* Municipality Selector */}
        <TouchableOpacity
            style={[styles.selectorContainer, (isMunicipalityDisabled || isSaving) && styles.disabledSelector]}
            onPress={() => !isMunicipalityDisabled && !isSaving && setIsMunicipalityModalVisible(true)}
            disabled={isMunicipalityDisabled || isSaving}
        >
             <Text style={[styles.selectorText, !selectedMunicipalityId && styles.placeholderText]}>
                {selectedCountyId && !isLoadingMunicipalities && !municipalityError && municipalities.length === 0
                    ? 'No Municipalities Found'
                    : getSelectedNames([selectedMunicipalityId ?? ''], municipalities)[0] || municipalityPlaceholder
                }
             </Text>
             {isLoadingMunicipalities ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down-outline" size={20} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        {municipalityError && !isLoadingMunicipalities && <Text style={styles.errorTextSmall}>{municipalityError}</Text>}


        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
           {isSaving ? <ActivityIndicator color={COLORS.buttonText} /> : <Text style={styles.saveButtonText}>Save</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* Modals */}
      <SelectModal
        mode="multi" // Multi-select for services
        visible={isServiceModalVisible}
        title="Select Service Category"
        data={services}
        initialSelectedIds={selectedServiceIds}
        onClose={() => setIsServiceModalVisible(false)}
        onConfirmMulti={handleServiceConfirm}
      />
      <SelectModal
        mode="single"
        visible={isCountyModalVisible}
        title="Select County"
        data={counties}
        initialSelectedId={selectedCountyId}
        onClose={() => setIsCountyModalVisible(false)}
        onConfirmSingle={handleCountyConfirm}
      />
      <SelectModal
        mode="single"
        visible={isMunicipalityModalVisible}
        title="Select Municipality"
        data={municipalities}
        initialSelectedId={selectedMunicipalityId}
        onClose={() => setIsMunicipalityModalVisible(false)}
        onConfirmSingle={handleMunicipalityConfirm}
      />

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  imagePickerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.imagePickerBorder,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 30, // More padding initially
    backgroundColor: COLORS.imagePickerBg,
    marginBottom: 10, // Space before thumbnails appear
  },
   imagePickerAreaCompact: {
      paddingVertical: 15, // Less padding when images are shown
   },
  imagePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows wrapping if needed, though 3 should fit
    justifyContent: 'flex-start', // Align thumbnails to the left
    marginBottom: 20,
    marginTop: 10,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  removeIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.background, // Give it a background to hide thumbnail corner
    borderRadius: 12,
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
    marginBottom: 5, // Space before error text or next element
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flex: 1, // Allow text to take space
    marginRight: 10,
  },
  placeholderText: {
    color: COLORS.placeholder,
  },
  tagContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     marginTop: 5,
     marginBottom: 15, // Space after tags
   },
   tag: {
     flexDirection: 'row',
     backgroundColor: COLORS.tagBg,
     borderRadius: 15,
     paddingVertical: 5,
     paddingHorizontal: 10,
     alignItems: 'center',
     marginRight: 8,
     marginBottom: 8,
   },
   tagText: {
     fontSize: 14,
     color: COLORS.tagText,
   },
   tagRemoveIcon: {
      marginLeft: 5,
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
    marginBottom: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
    marginBottom: 5,
  },
  saveButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
    minHeight: 50,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledSelector: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  buttonDisabled: {
    backgroundColor: COLORS.buttonDisabledBg,
  },
  errorTextSmall: { // Smaller error text for under selectors
      color: COLORS.error,
      fontSize: 12,
      marginTop: 0,
      marginBottom: 10,
      alignSelf: 'flex-start',
      marginLeft: 5,
  },
});