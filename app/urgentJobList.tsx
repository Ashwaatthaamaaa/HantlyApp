// File: app/urgentJobList.tsx (Redesigned - Minimalistic & Professional)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// --- Minimalistic Color Palette ---
const COLORS = {
    background: '#FAFAFA',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    accent: '#2563EB',
    accentLight: '#EFF6FF',
    success: '#059669',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    error: '#DC2626',
    white: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceHover: '#F9FAFB',
    shadow: 'rgba(0, 0, 0, 0.04)',
    overlay: 'rgba(0, 0, 0, 0.1)',
};

// --- Minimalistic CompanyCard Component ---
interface CompanyCardProps {
    item: CompanyInfo;
}

const CompanyCard: React.FC<CompanyCardProps> = React.memo(({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasServices = item.serviceList && item.serviceList.length > 0;
    const serviceCount = item.serviceList?.length || 0;
    const displayServices = isExpanded ? item.serviceList : item.serviceList?.slice(0, 3);
    const hasMoreServices = serviceCount > 3;

    const toggleExpansion = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const handleCallPress = useCallback(() => {
        if (!item.mobileNumber) {
            Alert.alert(t('error'), t('no_phone_number_available'));
            return;
        }

        const phoneUrl = `tel:${item.mobileNumber}`;
        
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(phoneUrl);
                } else {
                    Alert.alert(t('error'), t('phone_not_supported'));
                }
            })
            .catch((err) => {
                console.error('Error opening phone dialer:', err);
                Alert.alert(t('error'), t('failed_to_open_dialer'));
            });
    }, [item.mobileNumber]);

    return (
        <View style={styles.card}>
            {/* Main Content Row */}
            <View style={styles.cardHeader}>
                {/* Company Logo */}
                <View style={styles.logoContainer}>
                    {item.logoImagePath ? (
                        <Image 
                            source={{ uri: item.logoImagePath }} 
                            style={styles.logo} 
                            resizeMode="cover" 
                        />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Ionicons name="business" size={20} color={COLORS.textTertiary} />
                        </View>
                    )}
                </View>

                {/* Company Info */}
                <View style={styles.companyInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.companyName} numberOfLines={1}>
                            {item.companyName || t('unknown_company')}
                        </Text>
                        {item.is24X7 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>24/7</Text>
                            </View>
                        )}
                    </View>
                    
                    {item.contactPerson && (
                        <Text style={styles.contactPerson} numberOfLines={1}>
                            {item.contactPerson}
                        </Text>
                    )}
                    
                    {/* Contact Row */}
                    <View style={styles.contactRow}>
                        {item.mobileNumber && (
                            <View style={styles.contactItem}>
                                <Ionicons name="call" size={14} color={COLORS.textTertiary} />
                                <Text style={styles.contactText}>{item.mobileNumber}</Text>
                            </View>
                        )}
                        {item.emailId && (
                            <View style={styles.contactItem}>
                                <Ionicons name="mail" size={14} color={COLORS.textTertiary} />
                                <Text style={styles.contactText} numberOfLines={1}>{item.emailId}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={[styles.callButton, !item.mobileNumber && styles.callButtonDisabled]}
                    onPress={handleCallPress}
                    disabled={!item.mobileNumber}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="call" 
                        size={18} 
                        color={COLORS.white} 
                    />
                </TouchableOpacity>
            </View>

            {/* Services Section */}
            {hasServices && (
                <View style={styles.servicesSection}>
                    <View style={styles.servicesList}>
                        {displayServices && displayServices.map((service, index) => (
                            <Text key={`${service.serviceId}-${index}`} style={styles.serviceItem}>
                                {service.serviceName}
                            </Text>
                        ))}
                    </View>

                    {hasMoreServices && (
                        <TouchableOpacity onPress={toggleExpansion} style={styles.expandButton}>
                            <Text style={styles.expandText}>
                                {isExpanded 
                                    ? t('view_less')
                                    : `+${serviceCount - 3} ${t('more')}`
                                }
                            </Text>
                            <Ionicons 
                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                size={14} 
                                color={COLORS.accent} 
                            />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
});

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

  const renderItem = useCallback(({ item }: { item: CompanyInfo }) => (
      <CompanyCard item={item} />
  ), []);

  // Loading State
  if (isLoading && companies.length === 0 && !error) {
    return (
        <SafeAreaView style={styles.safearea} edges={['top']}>
             <Stack.Screen options={{ 
                 title: t('urgentjobpartners247'),
                 headerStyle: { backgroundColor: COLORS.white },
                 headerTintColor: COLORS.textPrimary,
             }} />
             <View style={styles.loadingContainer}>
                 <ActivityIndicator size="large" color={COLORS.accent} />
                 <Text style={styles.loadingText}>{t('loading')}</Text>
             </View>
        </SafeAreaView>
    );
  }

  // Error State
  if (error && companies.length === 0) {
      return (
        <SafeAreaView style={styles.safearea} edges={['top']}>
            <Stack.Screen options={{ 
                title: t('urgentjobpartners247'),
                headerStyle: { backgroundColor: COLORS.white },
                headerTintColor: COLORS.textPrimary,
            }}/>
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                <Text style={styles.errorTitle}>{t('error')}</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => fetchUrgentCompanies(true)} style={styles.retryButton}>
                   <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safearea} edges={['top']}>
      <Stack.Screen
        options={{
          title: t('urgentjobpartners247'),
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.textPrimary,
        }}
       />
        {/* Header with Filter and Count */}
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <Text style={styles.resultCount}>
                    {companies.length} {companies.length === 1 ? t('partner') : t('partners')}
                </Text>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={handleOpenFilterModal}
                    disabled={isLoadingServices}
                >
                    <Ionicons name="options-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.filterText}>{t('filter')}</Text>
                </TouchableOpacity>
            </View>
            
            {selectedServiceId !== ALL_SERVICES_FILTER_ID && (
                <View style={styles.activeFilter}>
                    <Text style={styles.activeFilterText}>{currentFilterName}</Text>
                    <TouchableOpacity onPress={() => handleApplyFilter(ALL_SERVICES_FILTER_ID)}>
                        <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>

      {companies.length === 0 && !isLoading && !error ? (
         <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={48} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>{t('nopartnersavailable')}</Text>
          {selectedServiceId !== ALL_SERVICES_FILTER_ID && (
              <Text style={styles.emptyText}>{t('trydifferentfilter')}</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={companies}
          renderItem={renderItem}
          keyExtractor={(item) => item.pCompId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          extraData={selectedServiceId}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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

// --- Minimalistic Styles ---
const styles = StyleSheet.create({

  safearea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Header Section
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.accentLight,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accent,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // List
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 16,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Company Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  // Company Logo
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  companyInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  contactPerson: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Call Button
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Services Section
  servicesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  serviceItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent,
  },
});