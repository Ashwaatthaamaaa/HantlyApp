// File: app/bookings/[ticketId].tsx (Complete Code)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  TextInput,
  Platform,
  // Import Clipboard from the correct package
} from 'react-native';
// Use @react-native-clipboard/clipboard if installed, otherwise expo-clipboard
import * as Clipboard from 'expo-clipboard';
// If you have @react-native-clipboard/clipboard installed, you might use:
// import Clipboard from '@react-native-clipboard/clipboard'; // <-- Alternative import

import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter , useFocusEffect} from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ImageViewing from "react-native-image-viewing";
import type { ImageSource } from "react-native-image-viewing/dist/@types";
import Modal from 'react-native-modal';
import { BASE_URL } from '@/constants/Api';
import { useHeaderHeight } from '@react-navigation/elements';
import { t } from '@/config/i18n';
// Removed ImagePicker import as it's not used in this specific file anymore

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
    reportingPerson?: string | null;
    reportingDescription?: string | null;
    operationId?: number | null;
    status?: string | null;
    toCraftmanType?: string | null;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    countyId?: number | null;
    municipalityId?: number | null;
    createdOn: string;
    updatedOn?: string | null;
    countyName?: string | null;
    municipalityName?: string | null;
    reviewStarRating?: number | null;
    reviewComment?: string | null;
    companyComment?: string | null;
    acceptedOTP?: number | null; // Added/Ensured
    closingOTP?: number | null;
    companyId?: number | null;
    companyEmailId?: string | null;
    companyName?: string | null;
    companyMobileNumber?: string | null;
    userId?: number | null;
    userEmailId?: string | null;
    userName?: string | null;
    userMobileNumber?: string | null;
    ticketImages?: TicketImage[] | null;
    ticketWorkImages?: TicketImage[] | null;
}
interface ChatListItem {
  companyId: number;
  companyUserName: string;
  companyLogoPath?: string | null;
}
interface ReviewApiResponse {
    statusCode: number;
    statusMessage: string;
    jwtToken?: string | null;
}

// --- COLORS Definition (Restored) ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#555555',
  accent: '#696969',
  headerBg: '#FFFFFF',
  headerText: '#333333',
  error: '#D9534F',
  borderColor: '#E0E0E0',
  cardBg: '#F8F8F8',
  buttonBg: '#696969',
  buttonText: '#FFFFFF',
  iconPlaceholder: '#CCCCCC',
  labelColor: '#666666',
  statusCreated: '#007BFF',
  statusAccepted: '#28A745',
  statusInProgress: '#FFC107',
  statusCompleted: '#6C757D',
  statusDefault: '#6C757D',
  modalInputBg: '#FFFFFF',
  actionRowDisabled: '#EFEFEF',
  starColor: '#FFC107',
  buttonDisabledBg: '#AAAAAA',
  filterBg: '#F2F2F2',
  filterActiveBg: '#696969',
  filterActiveText: '#FFFFFF',
  filterText: '#555555',
  filterIndicatorBg: '#EFEFEF',
  loadingOverlayBg: 'rgba(255,255,255,0.7)',
};
// --- END COLORS ---


// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t('notapplicable');
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return 'Invalid Date'; }
        return date.toLocaleDateString('sv-SE');
    } catch (error) { console.error("Error formatting date:", error); return 'Invalid Date'; }
};
const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return t('notapplicable');
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return 'Invalid Time'; }
        return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { console.error("Error formatting time:", e); return 'Invalid Time'; }
};
const getStatusColor = (status?: string | null): string => {
    const lowerCaseStatus = status?.toLowerCase() || '';
    if (lowerCaseStatus === 'created') return COLORS.statusCreated;
    if (lowerCaseStatus === 'accepted') return COLORS.statusAccepted;
    if (lowerCaseStatus === 'inprogress' || lowerCaseStatus === 'in progress') return COLORS.statusInProgress;
    if (lowerCaseStatus === 'completed') return COLORS.statusCompleted;
    return COLORS.statusDefault;
};

