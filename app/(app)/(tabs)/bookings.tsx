// File: app/(tabs)/bookings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal';
import { BASE_URL } from '@/constants/Api';

// --- Types ---
interface TicketImage {
    imageId?: number; ticketId?: number; imageName?: string | null;
    imagePath?: string | null; imageContentType?: string | null;
}
interface Booking {
  ticketId: number;
  reportingPerson?: string; reportingDescription?: string;
  operationId?: number; status?: string; toCraftmanType?: string;
  address?: string; city?: string; pincode?: string; countyId?: number;
  municipalityId?: number;
  createdOn: string; updatedOn?: string | null;
  countyName?: string; municipalityName?: string; reviewStarRating?: number | null;
  reviewComment?: string; companyComment?: string;
  closingOTP?: number | null;
  companyId?: number | null; companyName?: string;
  ticketImages?: TicketImage[] | null; ticketWorkImages?: TicketImage[] | null;
}
interface PartnerCounty {
    countyId: number; countyName: string;
}
interface PartnerMunicipality {
    municipalityId: number; municipalityName: string;
    countyId: number; countyName?: string;
}
interface PartnerProfileData {
    countyList?: PartnerCounty[] | null;
    municipalityList?: PartnerMunicipality[] | null;
}
interface ApiDataItem { id: string; name: string; }
type ActiveFilterType = {
    status: string | null;
    countyId: string | null;
    municipalityId: string | null;
};

// --- Constants ---
const ALL_STATUSES_FILTER_ID = ''; // Use empty string consistently for "All"
const FETCH_STATUSES = ['Created', 'Accepted', 'InProgress', 'Completed']; // Statuses for multi-fetch

// --- Colors ---
const COLORS = {
    background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555',
    accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
    borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC',
    buttonBg: '#696969', buttonText: '#FFFFFF', statusCreated: '#007BFF',
    statusAccepted: '#28A745', statusInProgress: '#FFC107', statusCompleted: '#6C757D',
    statusDefault: '#6C757D', filterButtonBg: '#696969', filterButtonText: '#FFFFFF',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => { if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleDateString('sv-SE'); } catch (error) { return 'Invalid Date'; } };
const getStatusColor = (status?: string): string => { const lowerStatus = status?.toLowerCase() || ''; if (lowerStatus === 'created') return COLORS.statusCreated; if (lowerStatus === 'accepted') return COLORS.statusAccepted; if (lowerStatus === 'inprogress' || lowerStatus === 'in progress') return COLORS.statusInProgress; if (lowerStatus === 'completed') return COLORS.statusCompleted; return COLORS.statusDefault; };

