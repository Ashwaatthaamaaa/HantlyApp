// File: app/urgentJobList.tsx (Reinstating Card Expansion)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert, // Keep Alert for other potential uses
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from '@/constants/Api';
import i18n ,{ t} from '@/config/i18n';
import ServiceFilterModal from '@/components/ServiceFilterModal';

// --- Types ---
interface ServiceMaster {
  serviceId: number;
  serviceName: string;
  serviceName_Swedish: string;
}
interface ApiDataItem { id: string; name: string | null; }
interface CompanyService {
    pCompId: number;
    serviceId: number;
    companyName: string;
    serviceName: string;
}
interface CompanyInfo {
  username: string | null;
  active: boolean; pCompId: number; mobileNumber: string | null;
  contactPerson: string | null; emailId: string | null; is24X7?: boolean | null;
  companyName: string | null; companyRegistrationNumber: string | null;
  companyPresentation: string | null; logoImagePath: string | null;
  logoImageContentType: string | null;
  serviceList?: CompanyService[] | null;
}

// --- Constants ---
const ALL_SERVICES_FILTER_ID = '';
// --- Colors ---
const COLORS = {
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

// --- CompanyCard Component (Reinstated) ---
interface CompanyCardProps {
    item: CompanyInfo;
}

const CompanyCard: React.FC<CompanyCardProps> = React.memo(({ item }) => { // Added React.memo for potential optimization
    const [isExpanded, setIsExpanded] = useState(false); // State for expansion

    const hasServices = item.serviceList && item.serviceList.length > 0;
    const serviceCount = item.serviceList?.length || 0;
    // Determine which services to display based on the expanded state
    const displayServices = isExpanded ? item.serviceList : item.serviceList?.slice(0, 3);
    // Determine if the "View More" button should be shown
    const showViewMoreButton = !isExpanded && serviceCount > 3;
    // Determine if the "View Less" button should be shown
    const showViewLessButton = isExpanded && serviceCount > 3;

    // Function to toggle the expanded state
    const toggleExpansion = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    return (
        <View style={styles.companyCard}>
            {/* Logo and Basic Details */}
            <View style={styles.logoContainer}>
                {item.logoImagePath ? ( <Image source={{ uri: item.logoImagePath }} style={styles.logo} resizeMode="contain" /> ) : ( <View style={styles.logoPlaceholder}><Ionicons name="business" size={24} color={COLORS.textSecondary} /></View> )}
            </View>
            <View style={styles.companyDetails}>
                <Text style={styles.companyName}>{item.companyName || t('unknown_company')}</Text>
                {item.contactPerson && <Text style={styles.contactPerson}>{t('contact')} {item.contactPerson}</Text>}
                {item.mobileNumber && ( <View style={styles.contactRow}><MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/><Text style={styles.contactText}>{item.mobileNumber}</Text></View> )}
                {item.emailId && ( <View style={styles.contactRow}><MaterialCommunityIcons name="email" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/><Text style={styles.contactText}>{item.emailId}</Text></View> )}

                {/* Services Section - Renders based on displayServices */}
                {hasServices && displayServices && (
                    <View style={styles.servicesSection}>
                        <View style={styles.sectionTitleRow}><MaterialCommunityIcons name="tools" size={16} color={COLORS.serviceSectionTitle} style={styles.sectionIcon} /><Text style={styles.servicesSectionTitle}>{t('services')}</Text></View>
                        {displayServices.map((service, index) => (
                            <View key={`${service.serviceId}-${index}`} style={styles.serviceItemRow}>
                                <MaterialCommunityIcons name="circle-small" size={16} color={COLORS.serviceText} style={styles.serviceItemIcon} />
                                <Text style={styles.serviceItem}>{service.serviceName}</Text>
                            </View>
                        ))}
                        {/* Toggle Button Logic */}
                        {(showViewMoreButton || showViewLessButton) && (
                             <TouchableOpacity onPress={toggleExpansion}>
                                <Text style={styles.viewMoreServices}>
                                    {showViewMoreButton ? `${t('view_more')} (${serviceCount - 3})` : t('view_less')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
             </View>
         </View>
    );
});
// --- END CompanyCard Component ---

// --- Main Screen Component ---
export default function UrgentJobListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(ALL_SERVICES_FILTER_ID);
  const [servicesList, setServicesList] = useState<ApiDataItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceFetchError, setServiceFetchError] = useState<string | null>(null);

  // --- Hooks and Functions (fetchServicesForFilter, fetchUrgentCompanies, etc. remain the same) ---
  const currentFilterName = useMemo(() => {
    const service = servicesList.find(s => s.id === selectedServiceId);
    return service?.name || t('all_services');
  }, [selectedServiceId, servicesList]);

  const fetchServicesForFilter = useCallback(async () => {
    setIsLoadingServices(true);
    setServiceFetchError(null);
    const url = `${BASE_URL}/api/Service/GetServiceList`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Service list fetch failed (${response.status})`);
        const data: ServiceMaster[] = await response.json();
        const currentLocale = i18n.locale;
        const formattedServices: ApiDataItem[] = data.map(service => ({
            id: service.serviceId.toString(),
            name: (currentLocale === 'sv' ? service.serviceName_Swedish : service.serviceName) || service.serviceName,
        }));
        setServicesList([{ id: ALL_SERVICES_FILTER_ID, name: t('all_services') }, ...formattedServices]);
    } catch (err: any) {
        setServiceFetchError(t('failedtoloadservices') + ` ${err.message}`);
        setServicesList([{ id: ALL_SERVICES_FILTER_ID, name: t('all_services') }]);
    } finally {
        setIsLoadingServices(false);
    }
  }, []);

  useEffect(() => { fetchServicesForFilter(); }, [fetchServicesForFilter]);

  const fetchUrgentCompanies = useCallback(async (showLoadingIndicator = true) => {
     if (!session || session.type !== 'user' || !session.id) { setError(t('accessdenied')); setIsLoading(false); setCompanies([]); return; }
     if (showLoadingIndicator) setIsLoading(true);
     setError(null);
     const userId = session.id;
     let url = `${BASE_URL}/api/Company/GetCompany24X7ForUser?userId=${userId}`;
     if (selectedServiceId && selectedServiceId !== ALL_SERVICES_FILTER_ID) { url += `&serviceId=${selectedServiceId}`; }
     try {
       const response = await fetch(url, { headers: { 'accept': 'text/plain' } });
       if (!response.ok) throw new Error(`Failed fetch (${response.status})`);
       const responseText = await response.text();
       let data: CompanyInfo[] = [];
       try { data = JSON.parse(responseText); } catch (parseError) { if (responseText.trim() === '') { data = []; } else { throw new Error("Unexpected response."); } }
       setCompanies(data);
     } catch (err: any) { setError(t('failedloadurgentcompanies', { message: err.message })); setCompanies([]); }
     finally { if (showLoadingIndicator) setIsLoading(false); }
  }, [session, selectedServiceId]);

  useFocusEffect(useCallback(() => { fetchUrgentCompanies(companies.length === 0); }, [fetchUrgentCompanies, companies.length]));

  const handleOpenFilterModal = useCallback(() => { fetchServicesForFilter(); setIsFilterModalVisible(true); }, [fetchServicesForFilter]);

  const handleApplyFilter = useCallback((serviceId: string | null) => {
      const newServiceId = serviceId ?? ALL_SERVICES_FILTER_ID;
      if (newServiceId !== selectedServiceId) { setSelectedServiceId(newServiceId); setCompanies([]); }
  }, [selectedServiceId]);

  // --- Render Item Function using CompanyCard ---
  const renderItem = useCallback(({ item }: { item: CompanyInfo }) => (
      <CompanyCard item={item} />
  ), []); // Empty dependency array as CompanyCard handles its own state

  // --- Loading/Error/Empty States ---
  if (isLoading && companies.length === 0 && !error) {
    return ( /* ... Loading Indicator ... */
        <SafeAreaView style={styles.safeArea}>
             <Stack.Screen options={{ title: t('loading') }} />
             <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />
        </SafeAreaView>
    );
  }
  if (error && companies.length === 0) {
      return ( /* ... Error Message ... */
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: t('error') }}/>
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/>
                <Text style={styles.errorText}>{t('failedloadurgentcompanies', { message: error })}</Text>
                <TouchableOpacity onPress={() => fetchUrgentCompanies(true)} style={styles.retryButton}>
                   <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: t('urgentjobpartners247'),
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
        }}
       />

        <View style={styles.filterButtonContainer}>
             {/* Filter Button */}
            <TouchableOpacity
                style={styles.filterButton}
                onPress={handleOpenFilterModal}
                disabled={isLoadingServices}
            >
                <Ionicons name="filter" size={18} color={COLORS.filterButtonColor} style={styles.filterButtonIcon} />
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
        // --- FlatList using the new renderItem ---
        <FlatList
          data={companies}
          renderItem={renderItem} // Use the renderItem function defined above
          keyExtractor={(item) => item.pCompId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          extraData={selectedServiceId} // Re-render list if filter changes
        />
      )}

      {/* Service Filter Modal */}
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

// --- Styles --- (Add 'viewless' key to translations if needed)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  inlineLoading: { marginVertical: 10, alignSelf: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 20 },
   retryButton: { backgroundColor: COLORS.retryButtonBg, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, },
   retryButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', },
  noDataSubText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 5, fontStyle: 'italic' },
  listContainer: { paddingBottom: 15, paddingHorizontal: 10, paddingTop: 5 },
  // Styles for the CompanyCard component:
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
  serviceItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, paddingLeft: 2, }, // Can adjust padding/margin here if needed when expanded
  serviceItemIcon: { marginRight: 4, },
  serviceItem: { fontSize: 14, color: COLORS.serviceText, flex: 1, }, // Ensure flex: 1 allows text wrapping
  viewMoreServices: { fontSize: 13, color: COLORS.viewMoreText, marginTop: 4, textAlign: 'right', paddingRight: 4, fontWeight: '500'},
  // Styles for the filter button area:
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

// Remember to add a translation key for 'viewless' if you haven't already
// e.g., in en.ts: viewless: "View Less"
// e.g., in sv.ts: viewless: "Visa Mindre"