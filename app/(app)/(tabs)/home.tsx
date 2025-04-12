// File: app/(tabs)/home.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text, // Keep Text import for error/loading states
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
import { BASE_URL } from '@/constants/Api';

// --- Define Types based on API Response ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string | null; // Allow null from API
  imageContentType: string | null; // Allow null from API
}
interface ServiceListItem {
    id: string;
    name: string;
    imageUri?: string | null; // Allow null
    iconName?: string; // Keep for type consistency, but won't be used for rendering default
    iconSet?: 'ion';
    contentType?: string | null; // Allow null
}
// -----------------------------------------


// --- Base URL ---
// -----------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8',
  textPrimary: '#333333',
  textSecondary: '#666666',
  accent: '#A0522D',
  urgentText: '#FF0000',
  buttonBg: '#696969',
  buttonText: '#FFFFFF',
  cardBg: '#FFFFFF',
  iconColor: '#696969', // No longer used for default icons here
  borderColor: '#E0E0E0',
  bannerPlaceholderBg: '#E0E0E0',
  errorText: '#D9534F',
  headerIconColor: '#555555',
};

// --- Helper Function for Login/Register Prompt ---
const showLoginRegisterAlert = (router: any) => { Alert.alert( "Login Required", "Please log in or register to proceed.", [ { text: "Cancel", style: "cancel" }, { text: "Log In", onPress: () => router.push('/login') }, { text: "Register", onPress: () => router.push('/register') } ] ); };


// --- Service Item Component ---
interface ServiceItemProps {
    item: ServiceListItem;
    session: ReturnType<typeof useAuth>['session'];
    router: ReturnType<typeof useRouter>;
}
const ServiceItem: React.FC<ServiceItemProps> = ({ item, session, router }) => {
    const handleItemPress = () => { if (!session) { showLoginRegisterAlert(router); } else if (session.type === 'user') { router.push({ pathname: '/create-job-card', params: { preselectedServiceId: item.id, preselectedServiceName: item.name } }); } else { Alert.alert("Action Not Allowed", "Only users can create job requests from services."); } };

    const renderContent = () => {
        if (item.imageUri && item.contentType?.startsWith('image/')) {
             return ( <Image source={{ uri: item.imageUri }} style={styles.serviceItemImage} resizeMode="contain" /> );
        }
        return <View style={styles.serviceItemImagePlaceholder} />;
    };

    return (
        <TouchableOpacity style={styles.serviceItem} onPress={handleItemPress}>
            {renderContent()}
            <ThemedText style={styles.serviceItemText}>{item.name}</ThemedText>
        </TouchableOpacity>
    );
};


