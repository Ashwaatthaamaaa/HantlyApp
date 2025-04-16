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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL } from '@/constants/Api';
import { SvgXml } from 'react-native-svg';

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
  headerBg: '#696969',
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  borderColor: '#E0E0E0',
  errorText: '#D9534F',
  accent: '#007AFF',
};

// --- Login Prompt ---
const showLoginRegisterAlert = (router: any) => {
  Alert.alert(
    'Login Required',
    'Please log in or register to proceed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log In', onPress: () => router.push('/login') },
      { text: 'Register', onPress: () => router.push('/register') },
    ]
  );
};

// --- List Item ---
interface ListItemComponentProps {
  item: ServiceListItem;
  onPress: (item: ServiceListItem) => void;
}

const ListItemComponent: React.FC<ListItemComponentProps> = ({ item, onPress }) => {
  const [svgXml, setSvgXml] = useState<string | null>(null);

  useEffect(() => {
    const loadSvg = async () => {
      if (item.imageUri?.endsWith('.svg')) {
        try {
          const res = await fetch(item.imageUri);
          const text = await res.text();
          setSvgXml(text);
        } catch (err) {
          console.log('SVG load error:', err);
        }
      }
    };
    loadSvg();
  }, [item.imageUri]);

  const renderVisual = () => {
    if (svgXml) {
      return <SvgXml xml={svgXml} width={40} height={40} />;
    } else if (item.imageUri && item.contentType?.startsWith('image/')) {
      return (
        <Image
          source={{ uri: item.imageUri }}
          style={[styles.itemVisual, styles.itemImage]}
          resizeMode="contain"
        />
      );
    }
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

// --- Main Screen ---
export default function CategoriesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true); setError(null);
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleServicePress = (service: ServiceListItem) => {
    if (!session) {
      showLoginRegisterAlert(router);
    } else if (session.type === 'user') {
      router.push({ pathname: '/create-job-card', params: { preselectedServiceId: service.id, preselectedServiceName: service.name } });
    } else {
      Alert.alert('Action Not Allowed', 'Only users can create job requests from services.');
    }
  };

  const renderListContent = () => {
    if (isLoading) return <ActivityIndicator size="large" color={COLORS.headerBg} style={styles.loadingIndicator} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (services.length === 0) return <Text style={styles.noDataText}>No services available.</Text>;
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
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
      {renderListContent()}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 10 },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  itemVisual: { width: 40, height: 40, marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  itemVisualPlaceholder: { width: 40, height: 40, marginRight: 15 },
  itemImage: {},
  itemText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
  loadingIndicator: { marginTop: 50 },
  errorText: { color: COLORS.errorText, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16 },
  noDataText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 30, paddingHorizontal: 20, fontSize: 16 },
});
