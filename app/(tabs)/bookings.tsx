// File: app/(tabs)/bookings.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAuth } from '@/context/AuthContext'; // Still use for session
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n'; // Add translation import

// --- Types ---
interface TicketImage { imageId?: number; ticketId?: number; imageName?: string | null; imagePath?: string | null; imageContentType?: string | null; }
interface Booking { ticketId: number; reportingPerson?: string; reportingDescription?: string; operationId?: number; status?: string; toCraftmanType?: string; address?: string; city?: string; pincode?: string; countyId?: number; municipalityId?: number; createdOn: string; updatedOn?: string | null; countyName?: string; municipalityName?: string; reviewStarRating?: number | null; reviewComment?: string; companyComment?: string; closingOTP?: number | null; companyId?: number | null; companyName?: string; ticketImages?: TicketImage[] | null; ticketWorkImages?: TicketImage[] | null; }

// --- Reintroduce local type definitions needed for local profile fetch ---
interface PartnerCounty {
    countyId: number;
    // Assuming API returns string | null here for consistency
    countyName: string | null;
}
interface PartnerMunicipality {
    municipalityId: number;
    municipalityName: string | null; // Allow null
    countyId: number;
    countyName?: string;
}
// Local Partner Profile Data structure expected from API
interface PartnerProfileData {
    countyList?: PartnerCounty[] | null;
    municipalityList?: PartnerMunicipality[] | null;
    // Add other fields if needed by this screen
}
// --- End Reintroduce ---

// ApiDataItem (as fixed previously) for modal usage and mapping
interface ApiDataItem {
    id: string;
    name: string | null; // Allows null
}

// Type for the filter state
type ActiveFilterType = { status: string | null; countyId: string | null; municipalityId: string | null; };

// Type needed for iterating partnerProfile.municipalityList if directly used
// Note: This might be redundant if PartnerMunicipality above is used consistently
// interface MunicipalityFromContext { municipalityId: number; municipalityName: string | null; countyId?: number; countyName?: string | null; }


// --- Constants ---
const ALL_STATUSES_FILTER_ID = '';
const FETCH_STATUSES = ['Created', 'Accepted', 'InProgress', 'Completed'];

