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
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter , useFocusEffect} from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ImageViewing from "react-native-image-viewing";
import Modal from 'react-native-modal';
import { BASE_URL } from '@/constants/Api';
import { useHeaderHeight } from '@react-navigation/elements';

// --- Types ---
interface TicketImage { imageId?: number; ticketId?: number; imageName?: string | null; imagePath?: string | null; imageContentType?: string | null; } //
interface BookingDetail {
    ticketId: number; reportingPerson?: string; reportingDescription?: string; operationId?: number; status?: string; //
    toCraftmanType?: string; address?: string; city?: string; pincode?: string; countyId?: number; municipalityId?: number; createdOn: string; updatedOn?: string | null; countyName?: string; //
    municipalityName?: string; reviewStarRating?: number | null; reviewComment?: string; companyComment?: string; closingOTP?: number | null; companyId?: number | null; companyEmailId?: string; //
    companyName?: string; companyMobileNumber?: string; userId?: number | null; userEmailId?: string; userName?: string; userMobileNumber?: string; ticketImages?: TicketImage[] | null; //
    ticketWorkImages?: TicketImage[] | null; //
}
interface ChatListItem { companyId: number; companyUserName: string; companyLogoPath?: string | null; //
}


// --- Colors ---
const COLORS = { background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555', accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F', borderColor: '#E0E0E0', cardBg: '#F8F8F8', buttonBg: '#696969', buttonText: '#FFFFFF', iconPlaceholder: '#CCCCCC', labelColor: '#666666', statusCreated: '#007BFF', statusAccepted: '#28A745', statusInProgress: '#FFC107', statusCompleted: '#6C757D', statusDefault: '#6C757D', modalInputBg: '#FFFFFF', actionRowDisabled: '#EFEFEF', }; //
// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined): string => { if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleDateString('sv-SE'); } catch (error) { return 'Invalid Date'; } }; //
const formatTime = (dateString: string | null | undefined): string => { if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return 'Invalid Time'; } }; //
const getStatusColor = (status?: string): string => { const lowerCaseStatus = status?.toLowerCase() || ''; if (lowerCaseStatus === 'created') return COLORS.statusCreated; if (lowerCaseStatus === 'accepted') return COLORS.statusAccepted; if (lowerCaseStatus === 'inprogress' || lowerCaseStatus === 'in progress') return COLORS.statusInProgress; if (lowerCaseStatus === 'completed') return COLORS.statusCompleted; return COLORS.statusDefault; }; //

