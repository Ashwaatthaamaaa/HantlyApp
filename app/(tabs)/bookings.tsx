// File: app/(tabs)/bookings.tsx (WITH CLEAR BUTTON ADDED TO INLINE FilterModal)

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
  Modal // Keep standard Modal import for the FilterModal structure
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal'; // Keep this for sub-modals
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n'; // Import translation function

// --- Types ---
interface TicketImage {
    imageId?: number;
    ticketId?: number;
    imageName?: string | null;
    imagePath?: string | null;
    imageContentType?: string | null;
}
interface Booking {
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
    companyName?: string;
    ticketImages?: TicketImage[] | null;
    ticketWorkImages?: TicketImage[] | null;
}
interface PartnerCounty {
    countyId: number;
    countyName: string | null; // Allow null for consistency
}
interface PartnerMunicipality {
    municipalityId: number;
    municipalityName: string | null; // Allow null
    countyId: number;
    countyName?: string;
}
interface PartnerProfileData {
    countyList?: PartnerCounty[] | null;
    municipalityList?: PartnerMunicipality[] | null;
    // Add other fields if needed
}
interface ApiDataItem {
    id: string;
    name: string | null; // Allows null
}
type ActiveFilterType = {
    status: string | null;
    countyId: string | null;
    municipalityId: string | null;
};

// --- Constants ---
const ALL_STATUSES_FILTER_ID = ''; // Represents "All Statuses"
const FETCH_STATUSES = ['Created', 'Accepted', 'InProgress', 'Completed']; // Statuses to fetch for partners when 'All' is selected

// --- Colors --- (Ensure these match your theme)
const COLORS = {
    background: '#F8F8F8',
    textPrimary: '#333333',
    textSecondary: '#555555',
    accent: '#696969',
    headerBg: '#FFFFFF',
    headerText: '#333333',
    error: '#D9534F',
    borderColor: '#E0E0E0',
    cardBg: '#FFFFFF',
    iconPlaceholder: '#CCCCCC',
    buttonBg: '#696969',
    buttonText: '#FFFFFF',
    statusCreated: '#007BFF',
    statusAccepted: '#28A745',
    statusInProgress: '#FFC107',
    statusCompleted: '#6C757D',
    statusDefault: '#6C757D',
    filterButtonBg: '#696969',
    filterButtonText: '#FFFFFF',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    selectorBg: '#FFFFFF',
    selectorBorder: '#E0E0E0',
    selectorDisabledBg: '#F0F0F0',
    placeholderText: '#AAAAAA',
    errorTextSmallColor: '#D9534F', // Specific color for small error text
    resetButtonBg: '#EFEFEF', // Background for Reset button
    resetButtonText: '#555555', // Text color for Reset button
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('sv-SE'); // Use appropriate locale
    } catch (error) {
        return 'Invalid Date';
    }
};
const getStatusColor = (status?: string): string => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'created') return COLORS.statusCreated;
    if (lowerStatus === 'accepted') return COLORS.statusAccepted;
    if (lowerStatus === 'inprogress' || lowerStatus === 'in progress') return COLORS.statusInProgress;
    if (lowerStatus === 'completed') return COLORS.statusCompleted;
    return COLORS.statusDefault;
};

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
      {/* Image Container */}
      <View style={styles.cardImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} />
          </View>
        )}
      </View>
      {/* Details Container */}
      <View style={styles.cardDetails}>
        <Text style={styles.cardDescription} numberOfLines={1}>
          {description || t('no_description')}
        </Text>
        <Text style={styles.cardService} numberOfLines={1}>
          {serviceName || t('not_available')}
        </Text>
        <Text style={styles.cardDate} numberOfLines={1}>
          {formatDate(item.createdOn)}
        </Text>
      </View>
      {/* Status Text */}
      <Text style={[styles.cardStatus, { color: statusColor }]}>
        {item.status || t('not_available')}
      </Text>
    </TouchableOpacity>
  );
});


