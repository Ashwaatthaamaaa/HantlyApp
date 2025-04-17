// File: app/findPartners/[ticketId].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
// Note: BASE_URL might not be needed here if API call is mocked, but good practice
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n'; // Import t

// --- Types ---
interface MockPartner {
    companyId: number;
    companyName: string;
    logoImagePath?: string | null; // Optional logo
    // Add other fields if needed for display (e.g., rating)
}

// --- Colors ---
const COLORS = {
    background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555',
    accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
    borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC',
};

// --- Mock Data (Replace with API call when available) ---
const MOCK_PARTNERS: MockPartner[] = [
    { companyId: 58, companyName: "General Slutions", logoImagePath: "https://apihandyman.programmingtrends.com/CraftManImages/CompanyImages/04694475-30c8-4036-a5ce-321c7a2e9e9d.png" },
    { companyId: 57, companyName: "Doctor Fixit", logoImagePath: null },
    { companyId: 101, companyName: "Another Painter Co.", logoImagePath: null },
    // Add more mock partners as needed
];

export default function FindPartnersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const {
      ticketId: ticketIdParam,
      serviceType, // Example: Receiving service as string
      countyId,
      municipalityId
  } = useLocalSearchParams<{ ticketId: string, serviceType?: string, countyId?: string, municipalityId?: string }>();

  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;

  const [partners, setPartners] = useState<MockPartner[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Set true if making API call
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // --- MOCK IMPLEMENTATION ---
    setIsLoading(true);
    setError(null);
    console.log("Finding partners (mock) for:", { serviceType, countyId, municipalityId });

    // Simulate API delay and filtering (basic example, doesn't use criteria yet)
    setTimeout(() => {
        try {
            // In real implementation, call API here:
            // const response = await fetch(`${BASE_URL}/api/Company/FindMatchingPartners?ServiceType=${serviceType}&CountyId=${countyId}...`);
            // const data = await response.json();
            // setPartners(data);

            // Using Mock Data:
            // You could add filtering logic here based on params if needed for mock
            setPartners(MOCK_PARTNERS);

        } catch (err: any) {
            console.error("Error finding partners:", err);
            setError(t('failedloadpartners', { message: err.message })); // Use t() for error
        } finally {
            setIsLoading(false);
        }
    }, 1000); // Simulate 1 second delay

  }, [serviceType, countyId, municipalityId]); // Refetch if criteria change (though screen might not reload)


  const handleSelectPartner = (partner: MockPartner) => {
      if (!ticketId || !session || session.type !== 'user') {
          Alert.alert(t("error"), t("requiredinfomissing")); // Use existing t() keys
          return;
      }

      console.log(`Selected partner ${partner.companyName} (ID: ${partner.companyId}) for ticket ${ticketId}`);

      // Navigate to chat screen
      router.push({
          pathname: `/chat/[ticketId]`,
          params: {
              ticketId: ticketId.toString(),
              otherPartyId: partner.companyId.toString(),
              otherPartyName: partner.companyName,
              otherPartyType: 'partner', // User is chatting with a partner
          }
      });
  };

  // --- Render Partner List Item ---
  const renderPartnerItem = ({ item }: { item: MockPartner }) => (
      <TouchableOpacity style={styles.partnerCard} onPress={() => handleSelectPartner(item)}>
          <View style={styles.partnerLogoContainer}>
              {item.logoImagePath ? (
                  <Image source={{ uri: item.logoImagePath }} style={styles.partnerLogo} resizeMode="contain" />
              ) : (
                  <View style={styles.partnerLogoPlaceholder}>
                      <Ionicons name="business" size={24} color={COLORS.textSecondary} />
                  </View>
              )}
          </View>
          <Text style={styles.partnerName}>{item.companyName}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
  );

  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <Stack.Screen options={{ title: "Chat with companies",headerBackTitleVisible: false, }} /> */}

      <Stack.Screen
        options={{
          title: t('chatwithcompanies_title'), // Use t()
          headerBackTitle: '', // no back text
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
        }}
      />

      {isLoading && <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />}

      {!isLoading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          {/* Add retry button if needed */}
        </View>
      )}

      {!isLoading && !error && partners.length === 0 && (
          <View style={styles.centered}>
              <Text style={styles.noDataText}>{t('nopartnersfound')}</Text> // Use t()
          </View>
      )}

      {!isLoading && !error && partners.length > 0 && (
        <FlatList
          data={partners}
          renderItem={renderPartnerItem}
          keyExtractor={(item) => item.companyId.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', },
  listContainer: { paddingVertical: 15, paddingHorizontal: 10, },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    elevation: 1,
  },
  partnerLogoContainer: {
      width: 40, height: 40, borderRadius: 5, marginRight: 15,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: COLORS.iconPlaceholder, // Background for placeholder
      overflow: 'hidden',
  },
   partnerLogoPlaceholder: {
      // Styles for the placeholder view itself if needed
   },
  partnerLogo: { width: '100%', height: '100%', },
  partnerName: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
});