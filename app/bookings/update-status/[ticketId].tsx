// File: app/bookings/update-status/[ticketId].tsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '@/constants/Api';

// Re-use BookingDetail type if appropriate or define a subset needed here
// Assuming TicketImage type is defined elsewhere or here if needed
interface TicketImage { imageId?: number; ticketId?: number; imageName?: string | null; imagePath?: string | null; imageContentType?: string | null; }
interface BookingDetailSubset {
  status?: string;
  companyComment?: string;
  ticketWorkImages?: TicketImage[];
}


// --- Colors ---
const COLORS = {
    background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
    accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
    borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
    buttonDisabledBg: '#AAAAAA', imagePickerBg: '#FFFFFF', imagePickerBorder: '#CCCCCC',
    iconPlaceholder: '#CCCCCC', placeholder: '#AAAAAA', modalInputBg: '#FFFFFF',
    labelColor: '#666666',
    // Added status colors for potential future use here if needed
    statusCreated: '#007BFF',
    statusAccepted: '#28A745',
    statusInProgress: '#FFC107',
    statusCompleted: '#6C757D',
    statusDefault: '#6C757D',
};
const MAX_PROOF_IMAGES = 5;

export default function UpdateStatusScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;

  const [currentBookingData, setCurrentBookingData] = useState<BookingDetailSubset | null>(null); // Store fetched data
  const [isLoadingBooking, setIsLoadingBooking] = useState(true); // Loading state for initial fetch
  const [fetchError, setFetchError] = useState<string | null>(null); // Error state for initial fetch
  const [isFormDisabled, setIsFormDisabled] = useState(false); // State to disable form if status is wrong

  const [proofImages, setProofImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [companyComment, setCompanyComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Fetch Current Booking Status & Data ---
  const fetchCurrentData = useCallback(async () => {
      if (!ticketId || !session || session.type !== 'partner') {
          setIsLoadingBooking(false);
          setFetchError("Invalid session or Ticket ID.");
          setIsFormDisabled(true);
          return;
      }
      setIsLoadingBooking(true);
      setFetchError(null);
      const url = `${BASE_URL}/api/IssueTicket/GetTicket?TicketId=${ticketId}`;
      try {
          const response = await fetch(url);
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to fetch current data (${response.status}): ${errorText}`);
          }
          const data: BookingDetailSubset = await response.json();
          setCurrentBookingData(data);

          // Check Status and Disable Form if necessary
          const currentStatus = data.status?.toLowerCase() || 'unknown';
          if (currentStatus !== 'inprogress' && currentStatus !== 'in progress') {
              Alert.alert("Cannot Update", "Service proof can only be uploaded or updated when the job status is 'In Progress'.");
              setIsFormDisabled(true);
          } else {
              setIsFormDisabled(false);
              setCompanyComment(data.companyComment || '');
          }
      } catch (err: any) {
          console.error("Error fetching current booking data:", err);
          setFetchError(err.message);
          setIsFormDisabled(true);
      } finally {
          setIsLoadingBooking(false);
      }
  }, [ticketId, session]); // Removed router dependency unless needed for auto-navigation

  // --- MODIFICATION START: Fix TS2345 ---
  // Fetch data when the screen gains focus using the correct pattern
  useFocusEffect(
      useCallback(() => {
          fetchCurrentData(); // Call the async function wrapped in useCallback
      }, [fetchCurrentData])
  );
  // --- MODIFICATION END ---

  // --- Image Picker Logic ---
  const handleChooseProofImage = async () => { if (isFormDisabled || isSubmitting) return; if (proofImages.length >= MAX_PROOF_IMAGES) { Alert.alert("Limit Reached", `Max ${MAX_PROOF_IMAGES} images.`); return; } Alert.alert( "Select Image Source", "", [ { text: "Camera", onPress: async () => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Camera access needed."); return; } try { const r = await ImagePicker.launchCameraAsync({ quality: 0.7 }); if (!r.canceled && r.assets) { setProofImages(p => [...p, r.assets[0]]); } } catch (e) { console.error("Launch Camera Error:", e); Alert.alert('Camera Error'); } } }, { text: "Library", onPress: async () => { const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!p.granted) { Alert.alert("Permission Required", "Media library access needed."); return; } try { let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 }); if (!r.canceled && r.assets) { const newImages = r.assets.slice(0, MAX_PROOF_IMAGES - proofImages.length); setProofImages(p => [...p, ...newImages]); } } catch (e) { console.error("Launch Library Error:", e); Alert.alert('Library Error'); } } }, { text: "Cancel", style: "cancel" }, ] ); };
  const handleRemoveProofImage = (uriToRemove: string) => { if (isSubmitting) return; setProofImages(prev => prev.filter(img => img.uri !== uriToRemove)); };

  // --- Submit Report Handler ---
  const handleSubmitReport = async () => {
      if (isFormDisabled) { Alert.alert("Cannot Submit", "Updates are only allowed when the job is 'In Progress'."); return; }
      if (!session || session.type !== 'partner' || !ticketId) { Alert.alert("Error", "Invalid session or Ticket ID."); return; }
      const trimmedComment = companyComment.trim();
      if (!trimmedComment) { Alert.alert("Missing Information", "Please enter a description of the work done."); return; }
      // Require *new* images OR rely on existing images if not adding new ones?
      // Let's adjust: Require comment, but images are optional IF some already exist. Require if none exist.
      const existingImages = currentBookingData?.ticketWorkImages || [];
      if (proofImages.length === 0 && existingImages.length === 0) {
          Alert.alert("Missing Information", "Please upload at least one service proof image.");
          return;
      }

      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('TicketId', ticketId.toString());
      formData.append('CompanyComment', trimmedComment);
      // Append only NEWLY selected images
      proofImages.forEach((image, index) => {
        const uriParts = image.uri.split('.'); const fileType = uriParts[uriParts.length - 1]; const mimeType = image.mimeType ?? `image/${fileType}`; const fileName = image.fileName ?? `proof_image_${ticketId}_${Date.now()}_${index}.${fileType}`;
        formData.append('Images', { uri: image.uri, name: fileName, type: mimeType } as any);
      });
      console.log(`Submitting Service Proof Update for Ticket ${ticketId}. New images: ${proofImages.length}`);
      const url = `${BASE_URL}/api/IssueTicket/UpdateCompanyComment`;
      try {
          const response = await fetch(url, { method: 'POST', body: formData });
          const responseText = await response.text();
          console.log("Submit Report Response Status:", response.status); console.log("Submit Report Response Text:", responseText);
          if (response.ok) { let successMessage = "Report submitted successfully."; try { const result = JSON.parse(responseText); successMessage = result?.statusMessage || successMessage; } catch (e) {} Alert.alert('Success', successMessage, [{ text: 'OK', onPress: () => router.back() }]); }
          else { let errorMessage = `Failed (Status: ${response.status})`; try { const errorData = JSON.parse(responseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage; } catch (e) { errorMessage = responseText || errorMessage; } Alert.alert('Error Submitting Report', errorMessage); }
      } catch (error: any) { console.error("Submit Report Error:", error); Alert.alert('Error', `An unexpected network error occurred: ${error.message}`); }
      finally { setIsSubmitting(false); }
  };


  // --- Render ---
  if (isLoadingBooking) {
      return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></SafeAreaView>;
  }

  // Handle fetch error state
  if (fetchError) {
       return (
           <SafeAreaView style={styles.centered}>
               <Stack.Screen options={{ title: 'Error' }}/>
               <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
               <Text style={styles.errorText}>{fetchError}</Text>
               {/* --- MODIFICATION START: Fix TS2339 --- */}
               <TouchableOpacity onPress={() => router.back()} style={styles.submitButton}>
                   <Text style={styles.submitButtonText}>Go Back</Text>
               </TouchableOpacity>
               {/* --- MODIFICATION END --- */}
           </SafeAreaView>
       );
   }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <Stack.Screen options={{ title: 'Update Service Proof', headerStyle: { backgroundColor: COLORS.headerBg }, headerTintColor: COLORS.headerText, headerTitleStyle: { fontWeight: 'bold' }, headerTitleAlign: 'center', headerBackTitleVisible: false,}} /> */}

      <Stack.Screen
        options={{
          title: "Update Service Proof",
          headerBackTitle: '', // no back text
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {isFormDisabled && (
              <View style={styles.disabledOverlay}>
                  <Text style={styles.disabledText}>Updates only allowed when job is In Progress.</Text>
              </View>
          )}

          {/* Display currently uploaded images (read-only) */}
           {currentBookingData?.ticketWorkImages && currentBookingData.ticketWorkImages.length > 0 && (
               <View>
                   <Text style={styles.inputLabel}>Current Proof Images:</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainerExisting}>
                       {currentBookingData.ticketWorkImages.map((image) => (
                           <View key={image.imageId || image.imagePath} style={styles.thumbnailWrapper}>
                               <Image source={{ uri: image.imagePath || '' }} style={styles.thumbnail} />
                           </View>
                       ))}
                   </ScrollView>
                   {/* Clarify image update behavior */}
                   <Text style={styles.infoText}>Selecting new images below will be added (API might replace/add depending on backend logic).</Text>
               </View>
           )}

           {/* Image Picker Area */}
           <TouchableOpacity style={[styles.imagePickerArea, (isFormDisabled || isSubmitting) && styles.disabledInput, proofImages.length > 0 && styles.imagePickerAreaCompact]} onPress={handleChooseProofImage} disabled={isFormDisabled || isSubmitting || proofImages.length >= MAX_PROOF_IMAGES} >
             <Ionicons name="images-outline" size={24} color={COLORS.textSecondary} />
             <Text style={styles.imagePickerText}>Add Images ({proofImages.length}/{MAX_PROOF_IMAGES}) *</Text>
           </TouchableOpacity>

           {/* Newly Selected Proof Images Display */}
           {proofImages.length > 0 && (
             <View style={styles.thumbnailContainer}>
                {proofImages.map((image) => (
                 <View key={image.uri} style={styles.thumbnailWrapper}>
                   <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                   <TouchableOpacity style={styles.removeIcon} onPress={() => handleRemoveProofImage(image.uri)} disabled={isSubmitting || isFormDisabled} >
                     <Ionicons name="close-circle" size={24} color={COLORS.error} />
                   </TouchableOpacity>
                 </View>
               ))}
             </View>
           )}

           {/* Description Input */}
            <Text style={styles.inputLabel}>Description of work done *</Text>
            <TextInput
              style={[styles.input, styles.textArea, (isFormDisabled || isSubmitting) && styles.disabledInput]}
              placeholder="Enter details about the job completed..."
              value={companyComment}
              onChangeText={setCompanyComment}
              multiline
              numberOfLines={5}
              placeholderTextColor={COLORS.placeholder}
              editable={!isFormDisabled && !isSubmitting}
            />

           {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (isFormDisabled || isSubmitting) && styles.buttonDisabled]}
              onPress={handleSubmitReport}
              disabled={isFormDisabled || isSubmitting}
            >
               {isSubmitting ? <ActivityIndicator color={COLORS.buttonText} /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
            </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  container: { flexGrow: 1, padding: 20, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  imagePickerArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.imagePickerBorder, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 30, backgroundColor: COLORS.imagePickerBg, marginBottom: 10, },
  imagePickerAreaCompact: { paddingVertical: 15, },
  imagePickerText: { marginLeft: 10, fontSize: 16, color: COLORS.textSecondary, },
  thumbnailContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20, marginTop: 10, },
  thumbnailContainerExisting: { marginBottom: 5 },
  thumbnailWrapper: { position: 'relative', marginRight: 10, marginBottom: 10, },
  thumbnail: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
  removeIcon: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.background, borderRadius: 12, },
  inputLabel: { fontSize: 14, color: COLORS.labelColor, marginBottom: 5, fontWeight: '500', },
  input: { backgroundColor: COLORS.modalInputBg, borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, color: COLORS.textPrimary, marginBottom: 25, },
  textArea: { height: 120, textAlignVertical: 'top', },
  submitButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, minHeight: 50, justifyContent: 'center', },
  submitButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, opacity: 0.7 }, // Consolidated disabled style
  disabledInput: { backgroundColor: '#F0F0F0', opacity: 0.7, color: COLORS.textSecondary },
  disabledOverlay: { padding: 10, marginBottom: 15, alignItems: 'center', backgroundColor: '#FFF8DC' },
  disabledText: { color: COLORS.textSecondary, fontWeight: 'bold', fontStyle: 'italic'},
  infoText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 10 },
});