// --- Filter Modal Component (Inline Definition - With Reset Button) ---
interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyFilters: (filters: ActiveFilterType) => void; // Callback to apply
    initialFilters: ActiveFilterType; // Current actual filters
    supportedCounties: ApiDataItem[];
    supportedMunicipalities: PartnerMunicipality[];
    isLoadingProfile: boolean;
    profileError: string | null;
    isUserView?: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApplyFilters,
    initialFilters,
    supportedCounties,
    supportedMunicipalities,
    isLoadingProfile,
    profileError,
    isUserView = false
}) => {
    // Temporary state within the modal to hold selections before applying
    const [tempStatus, setTempStatus] = useState<string | null>(initialFilters.status);
    const [tempCountyId, setTempCountyId] = useState<string | null>(initialFilters.countyId);
    const [tempMunicipalityId, setTempMunicipalityId] = useState<string | null>(initialFilters.municipalityId);
    // State to hold the list of municipalities filtered by the selected county
    const [municipalitiesForSelectedCounty, setMunicipalitiesForSelectedCounty] = useState<ApiDataItem[]>([]);

    // State to control visibility of nested selection modals
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [isCountyModalVisible, setIsCountyModalVisible] = useState(false);
    const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState(false);

    // Available job statuses for the filter
    const jobStatuses: ApiDataItem[] = useMemo(() => [ // Use useMemo if translations could change
      { id: 'Created', name: t('status_created') },
      { id: 'Accepted', name: t('status_accepted') },
      { id: 'InProgress', name: t('status_in_progress') },
      { id: 'Completed', name: t('status_completed') },
      { id: ALL_STATUSES_FILTER_ID, name: t('all_statuses') }, // "All" option
    ], []); // Empty dependency array means this runs once

    // Effect to filter municipalities when the temporary county selection changes
    useEffect(() => {
      if (tempCountyId && supportedMunicipalities) {
        const selectedCountyNum = parseInt(tempCountyId, 10);
        // Filter the supported municipalities based on the selected county ID
        const filtered = supportedMunicipalities
            .filter(m => m.countyId === selectedCountyNum)
            .map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName })); // Map to ApiDataItem format
        setMunicipalitiesForSelectedCounty(filtered);
        // Check if the currently selected municipality is still valid within the new list
        const currentMuniIdIsValid = filtered.some(m => m.id === tempMunicipalityId);
        // If not valid (e.g., county changed), deselect the municipality
        if (!currentMuniIdIsValid) {
            setTempMunicipalityId(null);
        }
      } else {
        // If no county is selected, clear the municipality list and selection
        setMunicipalitiesForSelectedCounty([]);
        if (!tempCountyId) { // Ensure municipality is cleared only if county is cleared
            setTempMunicipalityId(null);
        }
      }
      // This effect depends on the temporary county ID and the list of supported municipalities
    }, [tempCountyId, supportedMunicipalities]);

    // Effect to reset the temporary filter state when the modal becomes visible
    useEffect(() => {
       if (visible) {
           // Reset temporary state to match the actual active filters from the parent
           setTempStatus(initialFilters.status);
           setTempCountyId(initialFilters.countyId);
           setTempMunicipalityId(initialFilters.municipalityId);
       }
       // No 'else' needed, state persists while hidden
    }, [visible, initialFilters]); // Run when visibility or initial filters change

    // Handler for the "OK" (Apply) button
    const handleApply = () => {
      // Prepare the filter object to be sent back to the parent
      const filtersToApply: ActiveFilterType = {
          status: tempStatus,
          // For users, location filters are ignored (set to null)
          countyId: isUserView ? null : tempCountyId,
          municipalityId: isUserView ? null : tempMunicipalityId
      };
      // Call the parent's callback function to apply the filters
      onApplyFilters(filtersToApply);
      onClose(); // Close the modal
    };

    // Handler for the "Reset" button
    const handleReset = () => {
        // Reset temporary state within the modal to defaults
        setTempStatus(ALL_STATUSES_FILTER_ID);
        setTempCountyId(null);
        setTempMunicipalityId(null);
        setMunicipalitiesForSelectedCounty([]); // Clear derived state as well

        // Immediately apply the default/reset filters by calling the parent's callback
        onApplyFilters({
            status: ALL_STATUSES_FILTER_ID,
            countyId: null,
            municipalityId: null
        });
        onClose(); // Close the modal
    };

    // Helper functions to get display names for the selected temporary IDs
    const getStatusName = (id: string | null) => jobStatuses.find(s => s.id === id)?.name || t('select_status');
    const getCountyName = (id: string | null) => supportedCounties.find(c => c.id === id)?.name || t('select_county');
    const getMunicipalityName = (id: string | null) => municipalitiesForSelectedCounty.find(m => m.id === id)?.name || t('select_municipality');

    // Determine if selectors should be disabled based on loading/error states
    const isCountyDisabled = isLoadingProfile || !!profileError || supportedCounties.length === 0;
    const countyPlaceholder = isLoadingProfile ? t('loading_profile') : profileError ? t('error_loading_profile') : supportedCounties.length === 0 ? t('no_supported_counties') : t('select_county');
    const isMunicipalityDisabled = !tempCountyId || isLoadingProfile || !!profileError || municipalitiesForSelectedCounty.length === 0;
    const municipalityPlaceholder = !tempCountyId ? t('select_county_first') : (isLoadingProfile || !!profileError) ? '...' : municipalitiesForSelectedCounty.length === 0 ? t('no_supported_municipalities') : t('select_municipality');

    // JSX for the Filter Modal
    return (
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.filterModalBackdrop}>
          <View style={styles.filterModalContent}>
            {/* Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{t('filter_jobs')}</Text>
              <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Status Selector */}
            <TouchableOpacity
              style={styles.filterSelector}
              onPress={() => setIsStatusModalVisible(true)} // Opens the nested SelectModal
            >
              <Text style={tempStatus === null || tempStatus === ALL_STATUSES_FILTER_ID ? styles.filterPlaceholder : styles.filterValue}>
                {getStatusName(tempStatus)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* County & Municipality Selectors (Only shown for Partners) */}
            {!isUserView && (
              <>
                {/* County Selector */}
                <TouchableOpacity
                  style={[styles.filterSelector, isCountyDisabled && styles.filterSelectorDisabled]}
                  onPress={() => !isCountyDisabled && setIsCountyModalVisible(true)}
                  disabled={isCountyDisabled}
                >
                  <Text style={!tempCountyId ? styles.filterPlaceholder : styles.filterValue}>
                    {isLoadingProfile ? t('loading') : profileError ? t('error_profile') : getCountyName(tempCountyId) || countyPlaceholder}
                  </Text>
                  {isLoadingProfile ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> :
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  }
                </TouchableOpacity>
                {/* Display profile loading error if any */}
                {profileError && <Text style={styles.filterErrorText}>{profileError}</Text>}

                {/* Municipality Selector */}
                <TouchableOpacity
                  style={[styles.filterSelector, isMunicipalityDisabled && styles.filterSelectorDisabled]}
                  onPress={() => !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)}
                  disabled={isMunicipalityDisabled}
                >
                  <Text style={!tempMunicipalityId ? styles.filterPlaceholder : styles.filterValue}>
                    {getMunicipalityName(tempMunicipalityId) || municipalityPlaceholder}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            {/* Action Buttons (Reset and Apply/OK) */}
            <View style={styles.filterActionButtonsContainer}>
                {/* Reset Button */}
                <TouchableOpacity
                    style={[styles.filterModalButton, styles.filterResetButton]}
                    onPress={handleReset}
                >
                    <Text style={styles.filterResetButtonText}>{t('reset')}</Text>
                </TouchableOpacity>
                {/* Apply Button */}
                <TouchableOpacity
                    style={[styles.filterModalButton, styles.filterApplyButton]}
                    onPress={handleApply}
                >
                    <Text style={styles.filterApplyButtonText}>{t('ok')}</Text>
                </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Nested SelectModals for Status, County, Municipality */}
        <SelectModal
          mode="single"
          visible={isStatusModalVisible}
          title={t('select_status')}
          data={jobStatuses}
          initialSelectedId={tempStatus}
          onClose={() => setIsStatusModalVisible(false)}
          onConfirmSingle={(id) => setTempStatus(id)} // Update temporary state
        />

        {!isUserView && ( // Only render these for partners
          <>
            <SelectModal
              mode="single"
              visible={isCountyModalVisible}
              title={t('select_county')}
              data={supportedCounties}
              initialSelectedId={tempCountyId}
              onClose={() => setIsCountyModalVisible(false)}
              onConfirmSingle={(id) => setTempCountyId(id) } // Update temporary state
            />
            <SelectModal
              mode="single"
              visible={isMunicipalityModalVisible}
              title={t('select_municipality')}
              data={municipalitiesForSelectedCounty} // Use the filtered list
              initialSelectedId={tempMunicipalityId}
              onClose={() => setIsMunicipalityModalVisible(false)}
              onConfirmSingle={(id) => setTempMunicipalityId(id)} // Update temporary state
            />
          </>
        )}
      </Modal>
    );
};
// --- END Filter Modal ---


