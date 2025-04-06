444// File: app/bookings/update-status/[ticketId].tsx
import React, { useState } from 'react';
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '@/constants/Api';
// --- Base URL ---

// --- Colors (Consistent with theme) ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
  borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF',
  buttonDisabledBg: '#AAAAAA', imagePickerBg: '#FFFFFF', imagePickerBorder: '#CCCCCC',
  iconPlaceholder: '#CCCCCC', placeholder: '#AAAAAA',
  modalInputBg: '#FFFFFF',
  labelColor: '#666666',
  statusCreated: '#007BFF',
  statusAccepted: '#28A745',
  statusInProgress: '#FFC107',
  statusCompleted: '#6C757D',
  statusDefault: '#6C757D',
};

// Define max number of proof images
const MAX_PROOF_IMAGES = 5; // Adjust if needed

export default function UpdateStatusScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;

  const [proofImages, setProofImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [companyComment, setCompanyComment] = useState(''); // State for the description
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Image Picker Logic ---
  const handleChooseProofImage = async () => {
    if (proofImages.length >= MAX_PROOF_IMAGES) {
      Alert.alert("Limit Reached", `You can select a maximum of ${MAX_PROOF_IMAGES} proof images.`);
      return;
    }
    Alert.alert( "Select Image Source", "",
      [ { text: "Camera", onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) { Alert.alert("Permission Required", "Camera access needed."); return; }
            try {
              const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 }); // Allow editing false usually for proof
              if (!result.canceled && result.assets) { setProofImages(prev => [...prev, result.assets[0]]); }
            } catch (error) { console.error("Launch Camera Error:", error); Alert.alert('Camera Error'); }
          } },
        { text: "Library", onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) { Alert.alert("Permission Required", "Media library access needed."); return; }
            try {
                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    // Consider allowing multiple selection if needed, adjust logic below
                    // allowsMultipleSelection: true,
                    // selectionLimit: MAX_PROOF_IMAGES - proofImages.length,
                 });
                if (!result.canceled && result.assets) {
                    const newImages = result.assets.slice(0, MAX_PROOF_IMAGES - proofImages.length);
                    setProofImages(prev => [...prev, ...newImages]);
                }
            } catch (error) { console.error("Launch Library Error:", error); Alert.alert('Library Error'); }
          } },
        { text: "Cancel", style: "cancel" }, ]
    );
  };

  const handleRemoveProofImage = (uriToRemove: string) => {
    setProofImages(prev => prev.filter(img => img.uri !== uriToRemove));
  };

  // --- Submit Report Handler ---
  const handleSubmitReport = async () => {
      // Validation
      if (!session || session.type !== 'partner' || !ticketId) {
          Alert.alert("Error", "Cannot submit report. Invalid session or Ticket ID.");
          return;
      }
       if (proofImages.length === 0) {
            Alert.alert("Missing Information", "Please upload at least one service proof image.");
            return;
       }
       const trimmedComment = companyComment.trim();
       if (!trimmedComment) {
           Alert.alert("Missing Information", "Please enter a description of the work done.");
           return;
       }

      setIsSubmitting(true);

      // Prepare FormData
      const formData = new FormData();
      formData.append('TicketId', ticketId.toString());
      formData.append('CompanyComment', trimmedComment);

      proofImages.forEach((image, index) => {
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const mimeType = image.mimeType ?? `image/${fileType}`;
        const fileName = image.fileName ?? `proof_image_${ticketId}_${index}.${fileType}`;
        formData.append('Images', { uri: image.uri, name: fileName, type: mimeType } as any);
      });

      console.log(`Submitting Service Proof for Ticket ${ticketId}`);
      // console.log("FormData entries (excluding files):", [...formData.entries()]);

      // API Call
      const url = `${BASE_URL}/api/IssueTicket/UpdateCompanyComment`;
      try {
          const response = await fetch(url, { method: 'POST', body: formData });
          const responseText = await response.text();
           console.log("Submit Report Response Status:", response.status);
           console.log("Submit Report Response Text:", responseText);

          if (response.ok) {
               let successMessage = "Report submitted successfully.";
               try { const result = JSON.parse(responseText); successMessage = result?.statusMessage || successMessage; } catch (e) {}
               Alert.alert('Success', successMessage, [{ text: 'OK', onPress: () => router.back() }]); // Go back on success
          } else {
               let errorMessage = `Failed (Status: ${response.status})`;
               try { const errorData = JSON.parse(responseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage; } catch (e) { errorMessage = responseText || errorMessage; }
               Alert.alert('Error Submitting Report', errorMessage);
          }
      } catch (error: any) {
          console.error("Submit Report Error:", error);
          Alert.alert('Error', `An unexpected network error occurred: ${error.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };


  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Update Job Status',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Image Picker Area */}
           <TouchableOpacity
             style={[styles.imagePickerArea, proofImages.length > 0 && styles.imagePickerAreaCompact]}
             onPress={handleChooseProofImage}
             disabled={isSubmitting || proofImages.length >= MAX_PROOF_IMAGES}
           >
             <Ionicons name="images-outline" size={24} color={COLORS.textSecondary} />
             <Text style={styles.imagePickerText}>Choose Images ({proofImages.length}/{MAX_PROOF_IMAGES}) *</Text>
           </TouchableOpacity>

           {/* Selected Proof Images Display */}
           {proofImages.length > 0 && (
             <View style={styles.thumbnailContainer}>
               {proofImages.map((image) => (
                 <View key={image.uri} style={styles.thumbnailWrapper}>
                   <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                   <TouchableOpacity
                     style={styles.removeIcon}
                     onPress={() => handleRemoveProofImage(image.uri)}
                     disabled={isSubmitting}
                   >
                     <Ionicons name="close-circle" size={24} color={COLORS.error} />
                   </TouchableOpacity>
                 </View>
               ))}
             </View>
           )}

           {/* Description Input */}
            <Text style={styles.inputLabel}>Description of work done *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter details about the job which is completed work before change status to completed"
              value={companyComment}
              onChangeText={setCompanyComment}
              multiline
              numberOfLines={5}
              placeholderTextColor={COLORS.placeholder}
              editable={!isSubmitting}
            />

           {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmitReport}
              disabled={isSubmitting}
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
  imagePickerArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.imagePickerBorder, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 30, backgroundColor: COLORS.imagePickerBg, marginBottom: 10, },
  imagePickerAreaCompact: { paddingVertical: 15, },
  imagePickerText: { marginLeft: 10, fontSize: 16, color: COLORS.textSecondary, },
  thumbnailContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20, marginTop: 10, },
  thumbnailWrapper: { position: 'relative', marginRight: 10, marginBottom: 10, },
  thumbnail: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
  removeIcon: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.background, borderRadius: 12, },
  inputLabel: { fontSize: 14, color: COLORS.labelColor, marginBottom: 5, fontWeight: '500', },
  input: { backgroundColor: COLORS.modalInputBg, borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, // Adjust padding for multiline
      fontSize: 16, color: COLORS.textPrimary, marginBottom: 25, }, // Increased margin
  textArea: { height: 120, textAlignVertical: 'top', },
  submitButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, minHeight: 50, justifyContent: 'center', },
  submitButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, },
});