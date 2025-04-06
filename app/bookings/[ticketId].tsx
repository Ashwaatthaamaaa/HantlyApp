// File: app/bookings/[ticketId].tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput // Added for OTP Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter , useFocusEffect} from 'expo-router';
import { useAuth } from '@/context/AuthContext'; // Assuming AuthContext path is correct
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ImageViewing from "react-native-image-viewing"; // Assuming installed
import Modal from 'react-native-modal'; // Using react-native-modal for OTP input example

// --- Base URL ---
// IMPORTANT: Replace with your actual API endpoint if different
const BASE_URL = 'http://3.110.124.83:2030';

// --- Types ---
interface TicketImage {
  imageId?: number;
  ticketId?: number;
  imageName?: string | null;
  imagePath?: string | null; // Make sure this is the full URL or handle prefixing
  imageContentType?: string | null;
}
interface BookingDetail {
  ticketId: number;
  reportingPerson?: string;
  reportingDescription?: string;
  operationId?: number;
  status?: string;
  toCraftmanType?: string;
  address?: string;
  city?: string;
  pincode?: string;
  countyId?: number;
  municipalityId?: number;
  createdOn: string;
  updatedOn?: string | null;
  countyName?: string;
  municipalityName?: string;
  reviewStarRating?: number | null;
  reviewComment?: string;
  companyComment?: string;
  closingOTP?: number | null;
  companyId?: number | null;
  companyEmailId?: string;
  companyName?: string;
  companyMobileNumber?: string;
  userId?: number | null;
  userEmailId?: string;
  userName?: string;
  userMobileNumber?: string;
  ticketImages?: TicketImage[] | null;
  ticketWorkImages?: TicketImage[] | null; // Images uploaded by partner as proof
}

// --- Colors ---
// Consider defining these in a separate theme/constants file
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#555555',
  accent: '#696969', // A neutral accent color
  headerBg: '#FFFFFF',
  headerText: '#333333',
  error: '#D9534F', // Red for errors
  borderColor: '#E0E0E0', // Light gray for borders
  cardBg: '#F8F8F8', // Slightly off-white for cards
  buttonBg: '#696969', // Accent color for buttons
  buttonText: '#FFFFFF',
  iconPlaceholder: '#CCCCCC', // Placeholder color for image icons
  labelColor: '#666666', // Color for labels like "Job Description"
  statusCreated: '#007BFF', // Blue
  statusAccepted: '#28A745', // Green
  statusInProgress: '#FFC107', // Yellow/Orange
  statusCompleted: '#6C757D', // Gray
  statusDefault: '#6C757D', // Default/Unknown status color
  modalInputBg: '#FFFFFF',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // 'sv-SE' gives YYYY-MM-DD format
    return new Date(dateString).toLocaleDateString('sv-SE');
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
};

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // 'sv-SE' locale often uses 24-hour format HH:mm
    return new Date(dateString).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error("Error formatting time:", e);
    return 'Invalid Time';
  }
};

const getStatusColor = (status?: string): string => {
  const lowerCaseStatus = status?.toLowerCase() || '';
  if (lowerCaseStatus === 'created') return COLORS.statusCreated;
  if (lowerCaseStatus === 'accepted') return COLORS.statusAccepted;
  // Handle both 'inprogress' and 'in progress' if API might return either
  if (lowerCaseStatus === 'inprogress' || lowerCaseStatus === 'in progress') return COLORS.statusInProgress;
  if (lowerCaseStatus === 'completed') return COLORS.statusCompleted;
  return COLORS.statusDefault; // Default color for other statuses
};


