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
  Alert,
  ActivityIndicator,
  Image, // Keep Image import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Keep Ionicons for header/chevrons
import { Stack, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg'; // <-- Import SvgXml
import { useAuth } from '@/context/AuthContext';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n'; // Import the translation function


// --- Define Types based on API Response ---
interface Service {
  serviceId: number;
  serviceName: string;
  imagePath: string | null; // Allow null
  imageContentType: string | null; // Allow null
}

interface ServiceListItem {
    id: string;
    name: string;
    imageUri?: string | null; // Allow null
    iconName?: string; // Keep for type consistency
    iconSet?: 'ion';
    contentType?: string | null; // Allow null
}
// -----------------------------------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8',
  headerBg: '#696969',
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  borderColor: '#E0E0E0',
  errorText: '#D9534F',
  accent: '#007AFF',
};
// -----------------------------------------

// --- Helper Function for Login/Register Prompt ---
const showLoginRegisterAlert = (router: any) => {
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
// -----------------------------------------

// --- Updated List Item Component using SvgXml ---
interface ListItemComponentProps {
  item: ServiceListItem;
  onPress: (item: ServiceListItem) => void;
}

const ListItemComponent: React.FC<ListItemComponentProps> = ({ item, onPress }) => {
    const [svgXml, setSvgXml] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<boolean>(false); // Track fetch errors

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
      }, [item.imageUri, item.contentType]); // Rerun if URI or type changes


    const renderVisual = () => {
        // Prioritize successfully fetched SVG XML
        if (svgXml) {
             return (
                 <SvgXml
                     xml={svgXml}
                     width="40" // Match existing style dimensions
                     height="40"
                     style={styles.itemVisual}
                 />
             );
        }
        // Fallback to standard Image if not SVG or if SVG fetch failed
        else if (item.imageUri && item.contentType?.startsWith('image/') && !fetchError) {
             return (
                 <Image
                     source={{ uri: item.imageUri }}
                     style={[styles.itemVisual, styles.itemImage]}
                     resizeMode="contain"
                     onError={(e) => {
                       // Handle image loading errors if needed
                       console.warn("Image load error for:", item.imageUri, e.nativeEvent.error);
                     }}
                 />
             );
        }
        // Placeholder if no image, unsupported type, or fetch error
        return <View style={styles.itemVisualPlaceholder} />;
    };

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {renderVisual()}
      <Text style={styles.itemText}>{item.name}</Text>
       <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};
// -----------------------------------------

// --- Main Screen Component ---
export default function CategoriesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Services ---
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data: Service[] = await response.json();
            // Pass content type and uri
            const formattedData: ServiceListItem[] = data.map(service => ({
                id: service.serviceId.toString(),
                name: service.serviceName,
                contentType: service.imageContentType,
                imageUri: service.imagePath,
            }));
            setServices(formattedData);
        } else {
          throw new Error("Received non-JSON response");
        }
      } catch (err: any) {
        setError(`Failed to load services: ${err.message}`);
      }
      finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);
  // -----------------------

  // --- Handle Service Press ---
  const handleServicePress = (service: ServiceListItem) => {
    if (!session) {
        showLoginRegisterAlert(router);
    } else if (session.type === 'user') {
         router.push({
             pathname: '/create-job-card',
             params: { preselectedServiceId: service.id, preselectedServiceName: service.name }
         });
    } else {
        Alert.alert("Action Not Allowed", "Only users can create job requests from services.");
    }
  };
  // --------------------------

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
   // -----------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg}/>
       {/* Stack Screen Options */}
        <Stack.Screen
          options={{
            title: 'All Services',
            headerBackTitle: '',
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: COLORS.headerBg },
            headerTintColor: COLORS.headerText,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 10 }}>
                <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
              </TouchableOpacity>
            )
          }}
        />
       {/* Render the list */}
       {renderListContent()}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background, },
    listContainer: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 10, },
    itemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, },
    // Common visual container style
    itemVisual: {
      width: 40, height: 40, marginRight: 15, alignItems: 'center', justifyContent: 'center',
    },
    itemVisualPlaceholder: { // Style for the empty space if no image
        width: 40, height: 40, marginRight: 15,
        // backgroundColor: '#eee', // Optional: for visibility during debugging
    },
    itemImage: { // Specific styling for standard <Image>
      // borderRadius: 4,
    },
    // itemSvg: { // Removed as SvgXml uses itemVisual directly
    // },
    itemText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500', },
    loadingIndicator: { marginTop: 50, },
    errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16, },
    noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16, }
});
// -------------