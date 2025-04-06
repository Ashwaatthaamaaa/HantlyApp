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
  ScrollView, // Ensure ScrollView is imported
  Alert, // Ensure Alert is imported
  Modal // Import Modal for filter
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal'; // Import reusable select modal

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';

// --- Types ---
interface TicketImage {
    imageId?: number; ticketId?: number; imageName?: string | null;
    imagePath?: string | null; imageContentType?: string | null;
}
interface Booking { // Used for both User and Partner lists for consistency
  ticketId: number; reportingPerson?: string; reportingDescription?: string;
  operationId?: number; status?: string; toCraftmanType?: string;
  address?: string; city?: string; pincode?: string; countyId?: number;
  municipalityId?: number; createdOn: string; updatedOn?: string | null;
  countyName?: string; municipalityName?: string; reviewStarRating?: number | null;
  reviewComment?: string; companyComment?: string; closingOTP?: number | null;
  companyId?: number | null; companyName?: string;
  ticketImages?: TicketImage[] | null; ticketWorkImages?: TicketImage[] | null;
  // Add other fields returned by GetTicketsForCompany if needed
}
interface ApiDataItem { id: string; name: string; } // For SelectModal
interface CountyMaster { countyId: number; countyName: string; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string; countyId: number; }

// --- Colors ---
const COLORS = { /* ... Keep existing COLORS definition ... */
  background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
  borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC',
  statusCreated: '#007BFF', statusAccepted: '#28A745', statusInProgress: '#FFC107',
  statusCompleted: '#6C757D', statusDefault: '#6C757D',
  filterButtonBg: '#696969', // Example color for filter OK button
  filterButtonText: '#FFFFFF',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => { /* ... Keep existing formatDate ... */ if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleDateString('sv-SE'); } catch (error) { return 'Invalid Date'; } };
const getStatusColor = (status?: string): string => { /* ... Keep existing getStatusColor ... */ const lowerStatus = status?.toLowerCase() || ''; if (lowerStatus === 'created') return COLORS.statusCreated; if (lowerStatus === 'accepted') return COLORS.statusAccepted; if (lowerStatus === 'inprogress' || lowerStatus === 'in progress') return COLORS.statusInProgress; if (lowerStatus === 'completed') return COLORS.statusCompleted; return COLORS.statusDefault; };