// --- Colors ---
const COLORS = { background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555', accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F', borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC', buttonBg: '#696969', buttonText: '#FFFFFF', statusCreated: '#007BFF', statusAccepted: '#28A745', statusInProgress: '#FFC107', statusCompleted: '#6C757D', statusDefault: '#6C757D', filterButtonBg: '#696969', filterButtonText: '#FFFFFF', };

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

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/bookings/${item.ticketId}`)}>
      <View style={styles.cardImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} />
          </View>
        )}
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.cardDescription} numberOfLines={1}>
          {description || t('noDescription')}
        </Text>
        <Text style={styles.cardService} numberOfLines={1}>
          {serviceName || t('notAvailable')}
        </Text>
        <Text style={styles.cardDate} numberOfLines={1}>
          {formatDate(item.createdOn)}
        </Text>
      </View>
      <Text style={[styles.cardStatus, { color: statusColor }]}>
        {item.status || t('notAvailable')}
      </Text>
    </TouchableOpacity>
  );
});


// --- Filter Modal Component ---
interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyFilters: (filters: ActiveFilterType) => void;
    initialFilters: ActiveFilterType;
    supportedCounties: ApiDataItem[]; // Uses ApiDataItem
    // Now expects the locally defined PartnerMunicipality type
    supportedMunicipalities: PartnerMunicipality[];
    isLoadingProfile: boolean; // Loading state passed from parent
    profileError: string | null; // Error state passed from parent
}
// FilterModal implementation remains the same internally, relying on props passed down
const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApplyFilters, initialFilters, supportedCounties, supportedMunicipalities, isLoadingProfile, profileError }) => {
    const [tempStatus, setTempStatus] = useState<string | null>(initialFilters.status);
    const [tempCountyId, setTempCountyId] = useState<string | null>(initialFilters.countyId);
    const [tempMunicipalityId, setTempMunicipalityId] = useState<string | null>(initialFilters.municipalityId);
    const [municipalitiesForSelectedCounty, setMunicipalitiesForSelectedCounty] = useState<ApiDataItem[]>([]);
    const jobStatuses: ApiDataItem[] = [
      { id: 'Created', name: t('statusCreated') },
      { id: 'Accepted', name: t('statusAccepted') },
      { id: 'InProgress', name: t('statusInProgress') },
      { id: 'Completed', name: t('statusCompleted') },
      { id: ALL_STATUSES_FILTER_ID, name: t('allStatuses') },
    ];

    useEffect(() => {
      if (tempCountyId && supportedMunicipalities) {
        const selectedCountyNum = parseInt(tempCountyId, 10);
        // Map to ApiDataItem. PartnerMunicipality now allows null name, so this works.
        const filtered = supportedMunicipalities
            .filter(m => m.countyId === selectedCountyNum)
            .map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName }));
        setMunicipalitiesForSelectedCounty(filtered);
        const currentMuniIdIsValid = filtered.some(m => m.id === tempMunicipalityId);
        if (!currentMuniIdIsValid) { setTempMunicipalityId(null); }
      } else {
        setMunicipalitiesForSelectedCounty([]);
        if (!tempCountyId) { setTempMunicipalityId(null); }
      }
    }, [tempCountyId, supportedMunicipalities, tempMunicipalityId]);

    useEffect(() => {
       if (visible) {
           setTempStatus(initialFilters.status);
           setTempCountyId(initialFilters.countyId);
           setTempMunicipalityId(initialFilters.municipalityId);
       }
    }, [visible, initialFilters]);

    const handleApply = () => { onApplyFilters({ status: tempStatus, countyId: tempCountyId, municipalityId: tempMunicipalityId }); onClose(); };
    const getStatusName = (id: string | null) => jobStatuses.find(s => s.id === id)?.name || t('selectStatus');
    const getCountyName = (id: string | null) => supportedCounties.find(c => c.id === id)?.name || t('selectCounty');
    const getMunicipalityName = (id: string | null) => municipalitiesForSelectedCounty.find(m => m.id === id)?.name || t('selectMunicipality');

    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [isCountyModalVisible, setIsCountyModalVisible] = useState(false);
    const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState(false);

    const isCountyDisabled = isLoadingProfile || !!profileError || supportedCounties.length === 0;
    const countyPlaceholder = isLoadingProfile ? t('loadingProfile') : profileError ? t('errorLoadingProfile') : supportedCounties.length === 0 ? t('noSupportedCounties') : t('selectCounty');
    const isMunicipalityDisabled = !tempCountyId || isLoadingProfile || !!profileError || municipalitiesForSelectedCounty.length === 0;
    const municipalityPlaceholder = !tempCountyId ? t('selectCountyFirst') : (isLoadingProfile || !!profileError) ? '...' : municipalitiesForSelectedCounty.length === 0 ? t('noSupportedMunicipalities') : t('selectMunicipality');

    // JSX for the modal remains the same
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.filterModalBackdrop}><View style={styles.filterModalContent}><View style={styles.filterModalHeader}><Text style={styles.filterModalTitle}>{t('filterJobs')}</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={COLORS.textSecondary} /></TouchableOpacity></View><TouchableOpacity style={styles.filterSelector} onPress={() => setIsStatusModalVisible(true)}><Text style={tempStatus === null || tempStatus === undefined ? styles.filterPlaceholder : styles.filterValue}>{getStatusName(tempStatus)}</Text><Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} /></TouchableOpacity><TouchableOpacity style={[styles.filterSelector, isCountyDisabled && styles.filterSelectorDisabled]} onPress={() => !isCountyDisabled && setIsCountyModalVisible(true)} disabled={isCountyDisabled}><Text style={!tempCountyId ? styles.filterPlaceholder : styles.filterValue}>{isLoadingProfile ? t('loading') : profileError ? t('errorProfile') : getCountyName(tempCountyId) || countyPlaceholder}</Text>{isLoadingProfile ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> : <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />}</TouchableOpacity>{profileError && <Text style={styles.filterErrorText}>{profileError}</Text>}<TouchableOpacity style={[styles.filterSelector, isMunicipalityDisabled && styles.filterSelectorDisabled]} onPress={() => !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)} disabled={isMunicipalityDisabled}><Text style={!tempMunicipalityId ? styles.filterPlaceholder : styles.filterValue}>{getMunicipalityName(tempMunicipalityId) || municipalityPlaceholder}</Text><Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} /></TouchableOpacity><TouchableOpacity style={styles.filterApplyButton} onPress={handleApply}><Text style={styles.filterApplyButtonText}>{t('ok')}</Text></TouchableOpacity></View></View><SelectModal mode="single" visible={isStatusModalVisible} title={t('selectStatus')} data={jobStatuses} initialSelectedId={tempStatus} onClose={() => setIsStatusModalVisible(false)} onConfirmSingle={(id) => setTempStatus(id)} /><SelectModal mode="single" visible={isCountyModalVisible} title={t('selectCounty')} data={supportedCounties} initialSelectedId={tempCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={(id) => setTempCountyId(id) } /><SelectModal mode="single" visible={isMunicipalityModalVisible} title={t('selectMunicipality')} data={municipalitiesForSelectedCounty} initialSelectedId={tempMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={(id) => setTempMunicipalityId(id)} /></Modal> );
};


// --- Main Screen Component ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth(); // Only need session and auth loading state

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false); // For ticket fetching
  const [error, setError] = useState<string | null>(null); // For ticket fetching errors
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Reintroduce local state for partner profile ---
  const [partnerProfileData, setPartnerProfileData] = useState<PartnerProfileData | null>(null);
  const [isLoadingPartnerProfile, setIsLoadingPartnerProfile] = useState<boolean>(false);
  const [partnerProfileError, setPartnerProfileError] = useState<string | null>(null);
  // --- End Reintroduce ---

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilterType>({
      status: ALL_STATUSES_FILTER_ID,
      countyId: null,
      municipalityId: null,
  });

  // --- Reintroduce local fetchPartnerProfile ---
  const fetchPartnerProfile = useCallback(async () => {
      if (!session || session.type !== 'partner' || !session.email) {
          setPartnerProfileData(null);
          setIsLoadingPartnerProfile(false);
          setPartnerProfileError(null);
          return;
      }
      setIsLoadingPartnerProfile(true);
      setPartnerProfileError(null);
      const detailUrl = `${BASE_URL}/api/Company/GetCompanyDetail?EmailId=${encodeURIComponent(session.email)}`;
      try {
          console.log(`BookingsScreen: Fetching partner profile locally from: ${detailUrl}`);
          const response = await fetch(detailUrl);
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed profile fetch (${response.status}): ${errorText}`);
          }
          // Assume data structure matches PartnerProfileData defined locally
          const data: PartnerProfileData = await response.json();
          console.log("BookingsScreen: Local partner profile received:", data);
          setPartnerProfileData(data);
      } catch (err: any) {
          console.error("BookingsScreen: Failed to load partner profile locally:", err);
          setPartnerProfileError(`Profile Error: ${err.message}`);
          setPartnerProfileData(null);
      } finally {
          setIsLoadingPartnerProfile(false);
      }
  }, [session]);
  // --- End Reintroduce ---


  // Fetching Logic for tickets (fetchData) - remains the same
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    if (isAuthLoading || !session) { setBookings([]); setError(null); if (!session && !isAuthLoading) { setIsLoadingData(false); setIsRefreshing(false); } return; }
    const currentFilters = activeFilters;
    if (showLoadingIndicator) setIsLoadingData(true);
    setError(null);
    const headers: HeadersInit = { 'accept': 'text/plain' };
    let fetchPromises: Promise<Booking[]>[] = [];
    if (session.type === 'user') {
        if (!session.name) { setError("User name not found."); setIsLoadingData(false); setIsRefreshing(false); return; }
        const url = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?Username=${encodeURIComponent(session.name)}`;
        console.log(`User Bookings: Fetching jobs from ${url}`);
        fetchPromises.push(fetch(url, { headers }).then(async r => { if (!r.ok) { const et = await r.text(); throw new Error(`User fetch failed (${r.status}): ${et}`); } return r.json() as Promise<Booking[]>; }).catch(e => { console.error("User fetch failed:", e); setError(p => p ? `${p}\n${e.message}` : e.message); return []; }));
    } else { // Partner fetch logic
        if (!session.id) { setError("Partner ID not found."); setIsLoadingData(false); setIsRefreshing(false); return; }
        const baseParams = new URLSearchParams();
        baseParams.append('CompanyId', session.id.toString());
        const countyId = currentFilters.countyId; if (countyId !== null) { baseParams.append('CountyId', countyId); }
        const municipalityId = currentFilters.municipalityId; if (municipalityId !== null) { baseParams.append('MunicipalityId', municipalityId); }
        const isFetchingAll = currentFilters.status === ALL_STATUSES_FILTER_ID || currentFilters.status === null;
        const targetStatuses = isFetchingAll ? FETCH_STATUSES : (currentFilters.status ? [currentFilters.status] : []);
        console.log(`Partner Bookings: Fetching for statuses: [${targetStatuses.join(', ')}] with filters:`, currentFilters);
        if (targetStatuses.length === 0 && !isFetchingAll) { console.warn("No valid status selected for specific fetch, skipping API calls."); setBookings([]); setIsLoadingData(false); setIsRefreshing(false); return; }
        targetStatuses.forEach(status => {
             const statusParams = new URLSearchParams(baseParams); statusParams.append('Status', status); const url = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?${statusParams.toString()}`;
             fetchPromises.push( fetch(url, { headers }).then(async response => { if (!response.ok) { const errorText = await response.text(); console.error(`Partner fetch failed for status '${status}' (${response.status}): ${errorText}`); setError(prev => prev ? `${prev}\nFailed fetch for ${status}` : `Failed fetch for ${status}`); return []; } return response.json() as Promise<Booking[]>; }).catch(err => { console.error(`Partner fetch network error for status '${status}':`, err); setError(prev => prev ? `${prev}\nNetwork error for ${status}` : `Network error for ${status}`); return []; }) );
        });
    }
    try {
        const results = await Promise.all(fetchPromises); const fetchedBookings = results.flat(); fetchedBookings.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()); setBookings(fetchedBookings);
        if (fetchedBookings.length > 0 || !error) { if (error) { console.warn("Partial fetch errors occurred, but showing results:", error); } setError(null); } else { console.error("All ticket fetches failed or returned empty with errors:", error); }
    } catch (overallError: any) { console.error("Overall ticket fetch error (unexpected):", overallError); setError(`Failed to load bookings: ${overallError.message}`); setBookings([]); }
    finally { if (showLoadingIndicator) setIsLoadingData(false); setIsRefreshing(false); }
  }, [session, isAuthLoading, activeFilters]);


  // Focus Effect - Modified to call local fetchPartnerProfile
  useFocusEffect(
      useCallback(() => {
          if (!isAuthLoading) {
              console.log("Bookings screen focused.");
              fetchData(bookings.length === 0); // Fetch tickets
              if (session?.type === 'partner') {
                   console.log("Triggering local partner profile fetch.");
                   fetchPartnerProfile(); // Call local fetch function
              } else {
                   // Clear local partner state if user logs in
                   setPartnerProfileData(null);
                   setIsLoadingPartnerProfile(false);
                   setPartnerProfileError(null);
              }
          }
      }, [fetchData, fetchPartnerProfile, isAuthLoading, bookings.length, session]) // Use local fetch function
  );

  // Refresh handler - Modified to call local fetchPartnerProfile
  const handleRefresh = useCallback(() => {
      if (!isAuthLoading && session) {
        setIsRefreshing(true);
        fetchData(false); // Refetch tickets
        if (session.type === 'partner') {
            fetchPartnerProfile(); // Call local fetch function
        }
      } else { setIsRefreshing(false); }
  }, [fetchData, fetchPartnerProfile, isAuthLoading, session]); // Use local fetch function

  // Filter apply handler (remains the same)
  const handleApplyFilters = (newFilters: ActiveFilterType) => {
      if (newFilters.status !== activeFilters.status || newFilters.countyId !== activeFilters.countyId || newFilters.municipalityId !== activeFilters.municipalityId) {
            setActiveFilters(newFilters); setBookings([]);
      } else { console.log("Filters did not change."); }
  };

  // Format partner lists for SelectModal using data from local state
  const formattedSupportedCounties = useMemo(() => {
      const uniqueCounties = new Map<number, string>();
      // Use local partnerProfileData state
      (partnerProfileData?.countyList || []).forEach(c => {
          if (c && typeof c.countyId === 'number' && typeof c.countyName === 'string') { // Check type string for name
              if (!uniqueCounties.has(c.countyId)) {
                  uniqueCounties.set(c.countyId, c.countyName);
              }
          }
      });
      // Map to ApiDataItem structure (name should be string | null)
      return Array.from(uniqueCounties.entries()).map(([id, name]) => ({ id: id.toString(), name: name }));
  }, [partnerProfileData?.countyList]);

  // Use local partnerProfileData state
  const partnerMunicipalities = partnerProfileData?.municipalityList || [];

  // --- Render Logic ---
  if (isAuthLoading) { return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Bookings' }} /><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
  if (!session) { return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Bookings' }} /><View style={styles.containerCentered}><Ionicons name="calendar-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} /><Text style={styles.loggedOutMessage}>Log in or create an account to view your bookings.</Text><TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}><Text style={styles.loginButtonText}>LOG IN</Text></TouchableOpacity></View></SafeAreaView> ); }

  // Use local loading and error states
  const isOverallLoading = isLoadingData || (session.type === 'partner' && isLoadingPartnerProfile);
  const displayError = (session?.type === 'partner' ? partnerProfileError : null) || error;

  const renderListContent = () => {
      if (isOverallLoading && bookings.length === 0 && !displayError) {
          return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
      }
      if (displayError && bookings.length === 0 && !isOverallLoading) {
          return <View style={styles.centered}><Text style={styles.errorText}>{displayError}</Text></View>;
      }
      if (!isOverallLoading && !displayError && bookings.length === 0) {
          return ( <ScrollView contentContainerStyle={styles.centered} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }><Text style={styles.noDataText}>{session?.type === 'partner' ? 'No jobs match filters.' : 'You have no bookings yet.'}</Text>{session?.type === 'user' && ( <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}><Text style={styles.createButtonText}>Create New Job Request</Text></TouchableOpacity> )}</ScrollView> );
      }
      return (
          <>
            {error && <Text style={styles.errorTextSmall}>Note: {error}</Text>}
            <FlatList data={bookings} renderItem={({ item }) => <BookingCard item={item} />} keyExtractor={(item) => item.ticketId.toString()} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> } />
          </>
       );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen
          options={{
              title: session?.type === 'partner' ? 'Job Requests' : 'User Bookings',
              headerStyle: { backgroundColor: COLORS.headerBg }, headerTintColor: COLORS.headerText, headerTitleStyle: { fontWeight: 'bold' }, headerTitleAlign: 'center',
              // Use local isLoadingPartnerProfile for disabled state
              headerRight: session?.type === 'partner' ? () => ( <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={{ marginRight: 15 }} disabled={isLoadingPartnerProfile}><Ionicons name="filter" size={24} color={isLoadingPartnerProfile ? COLORS.borderColor : COLORS.headerText} /></TouchableOpacity> ) : undefined,
          }}
      />
      {renderListContent()}
      {session?.type === 'partner' && (
           <FilterModal
               visible={isFilterModalVisible}
               onClose={() => setIsFilterModalVisible(false)}
               onApplyFilters={handleApplyFilters}
               initialFilters={activeFilters}
               // Pass local data/state to modal
               supportedCounties={formattedSupportedCounties}
               supportedMunicipalities={partnerMunicipalities as PartnerMunicipality[]} // Cast needed if structure is identical
               isLoadingProfile={isLoadingPartnerProfile}
               profileError={partnerProfileError}
            />
         )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    /* ... styles remain the same ... */
    safeArea: { flex: 1, backgroundColor: COLORS.background, }, centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, }, containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, }, loggedOutMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24, }, loginButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', }, loginButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', paddingHorizontal: 15 }, errorTextSmall: { color: COLORS.error, fontSize: 12, textAlign: 'center', paddingHorizontal: 15, paddingBottom: 5 }, noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20, }, createButton: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, }, createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', }, listContainer: { paddingVertical: 15, paddingHorizontal: 10, }, card: { backgroundColor: COLORS.cardBg, borderRadius: 8, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.22, alignItems: 'center' }, cardImageContainer: { width: 70, height: 70, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, }, cardImage: { width: '100%', height: '100%', borderRadius: 8, }, cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', borderRadius: 8,}, cardDetails: { flex: 1, paddingVertical: 10, paddingLeft: 0, paddingRight: 10, justifyContent: 'center', }, cardDescription: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4, }, cardService: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, }, cardDate: { fontSize: 12, color: COLORS.textSecondary, }, cardStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 10, textAlign: 'right', }, filterModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', }, filterModalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, padding: 20, elevation: 5, }, filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, }, filterModalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, }, filterSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.borderColor, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 15, }, filterSelectorDisabled: { backgroundColor: '#F0F0F0', opacity: 0.7 }, filterPlaceholder: { fontSize: 16, color: COLORS.textSecondary, flex: 1, marginRight: 10, }, filterValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, marginRight: 10, }, filterApplyButton: { backgroundColor: COLORS.filterButtonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, }, filterApplyButtonText: { color: COLORS.filterButtonText, fontSize: 16, fontWeight: 'bold', }, filterErrorText: { color: COLORS.error, fontSize: 12, marginTop: -10, marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5, },
});