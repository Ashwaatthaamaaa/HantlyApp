// File: app/(tabs)/home.tsx
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
import { useRouter } from 'expo-router'; // Ensure this is imported
import { ThemedText } from '@/components/ThemedText'; //
import { Ionicons } from '@expo/vector-icons'; // [cite: 301]
import RegisterTypeModal from '@/components/RegisterTypeModal'; //
// Import the Register Type modal

// --- Define Types based on API Response ---
interface Service {
  serviceId: number; // [cite: 303]
  serviceName: string; // [cite: 303]
  imagePath: string; // [cite: 303]
  imageContentType: string; // Include content type for checking [cite: 303]
}

// Interface for the item passed to FlatList/ServiceItem
interface ServiceListItem {
    id: string; // [cite: 304]
    name: string; // [cite: 304]
    imageUri?: string; // Make optional // [cite: 304]
    iconName?: string; // [cite: 305]
    // Optional icon name for fallback // [cite: 305]
    iconSet?: 'ion'; // [cite: 306]
    // Optional icon set (add others if needed) // [cite: 306]
    contentType?: string; // [cite: 307]
    // Store content type to help decide rendering // [cite: 307]
}
// -----------------------------------------


// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030'; // [cite: 308]
// -----------------

// --- Approximate Colors ---
const COLORS = { // [cite: 309]
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
    item: ServiceListItem; // [cite: 310]
}
const ServiceItem: React.FC<ServiceItemProps> = ({ item }) => { // [cite: 310]
    const router = useRouter(); // [cite: 311]
    const handleItemPress = () => { // [cite: 311]
        Alert.alert("Service Pressed", item.name); // [cite: 311]
        // Navigate to specific service category: // [cite: 312]
        // router.push(`/services?category=${item.id}`); // [cite: 312]
    } // [cite: 313]

    // Decide whether to render Image or Icon
    const renderContent = () => { // [cite: 313]
        // Prioritize fallback icon if explicitly set (e.g., for Carpenter)
        if (item.iconName && item.iconSet === 'ion') { // [cite: 313]
            return (
                <Ionicons
                    name={item.iconName as any} // [cite: 314]
                    size={60} // [cite: 314]
                    color={COLORS.iconColor} // [cite: 314]
                    style={styles.serviceItemIcon} // [cite: 314]
                />
            ); // [cite: 315]
        } // [cite: 315]
        // Otherwise, attempt to render the image if URI is present and looks valid
        else if (item.imageUri && item.contentType?.startsWith('image/')) { // [cite: 315]
             return (
                 <Image
                     source={{ uri: item.imageUri }} // [cite: 315]
                     style={styles.serviceItemImage} // [cite: 316]
                     resizeMode="contain" // [cite: 316]
                     // onError={(e) => console.log(`Failed to load image: ${item.imageUri}`)} // Optional error handling // [cite: 316]
                 />
             ); // [cite: 317]
        } // [cite: 317]
        // Default fallback icon
        else { // [cite: 317]
             return (
                 <Ionicons
                     name="help-circle-outline" // [cite: 317]
                     size={60} // [cite: 317]
                     color={COLORS.textSecondary} // [cite: 318]
                     style={styles.serviceItemIcon} // [cite: 318]
                 />
             ); // [cite: 319]
        } // [cite: 319]
    };

    return (
        <TouchableOpacity style={styles.serviceItem} onPress={handleItemPress}>
            {renderContent()}
            <ThemedText style={styles.serviceItemText}>{item.name}</ThemedText>
        </TouchableOpacity>
    ); // [cite: 320]
};