// --- Main Home Screen Component ---
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);

  // --- Fetch Services ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true); setError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      try {
        const response = await fetch(url);
        if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'Failed to fetch'}`); }
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) { const responseText = await response.text(); throw new Error("Received non-JSON response"); }
        const data: Service[] = await response.json();
        const formattedData: ServiceListItem[] = data.map(service => ({ id: service.serviceId.toString(), name: service.serviceName, contentType: service.imageContentType, imageUri: service.imagePath }));
        setServices(formattedData);
      } catch (err: any) { setError(`Failed to load services: ${err.message}`); }
      finally { setIsLoading(false); }
    };
    fetchServices();
  }, []);

  // --- Event Handlers ---
  const handleNewJobRequestPress = () => { if (!session) { showLoginRegisterAlert(router); } else { if (session.type === 'user') { router.push('/create-job-card'); } else { Alert.alert("Action Not Allowed", "Partners cannot create job requests."); } } };
  const handleViewAllServicesPress = () => { router.push('/categories'); };
  const handleUrgentJobPress = () => { if (!session) { showLoginRegisterAlert(router); } else if (session.type !== 'user') { Alert.alert("Feature Not Available", "This feature is only available for users."); } else { router.push('/urgentJobList'); } };
  const handleRegisterPress = () => setIsRegisterModalVisible(true);
  const handleSelectPartner = () => { setIsRegisterModalVisible(false); router.push('/register-partner'); };
  const handleSelectUser = () => { setIsRegisterModalVisible(false); router.push('/register'); };
  const handleSelectLanguage = (language: 'en' | 'sv') => { Alert.alert("Language Selected", language === 'en' ? 'English' : 'Swedish'); };

  // --- Render Content for FlatList ---
  const renderListContent = () => {
      if (isLoading) {
          return <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />;
      }
      if (error) {
          return <Text style={styles.errorText}>{error}</Text>;
      }
      if (services.length === 0) {
          return <Text style={styles.noDataText}>No services available.</Text>;
      }
      return (
          <FlatList
              data={services}
              renderItem={({item}) => <ServiceItem item={item} session={session} router={router} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.serviceGridRow}
              scrollEnabled={false} // Important if inside ScrollView
              contentContainerStyle={styles.servicesGridContainer}
           />
       );
   };

  // --- Main Return JSX (Render Section) ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
       <Stack.Screen
         options={{
           headerShown: true,
           headerStyle: { backgroundColor: COLORS.background },
           headerTitle: () => <ThemedText style={styles.headerTitle}>Home</ThemedText>,
           headerTitleAlign: 'left',
           headerRight: () => (
             !session ? (
               <View style={styles.headerRightContainer}>
                 <TouchableOpacity onPress={() => setIsLanguageModalVisible(true)} style={styles.headerIconButton} >
                   <Ionicons name="settings-outline" size={24} color={COLORS.headerIconColor} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginButtonContainer} >
                   <ThemedText style={styles.loginText}>LOG IN</ThemedText>
                 </TouchableOpacity>
               </View>
             ) : null
           ),
         }}
       />
       <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.bannerContainer}>
                 <Image source={require('@/assets/images/banner.png')} style={styles.bannerImage} resizeMode='cover'/>
            </View>
            <View style={styles.sectionHeader}>
                 <ThemedText style={styles.sectionTitle}>Services</ThemedText>
                 <TouchableOpacity onPress={handleUrgentJobPress}>
                    <ThemedText style={styles.urgentJobText}>Urgent Job 24/7</ThemedText>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={handleViewAllServicesPress}>
                    <ThemedText style={styles.viewAllText}>View All</ThemedText>
                 </TouchableOpacity>
            </View>

            {renderListContent()}

            {(!session || session?.type === 'user') && (
                <View style={styles.notFoundSection}>
                    <ThemedText style={styles.notFoundText}>Didn't find your Service?</ThemedText>
                    <ThemedText style={styles.notFoundSubText}>Don't worry, You can post your Requirement</ThemedText>
                </View>
             )}

            <View style={styles.bottomButtonsContainer}>
                {(!session || session?.type === 'user') && (
                    <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}>
                        <ThemedText style={styles.buttonText}>New Job Request</ThemedText>
                    </TouchableOpacity>
                 )}
                {!session && (
                    <TouchableOpacity style={styles.button} onPress={handleRegisterPress}>
                        <ThemedText style={styles.buttonText}>Register</ThemedText>
                    </TouchableOpacity>
                 )}
            </View>
       </ScrollView>

       <RegisterTypeModal visible={isRegisterModalVisible} onClose={() => setIsRegisterModalVisible(false)} onSelectPartner={handleSelectPartner} onSelectUser={handleSelectUser} />
       <LanguageSelectionModal visible={isLanguageModalVisible} onClose={() => setIsLanguageModalVisible(false)} onSelectLanguage={handleSelectLanguage} />
    </SafeAreaView>
  );
}

// --- Styles ---
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
  serviceItem: { backgroundColor: COLORS.cardBg, paddingVertical: 15, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '48%', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.41, elevation: 2, minHeight: 140, },
  serviceItemImage: { width: 60, height: 60, marginBottom: 8, },
  serviceItemImagePlaceholder: { width: 60, height: 60, marginBottom: 8, },
  serviceItemText: { fontSize: 14, textAlign: 'center', color: COLORS.textPrimary, fontWeight: '500', flexShrink: 1, paddingHorizontal: 4, },
   notFoundSection: { alignItems: 'center', marginVertical: 25, paddingHorizontal: 15, },
   notFoundText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', },
   notFoundSubText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, textAlign: 'center', },
  bottomButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 10, minHeight: 70 },
  button: { backgroundColor: COLORS.buttonBg, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center', },
  buttonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  loadingIndicator: { marginTop: 50, height: 100, },
  errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, },
   noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, }
});