// --- Main Component ---
export default function BookingDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = useMemo(() => {
      const parsed = ticketIdParam ? parseInt(ticketIdParam, 10) : NaN;
      return isNaN(parsed) ? undefined : parsed;
  }, [ticketIdParam]);

  const [bookingData, setBookingData] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesForViewer, setImagesForViewer] = useState<ImageSource[]>([]);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isAcceptOtpModalVisible, setIsAcceptOtpModalVisible] = useState(false);
  const [enteredAcceptOtp, setEnteredAcceptOtp] = useState('');
  const [acceptOtpError, setAcceptOtpError] = useState('');
  const [interestedPartners, setInterestedPartners] = useState<ChatListItem[]>([]);
  const [isLoadingChatList, setIsLoadingChatList] = useState<boolean>(false);
  const [chatListError, setChatListError] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [reviewCommentText, setReviewCommentText] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const headerHeight = useHeaderHeight();

  // --- Fetch Booking Details ---
  const fetchBookingDetails = useCallback(async () => {
      setInterestedPartners([]); setIsLoadingChatList(false); setChatListError(null);
      if (ticketId === undefined) { setError(t('invalidticketid')); setIsLoading(false); setBookingData(null); return; }
      if (!session) { Alert.alert(t('sessionexpired'), t('pleaseloginagain'), [{ text: t('ok'), onPress: () => router.replace('/login') }]); setIsLoading(false); setBookingData(null); return; }
      setIsLoading(true); setError(null);
      const url = `${BASE_URL}/api/IssueTicket/GetTicket?TicketId=${ticketId}`;
      console.log("Fetching details from:", url);

      try {
          const response = await fetch(url);
          if (!response.ok) { const errorText = await response.text(); console.error(`HTTP error ${response.status}: ${errorText}`); throw new Error(t('failedfetchdetails', { status: response.status, errorText: errorText || 'Server error' })); }
          const data: BookingDetail = await response.json();
          setBookingData(data);
          // Reset review state only if fetching was successful and data is received
          setSelectedRating(0);
          setReviewCommentText('');
          setIsSubmittingReview(false);
      } catch (err: any) { console.error("Error fetching booking details:", err); setError(t('failedloadbookingdetails', { message: err?.message || 'Unknown error' })); setBookingData(null); }
      finally { setIsLoading(false); }
   }, [ticketId, session, router]); // Added router to dependency array as it's used in the effect

   // --- Fetch Chat List Function ---
   const fetchChatList = useCallback(async () => {
       if (!ticketId) return;
       setIsLoadingChatList(true); setChatListError(null);
       const url = `${BASE_URL}/api/IssueTicketChat/GetChatList?TicketId=${ticketId}`;
       console.log("(Re)Fetching chat list from:", url);
       try {
           const response = await fetch(url);
           if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch chat list (${response.status}): ${errorText}`); }
           const data = await response.json();
           if (Array.isArray(data)) {
               const validPartners = data.filter((p): p is ChatListItem => p && typeof p.companyId === 'number' && typeof p.companyUserName === 'string');
               setInterestedPartners(validPartners); console.log(`Workspaceed ${validPartners.length} interested partners.`);
           } else { console.warn("GetChatList did not return an array:", data); setInterestedPartners([]); throw new Error("Unexpected response format from GetChatList."); }
       } catch (err: any) { console.error("Error fetching chat list:", err); setChatListError(t('errorloadingpartners', { error: err?.message || 'Unknown error' })); setInterestedPartners([]); }
       finally { setIsLoadingChatList(false); }
   }, [ticketId]);

   // --- Modified updateStatus Function ---
   const updateStatus = useCallback(async (
       newStatus: "Accepted" | "Inprogress" | "Completed",
       otpValue: number | null = null
   ): Promise<boolean> => {
       // Permission and input checks
       if (!session || session.type !== 'partner' || typeof session.id !== 'number' || ticketId === undefined) {
           Alert.alert(t('error'), t('cannotupdatestatus'));
           return false;
       }
       if (isSubmittingStatus) return false; // Prevent double submissions

       // Determine OTP key and value based on the target status
       let otpKey: string | null = null;
       let otpApiValue: number | null = otpValue;
       let requiresOtpValidation = false;

       if (newStatus === "Accepted") {
           otpKey = "otp"; // Key for acceptance OTP
           requiresOtpValidation = true;
       } else if (newStatus === "Completed") {
           otpKey = "otp"; // Key for closing OTP
           requiresOtpValidation = true;
       } else if (newStatus === "Inprogress") {
           // For InProgress, send 'otp' with value 0 as per requirement
           otpKey = "otp";
           otpApiValue = 0;
           requiresOtpValidation = false; // No validation needed for value 0
       }

        // Validate OTP if required for this status transition
       if (requiresOtpValidation && (otpApiValue === null || isNaN(otpApiValue) || otpApiValue <= 0)) {
            // More specific error for missing/invalid OTP
            const errorMsg = newStatus === "Accepted" ? t('accept_otp_required') : t('closing_otp_required');
            Alert.alert(t('error'), errorMsg || t('invalidotp')); // Fallback generic message
            return false; // Stop execution
       }


       setIsSubmittingStatus(true); // Set loading state
       const url = `${BASE_URL}/api/IssueTicket/UpdateTicketStatus`;
       const baseBody = { ticketId: ticketId, status: newStatus, companyId: session.id };
       const bodyData = otpKey ? { ...baseBody, [otpKey]: otpApiValue } : baseBody;
       const body = JSON.stringify(bodyData);

       console.log(`Updating status API Call: URL=${url}, Body=${body}`);
       try {
           const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'accept': 'text/plain' }, body: body });
           const responseText = await response.text();
           console.log(`Update Status Response (${newStatus}): Status=${response.status}, Body=${responseText}`);

           if (!response.ok) {
               let errorMessage = `Failed (Status: ${response.status})`;
               try { const errorData = JSON.parse(responseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || errorData?.message || responseText || errorMessage; } catch (e) { errorMessage = responseText || errorMessage; }
               throw new Error(errorMessage);
           }

           let successMessage = t('statusupdatedsuccess');
           try { const result = JSON.parse(responseText); successMessage = result?.statusMessage || successMessage; } catch(e) { /* Ignore parsing errors on success if needed */ }
           Alert.alert(t('success'), successMessage);

           await fetchBookingDetails(); // Refetch details on success
           return true; // Indicate success
       } catch (err: any) {
           console.error(`Failed to update status to ${newStatus}:`, err);
           Alert.alert(t('errorupdatingstatus'), err?.message || t('unexpectederror'));
           return false; // Indicate failure
       } finally {
           setIsSubmittingStatus(false); // Reset loading state
           // Close the relevant modal unconditionally after attempt
           if (newStatus === "Completed") { setOtpModalVisible(false); setEnteredOtp(''); setOtpError(''); }
           if (newStatus === "Accepted") { setIsAcceptOtpModalVisible(false); setEnteredAcceptOtp(''); setAcceptOtpError('');}
       }
   }, [session, ticketId, isSubmittingStatus, fetchBookingDetails]); // Added fetchBookingDetails

   // --- Other Handlers ---
   const handleAcceptJob = useCallback(() => { setAcceptOtpError(''); setEnteredAcceptOtp(''); setIsAcceptOtpModalVisible(true); }, []);
   const handleSubmitAcceptOtp = useCallback(() => { const otpValue = parseInt(enteredAcceptOtp, 10); if (!enteredAcceptOtp || isNaN(otpValue) || enteredAcceptOtp.length !== 4) { setAcceptOtpError(t('invalidotp')); return; } setAcceptOtpError(''); updateStatus("Accepted", otpValue); }, [enteredAcceptOtp, updateStatus]);
   const handleChangeToInProgress = useCallback(() => { Alert.alert( t('confirmaction'), t('startjobquestion'), [ { text: t('cancel'), style: "cancel" }, { text: t('startjob'), onPress: () => updateStatus("Inprogress", 0) } ] ); }, [updateStatus]);
   const handleChangeToComplete = useCallback(() => { setOtpError(''); setEnteredOtp(''); setOtpModalVisible(true); }, []);
   const handleSubmitOtp = useCallback(() => { const otpValue = parseInt(enteredOtp, 10); if (!enteredOtp || isNaN(otpValue) || enteredOtp.length !== 4) { setOtpError(t('invalidotp')); return; } setOtpError(''); updateStatus("Completed", otpValue); }, [enteredOtp, updateStatus]);
   const handleNavigateToUpdateStatus = useCallback(() => { if (ticketId !== undefined) { router.push(`/bookings/update-status/${ticketId}`); } else { Alert.alert(t('error'), t('missingticketid')); } }, [ticketId, router]);
   const handleCall = useCallback((phoneNumber: string | null | undefined) => { if (phoneNumber) { const url = `tel:${phoneNumber}`; Linking.canOpenURL(url).then(supported => { if (supported) { Linking.openURL(url); } else { Alert.alert(t('cannotmakecall'), t('devicenotsupportcall', { phoneNumber })); } }).catch(err => console.error('Error opening phone dialer:', err)); } else { Alert.alert(t('cannotcall'), t('providerphonenotavailable')); } }, []);
   const handleCallProvider = useCallback(() => { handleCall(bookingData?.companyMobileNumber); }, [bookingData?.companyMobileNumber, handleCall]);
   const handleCallCustomer = useCallback(() => { handleCall(bookingData?.userMobileNumber); }, [bookingData?.userMobileNumber, handleCall]);
   // Use expo-clipboard method
   const handleCopyOtp = useCallback(async () => { const otp = bookingData?.closingOTP; if (otp != null) { try { await Clipboard.setStringAsync(otp.toString()); Alert.alert(t('otpcopied')); } catch (e) { Alert.alert(t('error'), t('couldnotcopyotp')); } } else { Alert.alert(t('nootp'), t('otpnotavailable')); } }, [bookingData?.closingOTP]);
   const handleCopyAcceptOtp = useCallback(async () => { const otp = bookingData?.acceptedOTP; if (otp != null) { try { await Clipboard.setStringAsync(otp.toString()); Alert.alert(t('otpcopied')); } catch (e) { Alert.alert(t('error'), t('couldnotcopyotp')); } } else { Alert.alert(t('nootp'), t('otpnotavailable')); } }, [bookingData?.acceptedOTP]);

   const openImageViewer = useCallback((images: TicketImage[] | null | undefined, index: number) => { const validImages: ImageSource[] = Array.isArray(images) ? images.filter(img => img && typeof img.imagePath === 'string' && img.imagePath.trim() !== '').map(img => ({ uri: img.imagePath! })) : []; if (validImages.length > 0 && index >= 0 && index < validImages.length) { setImagesForViewer(validImages); setCurrentImageIndex(index); setImageViewerVisible(true); } else { console.warn("Attempted to open image viewer with invalid images or index:", images, index); Alert.alert(t('noimages')); } }, []);
   const handleNavigateToPartnerChat = useCallback((partner: ChatListItem) => { if (!ticketId || !session || session.type !== 'user' || !partner || typeof partner.companyId !== 'number' || typeof partner.companyUserName !== 'string') { console.error("Cannot navigate to partner chat: Invalid args"); return; } router.push({ pathname: "/chat/[ticketId]", params: { ticketId: ticketId.toString(), otherPartyId: partner.companyId.toString(), otherPartyName: partner.companyUserName, otherPartyType: 'partner', } }); }, [ticketId, session, router]);
   const handleChatPress = useCallback(() => { if (!bookingData || !session || ticketId === undefined) { Alert.alert(t('cannotchat'), t('requiredinfomissing')); return; } let otherPartyId: number | undefined = undefined; let otherPartyName: string | undefined = undefined; let otherPartyType: 'user' | 'partner' | undefined = undefined; if (session.type === 'partner') { otherPartyId = bookingData.userId ?? undefined; otherPartyName = bookingData.userName || bookingData.userEmailId || 'Customer'; otherPartyType = 'user'; } else { otherPartyId = bookingData.companyId ?? undefined; otherPartyName = bookingData.companyName || bookingData.companyEmailId || 'Partner'; otherPartyType = 'partner'; } if (otherPartyId === undefined || !otherPartyName || !otherPartyType) { Alert.alert(t('cannotchat'), t('cannotidentifyparticipant')); return; } router.push({ pathname: "/chat/[ticketId]", params: { ticketId: ticketId.toString(), otherPartyId: otherPartyId.toString(), otherPartyName: otherPartyName, otherPartyType: otherPartyType, } }); }, [bookingData, session, ticketId, router]);
   const handleInitiatePartnerChatOnDetail = useCallback(() => { if (!session || session.type !== 'partner' || !bookingData || typeof bookingData.userId !== 'number' || typeof bookingData.ticketId !== 'number') { Alert.alert(t('error'), t('requiredinfomissing')); return; } const otherPartyName = bookingData.userName || bookingData.userEmailId || 'User'; router.push({ pathname: "/chat/[ticketId]", params: { ticketId: bookingData.ticketId.toString(), otherPartyId: bookingData.userId.toString(), otherPartyName: otherPartyName, otherPartyType: 'user', } }); }, [session, bookingData, router]);
   const handleSubmitReview = useCallback(async () => { if (!session || session.type !== 'user' || ticketId === undefined ) { Alert.alert(t('error'), t('requiredinfomissing')); return; } if (selectedRating === 0) { Alert.alert(t('missinginfo'), t('review_select_rating_alert')); return; } setIsSubmittingReview(true); const url = `${BASE_URL}/api/IssueTicket/UpdateTicketReview`; const requestBody: { ticketId: number; reviewStarRating: number; reviewComment: string; } = { ticketId: ticketId, reviewStarRating: selectedRating, reviewComment: reviewCommentText.trim(), }; try { const response = await fetch(url, { method: 'POST', headers: { 'accept': 'text/plain', 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), }); const responseText = await response.text(); if (!response.ok) { let errorMessage = `Failed (Status: ${response.status})`; try { const errorData = JSON.parse(responseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || responseText || errorMessage; } catch (e) { errorMessage = responseText || errorMessage; } throw new Error(errorMessage); } let successMessage = t('review_submit_success_default'); try { const result: ReviewApiResponse = JSON.parse(responseText); successMessage = result?.statusMessage || successMessage; } catch (e) { /* Ignore */ } Alert.alert(t('success'), successMessage); await fetchBookingDetails(); } catch (err: any) { console.error("Submit Review Error:", err); Alert.alert(t('error'), `${t('review_submit_error')}: ${err?.message || 'Unknown error'}`); } finally { setIsSubmittingReview(false); } }, [session, ticketId, selectedRating, reviewCommentText, fetchBookingDetails]); // Added fetchBookingDetails dependency


  // --- Effects ---
  useFocusEffect(useCallback(() => { fetchBookingDetails(); }, [fetchBookingDetails]));
  useEffect(() => {
     // Only fetch chat list if user viewing a 'Created' job
     if (session?.type === 'user' && bookingData && bookingData.status?.toLowerCase() === 'created') {
         fetchChatList();
     } else {
         // Clear chat list state if conditions aren't met (e.g., partner view, or job not 'Created')
         if (interestedPartners.length > 0 || isLoadingChatList || chatListError) {
             setInterestedPartners([]);
             setIsLoadingChatList(false); // Ensure loading is reset
             setChatListError(null);
         }
     }
   }, [bookingData, session, fetchChatList]); // Dependencies


  // --- Render Logic ---
  if (isLoading && !bookingData && !error) {
    return ( <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /><Text style={styles.loadingText}>{t('loading')}</Text></SafeAreaView> );
  }

  if (error && !isLoading) {
    return ( <SafeAreaView style={styles.centered}><Ionicons name="alert-circle-outline" size={40} color={COLORS.error} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchBookingDetails} style={styles.retryButton}><Text style={styles.retryButtonText}>{t('retry')}</Text></TouchableOpacity></SafeAreaView> );
  }

  // --- Explicit Null Check for bookingData ---
  if (!bookingData) {
    return ( <SafeAreaView style={styles.centered}><Ionicons name="information-circle-outline" size={40} color={COLORS.textSecondary} /><Text style={styles.noDataText}>{t('bookingnotfound', { ticketId: ticketIdParam })}</Text><TouchableOpacity onPress={() => router.back()} style={styles.retryButton}><Text style={styles.retryButtonText}>{t('goback')}</Text></TouchableOpacity></SafeAreaView> );
  }
  // --- End Null Check ---

  // --- Derived State (Safe to access bookingData now) ---
  const isPartner = session?.type === 'partner';
  const status = bookingData.status?.toLowerCase() || 'unknown';
  const cardImageUrl = bookingData.ticketImages?.[0]?.imagePath;
  const isCreated = status === 'created';
  const isAccepted = status === 'accepted';
  const isInProgress = status === 'inprogress' || status === 'in progress';
  const isCompleted = status === 'completed';
  const showAcceptButton = isPartner && isCreated;
  const showInProgressButton = isPartner && isAccepted;
  const showCompleteButton = isPartner && isInProgress;
  const userCanSeeAcceptOtp = !isPartner && isCreated && bookingData.acceptedOTP != null;
  const partnerCanUpdateProof = isPartner && isInProgress;
  const serviceProofImages = bookingData.ticketWorkImages ?? [];
  const serviceProofImagesExist = serviceProofImages.length > 0;
  const serviceProofCommentExists = !!bookingData.companyComment?.trim();
  const showServiceProofSection = serviceProofImagesExist || serviceProofCommentExists;
  const userCanSeeOtp = !isPartner && isInProgress && serviceProofImagesExist && bookingData.closingOTP != null; // Closing OTP
  const userCanSeeProviderInfo = !isPartner && (isAccepted || isInProgress || isCompleted);
  const userCanChatWithAssigned = !isPartner && !!bookingData.companyId && !isCreated;
  const partnerCanChatWithAssigned = isPartner && !!bookingData.userId && !isCreated;
  const partnerCanInitiateChat = isPartner && isCreated && !!bookingData.userId;
  const showCustomerInfo = isPartner;
  const showReviewInputForm = !isPartner && isCompleted && bookingData.reviewStarRating == null;
  const showSubmittedReview = !isPartner && isCompleted && bookingData.reviewStarRating != null;
  const showCustomerReviewForPartner = isPartner && isCompleted && bookingData.reviewStarRating != null;

  // --- Main Return JSX ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
       <Stack.Screen
        options={{
          title: bookingData.reportingDescription || t('bookingdetails'),
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
         {/* Status Header & Actions */}
        <View style={styles.statusHeader}>
             <Text style={[styles.statusTextTop, { color: getStatusColor(bookingData.status) }]}>{bookingData.status || t('unknownstatus')}</Text>
            {/* Buttons */}
            {showAcceptButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleAcceptJob} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>{t('acceptjob')}</Text></TouchableOpacity>}
            {showInProgressButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToInProgress} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>{t('startjob')}</Text></TouchableOpacity>}
            {showCompleteButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToComplete} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>{t('completejob')}</Text></TouchableOpacity>}
             {/* OTPs */}
            {userCanSeeAcceptOtp && (
                 <TouchableOpacity style={styles.otpContainer} onPress={handleCopyAcceptOtp}>
                    <Text style={styles.otpText}>{`Accept OTP: ${bookingData.acceptedOTP}`}</Text>
                    <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 5 }}/>
                 </TouchableOpacity>
             )}
            {userCanSeeOtp && ( // Closing OTP
                 <TouchableOpacity style={styles.otpContainer} onPress={handleCopyOtp}>
                     <Text style={styles.otpText}>{`Closing OTP: ${bookingData.closingOTP}`}</Text>
                     <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 5 }}/>
                 </TouchableOpacity>
             )}
        </View>
        {isSubmittingStatus && <ActivityIndicator style={{marginVertical: 5}} size="small" color={COLORS.accent}/>}

         {/* Top Info Card */}
        <View style={styles.infoCard}>
             <TouchableOpacity style={styles.cardImageContainer} onPress={() => openImageViewer(bookingData.ticketImages, 0)} disabled={!bookingData.ticketImages || bookingData.ticketImages.length === 0} >
                 {cardImageUrl ? ( <Image source={{ uri: cardImageUrl }} style={styles.cardImage} resizeMode="cover" /> ) : ( <View style={styles.cardImagePlaceholder}><Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} /></View> )}
             </TouchableOpacity>
             <View style={styles.cardTextContainer}>
                 <Text style={styles.cardTitle} numberOfLines={1}>{bookingData.toCraftmanType || 'Request'}</Text>
                 <Text style={styles.cardDateTime}>Date: {formatDate(bookingData.createdOn)}</Text>
                 <Text style={styles.cardDateTime}>Time: {formatTime(bookingData.createdOn)}</Text>
                 <Text style={styles.cardDateTime}>Ticket ID: {bookingData.ticketId}</Text>
                 {bookingData.ticketImages && bookingData.ticketImages.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraThumbnailsContainer}>
                         {bookingData.ticketImages.slice(1).map((image, index) => (
                             <TouchableOpacity key={image.imageId ?? `problem-${index+1}`} onPress={() => openImageViewer(bookingData.ticketImages!, index + 1)} disabled={!image.imagePath}>
                                <Image source={{ uri: image.imagePath ?? '' }} style={styles.thumbnail} resizeMode="cover" />
                             </TouchableOpacity>
                         ))}
                     </ScrollView>
                 )}
             </View>
         </View>

          {/* Job Details */}
        <View style={styles.detailsSection}>
             <Text style={styles.sectionLabel}>{t('jobdescription')}</Text>
             <Text style={styles.sectionValue}>{bookingData.reportingDescription || t('notapplicable')}</Text>
             <Text style={styles.sectionLabel}>{t('location')}</Text>
             <Text style={styles.sectionValue}>{bookingData.municipalityName || t('notapplicable')}, {bookingData.countyName || t('notapplicable')}</Text>
         </View>

          {/* Interested Partners List */}
        { !isPartner && isCreated && (
            <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('interestedpartners')}</Text>
                {isLoadingChatList && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 10 }} />}
                {chatListError && <Text style={styles.errorTextSmall}>{chatListError}</Text>}
                {!isLoadingChatList && !chatListError && interestedPartners.length === 0 && ( <Text style={styles.noPartnersText}>{t('nopartnersmessage')}</Text> )}
                {!isLoadingChatList && !chatListError && interestedPartners.length > 0 && (
                   interestedPartners.map((partner) => (
                        <TouchableOpacity key={partner.companyId} style={styles.partnerRow} onPress={() => handleNavigateToPartnerChat(partner)}>
                            <View style={styles.partnerLogoPlaceholder}>
                             {partner.companyLogoPath ? ( <Image source={{ uri: partner.companyLogoPath }} style={styles.partnerListLogo} resizeMode="contain"/> ) : ( <Ionicons name="business-outline" size={24} color={COLORS.textSecondary} /> )}
                            </View>
                            <Text style={styles.partnerNameText}>{partner.companyUserName}</Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    ))
                )}
            </View>
        )}

         {/* Partner Contact User Button */}
         { partnerCanInitiateChat && ( <TouchableOpacity style={[styles.chatButton, {backgroundColor: COLORS.statusAccepted}]} onPress={handleInitiatePartnerChatOnDetail}><Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.buttonText} style={{ marginRight: 8 }}/><Text style={styles.chatButtonText}>{t('contactuserquote')}</Text></TouchableOpacity> )}

        {/* General Chat Button */}
        { (userCanChatWithAssigned || partnerCanChatWithAssigned) && ( <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}><Ionicons name="chatbubbles-outline" size={20} color={COLORS.buttonText} style={{ marginRight: 8 }}/><Text style={styles.chatButtonText}>{t('chat')}</Text></TouchableOpacity> )}

         {/* Provider Info Section */}
        {userCanSeeProviderInfo && bookingData.companyId != null && (
             <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('aboutprovider')}</Text>
                <View style={styles.providerCard}>
                 <View style={styles.providerLogoPlaceholder}><Ionicons name="business-outline" size={30} color={COLORS.textSecondary} /></View>
                    <View style={styles.providerDetails}>
                        <Text style={styles.providerName}>{bookingData.companyName || t('notapplicable')}</Text>
                        {bookingData.companyEmailId && <Text style={styles.providerContact}>{bookingData.companyEmailId}</Text>}
                        {bookingData.companyMobileNumber && (
                            <TouchableOpacity onPress={handleCallProvider} style={styles.providerContactRow}>
                                <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/>
                                <Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.companyMobileNumber}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        )}

         {/* Customer Info Section */}
        {showCustomerInfo && (
             <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('aboutcustomer')}</Text>
                <View style={styles.providerCard}>
                    <View style={styles.providerLogoPlaceholder}><Ionicons name="person-outline" size={30} color={COLORS.textSecondary} /></View>
                    <View style={styles.providerDetails}>
                        <Text style={styles.providerName}>{bookingData.userName || bookingData.reportingPerson || t('notapplicable')}</Text>
                        {bookingData.userEmailId && <Text style={styles.providerContact}>{bookingData.userEmailId}</Text>}
                        {bookingData.userMobileNumber && (
                            <TouchableOpacity onPress={handleCallCustomer} style={styles.providerContactRow}>
                                <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/>
                                <Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.userMobileNumber}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        )}

         {/* Service Proof Section */}
        {showServiceProofSection && (
             <View style={styles.detailsSection}>
                 <Text style={styles.sectionTitle}>{t('serviceproof')}</Text>
                {serviceProofCommentExists && ( <><Text style={styles.sectionLabel}>{t('partnercomment')}</Text><View><Text style={styles.sectionValue}>{bookingData.companyComment}</Text></View></> )}
                {serviceProofImagesExist && (
                    <>
                    <Text style={styles.sectionLabel}>{t('proofimages')}</Text>
                     <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofThumbnailsContainer}>
                        {Array.isArray(serviceProofImages) && serviceProofImages.map((image, index) => (
                            <TouchableOpacity key={image.imageId ?? `work-${index}`} onPress={() => openImageViewer(serviceProofImages, index)} disabled={!image.imagePath}>
                                <Image source={{ uri: image.imagePath ?? '' }} style={styles.thumbnail} resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    </>
                 )}
            </View>
         )}

         {/* Partner Update Proof Button */}
        {isPartner && ( <TouchableOpacity style={[styles.actionRow, !partnerCanUpdateProof && styles.actionRowDisabled]} onPress={handleNavigateToUpdateStatus} disabled={!partnerCanUpdateProof}><View style={styles.actionRowContent}><Ionicons name="camera-outline" size={20} color={!partnerCanUpdateProof ? COLORS.textSecondary : COLORS.textPrimary} style={{ marginRight: 10 }}/><Text style={[styles.actionText, !partnerCanUpdateProof && styles.disabledText]}>{serviceProofImagesExist || serviceProofCommentExists ? t('viewupdateserviceproof') : t('uploadserviceproof')}</Text></View><Ionicons name="chevron-forward" size={20} color={!partnerCanUpdateProof ? COLORS.textSecondary : COLORS.textPrimary} /></TouchableOpacity> )}

        {/* User Submitted Review Display */}
        {showSubmittedReview && (
            <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('yourreview')}</Text>
                <View style={styles.starRatingDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => ( <Ionicons key={star} name={star <= (bookingData.reviewStarRating ?? 0) ? 'star' : 'star-outline'} size={24} color={COLORS.starColor} style={styles.starIconDisplay}/> ))}
                    <Text style={styles.ratingTextDisplay}>({bookingData.reviewStarRating ?? 0}/5)</Text>
                </View>
                {bookingData.reviewComment && bookingData.reviewComment.trim() !== '' && ( <Text style={styles.sectionValue}>{`${t('commentdisplay_prefix')} ${bookingData.reviewComment}`}</Text> )}
                {bookingData.companyComment && bookingData.companyComment.trim() !== '' && ( <><Text style={styles.sectionLabel}>{t('providerresponse')}</Text><View><Text style={styles.sectionValue}>{bookingData.companyComment}</Text></View></> )}
            </View>
        )}

        {/* Review Input Form */}
        {showReviewInputForm && (
            <View style={[styles.detailsSection, styles.reviewInputSection]}>
                <Text style={styles.sectionTitle}>{t('review_section_title')}</Text>
                <Text style={styles.sectionLabel}>{t('review_rating_label')}</Text>
                <View style={styles.starRatingInput}>
                    {[1, 2, 3, 4, 5].map((star) => ( <TouchableOpacity key={star} onPress={() => !isSubmittingReview && setSelectedRating(star)} disabled={isSubmittingReview}><Ionicons name={star <= selectedRating ? 'star' : 'star-outline'} size={32} color={COLORS.starColor} style={styles.starIconInput} /></TouchableOpacity> ))}
                </View>
                <Text style={styles.sectionLabel}>{t('review_comment_label')}</Text>
                <TextInput style={[styles.reviewTextInput, isSubmittingReview && styles.disabledInput]} placeholder={t('review_comment_placeholder')} value={reviewCommentText} onChangeText={setReviewCommentText} multiline numberOfLines={4} placeholderTextColor={COLORS.textSecondary} editable={!isSubmittingReview} />
                <TouchableOpacity style={[styles.submitButton, (isSubmittingReview || selectedRating === 0) && styles.buttonDisabled]} onPress={handleSubmitReview} disabled={isSubmittingReview || selectedRating === 0} >
                    {isSubmittingReview ? <ActivityIndicator color={COLORS.buttonText} /> : <Text style={styles.submitButtonText}>{t('review_submit_button')}</Text> }
                </TouchableOpacity>
            </View>
        )}

        {/* Customer Review Display (Partner View) */}
        {showCustomerReviewForPartner && (
             <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('partner_view_review_title')}</Text>
                <View style={styles.starRatingDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => ( <Ionicons key={star} name={star <= (bookingData.reviewStarRating ?? 0) ? 'star' : 'star-outline'} size={24} color={COLORS.starColor} style={styles.starIconDisplay} /> ))}
                    <Text style={styles.ratingTextDisplay}>({bookingData.reviewStarRating ?? 0}/5)</Text>
                </View>
               {bookingData.reviewComment && bookingData.reviewComment.trim() !== '' ? (
                    <View><Text style={styles.sectionValue}>{`${t('partner_view_comment_prefix')} ${bookingData.reviewComment}`}</Text></View>
                ) : (
                     <Text style={[styles.sectionValue, styles.italicText]}>{t('partner_view_no_comment')}</Text>
                 )}
             </View>
        )}

         {/* Logout Button or other actions */}
         {/* Consider adding logout or other profile actions here if appropriate */}

      </ScrollView>

       {/* Modals */}
       <ImageViewing
          images={imagesForViewer}
          imageIndex={currentImageIndex}
          visible={isImageViewerVisible}
          onRequestClose={() => setImageViewerVisible(false)}
          presentationStyle="overFullScreen"
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
          FooterComponent={({ imageIndex }) => (
            <View style={styles.imageViewerFooter}>
                <Text style={styles.imageViewerFooterText}>{`${imageIndex + 1} / ${imagesForViewer.length}`}</Text>
            </View>
           )}
        />

       {/* Existing Closing OTP Modal */}
       <Modal isVisible={isOtpModalVisible} onBackdropPress={() => !isSubmittingStatus && setOtpModalVisible(false)} onBackButtonPress={() => !isSubmittingStatus && setOtpModalVisible(false)} avoidKeyboard style={styles.otpModalContainer} backdropOpacity={0.5} animationIn="zoomIn" animationOut="zoomOut" >
            <View style={styles.otpModalContent}>
                <Text style={styles.otpModalTitle}>{t('enterotpfromuser')}</Text>
                 <Text style={styles.otpModalSubtitle}>{t('askcustomerotp')}</Text>
                 <TextInput style={styles.otpInput} placeholder={t('otp_placeholder')} placeholderTextColor={COLORS.iconPlaceholder} keyboardType="number-pad" maxLength={4} value={enteredOtp} onChangeText={setEnteredOtp} autoFocus={true} selectionColor={COLORS.accent} />
                 {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
                 <View style={styles.otpModalActions}>
                     <TouchableOpacity style={[styles.otpModalButton, styles.otpCloseButton]} onPress={() => setOtpModalVisible(false)} disabled={isSubmittingStatus}><Text style={styles.otpCloseButtonText}>{t('close')}</Text></TouchableOpacity>
                     <TouchableOpacity style={[styles.otpModalButton, styles.otpSubmitButton, (isSubmittingStatus || enteredOtp.length !== 4) && styles.buttonDisabled]} onPress={handleSubmitOtp} disabled={isSubmittingStatus || enteredOtp.length !== 4}>{isSubmittingStatus ? <ActivityIndicator size="small" color={COLORS.buttonText}/> : <Text style={styles.otpSubmitButtonText}>{t('submitcomplete')}</Text>}</TouchableOpacity>
                 </View>
            </View>
       </Modal>

       {/* Acceptance OTP Modal */}
       <Modal isVisible={isAcceptOtpModalVisible} onBackdropPress={() => !isSubmittingStatus && setIsAcceptOtpModalVisible(false)} onBackButtonPress={() => !isSubmittingStatus && setIsAcceptOtpModalVisible(false)} avoidKeyboard style={styles.otpModalContainer} backdropOpacity={0.5} animationIn="zoomIn" animationOut="zoomOut">
            <View style={styles.otpModalContent}>
                <Text style={styles.otpModalTitle}>{t('enter_acceptance_otp')}</Text>
                 <Text style={styles.otpModalSubtitle}>{t('get_otp_from_user_accept')}</Text>
                 <TextInput style={styles.otpInput} placeholder={t('otp_placeholder')} placeholderTextColor={COLORS.iconPlaceholder} keyboardType="number-pad" maxLength={4} value={enteredAcceptOtp} onChangeText={setEnteredAcceptOtp} autoFocus={true} selectionColor={COLORS.accent} />
                 {acceptOtpError ? <Text style={styles.otpErrorText}>{acceptOtpError}</Text> : null}
                 <View style={styles.otpModalActions}>
                     <TouchableOpacity style={[styles.otpModalButton, styles.otpCloseButton]} onPress={() => setIsAcceptOtpModalVisible(false)} disabled={isSubmittingStatus}>
                        <Text style={styles.otpCloseButtonText}>{t('cancel')}</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.otpModalButton, styles.otpSubmitButton, (isSubmittingStatus || enteredAcceptOtp.length !== 4) && styles.buttonDisabled]} onPress={handleSubmitAcceptOtp} disabled={isSubmittingStatus || enteredAcceptOtp.length !== 4}>
                        {isSubmittingStatus ? <ActivityIndicator size="small" color={COLORS.buttonText}/> : <Text style={styles.otpSubmitButtonText}>{t('submitaccept')}</Text>}
                     </TouchableOpacity>
                 </View>
            </View>
       </Modal>

     </SafeAreaView>
   );
}

// --- Styles --- (Complete Styles Object)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background, },
    scrollView: { flex: 1, },
    container: { flexGrow: 1, padding: 20, paddingBottom: 40, },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.background, },
    loadingText: { marginTop: 10, color: COLORS.textSecondary },
    noDataText: { marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' },
    errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginTop: 10, marginBottom: 20, },
    retryButton: { marginTop: 15, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, },
    retryButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', },
    statusTextTop: { fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize', marginRight: 10, marginBottom: 5, },
    otpContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: COLORS.borderColor, marginBottom: 5, },
    otpText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: 'bold', },
    statusActionButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginLeft: 5, marginBottom: 5, },
    statusActionButtonText: { color: COLORS.buttonText, fontSize: 13, fontWeight: 'bold', textAlign: 'center', },
    infoCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 15, marginBottom: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderColor, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
    cardImageContainer: { width: 80, height: 80, borderRadius: 6, marginRight: 15, overflow: 'hidden', backgroundColor: COLORS.iconPlaceholder, },
    cardImage: { width: '100%', height: '100%', },
    cardImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', },
    cardTextContainer: { flex: 1, justifyContent: 'center', },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 6, },
    cardDateTime: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3, },
    detailsSection: { marginBottom: 25, },
    sectionLabel: { fontSize: 14, color: COLORS.labelColor, marginBottom: 5, marginTop: 10, fontWeight: '600', },
    sectionValue: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 8, lineHeight: 23, },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.borderColor, marginTop: 10, },
    chatButton: { backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, paddingHorizontal: 20, minWidth: 150 },
    chatButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
    providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 15, borderWidth: 1, borderColor: COLORS.borderColor, marginTop: 5, },
    providerLogoPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', marginRight: 15, },
    providerLogo: { width: 50, height: 50, borderRadius: 8, }, // Assuming partner logo is square-ish
    providerDetails: { flex: 1, },
    providerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 5, },
    providerContactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, },
    providerIcon: { marginRight: 8, },
    providerContact: { fontSize: 14, color: COLORS.textSecondary, },
    phoneLink: { color: COLORS.statusCreated, textDecorationLine: 'underline' }, // Make phone numbers look like links
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderTopWidth: 1, borderTopColor: COLORS.borderColor, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, marginTop: 10, marginBottom: 15, },
    actionRowContent: { flexDirection: 'row', alignItems: 'center', flex: 1, },
    actionText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500', },
    actionRowDisabled: { backgroundColor: COLORS.actionRowDisabled, opacity: 0.6 }, // Style for disabled action rows
    disabledText: { color: COLORS.textSecondary }, // Style for text in disabled rows
    imageViewerFooter: { height: 50, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', },
    imageViewerFooterText: { color: 'white', fontSize: 16, },
    otpModalContainer: { justifyContent: 'center', alignItems: 'center', margin: 0 },
    otpModalContent: { backgroundColor: COLORS.modalInputBg, padding: 30, borderRadius: 15, width: '90%', maxWidth: 350, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, },
    otpModalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    otpModalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 25, },
    otpInput: { borderWidth: 1, borderColor: COLORS.borderColor, backgroundColor: '#f9f9f9', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, width: '70%', textAlign: 'center', fontSize: 24, marginBottom: 15, letterSpacing: 10, fontWeight: 'bold', },
    otpErrorText: { color: COLORS.error, marginBottom: 15, fontSize: 13, textAlign: 'center', },
    otpModalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15, },
    otpModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, minHeight: 46, justifyContent: 'center'}, // Added minHeight
    otpCloseButton: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.accent, },
    otpCloseButtonText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15, },
    otpSubmitButton: { backgroundColor: COLORS.buttonBg, },
    otpSubmitButtonText: { color: COLORS.buttonText, fontWeight: 'bold', fontSize: 15, },
    buttonDisabled: { backgroundColor: COLORS.buttonDisabledBg, opacity: 0.7, }, // More generic disabled button style
    proofThumbnailsContainer: { marginTop: 5, marginBottom: 10, paddingLeft: 2 }, // Added paddingLeft
    thumbnail: { width: 60, height: 60, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderColor, marginRight: 10, },
    extraThumbnailsContainer: { marginTop: 8, },
    partnerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, marginBottom: 10, },
    partnerLogoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', },
    partnerListLogo: { width: '100%', height: '100%', },
    partnerNameText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500',},
    noPartnersText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 10, marginBottom: 10, },
    errorTextSmall: { color: COLORS.error, fontSize: 12, marginTop: 5, marginBottom: 10, textAlign: 'center', },
    reviewInputSection: { borderTopWidth: 1, borderTopColor: COLORS.borderColor, marginTop: 10, paddingTop: 15, backgroundColor: '#fdfdfd', paddingHorizontal: 15, marginHorizontal: -20, // Extend slightly
        paddingBottom: 15, borderRadius: 5 },
    starRatingInput: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 10 },
    starIconInput: { marginHorizontal: 8 },
    reviewTextInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, padding: 10, fontSize: 15, color: COLORS.textPrimary, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
    submitButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', minHeight: 50, justifyContent: 'center' }, // Re-used for review submit
    submitButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold' }, // Re-used
    disabledInput: { backgroundColor: '#F0F0F0', color: COLORS.textSecondary },
    starRatingDisplay: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 5 }, // Added marginTop
    starIconDisplay: { marginRight: 2 },
    ratingTextDisplay: { marginLeft: 8, fontSize: 14, color: COLORS.textSecondary },
    italicText: { fontStyle: 'italic', color: COLORS.textSecondary },
});