// --- Booking Card Component (Used by both User & Partner) ---
interface BookingCardProps { item: Booking; onPress: (ticketId: number) => void; }
const BookingCard: React.FC<BookingCardProps> = React.memo(({ item, onPress }) => {
  const router = useRouter(); // Need router here if onPress is defined inline
  const statusColor = getStatusColor(item.status);
  const imageUrl = item.ticketImages?.[0]?.imagePath;
  const description = item.reportingDescription; // Get description
  const serviceName = item.toCraftmanType;

  return (
    // Using router.push directly here as requested in previous correction for simpler card component
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/bookings/${item.ticketId}`)}>
      <View style={styles.cardImageContainer}>
          {imageUrl ? ( <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" /> ) : ( <View style={styles.cardImagePlaceholder}><Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} /></View> )}
      </View>
      <View style={styles.cardDetails}>
            {/* Show description/title more prominently */}
            <Text style={styles.cardDescription} numberOfLines={1}>{description || 'No Description'}</Text>
            <Text style={styles.cardService} numberOfLines={1}>{serviceName || 'N/A'}</Text>
            <Text style={styles.cardDate} numberOfLines={1}>{formatDate(item.createdOn)}</Text>
      </View>
       <Text style={[styles.cardStatus, { color: statusColor }]}>{item.status || 'N/A'}</Text>
    </TouchableOpacity>
  );
});

// --- Filter Modal Component (for Partner) ---
interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyFilters: (filters: { status: string | null; countyId: string | null; municipalityId: string | null }) => void;
    initialFilters: { status: string | null; countyId: string | null; municipalityId: string | null };
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApplyFilters, initialFilters }) => {
    const [tempStatus, setTempStatus] = useState<string | null>(initialFilters.status);
    const [tempCountyId, setTempCountyId] = useState<string | null>(initialFilters.countyId);
    const [tempMunicipalityId, setTempMunicipalityId] = useState<string | null>(initialFilters.municipalityId);

    const [counties, setCounties] = useState<ApiDataItem[]>([]);
    const [municipalities, setMunicipalities] = useState<ApiDataItem[]>([]);
    const [isLoadingCounties, setIsLoadingCounties] = useState(false);
    const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);

    const jobStatuses: ApiDataItem[] = [
        { id: 'Created', name: 'Created (New Requests)' },
        { id: 'Accepted', name: 'Accepted' },
        { id: 'InProgress', name: 'In Progress' }, // Adjust value if API uses 'In Progress'
        { id: 'Completed', name: 'Completed' },
        { id: '', name: 'All Statuses' }, // Option to clear status filter
    ];

    // Fetch Counties
    useEffect(() => {
        if (!visible) return; // Don't fetch if not visible
        const fetchCounties = async () => {
            setIsLoadingCounties(true);
            const url = `${BASE_URL}/api/County/GetCountyList`;
            try {
                const response = await fetch(url);
                const data: CountyMaster[] = await response.json();
                setCounties(data.map(c => ({ id: c.countyId.toString(), name: c.countyName })));
            } catch (error) { console.error("FilterModal: County fetch failed:", error); }
            finally { setIsLoadingCounties(false); }
        };
        fetchCounties();
    }, [visible]); // Refetch when modal becomes visible

     // Fetch Municipalities based on selected County *within the modal*
    useEffect(() => {
        if (!tempCountyId) {
            setMunicipalities([]);
            // Don't clear tempMunicipalityId here, allow user to keep previous selection if county is cleared
            return;
        }
        const fetchMunicipalities = async () => {
            setIsLoadingMunicipalities(true);
            const url = `${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${tempCountyId}`;
            try {
                const response = await fetch(url);
                const data: MunicipalityMaster[] = await response.json();
                setMunicipalities(data.map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName })));
            } catch (error) { console.error("FilterModal: Municipality fetch failed:", error); setMunicipalities([]); } // Clear on error
            finally { setIsLoadingMunicipalities(false); }
        };
        fetchMunicipalities();
    }, [tempCountyId]);

    // Reset temp filters when modal opens
    useEffect(() => {
        if (visible) {
            setTempStatus(initialFilters.status);
            setTempCountyId(initialFilters.countyId);
            setTempMunicipalityId(initialFilters.municipalityId);
        }
    }, [visible, initialFilters]);


    const handleApply = () => {
        onApplyFilters({ status: tempStatus, countyId: tempCountyId, municipalityId: tempMunicipalityId });
        onClose();
    };

    // --- Helpers to get display names ---
    const getStatusName = (id: string | null) => jobStatuses.find(s => s.id === id)?.name || 'Select Status';
    const getCountyName = (id: string | null) => counties.find(c => c.id === id)?.name || 'Select County';
    const getMunicipalityName = (id: string | null) => municipalities.find(m => m.id === id)?.name || 'Select Municipality';

    // --- Modal state for selectors ---
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [isCountyModalVisible, setIsCountyModalVisible] = useState(false);
    const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState(false);

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.filterModalBackdrop}>
                <View style={styles.filterModalContent}>
                     <View style={styles.filterModalHeader}>
                        <Text style={styles.filterModalTitle}>Filter Jobs</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Status Selector */}
                    <TouchableOpacity style={styles.filterSelector} onPress={() => setIsStatusModalVisible(true)}>
                        <Text style={!tempStatus ? styles.filterPlaceholder : styles.filterValue}>
                            {getStatusName(tempStatus)}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* County Selector */}
                    <TouchableOpacity
                        style={styles.filterSelector}
                        onPress={() => !isLoadingCounties && setIsCountyModalVisible(true)}
                        disabled={isLoadingCounties}>
                         <Text style={!tempCountyId ? styles.filterPlaceholder : styles.filterValue}>
                            {isLoadingCounties ? 'Loading...' : getCountyName(tempCountyId)}
                         </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Municipality Selector */}
                     <TouchableOpacity
                        style={[styles.filterSelector, !tempCountyId && styles.filterSelectorDisabled]} // Disable if no county selected
                        onPress={() => !isLoadingMunicipalities && !!tempCountyId && setIsMunicipalityModalVisible(true)}
                        disabled={!tempCountyId || isLoadingMunicipalities}>
                         <Text style={!tempMunicipalityId ? styles.filterPlaceholder : styles.filterValue}>
                             {!tempCountyId ? 'Select County First' : isLoadingMunicipalities ? 'Loading...' : getMunicipalityName(tempMunicipalityId)}
                         </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterApplyButton} onPress={handleApply}>
                        <Text style={styles.filterApplyButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reusable Select Modals for Filters */}
             <SelectModal mode="single" visible={isStatusModalVisible} title="Select Status" data={jobStatuses} initialSelectedId={tempStatus} onClose={() => setIsStatusModalVisible(false)} onConfirmSingle={(id) => setTempStatus(id)} />
             <SelectModal mode="single" visible={isCountyModalVisible} title="Select County" data={counties} initialSelectedId={tempCountyId} onClose={() => setIsCountyModalVisible(false)} onConfirmSingle={(id) => {setTempCountyId(id); setTempMunicipalityId(null); /* Reset municipality on county change */} } />
             <SelectModal mode="single" visible={isMunicipalityModalVisible} title="Select Municipality" data={municipalities} initialSelectedId={tempMunicipalityId} onClose={() => setIsMunicipalityModalVisible(false)} onConfirmSingle={(id) => setTempMunicipalityId(id)} />

        </Modal>
    );
};


// --- Main Screen Component ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Partner Filter State ---
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ status: string | null; countyId: string | null; municipalityId: string | null }>({
      status: 'Created', // Default to show 'Created' jobs for partner
      countyId: null,
      municipalityId: null,
  });

  // --- Fetching Logic ---
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    if (!session) { if (showLoadingIndicator) setIsLoading(false); setIsRefreshing(false); router.replace('/login'); return; }

    let url = '';
    let headers: HeadersInit = { 'accept': 'text/plain' }; // Add headers if needed

    // Determine API call based on user type
    if (session.type === 'user') {
        if (!session.name) { /* Handle missing name */ setIsLoading(false); setIsRefreshing(false); return; }
        url = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?Username=${encodeURIComponent(session.name)}`;
    } else { // Partner
        if (!session.id) { /* Handle missing companyId */ setIsLoading(false); setIsRefreshing(false); return; }
        let params = new URLSearchParams({ CompanyId: session.id.toString() });
        if (activeFilters.status) params.append('Status', activeFilters.status);
        if (activeFilters.countyId) params.append('CountyId', activeFilters.countyId);
        if (activeFilters.municipalityId) params.append('MunicipalityId', activeFilters.municipalityId);
        url = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?${params.toString()}`;
    }

    console.log(`${session.type === 'user' ? 'User' : 'Partner'} Bookings: Fetching from ${url}`);
    if (showLoadingIndicator) setIsLoading(true);
    setError(null);

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed (${response.status}): ${errorText}`); }
        const data: Booking[] = await response.json();
        data.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
        setBookings(data);
    } catch (err: any) {
        console.error("Bookings: Fetch failed:", err); setError(`Failed to load: ${err.message}`); setBookings([]);
    } finally {
        if (showLoadingIndicator) setIsLoading(false); setIsRefreshing(false);
    }
  }, [session, router, activeFilters]); // Depend on filters for partners

  // Use useFocusEffect for both user types
  useFocusEffect(useCallback(() => { fetchData(bookings.length === 0); }, [fetchData, bookings.length]));
  // Refresh handler
  const handleRefresh = useCallback(() => { setIsRefreshing(true); fetchData(false); }, [fetchData]);
  // Filter apply handler (for partner)
  const handleApplyFilters = (newFilters: { status: string | null; countyId: string | null; municipalityId: string | null }) => {
      setActiveFilters(newFilters);
      // Refetch triggered by change in activeFilters dependency in fetchData's useCallback
  };


  // --- Render Logic ---
  const renderListContent = () => {
      if (isLoading && bookings.length === 0) { return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>; }
      if (error && bookings.length === 0) { return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>; }
      if (!isLoading && bookings.length === 0) {
          return (
            <ScrollView contentContainerStyle={styles.centered} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }>
                <Text style={styles.noDataText}>{session?.type === 'partner' ? 'No jobs match filters.' : 'You have no bookings yet.'}</Text>
                {session?.type === 'user' && (
                    <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}>
                        <Text style={styles.createButtonText}>Create New Job Request</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
          );
      }
      return (
          <FlatList
              data={bookings}
              renderItem={({ item }) => <BookingCard item={item} onPress={() => {}} />} // Navigation handled inside BookingCard now
              keyExtractor={(item) => item.ticketId.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }
          />
      );
  };

  // Main Screen Return
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          // Dynamic Title & Header based on user type
          title: session?.type === 'partner' ? 'Job Requests' : 'User Bookings',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
          // Add filter button for partners
          headerRight: session?.type === 'partner' ? () => (
              <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={{ marginRight: 15 }}>
                  <Ionicons name="filter" size={24} color={COLORS.headerText} />
              </TouchableOpacity>
          ) : undefined, // No filter button for users
        }}
      />
      {renderListContent()}

      {/* Render Filter Modal only for Partners */}
      {session?.type === 'partner' && (
          <FilterModal
              visible={isFilterModalVisible}
              onClose={() => setIsFilterModalVisible(false)}
              onApplyFilters={handleApplyFilters}
              initialFilters={activeFilters}
          />
      )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20, },
  createButton: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  listContainer: { paddingVertical: 15, paddingHorizontal: 10, },
  // Card styles (updated)
  card: { backgroundColor: COLORS.cardBg, borderRadius: 8, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.22, alignItems: 'center' /* Vertically center items */ },
  cardImageContainer: { width: 70, height: 70, // Smaller image for list view
       margin: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
  cardImage: { width: '100%', height: '100%', borderRadius: 8, },
  cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', borderRadius: 8,},
  cardDetails: { flex: 1, paddingVertical: 10, paddingLeft: 0, paddingRight: 10, /* Remove left padding */ justifyContent: 'center', },
  cardDescription: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4, }, // Use description as main text
  cardService: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, }, // Service type smaller
  cardDate: { fontSize: 12, color: COLORS.textSecondary, },
  cardStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 10, /* Add padding to not touch edge */ textAlign: 'right', }, // Status aligned right

  // Filter Modal Styles
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
});