// --- Booking Card Component ---
interface BookingCardProps { item: Booking; }
const BookingCard: React.FC<BookingCardProps> = React.memo(({ item }) => {
  const router = useRouter();
  const statusColor = getStatusColor(item.status);
  const imageUrl = item.ticketImages?.[0]?.imagePath;
  const description = item.reportingDescription;
  const serviceName = item.toCraftmanType;
  return ( <TouchableOpacity style={styles.card} onPress={() => router.push(`/bookings/${item.ticketId}`)}><View style={styles.cardImageContainer}>{imageUrl ? ( <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" /> ) : ( <View style={styles.cardImagePlaceholder}><Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} /></View> )}</View><View style={styles.cardDetails}><Text style={styles.cardDescription} numberOfLines={1}>{description || 'No Description'}</Text><Text style={styles.cardService} numberOfLines={1}>{serviceName || 'N/A'}</Text><Text style={styles.cardDate} numberOfLines={1}>{formatDate(item.createdOn)}</Text></View><Text style={[styles.cardStatus, { color: statusColor }]}>{item.status || 'N/A'}</Text></TouchableOpacity> );
});


// --- Filter Modal Component ---
interface FilterModalProps { visible: boolean; onClose: () => void; onApplyFilters: (filters: ActiveFilterType) => void; initialFilters: ActiveFilterType; supportedCounties: ApiDataItem[]; supportedMunicipalities: PartnerMunicipality[]; isLoadingProfile: boolean; profileError: string | null; }
const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApplyFilters, initialFilters, supportedCounties, supportedMunicipalities, isLoadingProfile, profileError }) => {
    // ... (FilterModal implementation remains the same - uses ALL_STATUSES_FILTER_ID) ...
    const [tempStatus, setTempStatus] = useState<string | null>(initialFilters.status);
    const [tempCountyId, setTempCountyId] = useState<string | null>(initialFilters.countyId);
    const [tempMunicipalityId, setTempMunicipalityId] = useState<string | null>(initialFilters.municipalityId);
    const [municipalitiesForSelectedCounty, setMunicipalitiesForSelectedCounty] = useState<ApiDataItem[]>([]);
    const jobStatuses: ApiDataItem[] = [ { id: 'Created', name: 'Created (New Requests)' }, { id: 'Accepted', name: 'Accepted' }, { id: 'InProgress', name: 'In Progress' }, { id: 'Completed', name: 'Completed' }, { id: ALL_STATUSES_FILTER_ID, name: 'All Statuses' }, ];
    useEffect(() => { if (tempCountyId && supportedMunicipalities) { const selectedCountyNum = parseInt(tempCountyId, 10); const filtered = supportedMunicipalities.filter(m => m.countyId === selectedCountyNum).map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName })); setMunicipalitiesForSelectedCounty(filtered); const currentMuniIdIsValid = filtered.some(m => m.id === tempMunicipalityId); if (!currentMuniIdIsValid) { setTempMunicipalityId(null); } } else { setMunicipalitiesForSelectedCounty([]); if (!tempCountyId) { setTempMunicipalityId(null); } } }, [tempCountyId, supportedMunicipalities, tempMunicipalityId]);
    useEffect(() => { if (visible) { setTempStatus(initialFilters.status); setTempCountyId(initialFilters.countyId); setTempMunicipalityId(initialFilters.municipalityId); } }, [visible, initialFilters]);
    const handleApply = () => { onApplyFilters({ status: tempStatus, countyId: tempCountyId, municipalityId: tempMunicipalityId }); onClose(); };
    const getStatusName = (id: string | null) => jobStatuses.find(s => s.id === id)?.name || 'Select Status';
    const getCountyName = (id: string | null) => supportedCounties.find(c => c.id === id)?.name || 'Select County';
    const getMunicipalityName = (id: string | null) => municipalitiesForSelectedCounty.find(m => m.id === id)?.name || 'Select Municipality';
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false); const [isCountyModalVisible, setIsCountyModalVisible] = useState(false); const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState(false);
    const isCountyDisabled = isLoadingProfile || !!profileError || supportedCounties.length === 0; const countyPlaceholder = isLoadingProfile ? 'Loading Profile...' : profileError ? 'Error Loading Profile' : supportedCounties.length === 0 ? 'No Supported Counties' : 'Select County';
    const isMunicipalityDisabled = !tempCountyId || isLoadingProfile || !!profileError || municipalitiesForSelectedCounty.length === 0; const municipalityPlaceholder = !tempCountyId ? 'Select County First' : (isLoadingProfile || !!profileError) ? '...' : municipalitiesForSelectedCounty.length === 0 ? 'No Supported Municipalities' : 'Select Municipality';
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.filterModalBackdrop}><View style={styles.filterModalContent}><View style={styles.filterModalHeader}><Text style={styles.filterModalTitle}>Filter Jobs</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={COLORS.textSecondary} /></TouchableOpacity></View><TouchableOpacity style={styles.filterSelector} onPress={() => setIsStatusModalVisible(true)}><Text style={tempStatus === null || tempStatus === undefined ? styles.filterPlaceholder : styles.filterValue}>{getStatusName(tempStatus)}</Text><Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} /></TouchableOpacity><TouchableOpacity style={[styles.filterSelector, isCountyDisabled && styles.filterSelectorDisabled]} onPress={() => !isCountyDisabled && setIsCountyModalVisible(true)} disabled={isCountyDisabled}><Text style={!tempCountyId ? styles.filterPlaceholder : styles.filterValue}>{isLoadingProfile ? 'Loading...' : profileError ? 'Error Profile' : getCountyName(tempCountyId) || countyPlaceholder}</Text>{isLoadingProfile ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />}</TouchableOpacity>{profileError && <Text style={styles.filterErrorText}>{profileError}</Text>}<TouchableOpacity style={[styles.filterSelector, isMunicipalityDisabled && styles.filterSelectorDisabled]} onPress={() => !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled}><Text style={!tempMunicipalityId ? styles.filterPlaceholder : styles.filterValue}>{getMunicipalityName(tempMunicipalityId) || municipalityPlaceholder}</Text><Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} /></TouchableOpacity><TouchableOpacity style={styles.filterApplyButton} onPress={handleApply}><Text style={styles.filterApplyButtonText}>OK</Text></TouchableOpacity></View></View><SelectModal mode="single" visible={isStatusModalVisible} title="Select Status" data={jobStatuses} initialSelectedId={tempStatus} onClose={() => setIsStatusModalVisible(false)} onConfirmSingle={(id) => setTempStatus(id)} /><SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={supportedCounties} initialSelectedId={tempCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={(id) => setTempCountyId(id) } /><SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalitiesForSelectedCounty} initialSelectedId={tempMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={(id) => setTempMunicipalityId(id)} /></Modal> );
};


