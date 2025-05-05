// File: app/urgentJobList.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Keep useMemo
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from '@/constants/Api';
import i18n ,{ t} from '@/config/i18n'; // Keep i18n import for now
import ServiceFilterModal from '@/components/ServiceFilterModal';

// --- Types ---
interface ServiceMaster {
    serviceId: number;
    serviceName: string;
    serviceName_Swedish: string;
}
interface ApiDataItem { id: string; name: string | null; }
interface CompanyInfo {
    // ... (CompanyInfo interface remains the same)
    username: string | null; active: boolean; pCompId: number; mobileNumber: string | null;
    contactPerson: string | null; emailId: string | null; is24X7?: boolean | null;
    companyName: string | null; companyRegistrationNumber: string | null;
    companyPresentation: string | null; logoImagePath: string | null;
    logoImageContentType: string | null;
    serviceList?: { pCompId: number; serviceId: number; companyName: string; serviceName: string; }[] | null;
}
// --- Constants ---
const ALL_SERVICES_FILTER_ID = '';

// --- Colors ---
const COLORS = {
    // ... (COLORS object remains the same)
    background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555',
    accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
    borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC',
    retryButtonBg: '#696969', buttonText: '#FFFFFF',
    serviceSectionTitle: '#333333', serviceText: '#666666',
    viewMoreText: '#007AFF',
    filterButtonColor: '#696969',
    filterButtonBorder: '#CCCCCC',
    filterButtonBackground: '#FFFFFF',
};

