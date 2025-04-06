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
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
// --- Import the image viewer library ---
import ImageViewing from "react-native-image-viewing";
// ---------------------------------------

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';

// --- Types ---
interface TicketImage {
    imageId?: number;
    ticketId?: number;
    imageName?: string | null;
    imagePath?: string | null;
    imageContentType?: string | null;
}
interface BookingDetail {
  ticketId: number;
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
  ticketImages?: TicketImage[] | null;
  ticketWorkImages?: TicketImage[] | null;
}
// --- Colors ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333',
  error: '#D9534F', borderColor: '#E0E0E0', cardBg: '#F8F8F8',
  buttonBg: '#696969', buttonText: '#FFFFFF', iconPlaceholder: '#CCCCCC',
  labelColor: '#666666', statusCreated: '#007BFF', statusAccepted: '#28A745',
  statusInProgress: '#FFC107', statusCompleted: '#6C757D', statusDefault: '#6C757D',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => { /* ... keep same ... */ if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleDateString('sv-SE'); } catch (error) { return 'Invalid Date'; } };
const formatTime = (dateString: string | null): string => { /* ... keep same ... */ if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); } catch (error) { return 'Invalid Time'; } };
const getStatusColor = (status?: string): string => { /* ... keep same ... */ const lowerStatus = status?.toLowerCase() || ''; if (lowerStatus === 'created') return COLORS.statusCreated; if (lowerStatus === 'accepted') return COLORS.statusAccepted; if (lowerStatus === 'inprogress' || lowerStatus === 'in progress') return COLORS.statusInProgress; if (lowerStatus === 'completed') return COLORS.statusCompleted; return COLORS.statusDefault; };


