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
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n';
import * as SecureStore from 'expo-secure-store';

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
    countyName: string | null;
}
interface PartnerMunicipality {
    municipalityId: number;
    municipalityName: string | null;
    countyId: number;
    countyName?: string;
}
interface PartnerProfileData {
    countyList?: PartnerCounty[] | null;
    municipalityList?: PartnerMunicipality[] | null;
}
interface ApiDataItem {
    id: string;
    name: string | null;
}
type ActiveFilterType = {
    status: string | null;
    countyId: string | null;
    municipalityId: string | null;
};

// --- Constants ---
const ALL_STATUSES_FILTER_ID = '';
const PARTNER_PROFILE_CACHE_KEY_PREFIX = 'partnerProfileCache_';
const CACHE_EXPIRY_DURATION = 1000 * 60 * 60; // 1 hour

// --- Colors ---
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
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    selectorBg: '#FFFFFF',
    selectorBorder: '#E0E0E0',
    selectorDisabledBg: '#F0F0F0',
    placeholderText: '#AAAAAA',
    errorTextSmallColor: '#D9534F',
    resetButtonBg: '#EFEFEF',
    resetButtonText: '#555555',
    loadingOverlayBg: 'rgba(248, 248, 248, 0.75)',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('sv-SE');
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
          {description || t('no_description')}
        </Text>
        <Text style={styles.cardService} numberOfLines={1}>
          {serviceName || t('not_available')}
        </Text>
        <Text style={styles.cardDate} numberOfLines={1}>
          {formatDate(item.createdOn)}
        </Text>
      </View>
      <Text style={[styles.cardStatus, { color: statusColor }]}>
        {item.status || t('not_available')}
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
    const [tempStatus, setTempStatus] = useState<string | null>(initialFilters.status);
    const [tempCountyId, setTempCountyId] = useState<string | null>(initialFilters.countyId);
    const [tempMunicipalityId, setTempMunicipalityId] = useState<string | null>(initialFilters.municipalityId);
    const [municipalitiesForSelectedCounty, setMunicipalitiesForSelectedCounty] = useState<ApiDataItem[]>([]);
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [isCountyModalVisible, setIsCountyModalVisible] = useState(false);
    const [isMunicipalityModalVisible, setIsMunicipalityModalVisible] = useState(false);

    const jobStatuses: ApiDataItem[] = useMemo(() => [
      { id: 'Created', name: t('status_created') },
      { id: 'Accepted', name: t('status_accepted') },
      { id: 'InProgress', name: t('status_in_progress') },
      { id: 'Completed', name: t('status_completed') },
      { id: ALL_STATUSES_FILTER_ID, name: t('all_statuses') },
    ], []);

    useEffect(() => {
       if (visible) {
           console.log("FilterModal: Visibility/initialFilters changed. Resetting temp state.", initialFilters);
           setTempStatus(initialFilters.status);
           setTempCountyId(initialFilters.countyId);
           setTempMunicipalityId(initialFilters.municipalityId);
       }
    }, [visible, initialFilters]);

    useEffect(() => {
      console.log(`FilterModal (MuniEffect): Triggered. tempCountyId: ${tempCountyId}, supportedMunicipalities count: ${supportedMunicipalities?.length}`);

      if (tempCountyId && supportedMunicipalities && supportedMunicipalities.length > 0) {
        const selectedCountyNum = parseInt(tempCountyId, 10);
        
        if (isNaN(selectedCountyNum)) {
            console.error("FilterModal (MuniEffect): tempCountyId is not a valid number string:", tempCountyId);
            setMunicipalitiesForSelectedCounty([]);
            if (tempMunicipalityId !== null) setTempMunicipalityId(null);
            return;
        }

        const filtered = supportedMunicipalities
            .filter(m => m.countyId === selectedCountyNum)
            .map(m => ({ id: m.municipalityId.toString(), name: m.municipalityName || `Municipality ${m.municipalityId}` })); // Added fallback name
        
        console.log(`FilterModal (MuniEffect): Filtered municipalities for countyId ${tempCountyId} (${selectedCountyNum}):`, filtered.length > 0 ? filtered : "No municipalities found.");
        setMunicipalitiesForSelectedCounty(filtered);

        if (tempMunicipalityId !== null) {
            const currentMuniIdIsValid = filtered.some(m => m.id === tempMunicipalityId);
            if (!currentMuniIdIsValid) {
               console.log(`FilterModal (MuniEffect): Resetting tempMunicipalityId ('${tempMunicipalityId}') as it's no longer valid for county '${tempCountyId}'.`);
               setTempMunicipalityId(null);
            }
        }
      } else {
        console.log("FilterModal (MuniEffect): Clearing municipalitiesForSelectedCounty (no tempCountyId or empty/no supportedMunicipalities).");
        setMunicipalitiesForSelectedCounty([]);
        if (!tempCountyId && tempMunicipalityId !== null) {
             console.log("FilterModal (MuniEffect): Resetting tempMunicipalityId as tempCountyId is now null.");
            setTempMunicipalityId(null);
        }
      }
    }, [tempCountyId, supportedMunicipalities]);


    const handleApply = () => {
      console.log("FilterModal: Apply clicked.", {tempStatus, tempCountyId, tempMunicipalityId});
      const filtersToApply: ActiveFilterType = {
          status: tempStatus,
          countyId: isUserView ? null : tempCountyId,
          municipalityId: isUserView ? null : tempMunicipalityId
      };
      onApplyFilters(filtersToApply);
      onClose();
    };

    const handleReset = () => {
        console.log("FilterModal: Reset clicked.");
        setTempStatus(ALL_STATUSES_FILTER_ID);
        setTempCountyId(null);
        setTempMunicipalityId(null);
        // setMunicipalitiesForSelectedCounty([]); // This will be handled by the useEffect when tempCountyId becomes null

        onApplyFilters({
            status: ALL_STATUSES_FILTER_ID,
            countyId: null,
            municipalityId: null
        });
        onClose(); 
    };
    
    const handleCountySelected = (selectedCountyId: string | null) => {
        console.log("FilterModal: County selected via modal:", selectedCountyId);
        if (tempCountyId !== selectedCountyId) { // Only reset municipality if county actually changed
            console.log("FilterModal: County changed, resetting tempMunicipalityId.");
            setTempMunicipalityId(null);
        }
        setTempCountyId(selectedCountyId);
    };

    const handleMunicipalitySelected = (selectedMuniId: string | null) => {
        console.log("FilterModal: Municipality selected via modal:", selectedMuniId);
        setTempMunicipalityId(selectedMuniId);
    };

    const getStatusName = (id: string | null) => jobStatuses.find(s => s.id === id)?.name || t('select_status');
    const getCountyName = (id: string | null) => supportedCounties.find(c => c.id === id)?.name || countyPlaceholder; // Use countyPlaceholder directly
    
    const getMunicipalityName = (id: string | null) => {
        // Use municipalitiesForSelectedCounty for the current display name
        const muni = municipalitiesForSelectedCounty.find(m => m.id === id);
        return muni?.name || municipalityPlaceholder; // Use municipalityPlaceholder
    };
    
    const isCountyDisabled = isLoadingProfile || !!profileError || supportedCounties.length === 0;
    const countyPlaceholder = isLoadingProfile ? t('loading_profile') : profileError ? t('error_loading_profile') : supportedCounties.length === 0 ? t('no_supported_counties') : t('select_county');
    
    const isMunicipalityDisabled = !tempCountyId || isLoadingProfile || !!profileError || (tempCountyId && municipalitiesForSelectedCounty.length === 0 && !isLoadingProfile && !profileError) ;
    const municipalityPlaceholder = !tempCountyId 
        ? t('select_county_first') 
        : (isLoadingProfile && tempCountyId && !profileError) 
            ? t('loading') // Show generic loading if county is selected but profile data (which includes municipalities) is still loading
            : profileError
                ? t('error_loading_profile') 
                : (municipalitiesForSelectedCounty.length === 0 && tempCountyId) // County selected, no error, profile loaded, but no munis
                    ? t('no_supported_municipalities') 
                    : t('select_municipality');


    return (
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.filterModalBackdrop}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{t('filter_jobs')}</Text>
              <TouchableOpacity onPress={onClose}  style={styles.closeButton}>
                 <Ionicons name="close" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.filterSelector}
              onPress={() => setIsStatusModalVisible(true)}
            >
              <Text style={tempStatus === null || tempStatus === ALL_STATUSES_FILTER_ID ? styles.filterPlaceholder : styles.filterValue}>
                {getStatusName(tempStatus)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {!isUserView && (
              <>
                <TouchableOpacity
                  style={[styles.filterSelector, isCountyDisabled && styles.filterSelectorDisabled]}
                  onPress={() => !isCountyDisabled && setIsCountyModalVisible(true)}
                  disabled={isCountyDisabled}
                >
                  <Text style={!tempCountyId ? styles.filterPlaceholder : styles.filterValue}>
                    {getCountyName(tempCountyId)}
                  </Text>
                  {(isLoadingProfile && !profileError) ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> :
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  }
                </TouchableOpacity>
                {profileError && <Text style={styles.filterErrorText}>{profileError}</Text>}
                <TouchableOpacity
                  style={[styles.filterSelector, isMunicipalityDisabled && styles.filterSelectorDisabled]}
                  onPress={() => !isMunicipalityDisabled && setIsMunicipalityModalVisible(true)}
                  disabled={Boolean(isMunicipalityDisabled)}
                >
                  <Text style={!tempMunicipalityId ? styles.filterPlaceholder : styles.filterValue}>
                    {getMunicipalityName(tempMunicipalityId)}
                  </Text>
                  {(isLoadingProfile && tempCountyId && !profileError && municipalitiesForSelectedCounty.length === 0) ? <ActivityIndicator size="small" color={COLORS.textSecondary}/> :
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  }
                </TouchableOpacity>
              </>
            )}
            <View style={styles.filterActionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.filterModalButton, styles.filterResetButton]}
                    onPress={handleReset}
                 >
                    <Text style={styles.filterResetButtonText}>{t('reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterModalButton, styles.filterApplyButton]}
                    onPress={handleApply}
                >
                    <Text style={styles.filterApplyButtonText}>{t('ok')}</Text>
                </TouchableOpacity>
            </View>
          </View>
         </View>
        <SelectModal
          mode="single"
          visible={isStatusModalVisible}
          title={t('select_status')}
          data={jobStatuses}
          initialSelectedId={tempStatus}
          onClose={() => setIsStatusModalVisible(false)}
          onConfirmSingle={(id) => setTempStatus(id)}
        />
        {!isUserView && (
          <>
            <SelectModal
              mode="single"
              visible={isCountyModalVisible}
              title={t('select_county')}
              data={supportedCounties}
              initialSelectedId={tempCountyId}
              onClose={() => setIsCountyModalVisible(false)}
              onConfirmSingle={handleCountySelected}
            />
            <SelectModal
              mode="single"
              visible={isMunicipalityModalVisible}
              title={t('select_municipality')}
              data={municipalitiesForSelectedCounty}
              initialSelectedId={tempMunicipalityId}
              onClose={() => setIsMunicipalityModalVisible(false)}
              onConfirmSingle={handleMunicipalitySelected}
            />
          </>
        )}
      </Modal>
    );
};

