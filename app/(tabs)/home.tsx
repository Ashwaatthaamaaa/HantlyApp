// File: app/(tabs)/home.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import RegisterTypeModal from '@/components/RegisterTypeModal';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL, fetchBaseUrlFromFirebase } from '@/constants/Api';
import { SvgXml } from 'react-native-svg'; // <-- Import SvgXml
import { t, setLocale } from '@/config/i18n'; // Import the translation function
import * as SecureStore from 'expo-secure-store';
import i18n from '@/config/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';


// --- Types ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string | null;
  imageContentType: string | null;
}
interface ServiceListItem {
  id: string;
  name: string;
  imageUri?: string | null;
  iconName?: string;
  iconSet?: 'ion';
  contentType?: string | null;
}

// --- Colors ---
const COLORS = {
  background: '#F8F8F8',
  textPrimary: '#333333',
  textSecondary: '#666666',
  accent: '#A0522D',
  urgentText: '#FF0000',
  buttonBg: '#696969',
  buttonText: '#FFFFFF',
  cardBg: '#FFFFFF',
//   iconColor: '#696969', // No longer used for default icons here
  borderColor: '#E0E0E0',
  bannerPlaceholderBg: '#E0E0E0',
  errorText: '#D9534F',
  headerIconColor: '#555555',
};

// --- Alert helper ---
const showLoginRegisterAlert = (router: any) => {
  Alert.alert(
    t('loginsrequired'),
    t('logintoproceed'),
    [
      { text: t('cancel'), style: 'cancel' },
      { text: t('login'), onPress: () => router.push('/login') },
      { text: t('register'), onPress: () => router.push('/register') },
    ]
  );
};

// --- ServiceItem with SvgXml Support ---
interface ServiceItemProps {
  item: ServiceListItem;
  session: ReturnType<typeof useAuth>['session'];
  router: ReturnType<typeof useRouter>;
}
const ServiceItem: React.FC<ServiceItemProps> = ({ item, session, router }) => {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<boolean>(false); // Track fetch errors

  const handleItemPress = () => {
    if (!session) return showLoginRegisterAlert(router);
    if (session.type === 'user') {
      router.push({
        pathname: '/create-job-card',
        params: {
          preselectedServiceId: item.id,
          preselectedServiceName: item.name,
        },
      });
    } else {
      Alert.alert('Action Not Allowed', 'Only users can create job requests from services.');
    }
  };

  useEffect(() => {
    const fetchSvg = async () => {
        setSvgXml(null); // Reset on item change
        setFetchError(false); // Reset error
        // Check if it's likely an SVG based on URI or content type
        const isSvg = item.contentType === 'image/svg+xml' || item.imageUri?.endsWith('.svg');

        if (item.imageUri && isSvg) {
          try {
            const res = await fetch(item.imageUri);
            if (!res.ok) {
                throw new Error(`Failed to fetch SVG: ${res.status}`);
            }
            const text = await res.text();
            // Basic check if the fetched text looks like SVG
            if (text.trim().startsWith('<svg')) {
                setSvgXml(text);
            } else {
                console.warn("Fetched content does not look like SVG for:", item.imageUri);
                setFetchError(true);
            }
          } catch (err) {
            console.error('SVG fetch error for:', item.imageUri, err);
            setFetchError(true); // Mark as error
          }
        }
    };
    fetchSvg();
  }, [item.imageUri, item.contentType]);

  const renderContent = () => {
    // Prioritize successfully fetched SVG XML
    if (svgXml) {
        return (
            <SvgXml
                xml={svgXml}
                width="60" // Match existing style dimensions
                height="60"
                style={styles.serviceItemVisual}
            />
        );
    }
    // Fallback to standard Image if not SVG or if SVG fetch failed
    else if (item.imageUri && item.contentType?.startsWith('image/') && !fetchError) {
        return (
             <Image
               source={{ uri: item.imageUri }}
               style={[styles.serviceItemVisual, styles.serviceItemImage]}
               resizeMode="contain"
               onError={(e) => {
                 console.warn("Image load error for:", item.imageUri, e.nativeEvent.error);
               }}
             />
           );
    }
    // Placeholder if no image, unsupported type, or fetch error
    return <View style={styles.serviceItemImagePlaceholder} />;
  };

  return (
    <TouchableOpacity style={styles.serviceItem} onPress={handleItemPress}>
      {renderContent()}
      <ThemedText style={styles.serviceItemText}>{item.name}</ThemedText>
    </TouchableOpacity>
  );
};

