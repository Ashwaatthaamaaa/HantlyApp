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
import { useAuth } from '@/context/AuthContext';
import { BASE_URL } from '@/constants/Api';
import { sv } from '@/constants/translations/sv';

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
  // iconColor no longer needed for default service icons
  borderColor: '#E0E0E0',
  errorText: '#D9534F',
  accent: '#007AFF',
};

// --- Helper Function for Login/Register Prompt ---
const showLoginRegisterAlert = (router: any) => {
  Alert.alert(
    sv.loginsrequired,
    sv.logintoproceed,
    [
      { text: sv.cancel, style: "cancel" },
      { text: sv.login, onPress: () => router.push('/login') },
      { text: sv.register, onPress: () => router.push('/register') }
    ]
  );
};

// --- List Item Component with Fallback Removed ---
interface ListItemComponentProps {
  item: ServiceListItem;
  onPress: (item: ServiceListItem) => void;
}

const ListItemComponent: React.FC<ListItemComponentProps> = ({ item, onPress }) => {

    // Updated renderVisual to only show API image or nothing
    const renderVisual = () => {
        if (item.imageUri && item.contentType?.startsWith('image/')) {
             return (
                 <Image
                     source={{ uri: item.imageUri }}
                     style={[styles.itemVisual, styles.itemImage]}
                     resizeMode="contain"
                 />
             );
        }
        // Otherwise, render an empty view to maintain layout
        return <View style={styles.itemVisualPlaceholder} />;
        // Alternatively: return null;
    };

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {renderVisual()}
      <Text style={styles.itemText}>{item.name}</Text>
       <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

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
      setIsLoading(true); setError(null);
      const url = `${BASE_URL}/api/Service/GetServiceList`;
      try {
        const response = await fetch(url);
        if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${errorText}`); }
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data: Service[] = await response.json();
            // Updated mapping - removed fallback icon logic
            const formattedData: ServiceListItem[] = data.map(service => ({
                id: service.serviceId.toString(),
                name: service.serviceName,
                contentType: service.imageContentType,
                imageUri: service.imagePath, // Pass imagePath directly
            }));
            setServices(formattedData);
        } else { throw new Error("Received non-JSON response"); }
      } catch (err: any) { setError(`Failed to load services: ${err.message}`); }
      finally { setIsLoading(false); }
    };
    fetchServices();
  }, []);

  // Updated handler for service press (remains same logic as before)
  const handleServicePress = (service: ServiceListItem) => {
    if (!session) {
      showLoginRegisterAlert(router);
    } else if (session.type === 'user') {
      router.push({ pathname: '/create-job-card', params: { preselectedServiceId: service.id, preselectedServiceName: service.name } });
    } else {
      Alert.alert(sv.actionnotallowed, sv.onlyuserscancreate);
    }
  };

  // --- Render List or Loading/Error State (remains same) ---
   const renderListContent = () => { if (isLoading) { return <ActivityIndicator size="large" color={COLORS.headerBg} style={styles.loadingIndicator} />; } if (error) { return <Text style={styles.errorText}>{sv.failedtoloadservices} {error}</Text>; } if (services.length === 0) { return <Text style={styles.noDataText}>{sv.noservicesavailable}</Text>; } return ( <FlatList data={services} renderItem={({ item }) => <ListItemComponent item={item} onPress={handleServicePress} />} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} /> ); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg}/>
       <Stack.Screen
         options={{
           title: sv.allservices,
           headerStyle: { backgroundColor: COLORS.headerBg },
           headerTintColor: COLORS.headerText,
           headerTitleStyle: { fontWeight: 'bold' },
           headerTitleAlign: 'center',
           headerBackTitle: '',
         }}
       />
       {renderListContent()}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  listContainer: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 10, },
  itemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, },
  itemVisual: { // Style for the actual image
    width: 40, height: 40, marginRight: 15, alignItems: 'center', justifyContent: 'center', },
  itemVisualPlaceholder: { // Style for the empty space if no image
      width: 40, height: 40, marginRight: 15, },
  itemImage: { // Specific image styling if needed (like border radius)
    // borderRadius: 4,
  },
  itemText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500', },
  loadingIndicator: { marginTop: 50, },
  errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16, },
   noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16, }
});