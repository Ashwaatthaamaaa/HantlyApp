// File: app/urgentJobList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity, // Keep for potential future row press action
  Image,
  ActivityIndicator,
  Alert,
  Linking // Keep Linking in case you want to make text pressable later
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Keep icons for placeholders etc.
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n';

// --- Types (Based on API Response) ---
interface CompanyInfo {
    username: string | null;
    active: boolean;
    pCompId: number; // This is the actual Company ID
    mobileNumber: string | null;
    contactPerson: string | null;
    emailId: string | null;
    is24X7?: boolean | null;
    companyName: string | null;
    companyRegistrationNumber: string | null;
    companyPresentation: string | null;
    logoImagePath: string | null;
    logoImageContentType: string | null;
}

// --- Colors ---
const COLORS = {
    background: '#F8F8F8', textPrimary: '#333333', textSecondary: '#555555',
    accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F',
    borderColor: '#E0E0E0', cardBg: '#FFFFFF', iconPlaceholder: '#CCCCCC',
    // Removed button colors
    retryButtonBg: '#696969',
    buttonText: '#FFFFFF', // For retry button
};

export default function UrgentJobListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch 24x7 Companies
  useFocusEffect(
    useCallback(() => {
      const fetchUrgentCompanies = async () => {
        if (!session || session.type !== 'user') {
            setError(t('accessdenied'));
            setIsLoading(false);
            setCompanies([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        const userId = session.id;
        const url = `${BASE_URL}/api/Company/GetCompany24X7ForUser?userId=${userId}`;
        console.log(`Workspaceing 24x7 companies from: ${url}`);
        try {
          const response = await fetch(url, { headers: { 'accept': 'text/plain' } });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch companies (${response.status}): ${errorText}`);
          }
          const responseText = await response.text();
          let data: CompanyInfo[] = [];
           try {
            data = JSON.parse(responseText);
           } catch (parseError) {
               console.error("Failed to parse 24x7 company list JSON:", parseError);
               console.log("Raw response text:", responseText);
               if (responseText.trim() === '' || responseText.toLowerCase().includes("not found") || responseText.toLowerCase().includes("no companies")) {
                   data = [];
               } else {
                   throw new Error("Received unexpected non-JSON response from server.");
               }
           }
          setCompanies(data);
        } catch (err: any) {
          console.error("Error fetching urgent companies:", err);
          setError(t('failedloadurgentcompanies', { message: err.message }));
          setCompanies([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUrgentCompanies();
    }, [session])
  );

  // --- Render List Item ---
  const renderCompanyItem = ({ item }: { item: CompanyInfo }) => (
    <View style={styles.companyCard}>
        <View style={styles.logoContainer}>
            {item.logoImagePath ? (
                <Image source={{ uri: item.logoImagePath }} style={styles.logo} resizeMode="contain" />
            ) : (
                <View style={styles.logoPlaceholder}>
                    <Ionicons name="business" size={24} color={COLORS.textSecondary} />
                </View>
            )}
        </View>
        <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{item.companyName || t('unknowncompany')}</Text>
            {item.contactPerson && <Text style={styles.contactPerson}>{t('contact')} {item.contactPerson}</Text>}
            {/* Display Contact Info as Text */}
            {item.mobileNumber && (
                <View style={styles.contactRow}>
                    <MaterialCommunityIcons name="phone" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/>
                    <Text style={styles.contactText}>{item.mobileNumber}</Text>
                </View>
            )}
            {item.emailId && (
                 <View style={styles.contactRow}>
                    <MaterialCommunityIcons name="email" size={16} color={COLORS.textSecondary} style={styles.contactIcon}/>
                    <Text style={styles.contactText}>{item.emailId}</Text>
                 </View>
            )}
            {/* Removed Action Buttons Container */}
         </View>
     </View>
  );

  // --- Render Loading State ---
  if (isLoading) {
    return (
        <SafeAreaView style={styles.safeArea}>
             <Stack.Screen options={{ title: t('loading') }} />
             <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator} />
        </SafeAreaView>
    );
  }

  // --- Render Error State ---
  if (error) {
      return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: t('error') }}/>
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/>
                <Text style={styles.errorText}>{error}</Text>
                {/* Provide a retry mechanism */}
                 {/* Using a simplified retry - re-running the effect can be complex here */}
                 {/* Best approach might be to navigate back and re-enter */}
                <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>{t('goback')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      );
  }

  // --- Render Main Content (List or No Data) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <Stack.Screen
        options={{
          title: t('urgentpartners'),
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: '', // Keep back button consistent
        }}
      /> */}

      <Stack.Screen
        options={{
          title: t('urgentjobpartners247'),
          headerBackTitle: '', // no back text
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
        }}
      />

      {companies.length === 0 ? (
         <View style={styles.centered}>
          <Text style={styles.noDataText}>{t('nopartnersavailable')}</Text>
        </View>
      ) : (
        <FlatList
          data={companies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item.pCompId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 20 },
   retryButton: { backgroundColor: COLORS.retryButtonBg, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, },
   retryButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', },
  listContainer: { paddingVertical: 15, paddingHorizontal: 10, },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to top for potentially wrapping text
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  logoContainer: {
      width: 50, height: 50, borderRadius: 8, marginRight: 15,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: COLORS.iconPlaceholder,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.borderColor,
  },
   logoPlaceholder: {
      // Styles for the placeholder view itself if needed
   },
  logo: { width: '100%', height: '100%', },
  companyDetails: { flex: 1, },
  companyName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  contactPerson: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4, // Add space between contact rows
  },
  contactIcon: {
      marginRight: 8,
      color: COLORS.textSecondary, // Use secondary color for icons
  },
  contactText: {
      fontSize: 14,
      color: COLORS.textPrimary, // Use primary color for text
      flexShrink: 1, // Allow text to wrap if needed
  },
  // Removed actionButtonsContainer, actionButton, actionButtonText styles
});