// --- Main HomeScreen ---
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  useEffect(() => {
    const loadServices = async () => {
      setIsLoading(true); setError(null);
      try {
        await fetchBaseUrlFromFirebase();
        const url = `${BASE_URL}/api/Service/GetServiceList`;
        const response = await fetch(url);
        if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`Failed to fetch services (Status: ${response.status}): ${errorText}`);
         }
         const contentType = response.headers.get("content-type");
         if (!contentType || !contentType.includes("application/json")) {
           const responseText = await response.text();
           console.error("Received non-JSON response for services:", responseText);
           throw new Error(`Received non-JSON response from server.`);
         }

        const data: Service[] = await response.json();
        const formatted = data.map(service => ({
          id: service.serviceId.toString(),
          name: service.serviceName,
          contentType: service.imageContentType,
          imageUri: service.imagePath
        }));
        setServices(formatted);
      } catch (err: any) {
        setError(`Failed to load services: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadServices();
  }, []);

    // --- Event Handlers ---
    const handleNewJobRequestPress = () => {
      if (!session) {
        showLoginRegisterAlert(router);
        return;
      }
      Alert.alert(
        t('newjobrequest'),
        t('newjobrequestmessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('proceed'), onPress: () => router.push('/create-job-card') },
        ]
      );
    };
    const handleViewAllServicesPress = () => {
      router.push('/categories');
    };
    const handleUrgentJobPress = () => {
      if (!session) {
        showLoginRegisterAlert(router);
        return;
      }
      Alert.alert(
        t('urgentjob'),
        t('urgentjobmessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('proceed'), onPress: () => router.push('/urgentJobList') },
        ]
      );
    };
    const handleRegisterPress = () => setIsRegisterModalVisible(true);
    const handleSelectPartner = () => { setIsRegisterModalVisible(false); router.push('/register-partner'); };
    const handleSelectUser = () => { setIsRegisterModalVisible(false); router.push('/register'); };
    const handleSelectLanguage = async (language: string) => {
      try {
        await setLocale(language);
        setSelectedLanguage(language);
        setIsLanguageModalVisible(false);
      } catch (error) {
        Alert.alert(t('error'), t('couldnotsavelanguage'));
      }
    };
    // ---------------------

  const renderListContent = () => {
    if (isLoading) return <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (services.length === 0) return <Text style={styles.noDataText}>{t('noservicesavailable')}</Text>;
    return (
      <FlatList
        data={services}
        renderItem={({ item }) => <ServiceItem item={item} session={session} router={router} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.serviceGridRow}
        scrollEnabled={false}
        contentContainerStyle={styles.servicesGridContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
          headerTitle: () => <ThemedText style={styles.headerTitle}>{t('home')}</ThemedText>,
          headerTitleAlign: 'left',
          headerRight: () =>
            !session ? (
              <View style={styles.headerRightContainer}>
                <TouchableOpacity onPress={() => setIsLanguageModalVisible(true)} style={styles.headerIconButton}>
                  <Ionicons name="settings-outline" size={24} color={COLORS.headerIconColor} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginButtonContainer}>
                  <ThemedText style={styles.loginText}>{t('login')}</ThemedText>
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.bannerContainer}>
          <Image source={require('@/assets/images/banner.png')} style={styles.bannerImage} resizeMode='cover' />
        </View>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{t('services')}</ThemedText>
          <TouchableOpacity onPress={handleUrgentJobPress}>
             <ThemedText style={styles.urgentJobText}>{t('urgentjob247')}</ThemedText>
           </TouchableOpacity>
          <TouchableOpacity onPress={handleViewAllServicesPress}>
             <ThemedText style={styles.viewAllText}>{t('viewall')}</ThemedText>
           </TouchableOpacity>
        </View>
        {renderListContent()}
        {(!session || session?.type === 'user') && (
          <View style={styles.notFoundSection}>
            <ThemedText style={styles.notFoundText}>{t('didntfindyourservice')}</ThemedText>
            <ThemedText style={styles.notFoundSubText}>{t('dontworry')}</ThemedText>
          </View>
        )}
        <View style={styles.bottomButtonsContainer}>
          {(!session || session?.type === 'user') && (
            <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}>
               <ThemedText style={styles.buttonText}>{t('newjobrequest')}</ThemedText>
             </TouchableOpacity>
          )}
          {!session && (
            <TouchableOpacity style={styles.button} onPress={handleRegisterPress}>
               <ThemedText style={styles.buttonText}>{t('register')}</ThemedText>
             </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <RegisterTypeModal visible={isRegisterModalVisible} onClose={() => setIsRegisterModalVisible(false)} onSelectPartner={handleSelectPartner} onSelectUser={handleSelectUser} />
      <LanguageSelectionModal visible={isLanguageModalVisible} onClose={() => setIsLanguageModalVisible(false)} onSelectLanguage={handleSelectLanguage} />
    </SafeAreaView>
  );
}

// --- Styles --- (Copied from previous version)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  scrollContentContainer: { paddingBottom: 20, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginLeft: 0 },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 10, },
  headerIconButton: { padding: 5, marginRight: 8, },
  loginButtonContainer: { paddingVertical: 5, },
  loginText: { fontSize: 14, fontWeight: 'bold', color: COLORS.accent, },
  bannerContainer: { height: 160, width: '100%', marginBottom: 20, backgroundColor: COLORS.bannerPlaceholderBg, },
  bannerImage: { width: '100%', height: '100%', },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15, },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, },
  urgentJobText: { fontSize: 14, fontWeight: 'bold', color: COLORS.urgentText, paddingVertical: 5 },
  viewAllText: { fontSize: 14, color: COLORS.accent, fontWeight: '500', paddingVertical: 5 },
  servicesGridContainer: { paddingHorizontal: 10, },
  serviceGridRow: { justifyContent: 'space-around', },
  serviceItem: {
    backgroundColor: COLORS.cardBg, paddingVertical: 15, paddingHorizontal: 10,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    width: '48%', marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.41,
    elevation: 2, minHeight: 140,
  },
  // Common visual container style
  serviceItemVisual: {
      width: 60, height: 60, marginBottom: 8,
  },
  serviceItemImagePlaceholder: { // Placeholder style
      width: 60, height: 60, marginBottom: 8,
      // backgroundColor: '#eee', // Optional: for debugging
  },
  serviceItemImage: { // Style for <Image>
      // Example: If images should be circular, add borderRadius: 30
  },
  // Removed serviceItemSvg style
  serviceItemText: {
     fontSize: 14, textAlign: 'center', color: COLORS.textPrimary, fontWeight: '500',
     flexShrink: 1, paddingHorizontal: 4,
  },
  notFoundSection: { alignItems: 'center', marginVertical: 25, paddingHorizontal: 15, },
  notFoundText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', },
  notFoundSubText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, textAlign: 'center', },
  bottomButtonsContainer: {
     flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15,
     paddingTop: 20, paddingBottom: 10, minHeight: 70
  },
  button: {
     backgroundColor: COLORS.buttonBg, paddingVertical: 12, paddingHorizontal: 20,
     borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center',
  },
  buttonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  loadingIndicator: { marginTop: 50, height: 100, },
  errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, },
  noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, }
});
// -----------