// --- Main Home Screen Component ---
export default function HomeScreen() { // [cite: 320]
  const router = useRouter(); // [cite: 321] Initialize router
  const [services, setServices] = useState<ServiceListItem[]>([]); // [cite: 321]
  const [isLoading, setIsLoading] = useState<boolean>(true); // [cite: 321]
  const [error, setError] = useState<string | null>(null); // [cite: 321]
  // State for the Register Type modal // [cite: 322]
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState<boolean>(false); // [cite: 322]

  // --- Fetch Services ---
  useEffect(() => { // [cite: 323]
    const fetchServices = async () => { // [cite: 323]
      setIsLoading(true); setError(null); // [cite: 323]
      const url = `${BASE_URL}/api/Service/GetServiceList`; // [cite: 323]
      try { // [cite: 323]
        const response = await fetch(url); // [cite: 323]
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); } // [cite: 323]
        const contentType = response.headers.get("content-type"); // [cite: 323]
        if (contentType?.includes("application/json")) { // [cite: 323]
            const data: Service[] = await response.json(); // [cite: 324]
            // Map API data, applying fallback logic for Carpenter
            const formattedData: ServiceListItem[] = data.map(service => { // [cite: 324]
                const baseItem = { id: service.serviceId.toString(), name: service.serviceName, contentType: service.imageContentType }; // [cite: 324]
                if (service.serviceId === 2 || service.serviceName === "Carpenter" || !service.imageContentType?.startsWith('image/')) { // [cite: 324]
                    return { ...baseItem, iconName: 'hammer-outline', iconSet: 'ion' } as ServiceListItem; // [cite: 325]
                } else { // [cite: 326]
                    return { ...baseItem, imageUri: service.imagePath } as ServiceListItem; // [cite: 326]
                } // [cite: 327]
            }); // [cite: 327]
            setServices(formattedData); // [cite: 327]
        } else { throw new Error("Received non-JSON response"); } // [cite: 328]
      } catch (err: any) { console.error("Failed to fetch services:", err); // [cite: 328]
        setError(`Failed to load services: ${err.message}`); } // [cite: 329]
      finally { setIsLoading(false); } // [cite: 329]
    };
    fetchServices(); // [cite: 329]
  }, []); // [cite: 330]

  // --- Event Handlers ---
  const handleLoginPress = () => router.push('/login'); // [cite: 330]

  // *** Updated handler to navigate to create-job-card ***
  const handleNewJobRequestPress = () => { // [cite: 331]
      router.push('/create-job-card'); // Navigate to the new screen
  };
  // ****************************************************

  const handleViewAllServicesPress = () => router.push('/categories'); // [cite: 331]
  const handleUrgentJobPress = () => Alert.alert("Urgent Job", "Urgent Job 24/7 action placeholder"); // [cite: 332]
  const handleRegisterPress = () => setIsRegisterModalVisible(true); // [cite: 332]
  // Show modal // [cite: 333]
  const handleSelectPartner = () => { setIsRegisterModalVisible(false); router.push('/register-partner'); }; // [cite: 333]
  const handleSelectUser = () => { setIsRegisterModalVisible(false); // [cite: 333]
    router.push('/register'); }; // [cite: 334]


  // --- Render Content for FlatList ---
  const renderListContent = () => { // [cite: 334]
    if (isLoading) { // [cite: 334]
      return <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />; // [cite: 334]
    } // [cite: 335]
    if (error) { // [cite: 335]
      return <Text style={styles.errorText}>{error}</Text>; // [cite: 335]
    } // [cite: 336]
    if (services.length === 0) { // [cite: 336]
        return <Text style={styles.noDataText}>No services available at the moment.</Text>; // [cite: 336]
    } // [cite: 337]
    return (
      <FlatList
         data={services} // [cite: 337]
         renderItem={({item}) => <ServiceItem item={item} />} // [cite: 337]
         keyExtractor={(item) => item.id} // [cite: 337]
         numColumns={2} // [cite: 337]
         columnWrapperStyle={styles.serviceGridRow} // [cite: 337]
         scrollEnabled={false} // Scrolling handled by outer ScrollView // [cite: 337]
         contentContainerStyle={styles.servicesGridContainer} // [cite: 337]
         extraData={services} // [cite: 337]
     /> // [cite: 338]
    ); // [cite: 338]
  }

  // --- Main Return JSX ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
        <TouchableOpacity onPress={handleLoginPress}>
            <ThemedText style={styles.loginText}>LOG IN</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>

        <View style={styles.bannerContainer}>
           <Image // [cite: 339]
             source={require('@/assets/images/banner.png')} // [cite: 339]
             style={styles.bannerImage} // [cite: 339]
             resizeMode='cover' // [cite: 339]
           />
        </View>

        <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Services</ThemedText>
            <TouchableOpacity onPress={handleUrgentJobPress}><ThemedText style={styles.urgentJobText}>Urgent Job 24/7</ThemedText></TouchableOpacity> // [cite: 339]
            <TouchableOpacity onPress={handleViewAllServicesPress}><ThemedText style={styles.viewAllText}>View All</ThemedText></TouchableOpacity> // [cite: 340]
        </View>
        {renderListContent()}
         <View style={styles.notFoundSection}>
           <ThemedText style={styles.notFoundText}>Didn't find your Service?</ThemedText>
           <ThemedText style={styles.notFoundSubText}>Don't worry, You can post your Requirement</ThemedText>
         </View>

        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}> {/* Ensure onPress calls the updated handler */}
             <ThemedText style={styles.buttonText}>New Job Request</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRegisterPress}>
             <ThemedText style={styles.buttonText}>Register</ThemedText>
          </TouchableOpacity> // [cite: 341]
        </View>

      </ScrollView>

      <RegisterTypeModal
        visible={isRegisterModalVisible} // [cite: 341]
        onClose={() => setIsRegisterModalVisible(false)} // [cite: 341]
        onSelectPartner={handleSelectPartner} // [cite: 341]
        onSelectUser={handleSelectUser} // [cite: 341]
      />

    </SafeAreaView>
  ); // [cite: 342]
}

