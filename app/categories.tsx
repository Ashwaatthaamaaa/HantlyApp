import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator, // Added
  Image, // Added
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Keep Ionicons for fallback/header
import { Stack, useRouter } from 'expo-router';

// --- Define Types based on API Response ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string;
  imageContentType: string;
}

// Interface for the item passed to FlatList/ListItemComponent
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
const BASE_URL = 'https://3.110.124.83';
// -----------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8',
  headerBg: '#696969', // Keep existing header style or adjust
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888', // For placeholder icon
  iconColor: '#696969', // Fallback icon color
  borderColor: '#E0E0E0',
  errorText: '#D9534F',
  accent: '#007AFF', // Optional: For interaction highlights
};

// --- Updated List Item Component ---
interface ListItemComponentProps {
  item: ServiceListItem;
  onPress: (item: ServiceListItem) => void;
}

const ListItemComponent: React.FC<ListItemComponentProps> = ({ item, onPress }) => {

    // Decide whether to render Image or Icon
    const renderVisual = () => {
        // Prioritize fallback icon if explicitly set (e.g., for Carpenter)
        if (item.iconName && item.iconSet === 'ion') {
            return (
                <Ionicons
                    name={item.iconName as any}
                    size={30} // Size for list item
                    color={COLORS.iconColor}
                    style={styles.itemVisual} // Use a shared style for visual elements
                />
            );
        }
        // Attempt to render the image if URI is present and content type is valid
        else if (item.imageUri && item.contentType?.startsWith('image/')) {
             return (
                 <Image
                     source={{ uri: item.imageUri }}
                     style={[styles.itemVisual, styles.itemImage]} // Apply base and specific image style
                     resizeMode="contain"
                 />
             );
        }
        // Default fallback icon
        else {
             return (
                 <Ionicons
                     name="help-circle-outline"
                     size={30}
                     color={COLORS.textSecondary}
                     style={styles.itemVisual}
                 />
             );
        }
    };

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {renderVisual()}
      <Text style={styles.itemText}>{item.name}</Text>
       {/* Optional: Add chevron or indicator for pressable action */}
       <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// --- Main Screen Component ---
export default function CategoriesScreen() {
  const router = useRouter();

  // State for API data, loading, and errors
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Services ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      console.log(`Workspaceing services from: ${url}`);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data: Service[] = await response.json();
            // Map API data, applying fallback logic
            const formattedData: ServiceListItem[] = data.map(service => {
                const baseItem = {
                    id: service.serviceId.toString(),
                    name: service.serviceName,
                    contentType: service.imageContentType,
                };
                if (service.serviceId === 2 || service.serviceName === "Carpenter" || !service.imageContentType?.startsWith('image/')) {
                    return { ...baseItem, iconName: 'hammer-outline', iconSet: 'ion' } as ServiceListItem;
                } else {
                    return { ...baseItem, imageUri: service.imagePath } as ServiceListItem;
                }
            });
            setServices(formattedData);
        } else {
            throw new Error("Received non-JSON response");
        }
      } catch (err: any) {
        console.error("Failed to fetch services:", err);
        setError(`Failed to load services: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);


  const handleServicePress = (service: ServiceListItem) => {
    // Placeholder action - Navigate to details or specific service screen
    Alert.alert('Service Pressed', `Maps to details for ${service.name}`);
    // Example navigation: router.push(`/service-details?serviceId=${service.id}`);
  };

  // --- Render List or Loading/Error State ---
   const renderListContent = () => {
     if (isLoading) {
       return <ActivityIndicator size="large" color={COLORS.headerBg} style={styles.loadingIndicator} />;
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
         renderItem={({ item }) => <ListItemComponent item={item} onPress={handleServicePress} />}
         keyExtractor={(item) => item.id}
         contentContainerStyle={styles.listContainer}
         showsVerticalScrollIndicator={false}
       />
     );
   };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg}/>
       {/* Configure header using Stack.Screen options */}
       <Stack.Screen
         options={{
           title: 'All Services', // Changed title
           headerStyle: { backgroundColor: COLORS.headerBg },
           headerTintColor: COLORS.headerText,
           headerTitleStyle: { fontWeight: 'bold' },
           headerTitleAlign: 'center',
           // Back button is handled by Stack Navigator automatically
         }}
       />

       {/* Render the list, loading indicator, or error message */}
       {renderListContent()}

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
    paddingHorizontal: 0, // List items will have their own padding
    paddingTop: 10,
    paddingBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12, // Adjust vertical padding
    paddingHorizontal: 15, // Adjust horizontal padding
    // Use borderBottom for separation instead of marginBottom
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    // Remove card-like shadow/elevation for a list appearance
  },
  itemVisual: {
    width: 40, // Consistent width for icon/image container
    height: 40, // Consistent height
    marginRight: 15, // Space between visual and text
    alignItems: 'center', // Center icon if it's smaller
    justifyContent: 'center', // Center icon
  },
  itemImage: {
    // Specific styles for image if needed (like borderRadius)
    // borderRadius: 4,
  },
  itemText: {
    flex: 1, // Allow text to take remaining space
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  loadingIndicator: {
      marginTop: 50,
  },
  errorText: {
      color: COLORS.errorText,
      textAlign: 'center',
      marginTop: 30,
      paddingHorizontal: 20,
      fontSize: 16,
  },
   noDataText: {
       color: COLORS.textSecondary,
       textAlign: 'center',
       marginTop: 30,
       paddingHorizontal: 20,
       fontSize: 16,
   }
});