// --- Main Screen Component ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [partnerProfileData, setPartnerProfileData] = useState<PartnerProfileData | null>(null);
  const [isLoadingPartnerProfile, setIsLoadingPartnerProfile] = useState<boolean>(false);
  const [partnerProfileError, setPartnerProfileError] = useState<string | null>(null);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Default filter status to "All"
  const [activeFilters, setActiveFilters] = useState<ActiveFilterType>({
      status: ALL_STATUSES_FILTER_ID, // Default to 'All'
      countyId: null,
      municipalityId: null,
  });

  // Remove caching state

  const fetchPartnerProfile = useCallback(async () => {
    // ... (fetchPartnerProfile remains the same) ...
      if (!session || session.type !== 'partner' || !session.email) { setPartnerProfileData(null); setIsLoadingPartnerProfile(false); setPartnerProfileError(null); return; }
      setIsLoadingPartnerProfile(true); setPartnerProfileError(null);
      const detailUrl = `${BASE_URL}/api/Company/GetCompanyDetail?EmailId=${encodeURIComponent(session.email)}`;
      try { console.log(`BookingsScreen: Fetching partner profile from: ${detailUrl}`); const response = await fetch(detailUrl); if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed profile fetch (${response.status}): ${errorText}`); } const data: PartnerProfileData = await response.json(); console.log("BookingsScreen: Partner profile received:", data); setPartnerProfileData(data); } catch (err: any) { console.error("BookingsScreen: Failed to load partner profile:", err); setPartnerProfileError(`Profile Error: ${err.message}`); setPartnerProfileData(null); } finally { setIsLoadingPartnerProfile(false); }
  }, [session]);


  // Fetching Logic (Simplified Multi-Fetch - No Cache)
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    if (isAuthLoading || !session) {
        setBookings([]); setError(null);
        if (!session && !isAuthLoading) { setIsLoadingData(false); setIsRefreshing(false); }
        return;
    }

    const currentFilters = activeFilters;

    if (showLoadingIndicator) setIsLoadingData(true);
    setError(null); // Clear previous errors

    const headers: HeadersInit = { 'accept': 'text/plain' };
    let fetchPromises: Promise<Booking[]>[] = [];


    if (session.type === 'user') {
        // User fetch remains the same
        if (!session.name) { setError("User name not found."); setIsLoadingData(false); setIsRefreshing(false); return; }
        const url = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?Username=${encodeURIComponent(session.name)}`;
        console.log(`User Bookings: Fetching jobs from ${url}`);
        fetchPromises.push(fetch(url, { headers }).then(async r => { if (!r.ok) { const et = await r.text(); throw new Error(`User fetch failed (${r.status}): ${et}`); } return r.json() as Promise<Booking[]>; }).catch(e => { console.error("User fetch failed:", e); setError(p => p ? `${p}\n${e.message}` : e.message); return []; }));
    } else { // Partner fetch logic
        if (!session.id) { setError("Partner ID not found."); setIsLoadingData(false); setIsRefreshing(false); return; }

        // --- MODIFICATION START: Apply explicit null checks for baseParams ---
        const baseParams = new URLSearchParams(); // Start empty
        baseParams.append('CompanyId', session.id.toString());

        const countyId = currentFilters.countyId;
        if (countyId !== null) { // Explicit check for null
            baseParams.append('CountyId', countyId);
        }
        const municipalityId = currentFilters.municipalityId;
        if (municipalityId !== null) { // Explicit check for null
            baseParams.append('MunicipalityId', municipalityId);
        }
        // --- MODIFICATION END ---

        const isFetchingAll = currentFilters.status === ALL_STATUSES_FILTER_ID || currentFilters.status === null;
        // Ensure targetStatuses only contains valid strings expected by the API
        const targetStatuses = isFetchingAll ? FETCH_STATUSES : (currentFilters.status ? [currentFilters.status] : []);

        console.log(`Partner Bookings: Fetching for statuses: [${targetStatuses.join(', ')}] with filters:`, currentFilters);

        // Only proceed if targetStatuses is not empty (safeguard)
        if (targetStatuses.length === 0 && !isFetchingAll) {
            console.warn("No valid status selected for specific fetch, skipping API calls.");
            setBookings([]); // Clear bookings if no status is valid
            setIsLoadingData(false);
            setIsRefreshing(false);
            return;
        }


        targetStatuses.forEach(status => {
             // status is guaranteed to be a string here from FETCH_STATUSES or a non-null activeFilters.status
            const statusParams = new URLSearchParams(baseParams); // Clone base params
            statusParams.append('Status', status); // Append the specific status string
            const url = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?${statusParams.toString()}`;

            fetchPromises.push(
                fetch(url, { headers })
                    .then(async response => {
                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error(`Partner fetch failed for status '${status}' (${response.status}): ${errorText}`);
                            setError(prev => prev ? `${prev}\nFailed fetch for ${status}` : `Failed fetch for ${status}`);
                            return [];
                        }
                        return response.json() as Promise<Booking[]>;
                    })
                    .catch(err => {
                        console.error(`Partner fetch network error for status '${status}':`, err);
                         setError(prev => prev ? `${prev}\nNetwork error for ${status}` : `Network error for ${status}`);
                        return [];
                    })
            );
        });
    }

    // Execute all fetch promises
    try {
        const results = await Promise.all(fetchPromises);
        const fetchedBookings = results.flat();
        fetchedBookings.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
        setBookings(fetchedBookings); // Update displayed bookings

        if (fetchedBookings.length > 0 || !error) {
             if (error) { console.warn("Partial fetch errors occurred, but showing results:", error); }
              setError(null);
        } else {
             console.error("All fetches failed or returned empty with errors:", error);
        }

    } catch (overallError: any) {
        console.error("Overall fetch error (unexpected):", overallError);
        setError(`Failed to load bookings: ${overallError.message}`);
        setBookings([]);
    } finally {
        if (showLoadingIndicator) setIsLoadingData(false);
        setIsRefreshing(false);
    }
  }, [session, isAuthLoading, activeFilters]);


  // Focus Effect
  useFocusEffect(
      useCallback(() => {
          if (!isAuthLoading) {
              fetchData(bookings.length === 0);
              if (session?.type === 'partner') { fetchPartnerProfile(); }
              else { setPartnerProfileData(null); setIsLoadingPartnerProfile(false); setPartnerProfileError(null); }
          }
      }, [fetchData, fetchPartnerProfile, isAuthLoading, bookings.length, session]) // Added bookings.length dependency
  );

  // Refresh handler
  const handleRefresh = useCallback(() => {
      if (!isAuthLoading && session) {
        setIsRefreshing(true);
        fetchData(false);
        if (session.type === 'partner') { fetchPartnerProfile(); }
      } else { setIsRefreshing(false); }
  }, [fetchData, fetchPartnerProfile, isAuthLoading, session]);

  // Filter apply handler
  const handleApplyFilters = (newFilters: ActiveFilterType) => {
      if (newFilters.status !== activeFilters.status || newFilters.countyId !== activeFilters.countyId || newFilters.municipalityId !== activeFilters.municipalityId) {
            setActiveFilters(newFilters);
            setBookings([]); // Clear bookings immediately for loading state feedback
      } else { console.log("Filters did not change."); }
  };

  // Format partner lists for SelectModal
  const formattedSupportedCounties = React.useMemo(() => { /* ... remains same ... */ const uniqueCounties = new Map<number, string>(); partnerProfileData?.countyList?.forEach(c => { if (c && typeof c.countyId === 'number' && typeof c.countyName === 'string') { if (!uniqueCounties.has(c.countyId)) { uniqueCounties.set(c.countyId, c.countyName); } } }); return Array.from(uniqueCounties.entries()).map(([id, name]) => ({ id: id.toString(), name: name })); }, [partnerProfileData?.countyList]);
  const partnerMunicipalities = partnerProfileData?.municipalityList || [];

  // --- Render Logic ---
  if (isAuthLoading) { return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Bookings' }} /><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
  if (!session) { return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Bookings' }} /><View style={styles.containerCentered}><Ionicons name="calendar-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} /><Text style={styles.loggedOutMessage}>Log in or create an account to view your bookings.</Text><TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}><Text style={styles.loginButtonText}>LOG IN</Text></TouchableOpacity></View></SafeAreaView> ); }
  const isOverallLoading = isLoadingData || (session.type === 'partner' && isLoadingPartnerProfile);
  const renderListContent = () => { if (isOverallLoading && bookings.length === 0 && !error && !partnerProfileError) { return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>; } const displayError = (session?.type === 'partner' ? partnerProfileError : null) || error; if (displayError && bookings.length === 0 && !isOverallLoading) { return <View style={styles.centered}><Text style={styles.errorText}>{displayError}</Text></View>; } if (!isOverallLoading && !displayError && bookings.length === 0) { return ( <ScrollView contentContainerStyle={styles.centered} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }><Text style={styles.noDataText}>{session?.type === 'partner' ? 'No jobs match filters.' : 'You have no bookings yet.'}</Text>{session?.type === 'user' && ( <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}><Text style={styles.createButtonText}>Create New Job Request</Text></TouchableOpacity> )}</ScrollView> ); } return ( <FlatList data={bookings} renderItem={({ item }) => <BookingCard item={item} />} keyExtractor={(item) => item.ticketId.toString()} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> } /> ); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: session?.type === 'partner' ? 'Job Requests' : 'User Bookings', headerStyle: { backgroundColor: COLORS.headerBg }, headerTintColor: COLORS.headerText, headerTitleStyle: { fontWeight: 'bold' }, headerTitleAlign: 'center', headerRight: session?.type === 'partner' ? () => ( <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={{ marginRight: 15 }} disabled={isLoadingPartnerProfile}><Ionicons name="filter" size={24} color={isLoadingPartnerProfile ? COLORS.borderColor : COLORS.headerText} /></TouchableOpacity> ) : undefined, }} />
      {renderListContent()}
      {session?.type === 'partner' && ( <FilterModal visible={isFilterModalVisible} onClose={() => setIsFilterModalVisible(false)} onApplyFilters={handleApplyFilters} initialFilters={activeFilters} supportedCounties={formattedSupportedCounties} supportedMunicipalities={partnerMunicipalities} isLoadingProfile={isLoadingPartnerProfile} profileError={partnerProfileError} /> )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    // ... (Styles remain the same) ...
    safeArea: { flex: 1, backgroundColor: COLORS.background, },
    centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
    containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, },
    loggedOutMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24, },
    loginButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', },
    loginButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
    errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', paddingHorizontal: 15 },
    noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20, },
    createButton: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, },
    createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
    listContainer: { paddingVertical: 15, paddingHorizontal: 10, },
    card: { backgroundColor: COLORS.cardBg, borderRadius: 8, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.22, alignItems: 'center' },
    cardImageContainer: { width: 70, height: 70, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
    cardImage: { width: '100%', height: '100%', borderRadius: 8, },
    cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', borderRadius: 8,},
    cardDetails: { flex: 1, paddingVertical: 10, paddingLeft: 0, paddingRight: 10, justifyContent: 'center', },
    cardDescription: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4, },
    cardService: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, },
    cardDate: { fontSize: 12, color: COLORS.textSecondary, },
    cardStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 10, textAlign: 'right', },
    filterModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', },
    filterModalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, padding: 20, elevation: 5, },
    filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    filterModalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, },
    filterSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 15, },
    filterSelectorDisabled: { backgroundColor: '#F0F0F0', opacity: 0.7 },
    filterPlaceholder: { fontSize: 16, color: COLORS.textSecondary, flex: 1, marginRight: 10, },
    filterValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, marginRight: 10, },
    filterApplyButton: { backgroundColor: COLORS.filterButtonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, },
    filterApplyButtonText: { color: COLORS.filterButtonText, fontSize: 16, fontWeight: 'bold', },
    filterErrorText: { color: COLORS.error, fontSize: 12, marginTop: -10, marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5, },
});