// --- Styles ---
const styles = StyleSheet.create({ // [cite: 342]
  safeArea: { // [cite: 342]
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: { // [cite: 342]
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  headerTitle: { // [cite: 342]
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
   loginText: { // [cite: 342]
     fontSize: 14,
     fontWeight: 'bold', // [cite: 343]
     color: COLORS.accent,
   }, // [cite: 343]
  scrollView: { // [cite: 343]
    flex: 1,
  },
  scrollContentContainer: { // [cite: 343]
    paddingBottom: 20,
  },
  bannerContainer: { // [cite: 343]
    height: 160, // Adjust height as needed
    width: '100%',
    marginBottom: 20,
    backgroundColor: COLORS.bannerPlaceholderBg, // Background if image fails
  },
  bannerImage: { // [cite: 343]
    width: '100%',
    height: '100%',
  },
  sectionHeader: { // [cite: 343]
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15, // [cite: 344]
    // marginTop: 10, // Removed explicit top margin // [cite: 344]
    marginBottom: 15, // [cite: 344]
  },
  sectionTitle: { // [cite: 344]
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  urgentJobText: { // [cite: 344]
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.urgentText,
  },
   viewAllText: { // [cite: 344]
     fontSize: 14,
     color: COLORS.accent,
     fontWeight: '500',
   },
   servicesGridContainer: { // [cite: 344]
       paddingHorizontal: 15, // Padding for the grid items // [cite: 345]
   }, // [cite: 345]
  serviceGridRow: { // [cite: 345]
    justifyContent: 'space-between',
  },
  serviceItem: { // [cite: 345]
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
    minHeight: 140, // [cite: 346]
  },
  serviceItemImage: { // [cite: 346]
      width: 60,
      height: 60,
      marginBottom: 8,
  },
  serviceItemIcon: { // [cite: 346]
      marginBottom: 8,
  },
  serviceItemText: { // [cite: 346]
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    paddingHorizontal: 4,
  },
   notFoundSection: { // [cite: 346]
     alignItems: 'center',
     marginVertical: 25,
     paddingHorizontal: 15,
   }, // [cite: 347]
   notFoundText: { // [cite: 347]
     fontSize: 16,
     fontWeight: 'bold',
     color: COLORS.textPrimary,
     textAlign: 'center',
   },
   notFoundSubText: { // [cite: 347]
     fontSize: 14,
     color: COLORS.textSecondary,
     marginTop: 5,
     textAlign: 'center',
   },
  bottomButtonsContainer: { // [cite: 347]
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 10,
  },
  button: { // [cite: 347]
     backgroundColor: COLORS.buttonBg, // [cite: 348]
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: { // [cite: 348]
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: { // [cite: 348]
    marginTop: 50,
    height: 100, // Give loading indicator space
  },
  errorText: { // [cite: 348]
      color: COLORS.errorText,
      textAlign: 'center',
      marginTop: 20,
      marginHorizontal: 15, // [cite: 349]
      fontSize: 16,
      height: 100, // Give error message space
  }, // [cite: 349]
   noDataText: { // [cite: 349]
       color: COLORS.textSecondary,
       textAlign: 'center',
       marginTop: 20,
       marginHorizontal: 15,
       fontSize: 16,
       height: 100, // Give no data message space
   }
}); // [cite: 349]