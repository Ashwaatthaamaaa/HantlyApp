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
import { SafeAreaView } from 'react-native-safe-area-context'; // Ensure import
import { Stack, useRouter } from 'expo-router';
// Import Stack
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import RegisterTypeModal from '@/components/RegisterTypeModal';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { BASE_URL } from '@/constants/Api';

// --- Define Types based on API Response ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string;
  imageContentType: string;
}
interface ServiceListItem {
    id: string;
    name: string;
    imageUri?: string;
    iconName?: string;
    iconSet?: 'ion';
    contentType?: string;
}
// -----------------------------------------


// --- Base URL ---
// ** FIX START: Updated BASE_URL **
// ** FIX END **
// -----------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8',
  textPrimary: '#333333',
  textSecondary: '#666666',
  accent: '#A0522D', // Brownish color used for LOG IN, View All
  urgentText: '#FF0000', // Red for Urgent Job text
  buttonBg: '#696969', // Dark grey/brown buttons
  buttonText: '#FFFFFF',
  cardBg: '#FFFFFF',
  iconColor: '#696969', // Color for fallback icon
  borderColor: '#E0E0E0',
  bannerPlaceholderBg: '#E0E0E0',
  errorText: '#D9534F',
};

// --- Service Item Component with Fallback ---
interface ServiceItemProps {
    item: ServiceListItem;
}
const ServiceItem: React.FC<ServiceItemProps> = ({ item }) => {
    const router = useRouter();
    const handleItemPress = () => {
        Alert.alert("Service Pressed", item.name);
        // Navigate to specific service category:
        // router.push(`/services?category=${item.id}`);
    }

    const renderContent = () => {
        if (item.iconName && item.iconSet === 'ion') {
            return <Ionicons name={item.iconName as any} size={60} color={COLORS.iconColor} style={styles.serviceItemIcon}/>;
        } else if (item.imageUri && item.contentType?.startsWith('image/')) {
             // NOTE: If imagePath from API is relative, prepend BASE_URL if needed
             // const fullImageUri = item.imageUri.startsWith('http') ? item.imageUri : `${BASE_URL}${item.imageUri}`;
             // return <Image source={{ uri: fullImageUri }} style={styles.serviceItemImage} resizeMode="contain"/>;
             // Assuming imagePath is already a full URL or handled correctly by API response
             return <Image source={{ uri: item.imageUri }} style={styles.serviceItemImage} resizeMode="contain"/>;
        } else {
             return <Ionicons name="help-circle-outline" size={60} color={COLORS.textSecondary} style={styles.serviceItemIcon}/>;
        }
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
  const { session } = useAuth(); // Get session state from context

  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState<boolean>(false);

  // --- Fetch Services ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true); setError(null);
      // ** NOTE: URL now uses the updated BASE_URL defined above **
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      console.log(`Workspaceing services from: ${url}`); // Log the URL being used
      try {
        const response = await fetch(url);
        console.log(`Service fetch response status: ${response.status}`); // Log status

        if (!response.ok) {
            const errorText = await response.text(); // Try to get error text
            console.error(`Service fetch failed (${response.status}): ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText || 'Failed to fetch'}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            const responseText = await response.text();
            console.error(`Received non-JSON response: ${responseText}`);
            throw new Error("Received non-JSON response");
        }

        const data: Service[] = await response.json();
        console.log(`Services data received:`, data); // Log received data

        const formattedData: ServiceListItem[] = data.map(service => {
            const baseItem = { id: service.serviceId.toString(), name: service.serviceName, contentType: service.imageContentType };
            // Corrected fallback logic (Example: Use icon if ID is 2 OR name is Carpenter OR no valid image content type)
            if (service.serviceId === 2 || service.serviceName === "Carpenter" || !service.imageContentType?.startsWith('image/')) {
                return { ...baseItem, iconName: 'hammer-outline', iconSet: 'ion' } as ServiceListItem;
            } else {
                 // Assuming imagePath is a full URL now, adjust if needed
                 // const imageUri = service.imagePath.startsWith('http') ? service.imagePath : `${BASE_URL}${service.imagePath}`;
                 const imageUri = service.imagePath; // Use directly if API provides full URL
                 return { ...baseItem, imageUri: imageUri } as ServiceListItem;
            }
        });
        setServices(formattedData);

      } catch (err: any) {
          console.error("Failed to fetch services:", err);
          setError(`Failed to load services: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  // --- Event Handlers ---
  // Removed handleLoginPress as button is now conditional

  const handleNewJobRequestPress = () => {
      // Check if logged in before allowing job request? Optional.
      if (!session) {
          Alert.alert("Login Required", "Please log in to create a job request.", [
              { text: "Cancel", style: "cancel" },
              { text: "Log In", onPress: () => router.push('/login') }
          ]);
      } else {
        router.push('/create-job-card');
      }
  };
  const handleViewAllServicesPress = () => router.push('/categories');
  const handleUrgentJobPress = () => Alert.alert("Urgent Job", "Urgent Job 24/7 action placeholder");
  const handleRegisterPress = () => setIsRegisterModalVisible(true);
  const handleSelectPartner = () => { setIsRegisterModalVisible(false); router.push('/register-partner'); };
  const handleSelectUser = () => { setIsRegisterModalVisible(false); router.push('/register'); };

  // --- Render Content for FlatList ---
  const renderListContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (services.length === 0) {
        return <Text style={styles.noDataText}>No services available at the moment.</Text>;
    }
    return (
      <FlatList
         data={services}
         renderItem={({item}) => <ServiceItem item={item} />}
         keyExtractor={(item) => item.id}
         numColumns={2}
         columnWrapperStyle={styles.serviceGridRow}
         scrollEnabled={false} // Scrolling handled by outer ScrollView
         contentContainerStyle={styles.servicesGridContainer}
         // extraData={services} // Not usually needed unless item identity changes without data ref changing
     />
    );
  }

  // --- Main Return JSX ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
       {/* Use Stack.Screen to configure header conditionally */}
       <Stack.Screen
            options={{
                headerShown: true,
                headerStyle: { backgroundColor: COLORS.background }, // Use consistent background
                headerTitle: () => <ThemedText style={styles.headerTitle}>Home</ThemedText>,
                headerTitleAlign: 'left', // Keep title left aligned
                headerRight: () => (
                    // Conditionally render Log In button
                    !session ? (
                        <TouchableOpacity onPress={() => router.push('/login')} style={{ marginRight: 15 }}>
                            <ThemedText style={styles.loginText}>LOG IN</ThemedText>
                        </TouchableOpacity>
                     ) : null // Render nothing in the right header if logged in
                ),
                // Prevent back button if needed (usually not for tabs)
                // headerLeft: () => null,
            }}
        />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>

        <View style={styles.bannerContainer}>
           <Image
             source={require('@/assets/images/banner.png')} // Ensure this asset exists
             style={styles.bannerImage}
             resizeMode='cover'
           />
        </View>

        <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Services</ThemedText>
            <TouchableOpacity onPress={handleUrgentJobPress}><ThemedText style={styles.urgentJobText}>Urgent Job 24/7</ThemedText></TouchableOpacity>
            <TouchableOpacity onPress={handleViewAllServicesPress}><ThemedText style={styles.viewAllText}>View All</ThemedText></TouchableOpacity>
        </View>

        {renderListContent()}

         <View style={styles.notFoundSection}>
           <ThemedText style={styles.notFoundText}>Didn't find your Service?</ThemedText>
           <ThemedText style={styles.notFoundSubText}>Don't worry, You can post your Requirement</ThemedText>
         </View>

        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}>
             <ThemedText style={styles.buttonText}>New Job Request</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRegisterPress}>
             <ThemedText style={styles.buttonText}>Register</ThemedText>
          </TouchableOpacity>
         </View>

      </ScrollView>

      {/* Register Type Modal */}
      <RegisterTypeModal
        visible={isRegisterModalVisible}
        onClose={() => setIsRegisterModalVisible(false)}
        onSelectPartner={handleSelectPartner}
        onSelectUser={handleSelectUser}
      />

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  scrollContentContainer: { paddingBottom: 20, },
  // Header Styles (Defined inline for Stack.Screen, or use constants)
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginLeft: 0 }, // Removed margin if headerTitleAlign: 'left'
  loginText: { fontSize: 14, fontWeight: 'bold', color: COLORS.accent, },
  // Banner
  bannerContainer: { height: 160, width: '100%', marginBottom: 20, backgroundColor: COLORS.bannerPlaceholderBg, },
  bannerImage: { width: '100%', height: '100%', },
  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15, },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, },
  urgentJobText: { fontSize: 14, fontWeight: 'bold', color: COLORS.urgentText, },
  viewAllText: { fontSize: 14, color: COLORS.accent, fontWeight: '500', },
  // Services Grid
   servicesGridContainer: { paddingHorizontal: 10, }, // Adjusted padding
  serviceGridRow: { justifyContent: 'space-around', }, // Use space-around maybe?
  serviceItem: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%', // Keep as percentage for responsiveness
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    minHeight: 140,
  },
  serviceItemImage: { width: 60, height: 60, marginBottom: 8, },
  serviceItemIcon: { marginBottom: 8, },
  serviceItemText: { fontSize: 14, textAlign: 'center', color: COLORS.textPrimary, fontWeight: '500', flexShrink: 1, paddingHorizontal: 4, },
  // Not Found Section
   notFoundSection: { alignItems: 'center', marginVertical: 25, paddingHorizontal: 15, },
   notFoundText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', },
   notFoundSubText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, textAlign: 'center', },
  // Bottom Buttons
  bottomButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 10, },
  button: { backgroundColor: COLORS.buttonBg, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center', },
  buttonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  // Loading/Error/No Data
  loadingIndicator: { marginTop: 50, height: 100, },
  errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, },
   noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, marginHorizontal: 15, fontSize: 16, height: 100, }
});