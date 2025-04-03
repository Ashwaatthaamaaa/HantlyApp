import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image, // Import Image component
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import RegisterTypeModal from '@/components/RegisterTypeModal'; // Import the Register Type modal

// --- Define Types based on API Response ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string;
  imageContentType: string; // Include content type for checking
}

// Interface for the item passed to FlatList/ServiceItem
interface ServiceListItem {
    id: string;
    name: string;
    imageUri?: string; // Make optional
    iconName?: string; // Optional icon name for fallback
    iconSet?: 'ion'; // Optional icon set (add others if needed)
    contentType?: string; // Store content type to help decide rendering
}
// -----------------------------------------


// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';
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
  bannerPlaceholderBg: '#E0E0E0', // Kept in case image fails to load
  errorText: '#D9534F', // Added for error messages
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

    // Decide whether to render Image or Icon
    const renderContent = () => {
        // Prioritize fallback icon if explicitly set (e.g., for Carpenter)
        if (item.iconName && item.iconSet === 'ion') {
            return (
                <Ionicons
                    name={item.iconName as any}
                    size={60}
                    color={COLORS.iconColor}
                    style={styles.serviceItemIcon}
                />
            );
        }
        // Otherwise, attempt to render the image if URI is present and looks valid
        else if (item.imageUri && item.contentType?.startsWith('image/')) {
             return (
                 <Image
                     source={{ uri: item.imageUri }}
                     style={styles.serviceItemImage}
                     resizeMode="contain"
                     // onError={(e) => console.log(`Failed to load image: ${item.imageUri}`)} // Optional error handling
                 />
             );
        }
        // Default fallback icon
        else {
             return (
                 <Ionicons
                     name="help-circle-outline"
                     size={60}
                     color={COLORS.textSecondary}
                     style={styles.serviceItemIcon}
                 />
             );
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
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for the Register Type modal
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState<boolean>(false);

  // --- Fetch Services ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true); setError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      try {
        const response = await fetch(url);
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data: Service[] = await response.json();
            // Map API data, applying fallback logic for Carpenter
            const formattedData: ServiceListItem[] = data.map(service => {
                const baseItem = { id: service.serviceId.toString(), name: service.serviceName, contentType: service.imageContentType };
                if (service.serviceId === 2 || service.serviceName === "Carpenter" || !service.imageContentType?.startsWith('image/')) {
                    return { ...baseItem, iconName: 'hammer-outline', iconSet: 'ion' } as ServiceListItem;
                } else {
                    return { ...baseItem, imageUri: service.imagePath } as ServiceListItem;
                }
            });
            setServices(formattedData);
        } else { throw new Error("Received non-JSON response"); }
      } catch (err: any) { console.error("Failed to fetch services:", err); setError(`Failed to load services: ${err.message}`); }
      finally { setIsLoading(false); }
    };
    fetchServices();
  }, []);

  // --- Event Handlers ---
  const handleLoginPress = () => router.push('/login');
  const handleNewJobRequestPress = () => Alert.alert("Placeholder", "Navigate to New Job Request screen");
  const handleViewAllServicesPress = () => router.push('/categories');
  const handleUrgentJobPress = () => Alert.alert("Urgent Job", "Urgent Job 24/7 action placeholder");
  const handleRegisterPress = () => setIsRegisterModalVisible(true); // Show modal
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
         extraData={services}
      />
    );
  }

  // --- Main Return JSX ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
        <TouchableOpacity onPress={handleLoginPress}>
            <ThemedText style={styles.loginText}>LOG IN</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>

        {/* Updated Image Banner */}
        <View style={styles.bannerContainer}>
          <Image
             source={require('@/assets/images/banner.png')} // Path using alias
             style={styles.bannerImage}
             resizeMode='cover'
           />
        </View>

        {/* Services Section */}
        <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Services</ThemedText>
            <TouchableOpacity onPress={handleUrgentJobPress}><ThemedText style={styles.urgentJobText}>Urgent Job 24/7</ThemedText></TouchableOpacity>
            <TouchableOpacity onPress={handleViewAllServicesPress}><ThemedText style={styles.viewAllText}>View All</ThemedText></TouchableOpacity>
        </View>
        {renderListContent()} {/* Render FlatList, Loading, or Error */}

         {/* Didn't Find Service Section */}
         <View style={styles.notFoundSection}>
           <ThemedText style={styles.notFoundText}>Didn't find your Service?</ThemedText>
           <ThemedText style={styles.notFoundSubText}>Don't worry, You can post your Requirement</ThemedText>
         </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}><ThemedText style={styles.buttonText}>New Job Request</ThemedText></TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRegisterPress}><ThemedText style={styles.buttonText}>Register</ThemedText></TouchableOpacity>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
   loginText: {
     fontSize: 14,
     fontWeight: 'bold',
     color: COLORS.accent,
   },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  bannerContainer: {
    height: 160, // Adjust height as needed
    width: '100%',
    marginBottom: 20,
    backgroundColor: COLORS.bannerPlaceholderBg, // Background if image fails
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    // marginTop: 10, // Removed explicit top margin
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  urgentJobText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.urgentText,
  },
   viewAllText: {
     fontSize: 14,
     color: COLORS.accent,
     fontWeight: '500',
   },
   servicesGridContainer: {
       paddingHorizontal: 15, // Padding for the grid items
   },
  serviceGridRow: {
    justifyContent: 'space-between',
  },
  serviceItem: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    minHeight: 140,
  },
  serviceItemImage: {
      width: 60,
      height: 60,
      marginBottom: 8,
  },
  serviceItemIcon: {
      marginBottom: 8,
  },
  serviceItemText: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    paddingHorizontal: 4,
  },
   notFoundSection: {
     alignItems: 'center',
     marginVertical: 25,
     paddingHorizontal: 15,
   },
   notFoundText: {
     fontSize: 16,
     fontWeight: 'bold',
     color: COLORS.textPrimary,
     textAlign: 'center',
   },
   notFoundSubText: {
     fontSize: 14,
     color: COLORS.textSecondary,
     marginTop: 5,
     textAlign: 'center',
   },
  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 10,
  },
  button: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: 50,
    height: 100, // Give loading indicator space
  },
  errorText: {
      color: COLORS.errorText,
      textAlign: 'center',
      marginTop: 20,
      marginHorizontal: 15,
      fontSize: 16,
      height: 100, // Give error message space
  },
   noDataText: {
       color: COLORS.textSecondary,
       textAlign: 'center',
       marginTop: 20,
       marginHorizontal: 15,
       fontSize: 16,
       height: 100, // Give no data message space
   }
});