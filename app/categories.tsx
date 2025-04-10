// File: app/categories.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert, // Import Alert
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router'; // Import useRouter
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { BASE_URL } from '@/constants/Api';

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
// -----------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8',
  headerBg: '#696969',
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  iconColor: '#696969',
  borderColor: '#E0E0E0',
  errorText: '#D9534F',
  accent: '#007AFF',
};

// --- Helper Function for Login/Register Prompt ---
const showLoginRegisterAlert = (router: any) => { // Use ReturnType<typeof useRouter> if possible
    Alert.alert(
        "Login Required",
        "Please log in or register to proceed.",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Log In", onPress: () => router.push('/login') },
            { text: "Register", onPress: () => router.push('/register') }
        ]
    );
};

// --- Updated List Item Component ---
interface ListItemComponentProps {
  item: ServiceListItem;
  onPress: (item: ServiceListItem) => void; // Keep the onPress prop
}

const ListItemComponent: React.FC<ListItemComponentProps> = ({ item, onPress }) => {

    // Decide whether to render Image or Icon
    const renderVisual = () => {
        if (item.iconName && item.iconSet === 'ion') {
            return (
                <Ionicons
                  name={item.iconName as any}
                  size={30}
                  color={COLORS.iconColor}
                  style={styles.itemVisual}
                />
            );
        }
        else if (item.imageUri && item.contentType?.startsWith('image/')) {
             return (
                 <Image
                     source={{ uri: item.imageUri }}
                     style={[styles.itemVisual, styles.itemImage]}
                     resizeMode="contain"
                 />
             );
        }
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
    // Call the passed onPress function when the item is pressed
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {renderVisual()}
      <Text style={styles.itemText}>{item.name}</Text>
       <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// --- Main Screen Component ---
export default function CategoriesScreen() {
  const router = useRouter(); // Get router instance
  const { session } = useAuth(); // Get session state

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


  // Updated handler for service press (includes login check)
  const handleServicePress = (service: ServiceListItem) => {
    if (!session) {
        // Use the helper function for the alert
        showLoginRegisterAlert(router);
    } else {
        // Logged-in user behavior (currently an alert)
        Alert.alert('Service Pressed', `Maps to details for ${service.name}`);
        // Example navigation for logged-in user:
        // router.push(`/service-details?serviceId=${service.id}`);
    }
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
         // Pass the updated handleServicePress to the component
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
           title: 'All Services',
           headerStyle: { backgroundColor: COLORS.headerBg },
           headerTintColor: COLORS.headerText,
           headerTitleStyle: { fontWeight: 'bold' },
           headerTitleAlign: 'center',
           // FIX: Add headerBackTitle to prevent "(tabs)" issue on iOS
           headerBackTitle: '',
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
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  itemVisual: {
    width: 40,
    height: 40,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    // borderRadius: 4, // Optional image border radius
  },
  itemText: {
    flex: 1,
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