// --- Main Component ---
export default function BookingDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;

  const [bookingData, setBookingData] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for Image Viewer ---
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesForViewer, setImagesForViewer] = useState<{ uri: string }[]>([]);
  // ---------------------------

  useEffect(() => {
    // ... (keep existing useEffect for fetchBookingDetails) ...
     if (!ticketId || isNaN(ticketId)) { setError("Invalid Ticket ID."); setIsLoading(false); return; }
    if (!session) { router.replace('/login'); return; }
    const fetchBookingDetails = async () => {
      setIsLoading(true); setError(null);
      const url = `${BASE_URL}/api/IssueTicket/GetTicket?TicketId=${ticketId}`;
      console.log(`Workspaceing details from: ${url}`);
      try {
        const response = await fetch(url);
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed (${response.status}): ${errorText}`); }
        const data: BookingDetail = await response.json();
        setBookingData(data);
      } catch (err: any) { console.error("Fetch booking detail error:", err); setError(`Failed: ${err.message}`);
      } finally { setIsLoading(false); }
    };
    fetchBookingDetails();
  }, [ticketId, session, router]);

  // --- Action Handlers ---
  const handleChatPress = () => { /* ... keep same ... */ if (bookingData?.companyId) { Alert.alert("Navigate to Chat", `Start chat for Ticket ${ticketId} with Company ${bookingData.companyId}`); } else { Alert.alert("Cannot Chat", "Provider information unavailable."); } };
  const handleServiceProofPress = () => {
      const proofImages = bookingData?.ticketWorkImages?.map(img => ({ uri: img.imagePath || '' })).filter(img => !!img.uri) || [];
      if (proofImages.length > 0) {
          setImagesForViewer(proofImages);
          setCurrentImageIndex(0);
          setImageViewerVisible(true);
      } else { Alert.alert("No Service Proof", "No service proof images available yet."); }
  };
  const handleCallProvider = () => { /* ... keep same ... */ if (bookingData?.companyMobileNumber) { const phoneNumber = `tel:${bookingData.companyMobileNumber}`; Linking.canOpenURL(phoneNumber) .then(supported => { if (supported) { Linking.openURL(phoneNumber); } else { Alert.alert('Cannot Call', 'Unable to make phone calls...'); } }).catch(err => console.error('Call error', err)); } };
  const handleCopyOtp = async () => { /* ... keep same ... */ if (bookingData?.closingOTP) { await Clipboard.setStringAsync(bookingData.closingOTP.toString()); Alert.alert("OTP Copied"); } };

  // Function to open viewer for the top card image(s)
   const openImageViewerForTicketImages = (index: number) => {
       const userImages = bookingData?.ticketImages?.map(img => ({ uri: img.imagePath || '' })).filter(img => !!img.uri) || [];
       if (userImages.length > 0) {
           setImagesForViewer(userImages); // Set images to user images
           setCurrentImageIndex(index);
           setImageViewerVisible(true);
       }
   };


  // --- Render Functions ---
   if (isLoading) { return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>; }
   if (error) { return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>; }
   if (!bookingData) { return <View style={styles.centered}><Text>Booking details not found.</Text></View>; }

   const status = bookingData.status?.toLowerCase() || '';
   const showProviderInfo = status === 'accepted' || status === 'inprogress' || status === 'in progress' || status === 'completed';
   const showOtp = (status === 'inprogress' || status === 'in progress') && bookingData.closingOTP !== null && bookingData.closingOTP !== undefined;
   const serviceProofImagesExist = bookingData.ticketWorkImages && bookingData.ticketWorkImages.length > 0;
   const showServiceProofRow = serviceProofImagesExist && (status === 'inprogress' || status === 'in progress' || status === 'completed');
   const showChatButton = !!bookingData.companyId;
   const cardImageUrl = bookingData.ticketImages?.[0]?.imagePath;

   return (
     <SafeAreaView style={styles.safeArea}>
       <Stack.Screen options={{ title: bookingData.toCraftmanType || 'Booking Details', headerStyle: { backgroundColor: COLORS.headerBg }, headerTintColor: COLORS.headerText, headerTitleStyle: { fontWeight: 'bold' }, }} />
       <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

         {/* Status and OTP */}
         <View style={styles.statusHeader}>
            <Text style={[styles.statusTextTop, { color: getStatusColor(bookingData.status) }]}>{bookingData.status || 'Unknown Status'}</Text>
            {showOtp && ( <TouchableOpacity style={styles.otpContainer} onPress={handleCopyOtp}> <Text style={styles.otpText}>Otp: {bookingData.closingOTP}</Text> <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 5 }}/> </TouchableOpacity> )}
         </View>

         {/* Top Card */}
         <View style={styles.infoCard}>
              <TouchableOpacity style={styles.cardImageContainer} onPress={() => openImageViewerForTicketImages(0)} disabled={!cardImageUrl}>
                  {cardImageUrl ? ( <Image source={{ uri: cardImageUrl }} style={styles.cardImage} resizeMode="cover" /> ) : ( <View style={styles.cardImagePlaceholder}><Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} /></View> )}
              </TouchableOpacity>
              <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{bookingData.toCraftmanType || 'N/A'}</Text>
                  <Text style={styles.cardDateTime}>Date: {formatDate(bookingData.createdOn)}</Text>
                  <Text style={styles.cardDateTime}>Time: {formatTime(bookingData.createdOn)}</Text>
              </View>
         </View>

         {/* Job Details */}
         <View style={styles.detailsSection}>
              <Text style={styles.sectionLabel}>Job Description</Text>
              <Text style={styles.sectionValue}>{bookingData.reportingDescription || 'N/A'}</Text>
              <Text style={styles.sectionLabel}>County</Text>
              <Text style={styles.sectionValue}>{bookingData.countyName || 'N/A'}</Text>
              <Text style={styles.sectionLabel}>Municipality</Text>
              <Text style={styles.sectionValue}>{bookingData.municipalityName || 'N/A'}</Text>
         </View>

         {/* Chat Button */}
         {showChatButton && ( <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}> <Text style={styles.chatButtonText}>CHAT</Text> </TouchableOpacity> )}

         {/* Provider Info */}
         {showProviderInfo && bookingData.companyId && ( <View style={styles.detailsSection}> <Text style={styles.sectionTitle}>About Provider</Text> <View style={styles.providerCard}> <View style={styles.providerLogoPlaceholder}> <Ionicons name="business-outline" size={30} color={COLORS.textSecondary} /> </View> <View style={styles.providerDetails}> <Text style={styles.providerName}>{bookingData.companyName || 'N/A'}</Text> {bookingData.companyEmailId && <Text style={styles.providerContact}>{bookingData.companyEmailId}</Text>} {bookingData.companyMobileNumber && <TouchableOpacity onPress={handleCallProvider} style={styles.providerContactRow}> <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/> <Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.companyMobileNumber}</Text> </TouchableOpacity> } </View> </View> </View> )}

         {/* Service Proof Row */}
         {showServiceProofRow && (
            <TouchableOpacity style={styles.actionRow} onPress={handleServiceProofPress}>
                <Text style={styles.actionText}>Service Proof</Text>
                <Text style={styles.serviceProofCount}>{bookingData.ticketWorkImages?.length} image(s)</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
         )}

         {/* Placeholder for Review Section */}
         {status === 'completed' && ( <View style={styles.detailsSection}> <Text style={styles.sectionTitle}>Review</Text> <Text style={styles.sectionValue}> Rating: {bookingData.reviewStarRating ?? 'Not Rated'} </Text> <Text style={styles.sectionValue}> Comment: {bookingData.reviewComment || 'No comment'} </Text> </View> )}

       </ScrollView>

       {/* --- Integrated Image Viewer Component --- */}
       {/* Make sure you have installed react-native-image-viewing */}
       <ImageViewing
           images={imagesForViewer} // Array of {uri: string} from state
           imageIndex={currentImageIndex} // Index from state
           visible={isImageViewerVisible} // Visibility from state
           onRequestClose={() => setImageViewerVisible(false)} // Close handler
           presentationStyle="overFullScreen" // Optional: Use modal presentation style
           swipeToCloseEnabled={true} // Optional: Allow swipe down to close
           doubleTapToZoomEnabled={true} // Optional: Enable double tap zoom
       />
       {/* --- End Image Viewer --- */}

     </SafeAreaView>
   );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
  statusTextTop: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize', },
  otpContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, },
  otpText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 10, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderColor, },
  cardImageContainer: { width: 70, height: 70, borderRadius: 4, marginRight: 15, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', },
  cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', },
  cardTextContainer: { flex: 1, justifyContent: 'center', },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 5, },
  cardDateTime: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2, },
  detailsSection: { marginBottom: 25, },
  sectionLabel: { fontSize: 14, color: COLORS.labelColor, marginBottom: 4, marginTop: 10, fontWeight: '500', },
  sectionValue: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 5, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10, borderTopWidth: 1, borderTopColor: COLORS.borderColor, paddingTop: 20, },
  chatButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 25, },
  chatButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 15, borderWidth: 1, borderColor: COLORS.borderColor, },
  providerLogoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', marginRight: 15, },
  providerDetails: { flex: 1, },
  providerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4, },
  providerContactRow: {flexDirection: 'row', alignItems: 'center', marginTop: 2},
  providerIcon: {marginRight: 5},
  providerContact: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 2, },
  phoneLink: { color: COLORS.statusCreated },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderTopColor: COLORS.borderColor, marginTop: 10, },
  actionText: { fontSize: 16, color: COLORS.textPrimary, },
  serviceProofCount: { fontSize: 14, color: COLORS.textSecondary, marginHorizontal: 10, },
});