// --- Main BookingsScreen Component ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth(); // Auth context
  const [bookings, setBookings] = useState<Booking[]>([]); // List of bookings
  const [isLoadingData, setIsLoadingData] = useState(false); // Loading state for fetching bookings
  const [error, setError] = useState<string | null>(null); // Error state for fetching bookings
  const [isRefreshing, setIsRefreshing] = useState(false); // State for pull-to-refresh

  // State for partner-specific profile data (counties, municipalities)
  const [partnerProfileData, setPartnerProfileData] = useState<PartnerProfileData | null>(null);
  const [isLoadingPartnerProfile, setIsLoadingPartnerProfile] = useState<boolean>(false);
  const [partnerProfileError, setPartnerProfileError] = useState<string | null>(null);

  // State for the filter modal visibility
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Default/Initial filter state
  const defaultFilters: ActiveFilterType = useMemo(() => ({ // Use useMemo if defaults depend on something stable
      status: ALL_STATUSES_FILTER_ID, // Default to "All Statuses"
      countyId: null, // Default to no county filter
      municipalityId: null, // Default to no municipality filter
  }), []); // Empty dependency array means it's calculated once

  // State to hold the currently active filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilterType>(defaultFilters);

  // Function to fetch partner's profile details (counties, municipalities)
  const fetchPartnerProfile = useCallback(async () => {
      // Only fetch if it's a partner session
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
          const response = await fetch(detailUrl);
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed profile fetch (${response.status}): ${errorText}`);
          }
          const data: PartnerProfileData = await response.json();
          setPartnerProfileData(data);
      } catch (err: any) {
          console.error("BookingsScreen: Failed to load partner profile:", err);
          setPartnerProfileError(`Profile Error: ${err.message}`);
          setPartnerProfileData(null);
      } finally {
          setIsLoadingPartnerProfile(false);
      }
  }, [session]); // Re-run if session changes

  // Function to fetch bookings based on current active filters
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    // Don't fetch if auth is still loading or no session exists
    if (isAuthLoading || !session) {
        setBookings([]);
        setError(null);
        if (!session && !isAuthLoading) { // Ensure loading stops if logged out
            setIsLoadingData(false);
            setIsRefreshing(false);
        }
        return;
    }

    const currentFilters = activeFilters; // Use the current state
    if (showLoadingIndicator) setIsLoadingData(true); // Show loading indicator if requested
    setError(null); // Clear previous errors
    const headers: HeadersInit = { 'accept': 'text/plain' };
    let fetchPromises: Promise<Booking[]>[] = []; // Array to hold all fetch promises

    // --- User Fetch Logic ---
    if (session.type === 'user') {
        if (!session.id) {
            setError("User ID not found."); setIsLoadingData(false); setIsRefreshing(false); return;
        }
        // Construct URL for user bookings
        let url = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?UserId=${session.id}`;
        // Add status filter if not "All"
        if (currentFilters.status && currentFilters.status !== ALL_STATUSES_FILTER_ID) {
          url += `&Status=${currentFilters.status}`;
        }
        console.log(`User Bookings: Fetching jobs from ${url}`);
        // Add the fetch promise to the array
        fetchPromises.push(
          fetch(url, { headers })
            .then(async r => {
              if (!r.ok) { const et = await r.text(); throw new Error(`User fetch failed (${r.status}): ${et}`); }
              return r.json() as Promise<Booking[]>; // Parse JSON response
            })
            .catch(e => { // Handle errors for this specific fetch
              console.error("User fetch failed:", e);
              setError(p => p ? `${p}\n${e.message}` : e.message); // Append error message
              return []; // Return empty array on error
            })
        );
    }
    // --- Partner Fetch Logic ---
    else {
        if (!session.id) {
            setError("Partner ID not found."); setIsLoadingData(false); setIsRefreshing(false); return;
        }
        // Base parameters for partner fetch
        const baseParams = new URLSearchParams();
        baseParams.append('CompanyId', session.id.toString());
        // Add county and municipality filters if they are selected
        if (currentFilters.countyId !== null) { baseParams.append('CountyId', currentFilters.countyId); }
        if (currentFilters.municipalityId !== null) { baseParams.append('MunicipalityId', currentFilters.municipalityId); }

        // Determine which statuses to fetch
        const isFetchingAllStatuses = currentFilters.status === ALL_STATUSES_FILTER_ID || currentFilters.status === null;
        // If "All" is selected, fetch all predefined statuses; otherwise, fetch only the selected one
        const targetStatuses = isFetchingAllStatuses ? FETCH_STATUSES : (currentFilters.status ? [currentFilters.status] : []);

        console.log(`Partner Bookings: Fetching for statuses: [${targetStatuses.join(', ')}] with filters:`, currentFilters);

        // If no valid status is selected (and not fetching all), don't make API calls
        if (targetStatuses.length === 0 && !isFetchingAllStatuses) {
            console.warn("No valid status selected for specific fetch, skipping API calls.");
            setBookings([]); setIsLoadingData(false); setIsRefreshing(false); return;
        }

        // Create a fetch promise for each target status
        targetStatuses.forEach(status => {
             const statusParams = new URLSearchParams(baseParams); // Copy base params
             statusParams.append('Status', status); // Add the specific status
             const url = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?${statusParams.toString()}`;
             fetchPromises.push(
                 fetch(url, { headers })
                 .then(async response => {
                     if (!response.ok) {
                         const errorText = await response.text();
                         console.error(`Partner fetch failed for status '${status}' (${response.status}): ${errorText}`);
                         setError(prev => prev ? `${prev}\nFailed fetch for ${status}` : `Failed fetch for ${status}`);
                         return []; // Return empty array on error for this status
                     }
                     return response.json() as Promise<Booking[]>; // Parse JSON
                 })
                 .catch(err => { // Handle network errors
                     console.error(`Partner fetch network error for status '${status}':`, err);
                     setError(prev => prev ? `${prev}\nNetwork error for ${status}` : `Network error for ${status}`);
                     return []; // Return empty array on error
                 })
             );
        });
    }

    // --- Process all fetch promises ---
    try {
        const results = await Promise.all(fetchPromises); // Wait for all fetches to complete
        const fetchedBookings = results.flat(); // Combine results from all fetches
        // Sort bookings by creation date (newest first)
        fetchedBookings.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
        setBookings(fetchedBookings); // Update the bookings state

        // Clear the main error state only if some data was fetched successfully
        // OR if there was no error to begin with. This prevents clearing
        // an error message if all fetches failed but one returned empty.
        if (fetchedBookings.length > 0 || !error) {
            if (error) { console.warn("Partial fetch errors occurred, but showing results:", error); }
            setError(null); // Clear error if successful fetch or no prior error
        } else {
            // If fetches completed but bookings array is empty AND there was an error, keep the error.
             console.error("All ticket fetches failed or returned empty with errors:", error);
        }
    } catch (overallError: any) {
        // Catch any unexpected errors during Promise.all or sorting
        console.error("Overall ticket fetch error (unexpected):", overallError);
        setError(`Failed to load bookings: ${overallError.message}`);
        setBookings([]); // Clear bookings on major error
    } finally {
        // Stop loading indicators
        if (showLoadingIndicator) setIsLoadingData(false);
        setIsRefreshing(false);
    }
  }, [session, isAuthLoading, activeFilters]); // Dependencies: session, auth loading state, and active filters

  // Effect to fetch data when the screen gains focus or dependencies change
  useFocusEffect(
      useCallback(() => {
          if (!isAuthLoading) { // Only run if authentication is not loading
              console.log("Bookings screen focused or dependencies changed.");
              fetchData(bookings.length === 0); // Fetch bookings (show indicator only if list is empty)
              if (session?.type === 'partner') {
                   fetchPartnerProfile(); // Fetch partner profile if applicable
              } else {
                   // Clear partner profile data if the user is not a partner
                   setPartnerProfileData(null);
                   setIsLoadingPartnerProfile(false);
                   setPartnerProfileError(null);
              }
          }
      }, [fetchData, fetchPartnerProfile, isAuthLoading, bookings.length, session]) // Dependencies
  );

  // Handler for pull-to-refresh action
  const handleRefresh = useCallback(() => {
      if (!isAuthLoading && session) { // Only refresh if logged in and not auth loading
        setIsRefreshing(true); // Set refreshing state
        fetchData(false); // Refetch bookings without main loading indicator
        if (session.type === 'partner') {
            fetchPartnerProfile(); // Refetch partner profile
        }
      } else {
          setIsRefreshing(false); // Ensure refreshing stops if conditions not met
      }
  }, [fetchData, fetchPartnerProfile, isAuthLoading, session]); // Dependencies

  // Handler called by the FilterModal when filters are applied or reset
  const handleApplyFilters = useCallback((newFilters: ActiveFilterType) => {
      // Compare new filters with current active filters
      if (newFilters.status !== activeFilters.status ||
          newFilters.countyId !== activeFilters.countyId ||
          newFilters.municipalityId !== activeFilters.municipalityId)
      {
            // If filters changed, update the activeFilters state
            setActiveFilters(newFilters);
            setBookings([]); // Clear current bookings for immediate visual feedback
            // The useFocusEffect/fetchData will automatically refetch data because activeFilters changed
            console.log("Applied new filters:", newFilters);
      } else {
          // If filters didn't change, log it and do nothing
          console.log("Filters did not change.");
      }
      setIsFilterModalVisible(false); // Close the filter modal
  }, [activeFilters]); // Depend on current activeFilters to compare


  // Memoized formatting of partner counties for the SelectModal
  const formattedSupportedCounties = useMemo(() => {
      const uniqueCounties = new Map<number, string | null>();
      // Safely iterate over partner profile data
      (partnerProfileData?.countyList || []).forEach(c => {
          // Ensure county data is valid before adding
          if (c && typeof c.countyId === 'number' && typeof c.countyName === 'string') {
              if (!uniqueCounties.has(c.countyId)) {
                  uniqueCounties.set(c.countyId, c.countyName);
              }
          }
      });
      // Map the unique counties to the ApiDataItem format required by SelectModal
      return Array.from(uniqueCounties.entries()).map(([id, name]) => ({ id: id.toString(), name: name }));
  }, [partnerProfileData?.countyList]); // Recompute only when partner county list changes

  // Get the raw list of partner municipalities (used by the inline FilterModal)
  const partnerMunicipalities = partnerProfileData?.municipalityList || [];

  // --- Render Logic ---

  // Show loading indicator if authentication is still in progress
  if (isAuthLoading) {
     return (
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('bookings') }} />
         <View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View>
       </SafeAreaView>
     );
   }

   // Show logged-out message and login button if no session exists
   if (!session) {
     return (
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('bookings') }} />
         <View style={styles.containerCentered}>
           <Ionicons name="calendar-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} />
           <Text style={styles.loggedOutMessage}>{t('logincreateaccount')}</Text>
           <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
             <Text style={styles.loginButtonText}>{t('login')}</Text>
           </TouchableOpacity>
         </View>
       </SafeAreaView>
     );
   }

  // Determine overall loading state and any errors to display
  const isOverallLoading = isLoadingData || (session.type === 'partner' && isLoadingPartnerProfile);
  // Combine potential errors from profile loading and booking fetching
  const displayError = (session?.type === 'partner' ? partnerProfileError : null) || error;

  // Function to render the main content (list, empty state, or error)
  const renderListContent = () => {
      // Show main loading indicator if loading and list is empty without error
      if (isOverallLoading && bookings.length === 0 && !displayError) {
          return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
      }
      // Show error message if an error occurred and list is empty
      if (displayError && bookings.length === 0 && !isOverallLoading) {
           // Allow pull-to-refresh even on the error screen
          return (<ScrollView contentContainerStyle={styles.centered} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }><Text style={styles.errorText}>{displayError}</Text></ScrollView>);
      }
      // Show empty state message if not loading, no error, and list is empty
      if (!isOverallLoading && !displayError && bookings.length === 0) {
          return (
              <ScrollView
                  contentContainerStyle={styles.centered}
                  refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> } // Allow refresh on empty state
              >
                  <Text style={styles.noDataText}>{t('nobookingsfound')}</Text>
                  {/* Show "Create Job" button only for users */}
                  {session?.type === 'user' && (
                      <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}>
                          <Text style={styles.createButtonText}>{t('newjobrequest')}</Text>
                      </TouchableOpacity>
                  )}
              </ScrollView>
          );
      }
      // Otherwise, render the list of bookings
      return (
          <>
            {/* Display partial fetch errors discreetly if they occurred but some data loaded */}
            {error && <Text style={styles.errorTextSmall}>{t('partialfetcherror', { error: error })}</Text>}
            {/* The main list of bookings */}
            <FlatList
                data={bookings}
                renderItem={({ item }) => <BookingCard item={item} />} // Uses the memoized BookingCard
                keyExtractor={(item) => item.ticketId.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                // Enable pull-to-refresh
                refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }
            />
          </>
       );
  };

  // --- Final Render ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Stack Screen Configuration */}
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleAlign: 'center',
          headerTitle: t('bookings'),
          // Add Filter button to the header right
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={{ marginRight: 15 }}>
              <Ionicons name="filter" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      {/* Render the main content */}
      {renderListContent()}
      {/* Render the Filter Modal (controlled by isFilterModalVisible state) */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters} // Pass the handler to apply filters
        initialFilters={activeFilters} // Pass the current active filters
        supportedCounties={formattedSupportedCounties} // Pass formatted county list
        // Pass partner municipalities (ensure type matches or cast carefully)
        supportedMunicipalities={partnerMunicipalities as PartnerMunicipality[]}
        isLoadingProfile={isLoadingPartnerProfile} // Pass profile loading state
        profileError={partnerProfileError} // Pass profile error state
        isUserView={session?.type === 'user'} // Indicate if it's a user view
      />
    </SafeAreaView>
  );
}

// --- Styles --- (Complete Styles Object)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background, },
    centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
    containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, },
    loggedOutMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24, },
    loginButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', },
    loginButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
    errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', paddingHorizontal: 15 },
    errorTextSmall: { color: COLORS.errorTextSmallColor, fontSize: 12, textAlign: 'center', paddingHorizontal: 15, paddingBottom: 5 },
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
    // Filter Modal Styles
    filterModalBackdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', alignItems: 'center', },
    filterModalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, padding: 20, elevation: 5, },
    filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    filterModalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, },
    filterSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.selectorBg, borderWidth: 1, borderColor: COLORS.selectorBorder, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 15, },
    filterSelectorDisabled: { backgroundColor: COLORS.selectorDisabledBg, opacity: 0.7 },
    filterPlaceholder: { fontSize: 16, color: COLORS.placeholderText, flex: 1, marginRight: 10, },
    filterValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, marginRight: 10, },
    filterErrorText: { color: COLORS.errorTextSmallColor, fontSize: 12, marginTop: -10, marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5, },
    filterActionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    filterModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        minHeight: 46,
        justifyContent: 'center',
    },
    filterResetButton: {
        backgroundColor: COLORS.resetButtonBg,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    filterResetButtonText: {
        color: COLORS.resetButtonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    filterApplyButton: {
        backgroundColor: COLORS.buttonBg,
    },
    filterApplyButtonText: {
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// Add required translation keys if missing:
// nobookingsfound: "No bookings found matching your criteria."
// partialfetcherror: "Note: Some data might be missing due to fetch errors. {error}"
// reset: "Reset"