export default function UrgentJobListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Filter State ---
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(ALL_SERVICES_FILTER_ID);

  // --- Service List State ---
  const [servicesList, setServicesList] = useState<ApiDataItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceFetchError, setServiceFetchError] = useState<string | null>(null);

  // *** FIX: Move useMemo hook before conditional returns ***
  const currentFilterName = useMemo(() => {
    // Find the service name based on the current selection
    const service = servicesList.find(s => s.id === selectedServiceId);
    // Default to 'All Services' translated text if not found or if ID matches ALL_SERVICES_FILTER_ID
    return service?.name || t('all_services');
  }, [selectedServiceId, servicesList]); // Dependencies: selection and the list itself


  // --- Fetch Services for Filter ---
  const fetchServicesForFilter = useCallback(async () => {
    setIsLoadingServices(true);
    setServiceFetchError(null);
    const url = `${BASE_URL}/api/Service/GetServiceList`;
    console.log("Fetching services for filter from:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Service list fetch failed (${response.status}): ${errorText}`);
        }
        const data: ServiceMaster[] = await response.json();

        // *** FIX: Get locale *inside* the function ***
        const currentLocale = i18n.locale;
        console.log("Current locale for service names:", currentLocale); // Log locale

        const formattedServices: ApiDataItem[] = data.map(service => ({
            id: service.serviceId.toString(),
            // Choose name based on locale retrieved *now*
            name: (currentLocale === 'sv' ? service.serviceName_Swedish : service.serviceName) || service.serviceName,
        }));
        setServicesList([
            { id: ALL_SERVICES_FILTER_ID, name: t('all_services') },
            ...formattedServices
        ]);
        console.log("Services fetched for filter:", formattedServices.length);
    } catch (err: any) {
        console.error("Error fetching services for filter:", err);
        setServiceFetchError(t('failedtoloadservices') + ` ${err.message}`);
        setServicesList([{ id: ALL_SERVICES_FILTER_ID, name: t('all_services') }]);
    } finally {
        setIsLoadingServices(false);
    }
  }, []); // Keep dependencies minimal for useCallback if i18n updates via separate mechanism

  useEffect(() => {
    fetchServicesForFilter();
  }, [fetchServicesForFilter]);

  // --- Fetch 24x7 Companies ---
  const fetchUrgentCompanies = useCallback(async (showLoadingIndicator = true) => {
    // ... (fetchUrgentCompanies function remains the same)
     if (!session || session.type !== 'user' || !session.id) { setError(t('accessdenied')); setIsLoading(false); setCompanies([]); return; }
     if (showLoadingIndicator) setIsLoading(true);
     setError(null);
     const userId = session.id;
     let url = `${BASE_URL}/api/Company/GetCompany24X7ForUser?userId=${userId}`;
     if (selectedServiceId && selectedServiceId !== ALL_SERVICES_FILTER_ID) { url += `&serviceId=${selectedServiceId}`; }
     console.log(`Workspaceing 24x7 companies from: ${url}`);
     try {
       const response = await fetch(url, { headers: { 'accept': 'text/plain' } });
       if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed fetch (${response.status}): ${errorText}`); }
       const responseText = await response.text();
       let data: CompanyInfo[] = [];
       try { data = JSON.parse(responseText); } catch (parseError) {
            console.error("Failed JSON parse:", parseError); console.log("Raw text:", responseText);
            if (responseText.trim() === '' || responseText.toLowerCase().includes("not found") || responseText.toLowerCase().includes("no companies")) { data = []; }
            else { throw new Error("Unexpected non-JSON response."); }
        }
       setCompanies(data);
     } catch (err: any) {
       console.error("Error fetching urgent companies:", err);
       setError(t('failedloadurgentcompanies', { message: err.message }));
       setCompanies([]);
     } finally { if (showLoadingIndicator) setIsLoading(false); }
  }, [session, selectedServiceId]);

  // --- Effect to fetch companies ---
  useFocusEffect(
    useCallback(() => {
      fetchUrgentCompanies(companies.length === 0);
    }, [fetchUrgentCompanies, companies.length])
  );

  // --- Filter Modal Handlers ---
  const handleOpenFilterModal = useCallback(() => {
      console.log("Filter button pressed. Opening modal...");
      fetchServicesForFilter(); // Fetch services again in case language changed
      setIsFilterModalVisible(true);
  }, [fetchServicesForFilter]);

  const handleApplyFilter = useCallback((serviceId: string | null) => {
      const newServiceId = serviceId ?? ALL_SERVICES_FILTER_ID;
      if (newServiceId !== selectedServiceId) {
        console.log("Applying filter from modal:", newServiceId);
        setSelectedServiceId(newServiceId);
        setCompanies([]); // Clear list while fetching
      } else {
        console.log("Filter unchanged.");
      }
  }, [selectedServiceId]); // Correct dependency


  // --- Render List Item ---
  const renderCompanyItem = ({ item }: { item: CompanyInfo }) => {
    // ... (renderCompanyItem JSX remains the same)
    const hasServices = item.serviceList && item.serviceList.length > 0;
    const serviceCount = item.serviceList?.length || 0;
    const displayServices = item.serviceList?.slice(0, 3) || [];
    const hasMoreServices = serviceCount > 3;
    return (
        <View style={styles.companyCard}>
            <View style={styles.logoContainer}>
                {item.logoImagePath ? ( <Image source={{ uri: item.logoImagePath }} style={styles.logo} resizeMode="contain" /> ) : ( <View style={styles.logoPlaceholder}><Ionicons name="business" size={24} color={COLORS.textSecondary} /></View> )}
            </View>
            <View style={styles.companyDetails}>
                <Text style={styles.companyName}>{item.companyName || t('unknowncompany')}</Text>
                {item.contactPerson && <Text style={styles.contactPerson}>{t('contact')} {item.contactPerson}</Text>}
                {item.mobileNumber && ( <View style={styles.contactRow}><MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/><Text style={styles.contactText}>{item.mobileNumber}</Text></View> )}
                {item.emailId && ( <View style={styles.contactRow}><MaterialCommunityIcons name="email" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/><Text style={styles.contactText}>{item.emailId}</Text></View> )}
                {hasServices && (
                     <View style={styles.servicesSection}>
                        <View style={styles.sectionTitleRow}><MaterialCommunityIcons name="tools" size={16} color={COLORS.serviceSectionTitle} style={styles.sectionIcon} /><Text style={styles.servicesSectionTitle}>{t('services')}</Text></View>
                        {displayServices.map((service, index) => ( <View key={index} style={styles.serviceItemRow}><MaterialCommunityIcons name="circle-small" size={16} color={COLORS.serviceText} style={styles.serviceItemIcon} /><Text style={styles.serviceItem}>{service.serviceName}</Text></View> ))}
                        {hasMoreServices && ( <TouchableOpacity><Text style={styles.viewMoreServices}>{t('viewmore')} ({serviceCount - 3})</Text></TouchableOpacity> )}
                    </View>
                )}
             </View>
         </View>
    );
  };

  // --- Get Screen Title ---
  const getScreenTitle = () => {
      // Note: Can't use hooks conditionally, so title logic might need adjustment
      // if it relies on hooks that are below conditional returns.
      // For now, assume isLoading/error are checked *after* title is determined conceptually.
      // if (isLoading && companies.length === 0) return t('loading'); // This check happens later
      // if (error) return t('error'); // This check happens later
      return t('urgentjobpartners247');
  };


  // --- Conditional Returns for Loading/Error (MUST be AFTER all hooks) ---
  if (isLoading && companies.length === 0 && !error) {
    return (
        <SafeAreaView style={styles.safeArea}>
             {/* Render Stack.Screen here if needed for consistent title during load */}
             <Stack.Screen options={{ title: t('loading') }} />
             <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />
        </SafeAreaView>
    );
  }
  if (error && companies.length === 0) {
      return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: t('error') }}/>
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => fetchUrgentCompanies(true)} style={styles.retryButton}>
                   <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      );
  }

  // --- Render Main Content (After hooks and conditional returns) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          // Use the title derived earlier or keep it static
          title: t('urgentjobpartners247'),
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
        }}
       />

        <View style={styles.filterButtonContainer}>
            <TouchableOpacity
                style={styles.filterButton}
                onPress={handleOpenFilterModal}
                disabled={isLoadingServices}
            >
                <Ionicons name="filter" size={18} color={COLORS.filterButtonColor} style={styles.filterButtonIcon} />
                {/* Use the memoized currentFilterName */}
                <Text style={styles.filterButtonText}>
                    {t('filter')}: {currentFilterName}
                </Text>
                {isLoadingServices && <ActivityIndicator size="small" color={COLORS.filterButtonColor} style={{ marginLeft: 10 }} />}
            </TouchableOpacity>
        </View>

      {isLoading && companies.length > 0 && <ActivityIndicator size="small" color={COLORS.accent} style={styles.inlineLoading} />}

      {companies.length === 0 && !isLoading && !error ? (
         <View style={styles.centered}>
          <Text style={styles.noDataText}>{t('nopartnersavailable')}</Text>
          {selectedServiceId !== ALL_SERVICES_FILTER_ID && (
              <Text style={styles.noDataSubText}>{t('trydifferentfilter')}</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={companies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item.pCompId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ServiceFilterModal
          visible={isFilterModalVisible}
          onClose={() => setIsFilterModalVisible(false)}
          onApplyFilter={handleApplyFilter}
          initialServiceId={selectedServiceId}
          servicesList={servicesList}
          isLoadingServices={isLoadingServices}
          serviceFetchError={serviceFetchError}
      />

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  // ... (Styles remain the same as the previous version)
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  inlineLoading: { marginVertical: 10, alignSelf: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 20 },
   retryButton: { backgroundColor: COLORS.retryButtonBg, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, },
   retryButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', },
  noDataSubText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 5, fontStyle: 'italic' },
  listContainer: { paddingBottom: 15, paddingHorizontal: 10, paddingTop: 5 }, // Adjusted paddingTop
  companyCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.cardBg,
    padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1,
    borderColor: COLORS.borderColor, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
  },
  logoContainer: {
      width: 50, height: 50, borderRadius: 8, marginRight: 15,
      justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.iconPlaceholder,
      overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderColor,
  },
   logoPlaceholder: {},
  logo: { width: '100%', height: '100%', },
  companyDetails: { flex: 1, },
  companyName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  contactPerson: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, },
  contactIcon: { marginRight: 8, color: COLORS.textSecondary, },
  contactText: { fontSize: 14, color: COLORS.textPrimary, flexShrink: 1, },
  servicesSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderColor, },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  sectionIcon: { marginRight: 8, },
  servicesSectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.serviceSectionTitle, },
  serviceItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, paddingLeft: 2, },
  serviceItemIcon: { marginRight: 4, },
  serviceItem: { fontSize: 14, color: COLORS.serviceText, flex: 1, },
  viewMoreServices: { fontSize: 13, color: COLORS.viewMoreText, marginTop: 4, textAlign: 'right', paddingRight: 4, },
  filterButtonContainer: {
      paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10,
      borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, backgroundColor: COLORS.background,
  },
  filterButton: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.filterButtonBackground,
      paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1,
      borderColor: COLORS.filterButtonBorder, alignSelf: 'flex-start',
  },
  filterButtonIcon: { marginRight: 8, },
  filterButtonText: { fontSize: 14, color: COLORS.filterButtonColor, fontWeight: '500', },
});