// --- Main BookingsScreen Component ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isFetchingBookings, setIsFetchingBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [partnerProfileData, setPartnerProfileData] = useState<PartnerProfileData | null>(null);
  const [isFetchingPartnerProfileForFilters, setIsFetchingPartnerProfileForFilters] = useState<boolean>(false);
  const [partnerProfileError, setPartnerProfileError] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  const defaultFilters: ActiveFilterType = useMemo(() => ({
      status: ALL_STATUSES_FILTER_ID,
      countyId: null,
      municipalityId: null,
  }), []);
  const [activeFilters, setActiveFilters] = useState<ActiveFilterType>(defaultFilters);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const fetchPartnerProfile = useCallback(async (forceNetwork = false) => {
    if (!session || !session.email || session.type !== 'partner') {
        setPartnerProfileData(null);
        setIsFetchingPartnerProfileForFilters(false);
        setPartnerProfileError(null);
        console.log("BookingsScreen/fetchPartnerProfile: Skipping, no valid partner session.");
        return;
    }

    const sanitizedEmailForKey = session.email.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cacheKey = `${PARTNER_PROFILE_CACHE_KEY_PREFIX}${sanitizedEmailForKey}`;

    if (!forceNetwork) {
        try {
            const cachedItem = await SecureStore.getItemAsync(cacheKey);
            if (cachedItem) {
                const { data, timestamp } = JSON.parse(cachedItem);
                if (data && timestamp && (Date.now() - timestamp < CACHE_EXPIRY_DURATION)) {
                    console.log("BookingsScreen/fetchPartnerProfile: Using cached partner profile. Key:", cacheKey);
                    setPartnerProfileData(data);
                    setIsFetchingPartnerProfileForFilters(false);
                    return; 
                } else {
                    console.log("BookingsScreen/fetchPartnerProfile: Cache expired/invalid. Key:", cacheKey);
                    await SecureStore.deleteItemAsync(cacheKey);
                }
            } else {
                 console.log("BookingsScreen/fetchPartnerProfile: No cache found. Key:", cacheKey);
            }
        } catch (e) {
            console.error("BookingsScreen/fetchPartnerProfile: Error reading cache. Key:", cacheKey, e);
        }
    }

    console.log(`BookingsScreen/fetchPartnerProfile: ${forceNetwork ? "Force fetching from network." : "Fetching from network (no valid cache)."} Key:`, cacheKey);
    setIsFetchingPartnerProfileForFilters(true);
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
        await SecureStore.setItemAsync(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        console.log("BookingsScreen/fetchPartnerProfile: Fetched and cached. Key:", cacheKey);
    } catch (err: any) {
        console.error("BookingsScreen/fetchPartnerProfile: Failed to load. Key:", cacheKey, err);
        setPartnerProfileError(`Profile Error: ${err.message}`);
        setPartnerProfileData(null);
    } finally {
        setIsFetchingPartnerProfileForFilters(false);
    }
  }, [session]);

  const fetchData = useCallback(async (isInitialLoadOrRefresh = true) => {
    if (isAuthLoading || !session) {
        setBookings([]); setError(null);
        if (!session && !isAuthLoading) {
            setIsFetchingBookings(false);
            setIsRefreshing(false);
            setIsApplyingFilters(false);
        }
        return;
    }

    if (isInitialLoadOrRefresh && !isApplyingFilters) {
        console.log("BookingsScreen/fetchData: Setting isFetchingBookings = true (initial/refresh)");
        setIsFetchingBookings(true);
    }
    setError(null);

    const currentFilters = activeFilters;
    const headers: HeadersInit = { 'accept': 'text/plain' };
    let url: string;

    if (session.type === 'user') {
        if (!session.id) { 
            setError("User ID not found."); 
            setIsFetchingBookings(false); setIsRefreshing(false); setIsApplyingFilters(false); 
            return; 
        }
        let userUrl = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?UserId=${session.id}`;
        if (currentFilters.status && currentFilters.status !== ALL_STATUSES_FILTER_ID) {
          userUrl += `&Status=${currentFilters.status}`;
        }
        url = userUrl;
    } else {
        if (!session.id) { 
            setError("Partner ID not found."); 
            setIsFetchingBookings(false); setIsRefreshing(false); setIsApplyingFilters(false); 
            return; 
        }
        const params = new URLSearchParams();
        params.append('CompanyId', session.id.toString());
        if (currentFilters.countyId !== null) { params.append('CountyId', currentFilters.countyId); }
        if (currentFilters.municipalityId !== null) { params.append('MunicipalityId', currentFilters.municipalityId); }
        const isFetchingAllStatuses = currentFilters.status === ALL_STATUSES_FILTER_ID || currentFilters.status === null;
        if (!isFetchingAllStatuses && currentFilters.status) {
            params.append('Status', currentFilters.status);
        }
        url = `${BASE_URL}/api/IssueTicket/GetTicketsForCompany?${params.toString()}`;
    }

    try {
        console.log(`BookingsScreen/fetchData: Executing fetch: ${url}`);
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            const fetchType = session.type === 'user' ? 'User' : 'Partner';
            console.error(`BookingsScreen/fetchData: ${fetchType} fetch failed (${response.status}): ${errorText}`);
            throw new Error(`${fetchType} fetch failed (${response.status}): ${errorText}`);
        }
        const fetchedBookings: Booking[] = await response.json();
        fetchedBookings.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
        setBookings(fetchedBookings);
        setError(null);
        console.log(`BookingsScreen/fetchData: Fetched ${fetchedBookings.length} bookings successfully.`);
    } catch (err: any) {
        console.error("BookingsScreen/fetchData: Error during booking fetch:", err);
        setError(err.message || `Failed to load bookings`);
        if (!isApplyingFilters) {
            setBookings([]);
        }
    } finally {
        if (isInitialLoadOrRefresh) {
            setIsFetchingBookings(false);
        }
        setIsRefreshing(false);
        setIsApplyingFilters(false);
        console.log("BookingsScreen/fetchData: Fetch finished. isFetchingBookings:", isFetchingBookings, "isApplyingFilters:", isApplyingFilters);
    }
  }, [session, isAuthLoading, activeFilters, isApplyingFilters]);

  useEffect(() => {
    if (!isAuthLoading && session && !isApplyingFilters) { // Added !isApplyingFilters to prevent loop if activeFilters is object
         // Check if activeFilters truly changed if it's an object. For primitive parts, direct compare is fine.
         // This effect is tricky if activeFilters is an object and its reference changes without value change.
         // However, simple comparison or deep compare might be too much. Assuming new object for new filter state.
        const prevFiltersString = JSON.stringify(activeFiltersRef.current); // Need a ref for previous filters
        const currentFiltersString = JSON.stringify(activeFilters);
        if (prevFiltersString !== currentFiltersString) {
            console.log("BookingsScreen: activeFilters changed, setting isApplyingFilters=true and calling fetchData.", activeFilters);
            setIsApplyingFilters(true);
            fetchData(false); 
        }
        activeFiltersRef.current = activeFilters; // Update ref
    }
  }, [activeFilters]); // Removed session, isAuthLoading, fetchData

  // Ref for previous activeFilters
  const activeFiltersRef = React.useRef(activeFilters);
  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);


  useFocusEffect(
      useCallback(() => {
          if (!isAuthLoading && session) {
              console.log("BookingsScreen: Screen focused. isApplyingFilters:", isApplyingFilters);
              if (bookings.length === 0 && !isApplyingFilters) {
                  console.log("BookingsScreen: Initial fetch on focus (bookings empty, not applying filters).");
                  fetchData(true);
              }
              if (session?.type === 'partner') {
                   console.log("BookingsScreen: Fetching partner profile on focus.");
                   fetchPartnerProfile();
              } else {
                   setPartnerProfileData(null);
                   setIsFetchingPartnerProfileForFilters(false);
                   setPartnerProfileError(null);
              }
          }
      }, [isAuthLoading, session, bookings.length, isApplyingFilters, fetchPartnerProfile, fetchData])
  );

  const handleRefresh = useCallback(() => {
      if (!isAuthLoading && session) {
        console.log("BookingsScreen: Refresh triggered.");
        setIsRefreshing(true);
        fetchData(false); 
        if (session.type === 'partner') {
            fetchPartnerProfile(true); 
        }
      } else {
          setIsRefreshing(false);
      }
  }, [isAuthLoading, session, fetchPartnerProfile, fetchData]);

  const handleApplyFilters = useCallback((newFilters: ActiveFilterType) => {
      const filtersHaveChanged =
          newFilters.status !== activeFilters.status ||
          newFilters.countyId !== activeFilters.countyId ||
          newFilters.municipalityId !== activeFilters.municipalityId;

      if (filtersHaveChanged) {
            console.log("BookingsScreen: Applying new filters via handleApplyFilters:", newFilters);
            setActiveFilters(newFilters);
      } else {
          console.log("BookingsScreen: Filters did not change in handleApplyFilters.");
      }
      setIsFilterModalVisible(false);
  }, [activeFilters]);

  const formattedSupportedCounties = useMemo(() => {
      const uniqueCounties = new Map<number, string | null>();
      (partnerProfileData?.countyList || []).forEach(c => {
          if (c && typeof c.countyId === 'number' && typeof c.countyName === 'string') {
             if (!uniqueCounties.has(c.countyId)) {
                  uniqueCounties.set(c.countyId, c.countyName);
              }
          }
      });
      return Array.from(uniqueCounties.entries()).map(([id, name]) => ({ id: id.toString(), name: name }));
  }, [partnerProfileData?.countyList]);

  const partnerMunicipalities = partnerProfileData?.municipalityList || [];

  if (isAuthLoading) {
     return (
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('bookings') }} />
         <View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View>
       </SafeAreaView>
     );
   }
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

  const showInitialLoadingIndicator = isFetchingBookings && bookings.length === 0 && !isApplyingFilters;
  const displayError = (session?.type === 'partner' ? partnerProfileError : null) || error;

  const renderListContent = () => {
      if (showInitialLoadingIndicator && !displayError) {
          console.log("BookingsScreen/render: Showing initial loading indicator.");
          return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
      }
      if (displayError && bookings.length === 0 && !isFetchingBookings && !isApplyingFilters) {
          console.log("BookingsScreen/render: Showing error state (no bookings). Error:", displayError);
          return (<ScrollView contentContainerStyle={styles.centered} refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }><Text style={styles.errorText}>{displayError}</Text></ScrollView>);
      }
      if (!isFetchingBookings && !displayError && bookings.length === 0 && !isApplyingFilters) {
          console.log("BookingsScreen/render: Showing no data state.");
          return (
              <ScrollView
                  contentContainerStyle={styles.centered}
                  refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }
              >
                  <Text style={styles.noDataText}>{t('nobookingsfound')}</Text>
                  {session?.type === 'user' && (
                      <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}>
                          <Text style={styles.createButtonText}>{t('newjobrequest')}</Text>
                      </TouchableOpacity>
                  )}
              </ScrollView>
          );
      }
      
      console.log(`BookingsScreen/render: Rendering list. Bookings: ${bookings.length}, isApplyingFilters: ${isApplyingFilters}`);
      return (
          <View style={{ flex: 1 }}>
            {error && bookings.length > 0 && <Text style={styles.errorTextSmall}>{t('partialfetcherror', { error: error })}</Text>}
            { (bookings.length > 0 || isApplyingFilters) &&
                <FlatList
                    data={bookings}
                    renderItem={({ item }) => <BookingCard item={item} />}
                    keyExtractor={(item) => item.ticketId.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/> }
                />
            }
            {isApplyingFilters && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            )}
          </View>
       );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleAlign: 'center',
          headerTitle: t('bookings'),
          headerRight: () => (
            <TouchableOpacity onPress={() => {
                if (session?.type === 'partner' && !partnerProfileData && !partnerProfileError && !isFetchingPartnerProfileForFilters) {
                    console.log("BookingsScreen: Filter icon pressed, partner profile not loaded/loading, fetching now.");
                    fetchPartnerProfile();
                }
                setIsFilterModalVisible(true);
            }} style={{ marginRight: 15 }}>
              <Ionicons name="filter" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      {renderListContent()}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        supportedCounties={formattedSupportedCounties}
        supportedMunicipalities={partnerMunicipalities as PartnerMunicipality[]}
        isLoadingProfile={isFetchingPartnerProfileForFilters}
        profileError={partnerProfileError}
        isUserView={session?.type === 'user'}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
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
    listContainer: { paddingVertical: 15, paddingHorizontal: 10, flexGrow: 1 },
    card: { backgroundColor: COLORS.cardBg, borderRadius: 8, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.22, alignItems: 'center' },
    cardImageContainer: { width: 70, height: 70, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderColor, },
    cardImage: { width: '100%', height: '100%', borderRadius: 8, },
    cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.iconPlaceholder, justifyContent: 'center', alignItems: 'center', borderRadius: 8,},
    cardDetails: { flex: 1, paddingVertical: 10, paddingLeft: 0, paddingRight: 10, justifyContent: 'center', },
    cardDescription: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4, },
    cardService: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, },
    cardDate: { fontSize: 12, color: COLORS.textSecondary, },
    cardStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', paddingRight: 10, textAlign: 'right', },
    filterModalBackdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', alignItems: 'center', },
    filterModalContent: { width: '90%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 10, padding: 20, elevation: 5, },
    filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    filterModalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
    closeButton: { padding:5 }, // Added for easier tapping on the close icon
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.loadingOverlayBg,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});