// --- Main Component ---
export default function BookingDetailScreen() { //
  const router = useRouter(); //
  const { session } = useAuth(); //
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>(); //
  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined; //

  const [bookingData, setBookingData] = useState<BookingDetail | null>(null); //
  const [isLoading, setIsLoading] = useState<boolean>(true); //
  const [error, setError] = useState<string | null>(null); //
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false); //
  const [isImageViewerVisible, setImageViewerVisible] = useState(false); //
  const [currentImageIndex, setCurrentImageIndex] = useState(0); //
  const [imagesForViewer, setImagesForViewer] = useState<{ uri: string }[]>([]); //
  const [isOtpModalVisible, setOtpModalVisible] = useState(false); //
  const [enteredOtp, setEnteredOtp] = useState(''); //
  const [otpError, setOtpError] = useState(''); //

  const [interestedPartners, setInterestedPartners] = useState<ChatListItem[]>([]); //
  const [isLoadingChatList, setIsLoadingChatList] = useState<boolean>(false); //
  const [chatListError, setChatListError] = useState<string | null>(null); //
  // Fetch Booking Details
  const fetchBookingDetails = useCallback(async () => { setInterestedPartners([]); setIsLoadingChatList(false); setChatListError(null); if (!ticketId || isNaN(ticketId)) { setError("Invalid Ticket ID."); setIsLoading(false); return; } if (!session) { Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace('/login') }]); return; } setIsLoading(true); setError(null); const url = `${BASE_URL}/api/IssueTicket/GetTicket?TicketId=${ticketId}`; console.log("Fetching details from:", url); try { const response = await fetch(url); if (!response.ok) { const errorText = await response.text(); console.error(`HTTP error ${response.status}: ${errorText}`); throw new Error(`Failed to fetch details (Status: ${response.status}). ${errorText || 'Server error'}`); } const data: BookingDetail = await response.json(); setBookingData(data); } catch (err: any) { console.error("Error fetching booking details:", err); setError(`Failed to load booking details: ${err.message}`); setBookingData(null); } finally { setIsLoading(false); } }, [ticketId, session, router]); //
  // Fetch Chat List Function
  const fetchChatList = useCallback(async () => { if (!ticketId) return; setIsLoadingChatList(true); setChatListError(null); const url = `${BASE_URL}/api/IssueTicketChat/GetChatList?TicketId=${ticketId}`; console.log("(Re)Fetching chat list from:", url); try { const response = await fetch(url); if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch chat list (${response.status}): ${errorText}`); } const data = await response.json(); if (Array.isArray(data)) { const validPartners = data.filter(p => p && typeof p.companyId === 'number' && typeof p.companyUserName === 'string'); setInterestedPartners(validPartners); console.log(`Workspaceed ${validPartners.length} interested partners.`); } else { console.warn("GetChatList did not return an array:", data); setInterestedPartners([]); throw new Error("Unexpected response format from GetChatList."); } } catch (err: any) { console.error("Error fetching chat list:", err); setChatListError(err.message); setInterestedPartners([]); } finally { setIsLoadingChatList(false); } }, [ticketId]); //
  // Effect 1: Fetch Booking Details on Focus
  useFocusEffect( useCallback(() => { console.log("Booking Detail Screen Focused: Fetching main details..."); fetchBookingDetails(); }, [fetchBookingDetails]) ); //
  // Effect 2: Fetch Chat List *after* Booking Details are Loaded/Changed
  useEffect(() => { if (session?.type === 'user' && bookingData && bookingData.status?.toLowerCase() === 'created') { console.log("Booking data loaded/changed and conditions met: Fetching chat list..."); fetchChatList(); } else { if (interestedPartners.length > 0 || isLoadingChatList || chatListError) { console.log("Conditions for chat list not met or bookingData changed, clearing chat list state."); setInterestedPartners([]); setIsLoadingChatList(false); setChatListError(null); } } }, [bookingData, session, fetchChatList]); //
  const updateStatus = async (newStatus: "Accepted" | "Inprogress" | "Completed", otp: number | null = 0): Promise<boolean> => { if (!session || session.type !== 'partner' || !session.id || !ticketId) { Alert.alert("Error", "Cannot update status."); return false; } if (isSubmittingStatus) return false; setIsSubmittingStatus(true); const url = `${BASE_URL}/api/IssueTicket/UpdateTicketStatus`; const body = JSON.stringify({ ticketId: ticketId, status: newStatus, closingOTP: otp, companyId: session.id }); console.log(`Updating status API Call: URL=${url}, Body=${body}`); try { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'accept': 'text/plain' }, body: body }); const responseText = await response.text(); console.log(`Update Status Response (${newStatus}): Status=${response.status}, Body=${responseText}`); if (!response.ok) { let errorMessage = `Failed (Status: ${response.status})`; try { const errorData = JSON.parse(responseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || errorData?.message || responseText || errorMessage; } catch (e) { errorMessage = responseText || errorMessage; } throw new Error(errorMessage); } let successMessage = "Status updated successfully"; try { const result = JSON.parse(responseText); successMessage = result?.statusMessage || successMessage; } catch(e) { /* Ignore */ } Alert.alert("Success", successMessage); await fetchBookingDetails(); return true; } catch (err: any) { console.error(`Failed to update status to ${newStatus}:`, err); Alert.alert("Error updating status", err.message || "An unexpected error occurred."); return false; } finally { setIsSubmittingStatus(false); if (newStatus === "Completed") { setOtpModalVisible(false); setEnteredOtp(''); } } }; //
  const handleAcceptJob = () => { Alert.alert( "Confirm Action", "Accept job?", [ { text: "Cancel", style: "cancel" }, { text: "Accept", onPress: () => updateStatus("Accepted", 0) } ] ); }; //
  const handleChangeToInProgress = () => { Alert.alert( "Confirm Action", "Start job?", [ { text: "Cancel", style: "cancel" }, { text: "Start Job", onPress: () => updateStatus("Inprogress", 0) } ] ); }; //
  const handleChangeToComplete = () => { setOtpError(''); setEnteredOtp(''); setOtpModalVisible(true); }; //
  const handleSubmitOtp = () => { const otpValue = parseInt(enteredOtp, 10); if (!enteredOtp || isNaN(otpValue) || enteredOtp.length !== 4) { setOtpError("Please enter a valid 4-digit OTP."); return; } setOtpError(''); updateStatus("Completed", otpValue); }; //
  const handleNavigateToUpdateStatus = () => { if (ticketId) { router.push(`/bookings/update-status/${ticketId}`); } else { Alert.alert("Error", "Missing Ticket ID."); } }; //
  const handleCallProvider = () => { const phoneNumber = bookingData?.companyMobileNumber; if (phoneNumber) { const url = `tel:${phoneNumber}`; Linking.canOpenURL(url) .then(supported => { if (supported) Linking.openURL(url); else Alert.alert('Cannot Make Call', `Device does not support calling ${phoneNumber}.`); }).catch(err => console.error('Error opening phone dialer:', err)); } else Alert.alert('Cannot Call', 'Provider phone number not available.'); }; //
  const handleCopyOtp = async () => { const otp = bookingData?.closingOTP; if (otp) { try { await Clipboard.setStringAsync(otp.toString()); Alert.alert("OTP Copied"); } catch (e) { Alert.alert("Error", "Could not copy OTP."); } } else { Alert.alert("No OTP", "OTP not available."); } }; //
  const openImageViewer = (images: TicketImage[] | null | undefined, index: number) => { const validImages = images?.map(img => ({ uri: img.imagePath || '' })).filter(img => !!img.uri) || []; if (validImages.length > 0) { setImagesForViewer(validImages); setCurrentImageIndex(index); setImageViewerVisible(true); } else { Alert.alert("No Images"); } }; //
  const handleNavigateToPartnerChat = (partner: ChatListItem) => { if (!ticketId || !session || session.type !== 'user') return; console.log(`Navigating to chat for ticket ${ticketId} with partner ${partner.companyUserName} (ID: ${partner.companyId})`); router.push({ pathname: "/chat/[ticketId]", params: { ticketId: ticketId.toString(), otherPartyId: partner.companyId.toString(), otherPartyName: partner.companyUserName, otherPartyType: 'partner', } }); }; //
  // Handler for the general CHAT button (user with assigned partner, or partner with assigned user)
  const handleChatPress = () => { if (!bookingData || !session || !ticketId) { Alert.alert("Cannot Chat", "Required information missing."); return; } let otherPartyId: number | undefined; let otherPartyName: string | undefined; let otherPartyType: 'user' | 'partner' | undefined; if (session.type === 'partner') { otherPartyId = bookingData.userId ?? undefined; otherPartyName = bookingData.userName || bookingData.userEmailId || 'Customer'; otherPartyType = 'user'; } else { otherPartyId = bookingData.companyId ?? undefined; otherPartyName = bookingData.companyName || bookingData.companyEmailId || 'Partner'; otherPartyType = 'partner'; } if (otherPartyId === undefined) { Alert.alert("Cannot Chat", "Could not identify the other participant."); return; } console.log(`Navigating to chat for ticket ${ticketId}, other party: ${otherPartyName} (ID: ${otherPartyId}, Type: ${otherPartyType})`); router.push({ pathname: "/chat/[ticketId]", params: { ticketId: ticketId.toString(), otherPartyId: otherPartyId.toString(), otherPartyName: otherPartyName, otherPartyType: otherPartyType, } }); }; //
  // Handler for Partner initiating chat from Details page
   const handleInitiatePartnerChatOnDetail = () => { if (!session || session.type !== 'partner' || !bookingData || !bookingData.userId || !bookingData.ticketId) { Alert.alert("Error", "Cannot initiate chat. Required information missing."); return; } const otherPartyName = bookingData.userName || bookingData.userEmailId || 'User'; console.log(`Partner initiating chat from details for ticket ${bookingData.ticketId} with user ${otherPartyName} (ID: ${bookingData.userId})`); router.push({ pathname: "/chat/[ticketId]", params: { ticketId: bookingData.ticketId.toString(), otherPartyId: bookingData.userId.toString(), otherPartyName: otherPartyName, otherPartyType: 'user', } }); }; //
  // --- Render Logic ---
  if (isLoading) { return ( <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /><Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading...</Text></SafeAreaView> ); } //
  if (error) { return ( <SafeAreaView style={styles.centered}><Ionicons name="alert-circle-outline" size={40} color={COLORS.error} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchBookingDetails} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></SafeAreaView> ); } //
  if (!bookingData) { return ( <SafeAreaView style={styles.centered}><Ionicons name="information-circle-outline" size={40} color={COLORS.textSecondary} /><Text style={{ marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' }}>Booking details not found or empty for Ticket ID {ticketIdParam}.</Text><TouchableOpacity onPress={() => router.back()} style={styles.retryButton}><Text style={styles.retryButtonText}>Go Back</Text></TouchableOpacity></SafeAreaView> ); } //

   // --- Derived State (Refined Conditions) ---
  const isPartner = session?.type === 'partner'; //
  const status = bookingData.status?.toLowerCase() || 'unknown'; //
  const cardImageUrl = bookingData.ticketImages?.[0]?.imagePath; //
  const isCreated = status === 'created'; //
  const isInProgress = status === 'inprogress' || status === 'in progress'; //
  const isCompleted = status === 'completed'; //
  const showAcceptButton = isPartner && isCreated; //
  const showInProgressButton = isPartner && status === 'accepted'; //
  const showCompleteButton = isPartner && isInProgress; //
  const partnerCanUpdateProof = isPartner && isInProgress; //
  const serviceProofImages = bookingData.ticketWorkImages || []; //
  const serviceProofImagesExist = serviceProofImages.length > 0; //
  const serviceProofCommentExists = !!bookingData.companyComment?.trim(); //
  const showServiceProofSection = serviceProofImagesExist || serviceProofCommentExists; //
  const userCanSeeOtp = !isPartner && isInProgress && serviceProofImagesExist && bookingData.closingOTP != null; //
  const userCanSeeProviderInfo = !isPartner && (status === 'accepted' || isInProgress || isCompleted); //
  // ** REVISED CONDITIONS FOR CHAT BUTTONS **
  const userCanChatWithAssigned = !isPartner && !!bookingData.companyId && !isCreated; //
  const partnerCanChatWithAssigned = isPartner && !!bookingData.userId && !isCreated; //
  const partnerCanInitiateChat = isPartner && isCreated && !!bookingData.userId; //
  // ** END REVISED CONDITIONS **
  const showCustomerInfo = isPartner; //
  return ( //
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: bookingData.reportingDescription || 'Booking Details', headerStyle: { backgroundColor: COLORS.headerBg }, headerTintColor: COLORS.headerText, headerTitleStyle: { fontWeight: 'bold' }, headerBackTitle: '', headerBackTitleVisible: false,}} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Status Header & Actions */}
        <View style={styles.statusHeader}><Text style={[styles.statusTextTop, { color: getStatusColor(bookingData.status) }]}>{bookingData.status || 'Unknown'}</Text>{showAcceptButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleAcceptJob} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Accept Job</Text></TouchableOpacity>}{showInProgressButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToInProgress} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Start Job</Text></TouchableOpacity>}{showCompleteButton && <TouchableOpacity style={styles.statusActionButton} onPress={handleChangeToComplete} disabled={isSubmittingStatus}><Text style={styles.statusActionButtonText}>Complete Job</Text></TouchableOpacity>}{userCanSeeOtp && ( <TouchableOpacity style={styles.otpContainer} onPress={handleCopyOtp}><Text style={styles.otpText}>OTP: {bookingData.closingOTP}</Text><Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 5 }}/></TouchableOpacity> )}</View> {/* */}
        {isSubmittingStatus && <ActivityIndicator style={{marginVertical: 5}} size="small" color={COLORS.accent}/>}

        {/* Top Info Card */}
        <View style={styles.infoCard}><TouchableOpacity style={styles.cardImageContainer} onPress={() => openImageViewer(bookingData.ticketImages, 0)} disabled={!bookingData.ticketImages || bookingData.ticketImages.length === 0} >{cardImageUrl ? ( <Image source={{ uri: cardImageUrl }} style={styles.cardImage} resizeMode="cover" /> ) : ( <View style={styles.cardImagePlaceholder}><Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} /></View> )}</TouchableOpacity><View style={styles.cardTextContainer}><Text style={styles.cardTitle} numberOfLines={1}>{bookingData.toCraftmanType || 'Request'}</Text><Text style={styles.cardDateTime}>Date: {formatDate(bookingData.createdOn)}</Text><Text style={styles.cardDateTime}>Time: {formatTime(bookingData.createdOn)}</Text><Text style={styles.cardDateTime}>Ticket ID: {bookingData.ticketId}</Text>{bookingData.ticketImages && bookingData.ticketImages.length > 1 && ( <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraThumbnailsContainer}>{bookingData.ticketImages.slice(1).map((image, index) => ( <TouchableOpacity key={image.imageId || `problem-${index+1}`} onPress={() => openImageViewer(bookingData.ticketImages, index + 1)}><Image source={{ uri: image.imagePath || '' }} style={styles.thumbnail} resizeMode="cover" /></TouchableOpacity> ))}</ScrollView> )}</View></View> {/* */}

        {/* Job Details */}
        <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>Job Description</Text>
            <Text style={styles.sectionValue}>{bookingData.reportingDescription || 'N/A'}</Text>

            {/* === Location Section Start (MODIFIED) === */}
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.sectionValue}>
                {/* Display municipality and county */}
                {bookingData.municipalityName || 'N/A'}, {bookingData.countyName || 'N/A'}
            </Text>
            {/* Address, Pincode, and City lines REMOVED */}
            {/* === Location Section End (MODIFIED) === */}
        </View>

        {/* Interested Partners List (User view, Created status) */}
        { !isPartner && isCreated && ( <View style={styles.detailsSection}><Text style={styles.sectionTitle}>Interested Partners</Text>{isLoadingChatList && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 10 }} />}{chatListError && <Text style={styles.errorTextSmall}>Error loading partners: {chatListError}</Text>}{!isLoadingChatList && !chatListError && interestedPartners.length === 0 && ( <Text style={styles.noPartnersText}>No partners have messaged about this job yet.</Text> )}{!isLoadingChatList && !chatListError && interestedPartners.length > 0 && ( interestedPartners.map((partner) => ( <TouchableOpacity key={partner.companyId} style={styles.partnerRow} onPress={() => handleNavigateToPartnerChat(partner)}> <View style={styles.partnerLogoPlaceholder}>{partner.companyLogoPath ? ( <Image source={{ uri: partner.companyLogoPath }} style={styles.partnerListLogo} resizeMode="contain"/> ) : ( <Ionicons name="business-outline" size={24} color={COLORS.textSecondary} /> )}</View> <Text style={styles.partnerNameText}>{partner.companyUserName}</Text> <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> </TouchableOpacity> )) )}</View> )} {/* */}

        {/* ** NEW: Contact User button for Partner on Created jobs ** */}
        { partnerCanInitiateChat && (
             <TouchableOpacity
                 style={[styles.chatButton, {backgroundColor: COLORS.statusAccepted}]} // Style as needed //
                 onPress={handleInitiatePartnerChatOnDetail} //
             >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.buttonText} style={{ marginRight: 8 }}/>
                <Text style={styles.chatButtonText}>CONTACT USER (Send Quote)</Text>
             </TouchableOpacity>
        )}
        {/* ** END NEW BUTTON ** */} {/* */}

        {/* ** UPDATED: General Chat Button (Only shown AFTER creation phase) ** */}
        { (userCanChatWithAssigned || partnerCanChatWithAssigned) && ( //
            <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
                <Ionicons name="chatbubbles-outline" size={20} color={COLORS.buttonText} style={{ marginRight: 8 }}/>
                <Text style={styles.chatButtonText}>CHAT</Text>
            </TouchableOpacity>
         )}
         {/* ** END UPDATED BUTTON ** */}


        {/* Provider/Customer Info Sections */}
        {userCanSeeProviderInfo && bookingData.companyId && ( <View style={styles.detailsSection}><Text style={styles.sectionTitle}>About Your Provider</Text><View style={styles.providerCard}><View style={styles.providerLogoPlaceholder}><Ionicons name="business-outline" size={30} color={COLORS.textSecondary} /></View><View style={styles.providerDetails}><Text style={styles.providerName}>{bookingData.companyName || 'N/A'}</Text>{bookingData.companyEmailId && <Text style={styles.providerContact}>{bookingData.companyEmailId}</Text>}{bookingData.companyMobileNumber && ( <TouchableOpacity onPress={handleCallProvider} style={styles.providerContactRow}><MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/><Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.companyMobileNumber}</Text></TouchableOpacity> )}</View></View></View> )} {/* */}
        {showCustomerInfo && ( <View style={styles.detailsSection}><Text style={styles.sectionTitle}>About Customer</Text><View style={styles.providerCard}><View style={styles.providerLogoPlaceholder}><Ionicons name="person-outline" size={30} color={COLORS.textSecondary} /></View><View style={styles.providerDetails}><Text style={styles.providerName}>{bookingData.userName || bookingData.reportingPerson || 'N/A'}</Text>{bookingData.userEmailId && <Text style={styles.providerContact}>{bookingData.userEmailId}</Text>}{bookingData.userMobileNumber && ( <TouchableOpacity onPress={() => Linking.openURL(`tel:${bookingData.userMobileNumber}`)} style={styles.providerContactRow}><MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.providerIcon}/><Text style={[styles.providerContact, styles.phoneLink]}>{bookingData.userMobileNumber}</Text></TouchableOpacity> )}</View></View></View> )} {/* */}

        {/* Service Proof/Update/Review Sections */}
        {showServiceProofSection && ( <View style={styles.detailsSection}><Text style={styles.sectionTitle}>Service Proof</Text>{serviceProofCommentExists && ( <><Text style={styles.sectionLabel}>Partner Comment:</Text><Text style={styles.sectionValue}>{bookingData.companyComment}</Text></> )}{serviceProofImagesExist && ( <><Text style={styles.sectionLabel}>Proof Images:</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofThumbnailsContainer}>{serviceProofImages.map((image, index) => ( <TouchableOpacity key={image.imageId || `work-${index}`} onPress={() => openImageViewer(serviceProofImages, index)}><Image source={{ uri: image.imagePath || '' }} style={styles.thumbnail} resizeMode="cover" /></TouchableOpacity> ))}</ScrollView></> )}</View> )} {/* */}
        {isPartner && ( <TouchableOpacity style={[styles.actionRow, !partnerCanUpdateProof && styles.actionRowDisabled]} onPress={handleNavigateToUpdateStatus} disabled={!partnerCanUpdateProof}><View style={styles.actionRowContent}><Ionicons name="camera-outline" size={20} color={!partnerCanUpdateProof ? COLORS.textSecondary : COLORS.textPrimary} style={{ marginRight: 10 }}/><Text style={[styles.actionText, !partnerCanUpdateProof && styles.disabledText]}>{serviceProofImagesExist || serviceProofCommentExists ? 'View/Update Service Proof' : 'Upload Service Proof'}</Text></View><Ionicons name="chevron-forward" size={20} color={!partnerCanUpdateProof ? COLORS.textSecondary : COLORS.textPrimary} /></TouchableOpacity> )} {/* */}
        {!isPartner && isCompleted && ( <View style={styles.detailsSection}><Text style={styles.sectionTitle}>Your Review</Text>{bookingData.reviewStarRating != null ? ( <> <Text style={styles.sectionValue}>Rating: {'⭐'.repeat(bookingData.reviewStarRating)}{'☆'.repeat(5 - bookingData.reviewStarRating)} ({bookingData.reviewStarRating}/5)</Text> <Text style={styles.sectionValue}>Comment: {bookingData.reviewComment || 'N/A'}</Text> {bookingData.companyComment && ( <><Text style={styles.sectionLabel}>Provider Response:</Text><Text style={styles.sectionValue}>{bookingData.companyComment}</Text></> )} </> ) : ( <View><Text style={styles.sectionValue}>You haven't rated this service yet.</Text></View> )} </View> )} {/* */}

      </ScrollView>

       {/* Modals */}
       <ImageViewing images={imagesForViewer} imageIndex={currentImageIndex} visible={isImageViewerVisible} onRequestClose={() => setImageViewerVisible(false)} presentationStyle="overFullScreen" swipeToCloseEnabled={true} doubleTapToZoomEnabled={true} FooterComponent={({ imageIndex }) => ( <View style={styles.imageViewerFooter}><Text style={styles.imageViewerFooterText}>{`${imageIndex + 1} / ${imagesForViewer.length}`}</Text></View> )}/> {/* */}
       <Modal isVisible={isOtpModalVisible} onBackdropPress={() => !isSubmittingStatus && setOtpModalVisible(false)} onBackButtonPress={() => !isSubmittingStatus && setOtpModalVisible(false)} avoidKeyboard style={styles.otpModalContainer} backdropOpacity={0.5} animationIn="zoomIn" animationOut="zoomOut" ><View style={styles.otpModalContent}><Text style={styles.otpModalTitle}>Enter OTP From User</Text><Text style={styles.otpModalSubtitle}>Ask the customer for the 4-digit code.</Text><TextInput style={styles.otpInput} placeholder="----" placeholderTextColor={COLORS.iconPlaceholder} keyboardType="number-pad" maxLength={4} value={enteredOtp} onChangeText={setEnteredOtp} autoFocus={true} selectionColor={COLORS.accent} />{otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}<View style={styles.otpModalActions}><TouchableOpacity style={[styles.otpModalButton, styles.otpCloseButton]} onPress={() => setOtpModalVisible(false)} disabled={isSubmittingStatus}><Text style={styles.otpCloseButtonText}>Close</Text></TouchableOpacity><TouchableOpacity style={[styles.otpModalButton, styles.otpSubmitButton, (isSubmittingStatus || enteredOtp.length !== 4) && styles.buttonDisabled]} onPress={handleSubmitOtp} disabled={isSubmittingStatus || enteredOtp.length !== 4}>{isSubmittingStatus ? <ActivityIndicator size="small" color={COLORS.buttonText}/> : <Text style={styles.otpSubmitButtonText}>Submit & Complete</Text>}</TouchableOpacity></View></View></Modal> {/* */}
     </SafeAreaView>
   );
}

// --- Styles --- (Ensure styles mentioned above are defined)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background, }, //
    scrollView: { flex: 1, }, //
    container: { flexGrow: 1, padding: 20, paddingBottom: 40, }, //
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.background, }, //
    errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginTop: 10, marginBottom: 20, }, //
    retryButton: { marginTop: 15, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, }, //
    retryButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, //
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', }, //
    statusTextTop: { fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize', marginRight: 10, marginBottom: 5, }, //
    otpContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: COLORS.borderColor, marginBottom: 5, }, //
    otpText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: 'bold', }, //
    statusActionButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginLeft: 5, marginBottom: 5, }, //
    statusActionButtonText: { color: COLORS.buttonText, fontSize: 13, fontWeight: 'bold', textAlign: 'center', }, //
    infoCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 15, marginBottom: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderColor, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, //
    cardImageContainer: { width: 80, height: 80, borderRadius: 6, marginRight: 15, overflow: 'hidden', backgroundColor: COLORS.iconPlaceholder, }, //
    cardImage: { width: '100%', height: '100%', }, //
    cardImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', }, //
    cardTextContainer: { flex: 1, justifyContent: 'center', }, //
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 6, }, //
    cardDateTime: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3, }, //
    detailsSection: { marginBottom: 25, }, //
    sectionLabel: { fontSize: 14, color: COLORS.labelColor, marginBottom: 5, marginTop: 10, fontWeight: '600', }, //
    sectionValue: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 8, lineHeight: 23, }, //
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.borderColor, marginTop: 10, }, //
    chatButton: { backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, }, //
    chatButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, //
    providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 15, borderWidth: 1, borderColor: COLORS.borderColor, marginTop: 5, }, //
    providerLogoPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', marginRight: 15, }, //
    providerLogo: { width: 50, height: 50, borderRadius: 8, }, //
    providerDetails: { flex: 1, }, //
    providerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 5, }, //
    providerContactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, }, //
    providerIcon: { marginRight: 8, }, //
    providerContact: { fontSize: 14, color: COLORS.textSecondary, }, //
    phoneLink: { color: COLORS.statusCreated, }, //
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderTopWidth: 1, borderTopColor: COLORS.borderColor, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, marginTop: 10, marginBottom: 15, }, //
    actionRowContent: { flexDirection: 'row', alignItems: 'center', flex: 1, }, //
    actionText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500', }, //
    actionRowDisabled: { backgroundColor: COLORS.actionRowDisabled }, //
    disabledText: { color: COLORS.textSecondary }, //
    imageViewerFooter: { height: 50, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', }, //
    imageViewerFooterText: { color: 'white', fontSize: 16, }, //
    otpModalContainer: { justifyContent: 'center', alignItems: 'center', }, //
    otpModalContent: { backgroundColor: COLORS.modalInputBg, padding: 30, borderRadius: 15, width: '90%', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, }, //
    otpModalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, }, //
    otpModalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 25, }, //
    otpInput: { borderWidth: 1, borderColor: COLORS.borderColor, backgroundColor: '#f9f9f9', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, width: '70%', textAlign: 'center', fontSize: 24, marginBottom: 15, letterSpacing: 10, fontWeight: 'bold', }, //
    otpErrorText: { color: COLORS.error, marginBottom: 15, fontSize: 13, textAlign: 'center', }, //
    otpModalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15, }, //
    otpModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, }, //
    otpCloseButton: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.accent, }, //
    otpCloseButtonText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15, }, //
    otpSubmitButton: { backgroundColor: COLORS.buttonBg, }, //
    otpSubmitButtonText: { color: COLORS.buttonText, fontWeight: 'bold', fontSize: 15, }, //
    buttonDisabled: { backgroundColor: '#CCCCCC', opacity: 0.7, }, //
    proofThumbnailsContainer: { marginTop: 5, marginBottom: 10, }, //
    thumbnail: { width: 60, height: 60, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderColor, marginRight: 10, }, //
    extraThumbnailsContainer: { marginTop: 8, }, //
    partnerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, marginBottom: 10, }, //
    partnerLogoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', }, //
    partnerListLogo: { width: '100%', height: '100%', }, //
    partnerNameText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500',}, //
    noPartnersText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 10, marginBottom: 10, }, //
    errorTextSmall: { color: COLORS.error, fontSize: 12, marginTop: 5, marginBottom: 10, textAlign: 'center', }, //
});