// --- Main Component ---
export default function BookingDetailScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Assuming useAuth provides session object with { id, type: 'partner' | 'user', ... }
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;

  const [bookingData, setBookingData] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false); // To disable buttons during API call

  // Image Viewer State
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesForViewer, setImagesForViewer] = useState<{ uri: string }[]>([]);

  // OTP Modal State
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(''); // For displaying errors within the OTP modal

  // --- Fetch Booking Details ---
  const fetchBookingDetails = useCallback(async () => {
    // Validate ticketId
    if (!ticketId || isNaN(ticketId)) {
      setError("Invalid Ticket ID provided.");
      setIsLoading(false);
      return;
    }
    // Ensure user is logged in
    if (!session) {
      Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace('/login') }]);
      return;
    }

    setIsLoading(true);
    setError(null); // Clear previous errors
    const url = `${BASE_URL}/api/IssueTicket/GetTicket?TicketId=${ticketId}`;
    console.log("Fetching details from:", url);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        // Try to get more specific error from response body
        const errorText = await response.text();
        console.error(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`Failed to fetch details (Status: ${response.status}). ${errorText || 'Server error'}`);
      }

      const data: BookingDetail = await response.json();
      // Ensure image paths are complete URLs if needed
      // Example: data.ticketImages = data.ticketImages?.map(img => ({ ...img, imagePath: img.imagePath ? `${BASE_URL}${img.imagePath}` : null })) ?? null;
      setBookingData(data);

    } catch (err: any) {
      console.error("Error fetching booking details:", err);
      setError(`Failed to load booking details: ${err.message}`);
      setBookingData(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, session, router]); // Dependencies for useCallback

  // Refetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBookingDetails();
    }, [fetchBookingDetails]) // fetchBookingDetails is memoized, so this is safe
  );

  // --- Action: Update Status ---
  // Type definition ensures only valid statuses are passed
  const updateStatus = async (newStatus: "Accepted" | "Inprogress" | "Completed", otp: number | null = 0): Promise<boolean> => {
      // Validate session and required IDs
      if (!session || session.type !== 'partner' || !session.id || !ticketId) {
          Alert.alert("Error", "Cannot update status. Invalid session or ticket ID.");
          return false; // Indicate failure
      }

      // Prevent duplicate submissions
      if (isSubmittingStatus) return false;

      setIsSubmittingStatus(true); // Indicate loading state
      const url = `${BASE_URL}/api/IssueTicket/UpdateTicketStatus`;
      const body = JSON.stringify({
          ticketId: ticketId,
          status: newStatus, // Send the exact status string
          closingOTP: otp, // Send OTP (0 if not applicable)
          companyId: session.id // Partner's company ID from session
      });

      console.log(`Updating status API Call: URL=${url}, Body=${body}`);

      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'accept': 'text/plain' // Or 'application/json' if API returns JSON
              },
              body: body
          });

          const responseText = await response.text(); // Get text first to handle potential JSON errors
          console.log(`Update Status Response (${newStatus}): Status=${response.status}, Body=${responseText}`);

          if (!response.ok) {
               // Attempt to parse error message from response text (might be plain text or JSON)
               let errorMessage = `Failed (Status: ${response.status})`;
               try {
                  const errorData = JSON.parse(responseText);
                  // Look for common error message properties
                  errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || errorData?.message || responseText || errorMessage;
               } catch (e) {
                   // If parsing fails, use the raw text or the default message
                   errorMessage = responseText || errorMessage;
               }
               throw new Error(errorMessage);
          }

          // Assuming successful response text might be JSON with a success message
          let successMessage = "Status updated successfully";
          try {
            const result = JSON.parse(responseText);
            successMessage = result?.statusMessage || successMessage;
          } catch(e) { /* Ignore if response is not JSON */ }

          Alert.alert("Success", successMessage);
          await fetchBookingDetails(); // Refetch data to show the updated status
          return true; // Indicate success

      } catch (err: any) {
          console.error(`Failed to update status to ${newStatus}:`, err);
          Alert.alert("Error updating status", err.message || "An unexpected error occurred.");
          return false; // Indicate failure
      } finally {
          setIsSubmittingStatus(false); // Reset loading state
          // Close OTP modal regardless of success/failure if it was open
          if (newStatus === "Completed") {
              setOtpModalVisible(false);
              setEnteredOtp(''); // Clear OTP input
          }
      }
  };

  // --- Action Handlers ---

  // Handler for "Accept Job" button
  const handleAcceptJob = () => {
      Alert.alert(
          "Confirm Action",
          "Are you sure you want to accept this job?",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Accept", onPress: () => updateStatus("Accepted", 0) } // OTP is 0 for accept
          ]
      );
  };

  // Handler for "Start Job" button
  const handleChangeToInProgress = () => {
      Alert.alert(
          "Confirm Action",
          "Are you sure you want to start this job and change status to In Progress?",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Start Job", onPress: () => updateStatus("Inprogress", 0) } // OTP is 0 for start
          ]
      );
  };

  // Handler for "Complete Job" button (opens OTP Modal)
  const handleChangeToComplete = () => {
      setOtpError(''); // Clear previous errors
      setEnteredOtp(''); // Clear previous input
      setOtpModalVisible(true); // Open the OTP modal
      // The actual updateStatus("Completed", otp) call happens in handleSubmitOtp
  };

  // Handler for OTP Modal Submit button
  const handleSubmitOtp = () => {
      const otpValue = parseInt(enteredOtp, 10);
      // Validate OTP input
      if (!enteredOtp || isNaN(otpValue) || enteredOtp.length !== 4) { // Assuming 4-digit OTP
          setOtpError("Please enter a valid 4-digit numeric OTP.");
          return;
      }
      setOtpError(''); // Clear error if validation passes
      // Call updateStatus with "Completed" and the entered OTP
      updateStatus("Completed", otpValue);
      // Modal will be closed in the finally block of updateStatus
  };

  // Handler for Chat button
  const handleChatPress = () => {
      // Placeholder: Implement actual navigation or chat functionality
      if (bookingData?.companyId || bookingData?.userId) {
          Alert.alert("Navigate to Chat", `Initiate chat for Ticket ${ticketId}.`);
          // Example navigation: router.push(`/chat/${ticketId}`);
      } else {
          Alert.alert("Cannot Chat", "Required information for chat is missing.");
      }
  };

  // Handler for navigating to Service Proof screen (or opening image upload)
  const handleServiceProofPress = () => {
      if (ticketId) {
          // Navigate to a screen where the partner can upload/view work images
          router.push(`/bookings/update-status/${ticketId}`); // Adjust path as needed
      } else {
          Alert.alert("Error", "Missing Ticket ID.");
      }
  };

  // Handler for calling the provider (from User view)
  const handleCallProvider = () => {
      const phoneNumber = bookingData?.companyMobileNumber;
      if (phoneNumber) {
          const url = `tel:${phoneNumber}`;
          Linking.canOpenURL(url)
              .then(supported => {
                  if (supported) {
                      Linking.openURL(url);
                  } else {
                      Alert.alert('Cannot Make Call', `Device does not support calling ${phoneNumber}.`);
                  }
              })
              .catch(err => console.error('Error opening phone dialer:', err));
      } else {
          Alert.alert('Cannot Call', 'Provider phone number is not available.');
      }
  };

   // Handler for copying OTP (for User view)
   const handleCopyOtp = async () => {
      const otp = bookingData?.closingOTP;
      if (otp) {
          try {
              await Clipboard.setStringAsync(otp.toString());
              Alert.alert("OTP Copied", "The closing OTP has been copied to your clipboard.");
          } catch (e) {
              console.error("Clipboard error:", e);
              Alert.alert("Error", "Could not copy OTP to clipboard.");
          }
      } else {
          Alert.alert("No OTP", "Closing OTP is not available yet.");
      }
   };

  // Handler to open image viewer for Ticket Images (initial problem images)
  const openImageViewerForTicketImages = (index: number) => {
      const images = bookingData?.ticketImages
          ?.map(img => ({ uri: img.imagePath || '' })) // Ensure you have full URLs here
          .filter(img => !!img.uri) // Filter out any invalid image paths
          || [];

      if (images.length > 0) {
          setImagesForViewer(images);
          setCurrentImageIndex(index);
          setImageViewerVisible(true);
      } else {
          Alert.alert("No Images", "There are no images available to view for this ticket.");
      }
  };

  // --- Render Logic ---

   // Loading State
   if (isLoading) {
       return (
           <SafeAreaView style={styles.centered}>
               <ActivityIndicator size="large" color={COLORS.accent} />
               <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading booking details...</Text>
           </SafeAreaView>
       );
   }

   // Error State
   if (error) {
       return (
           <SafeAreaView style={styles.centered}>
               <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
               <Text style={styles.errorText}>{error}</Text>
               <TouchableOpacity onPress={fetchBookingDetails} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
               </TouchableOpacity>
           </SafeAreaView>
       );
   }

   // No Data State
   if (!bookingData) {
       return (
           <SafeAreaView style={styles.centered}>
               <Ionicons name="information-circle-outline" size={40} color={COLORS.textSecondary} />
               <Text style={{ marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' }}>
                   Booking details could not be found for Ticket ID {ticketIdParam}.
               </Text>
               <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
               </TouchableOpacity>
           </SafeAreaView>
       );
   }

   // --- Derived State for Conditional Rendering ---
   const isPartner = session?.type === 'partner';
   const status = bookingData.status?.toLowerCase() || 'unknown'; // Lowercase for easier comparison
   const cardImageUrl = bookingData.ticketImages?.[0]?.imagePath; // Ensure this is a full URL
   const isInProgress = status.includes('inprogress') || status.includes('in progress'); // Check both possibilities

   // Partner specific UI elements
   const showAcceptButton = isPartner && status === 'created';
   const showInProgressButton = isPartner && status === 'accepted';
   const showCompleteButton = isPartner && isInProgress;
   const serviceProofImagesExist = bookingData.ticketWorkImages && bookingData.ticketWorkImages.length > 0;
   // Partner sees the "Service Proof" row/button if they are InProgress or have Completed the job
   const showServiceProofRowOrButton = isPartner && (isInProgress || status === 'completed');

   // User specific UI elements
   // User sees OTP only if partner is InProgress AND partner uploaded proof AND API provided the OTP
   const userCanSeeOtp = !isPartner && isInProgress && serviceProofImagesExist && bookingData.closingOTP != null;
   // User sees provider info once the job is accepted or later
   const userCanSeeProviderInfo = !isPartner && (status === 'accepted' || isInProgress || status === 'completed');
   // User sees the "Service Proof" row only if proof exists and job is InProgress or Completed
   const userCanSeeServiceProofRow = !isPartner && serviceProofImagesExist && (isInProgress || status === 'completed');
   const userCanChat = !isPartner && !!bookingData.companyId; // User can chat if a company is assigned

   // General elements visible to either role
   const partnerCanChat = isPartner; // Partner can always potentially chat
   const showCustomerInfo = isPartner; // Partner sees customer details

   return (
     <SafeAreaView style={styles.safeArea}>
       {/* Screen Header Configuration */}
       <Stack.Screen
          options={{
            title: bookingData.toCraftmanType || 'Booking Details',
            headerStyle: { backgroundColor: COLORS.headerBg },
            headerTintColor: COLORS.headerText,
            headerTitleStyle: { fontWeight: 'bold' },
            // Add a back button maybe? headerLeft: () => <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.headerText} style={{marginLeft: 15}} /></TouchableOpacity>
          }}
       />

       <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

         {/* Status Display and Action Buttons / OTP */}
         <View style={styles.statusHeader}>
            <Text style={[styles.statusTextTop, { color: getStatusColor(bookingData.status) }]}>
              {bookingData.status || 'Unknown Status'}
            </Text>
            {/* Partner Action Buttons */}
            {showAcceptButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleAcceptJob} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Accept Job</Text></TouchableOpacity>}
            {showInProgressButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToInProgress} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Start Job</Text></TouchableOpacity>}
            {showCompleteButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToComplete} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Complete Job</Text></TouchableOpacity>}
            {/* User OTP Display */}
            {userCanSeeOtp && (
                <TouchableOpacity style={styles.otpContainer} onPress={handleCopyOtp}>
                    <Text style={styles.otpText}>OTP: {bookingData.closingOTP}</Text>
                    <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 5 }}/>
                </TouchableOpacity>
            )}
         </View>
          {/* Loading indicator during status update */}
          {isSubmittingStatus && <ActivityIndicator style={{marginVertical: 5}} size="small" color={COLORS.accent}/>}

         {/* Top Information Card */}
         <View style={styles.infoCard}>
              {/* Make image clickable to open viewer */}
              <TouchableOpacity
                  style={styles.cardImageContainer}
                  onPress={() => openImageViewerForTicketImages(0)}
                  disabled={!cardImageUrl} // Disable if no image
              >
                  {cardImageUrl ? (
                      <Image source={{ uri: cardImageUrl }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                      <View style={styles.cardImagePlaceholder}>
                          <Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} />
                      </View>
                  )}
              </TouchableOpacity>
              <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{bookingData.toCraftmanType || 'Service Request'}</Text>
                  <Text style={styles.cardDateTime}>Date: {formatDate(bookingData.createdOn)}</Text>
                  <Text style={styles.cardDateTime}>Time: {formatTime(bookingData.createdOn)}</Text>
                  {/* Display Ticket ID clearly */}
                  <Text style={styles.cardDateTime}>Ticket ID: {bookingData.ticketId}</Text>
              </View>
         </View>

         {/* Job Details Section */}
         <View style={styles.detailsSection}>
              <Text style={styles.sectionLabel}>Job Description</Text>
              <Text style={styles.sectionValue}>{bookingData.reportingDescription || 'No description provided.'}</Text>

              <Text style={styles.sectionLabel}>Location</Text>
              <Text style={styles.sectionValue}>
                  {bookingData.address ? `${bookingData.address}, ` : ''}
                  {bookingData.municipalityName || 'N/A Municipality'}, {bookingData.countyName || 'N/A County'}
                  {bookingData.pincode ? `, ${bookingData.pincode}` : ''}
              </Text>
              {/* Optionally show City if available and different from Municipality */}
              {bookingData.city && bookingData.city !== bookingData.municipalityName && (
                 <Text style={styles.sectionValue}>City: {bookingData.city}</Text>
              )}
         </View>

         {/* Chat Button (Conditional) */}
         { (userCanChat || partnerCanChat) && (
            <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
                <Ionicons name="chatbubbles-outline" size={20} color={COLORS.buttonText} style={{ marginRight: 8 }}/>
                <Text style={styles.chatButtonText}>CHAT</Text>
            </TouchableOpacity>
         )}

         {/* Provider Info Section (Visible to User) */}
         {userCanSeeProviderInfo && bookingData.companyId && (
            <View style={styles.detailsSection}>
                 <Text style={styles.sectionTitle}>About Your Provider</Text>
                 <View style={styles.providerCard}>
                     <View style={styles.providerLogoPlaceholder}>
                         {/* Placeholder - Add company logo if available */}
                         <Ionicons name="business-outline" size={30} color={COLORS.textSecondary} />
                     </View>
                     <View style={styles.providerDetails}>
                         <Text style={styles.providerName}>{bookingData.companyName || 'Provider Name Not Available'}</Text>
                         {bookingData.companyEmailId && <Text style={styles.providerContact}>{bookingData.companyEmailId}</Text>}
                         {bookingData.companyMobileNumber && (
                            <TouchableOpacity onPress={handleCallProvider} style={styles.providerContactRow}>
                                <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/>
                                <Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.companyMobileNumber}</Text>
                            </TouchableOpacity>
                         )}
                         {/* Add more provider details if needed */}
                     </View>
                 </View>
            </View>
         )}

         {/* Customer Info Section (Visible to Partner) */}
         {showCustomerInfo && (
             <View style={styles.detailsSection}>
                 <Text style={styles.sectionTitle}>About Customer</Text>
                 <View style={styles.providerCard}>
                     <View style={styles.providerLogoPlaceholder}>
                          <Ionicons name="person-outline" size={30} color={COLORS.textSecondary} />
                     </View>
                     <View style={styles.providerDetails}>
                         {/* Prefer userName, fallback to reportingPerson */}
                         <Text style={styles.providerName}>{bookingData.userName || bookingData.reportingPerson || 'Customer Name Not Available'}</Text>
                         {bookingData.userEmailId && <Text style={styles.providerContact}>{bookingData.userEmailId}</Text>}
                         {bookingData.userMobileNumber && (
                             // Optionally make customer number callable for partner too
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${bookingData.userMobileNumber}`)} style={styles.providerContactRow}>
                                <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/>
                                <Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.userMobileNumber}</Text>
                            </TouchableOpacity>
                         )}
                         {/* Add address again here if needed, though it's above */}
                     </View>
                 </View>
             </View>
         )}

         {/* Service Proof Row (Conditional Navigation) */}
         { (userCanSeeServiceProofRow || showServiceProofRowOrButton) && (
            <TouchableOpacity style={styles.actionRow} onPress={handleServiceProofPress}>
                <View style={styles.actionRowContent}>
                    <Ionicons name="camera-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 10 }}/>
                    <Text style={styles.actionText}>Service Proof</Text>
                    {/* Show count only if images exist */}
                    {serviceProofImagesExist && (
                       <Text style={styles.serviceProofCount}>({bookingData.ticketWorkImages?.length} image{bookingData.ticketWorkImages?.length !== 1 ? 's' : ''})</Text>
                    )}
                    {/* Indicate if partner still needs to upload */}
                    {!serviceProofImagesExist && isPartner && isInProgress && (
                        <Text style={styles.uploadNeededText}>(Upload Required)</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
         )}

         {/* Review Section (Visible to User after Completion) */}
         {!isPartner && status === 'completed' && (
             <View style={styles.detailsSection}>
                 <Text style={styles.sectionTitle}>Your Review</Text>
                 {/* Add logic here to allow user to *submit* a review if not yet done */}
                 {bookingData.reviewStarRating != null ? (
                    <>
                        <Text style={styles.sectionValue}>
                            Rating: {'⭐'.repeat(bookingData.reviewStarRating)}{'☆'.repeat(5 - bookingData.reviewStarRating)} ({bookingData.reviewStarRating}/5)
                        </Text>
                        <Text style={styles.sectionValue}>
                            Comment: {bookingData.reviewComment || 'No comment provided.'}
                        </Text>
                        {bookingData.companyComment && (
                            <>
                              <Text style={styles.sectionLabel}>Provider Response:</Text>
                              <Text style={styles.sectionValue}>{bookingData.companyComment}</Text>
                            </>
                        )}
                    </>
                 ) : (
                    <View>
                       <Text style={styles.sectionValue}>You haven't rated this service yet.</Text>
                       {/* Add a button to navigate to a review screen */}
                       {/* <TouchableOpacity onPress={() => router.push(`/review/${ticketId}`)} style={styles.reviewButton}><Text style={styles.reviewButtonText}>Rate Service</Text></TouchableOpacity> */}
                    </View>
                 )}
             </View>
         )}

       </ScrollView>

       {/* --- Modals --- */}

       {/* Image Viewer Modal */}
       <ImageViewing
            images={imagesForViewer}
            imageIndex={currentImageIndex}
            visible={isImageViewerVisible}
            onRequestClose={() => setImageViewerVisible(false)}
            presentationStyle="overFullScreen" // iOS specific
            swipeToCloseEnabled={true}
            doubleTapToZoomEnabled={true}
            FooterComponent={({ imageIndex }) => ( // Optional footer to show image count
                <View style={styles.imageViewerFooter}>
                    <Text style={styles.imageViewerFooterText}>{`${imageIndex + 1} / ${imagesForViewer.length}`}</Text>
                </View>
            )}
        />

        {/* OTP Entry Modal */}
        <Modal
            isVisible={isOtpModalVisible}
            onBackdropPress={() => !isSubmittingStatus && setOtpModalVisible(false)} // Prevent closing while submitting
            onBackButtonPress={() => !isSubmittingStatus && setOtpModalVisible(false)} // Android back button
            avoidKeyboard // Automatically handles keyboard covering input
            style={styles.otpModalContainer}
            backdropOpacity={0.5}
            animationIn="zoomIn"
            animationOut="zoomOut"
         >
            <View style={styles.otpModalContent}>
                <Text style={styles.otpModalTitle}>Enter OTP From User</Text>
                <Text style={styles.otpModalSubtitle}>Ask the customer for the 4-digit code.</Text>
                <TextInput
                    style={styles.otpInput}
                    placeholder="----"
                    placeholderTextColor={COLORS.iconPlaceholder}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={enteredOtp}
                    onChangeText={setEnteredOtp}
                    autoFocus={true} // Focus input when modal opens
                    selectionColor={COLORS.accent}
                />
                {/* Display OTP validation errors */}
                {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

                <View style={styles.otpModalActions}>
                    <TouchableOpacity
                       style={[styles.otpModalButton, styles.otpCloseButton]}
                       onPress={() => setOtpModalVisible(false)}
                       disabled={isSubmittingStatus} // Disable while submitting
                    >
                        <Text style={styles.otpCloseButtonText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.otpModalButton, styles.otpSubmitButton, isSubmittingStatus && styles.buttonDisabled]} // Style when disabled
                        onPress={handleSubmitOtp}
                        disabled={isSubmittingStatus || enteredOtp.length !== 4} // Also disable if OTP length isn't 4
                    >
                       {/* Show activity indicator when submitting */}
                       {isSubmittingStatus
                           ? <ActivityIndicator size="small" color={COLORS.buttonText}/>
                           : <Text style={styles.otpSubmitButtonText}>Submit & Complete</Text>
                       }
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

     </SafeAreaView>
   );
}

// --- Styles ---
// (Keep all existing styles and add/modify as needed below)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1, // Ensure content can scroll if it exceeds screen height
    padding: 20,
    paddingBottom: 40, // Extra padding at the bottom
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
      marginTop: 15,
      backgroundColor: COLORS.accent,
      paddingVertical: 10,
      paddingHorizontal: 25,
      borderRadius: 5,
  },
  retryButtonText: {
      color: COLORS.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5, // Reduced margin
    flexWrap: 'wrap', // Allow button/OTP to wrap if needed
  },
  statusTextTop: {
    fontSize: 18, // Slightly larger status text
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginRight: 10, // Space between status and buttons/OTP
    marginBottom: 5, // Margin if wraps
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 5, // Slightly more padding
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    marginBottom: 5, // Margin if wraps
  },
  otpText: {
    fontSize: 14,
    color: COLORS.textPrimary, // Darker OTP text
    fontWeight: 'bold', // Make OTP bold
  },
  statusActionButton: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 8, // Adjusted padding
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 5, // Space between buttons if multiple shown
    marginBottom: 5, // Margin if wraps
  },
  statusActionButtonText: {
    color: COLORS.buttonText,
    fontSize: 13, // Slightly smaller text for actions
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 15, // More padding
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    elevation: 1, // Subtle shadow on Android
    shadowColor: '#000', // Shadow on iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardImageContainer: {
    width: 80, // Larger image
    height: 80,
    borderRadius: 6, // Slightly rounded corners
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.iconPlaceholder, // Background for placeholder
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17, // Larger title
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDateTime: {
    fontSize: 13, // Slightly larger date/time
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  detailsSection: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.labelColor,
    marginBottom: 5,
    marginTop: 15, // Space above label
    fontWeight: '600', // Bolder labels
  },
  sectionValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 8, // Space below value
    lineHeight: 23, // Improve readability
  },
  sectionTitle: {
    fontSize: 18, // Larger section titles
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15,
    paddingTop: 20, // More space above title
    borderTopWidth: 1,
    borderTopColor: COLORS.borderColor,
    marginTop: 10, // Space before the border
  },
  chatButton: {
    backgroundColor: COLORS.accent, // Use accent color
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
    flexDirection: 'row', // Align icon and text
    marginBottom: 30, // More space below button
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  chatButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg, // Use card background
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    marginTop: 5, // Space below section title
  },
  providerLogoPlaceholder: {
    width: 50, // Larger placeholder
    height: 50,
    borderRadius: 25, // Circular
    backgroundColor: COLORS.iconPlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  providerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4, // Space between contact lines
  },
  providerIcon: {
    marginRight: 8, // More space for icon
  },
  providerContact: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  phoneLink: {
    color: COLORS.statusCreated, // Make phone number look like a link
    textDecorationLine: 'underline', // Underline phone number
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18, // More vertical padding
    borderTopWidth: 1,
    borderTopColor: COLORS.borderColor,
    borderBottomWidth: 1, // Add bottom border too
    borderBottomColor: COLORS.borderColor,
    marginTop: 10,
    marginBottom: 15, // Space after row
  },
  actionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow text content to take space
  },
  actionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  serviceProofCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8, // Space before count
  },
  uploadNeededText: {
    fontSize: 13,
    color: COLORS.error, // Highlight need for upload
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Image Viewer Footer Styles
  imageViewerFooter: {
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerFooterText: {
    color: 'white',
    fontSize: 16,
  },
  // OTP Modal Styles
  otpModalContainer: {
    // No explicit flex: 1, margin: 0 needed if using react-native-modal defaults
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
  },
  otpModalContent: {
    backgroundColor: COLORS.modalInputBg, // Use defined background
    padding: 30, // More padding
    borderRadius: 15, // More rounded corners
    width: '90%', // Wider modal
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  otpModalTitle: {
    fontSize: 20, // Larger title
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8, // Space below title
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 25, // More space below subtitle
  },
  otpInput: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    backgroundColor: '#f9f9f9', // Slight background tint
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    width: '70%', // Adjust width as needed
    textAlign: 'center',
    fontSize: 24, // Larger font for OTP digits
    marginBottom: 15, // Space below input
    letterSpacing: 10, // Space out digits
    fontWeight: 'bold',
  },
  otpErrorText: {
    color: COLORS.error,
    marginBottom: 15, // Space below error
    fontSize: 13,
    textAlign: 'center',
  },
  otpModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space out buttons
    width: '100%',
    marginTop: 15, // Space above buttons
  },
  otpModalButton: {
    flex: 1, // Make buttons take equal width
    paddingVertical: 12, // Button padding
    borderRadius: 8, // Rounded buttons
    alignItems: 'center', // Center text
    marginHorizontal: 5, // Space between buttons
  },
  otpCloseButton: {
      backgroundColor: COLORS.background, // White background
      borderWidth: 1,
      borderColor: COLORS.accent,
  },
  otpCloseButtonText: {
      color: COLORS.accent, // Accent color text
      fontWeight: 'bold',
      fontSize: 15,
  },
  otpSubmitButton: {
      backgroundColor: COLORS.buttonBg, // Primary button color
  },
  otpSubmitButtonText: {
      color: COLORS.buttonText, // White text
      fontWeight: 'bold',
      fontSize: 15,
  },
  buttonDisabled: {
      backgroundColor: '#CCCCCC', // Grey out button when disabled
      opacity: 0.7,
  },
  reviewButton: { // Example style if you add a review button
      marginTop: 15,
      backgroundColor: COLORS.accent,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
      alignSelf: 'flex-start',
  },
  reviewButtonText: {
      color: COLORS.buttonText,
      fontWeight: 'bold',
  }
});