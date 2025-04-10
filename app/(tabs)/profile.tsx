// File: app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native'; // Removed Switch as it's no longer used
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { useAuth } from '@/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/constants/Api';

// --- Types (Keep UserProfile, PartnerProfile if needed, or define inline) ---
interface UserProfile {
  userId: number;
  userName: string;
  emailId: string;
  mobileNumber: string;
  countyName: string; // Assuming single for User based on current UI
  municipalityName: string; // Assuming single for User based on current UI
}

// Define CountyMaster and MunicipalityMaster types based on API response
interface CountyMaster {
    countyId: number;
    countyName: string | null;
}

interface MunicipalityMaster {
    municipalityId: number;
    municipalityName: string | null;
    countyId?: number; // Optional county info often included
    countyName?: string | null;
}

interface PartnerProfile {
    pCompId: number;
    companyName: string;
    emailId: string;
    companyRegistrationNumber: string;
    logoImagePath: string | null;
    companyPresentation: string | null;
    serviceList: { serviceName: string }[];
    mobileNumber: string;
    countyList: CountyMaster[] | null; // Use the defined type
    municipalityList: MunicipalityMaster[] | null; // Use the defined type
    // Add other fields if needed
}


// --- Base URL (Still needed for update API) ---

// --- Colors (Keep consistent) ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969',
  buttonText: '#FFFFFF', locationBg: '#F0F0F0', iconColor: '#555555',
  versionText: '#AAAAAA',
  // Removed switch colors
};

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isLoading: isAuthLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | PartnerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Removed isUpdatingStatus state

  // Modals visibility
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);

  // --- Fetch Profile Data ---
  useEffect(() => {
      const fetchProfileDetails = async () => {
          if (!session) {
              setIsLoadingProfile(false); setProfileData(null); setError(null);
              return;
          }
          setIsLoadingProfile(true); setError(null); setProfileData(null);
          const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
          const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`;
          try {
              console.log(`Workspaceing profile details from: ${detailUrl}`);
              const response = await fetch(detailUrl);
              if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Failed profile details (${response.status}): ${errorText}`);
              }
              const data = await response.json();
              console.log("Profile details received:", data);
              setProfileData(data);
          } catch (err: any) {
              console.error("Failed profile details:", err);
              setError(`Failed profile: ${err.message}`);
              setProfileData(null);
          } finally {
              setIsLoadingProfile(false);
          }
      };
      fetchProfileDetails();
  }, [session]);

  // --- Handlers ---
  const handleOpenLanguageModal = () => setIsLanguageModalVisible(true);
  const handleSelectLanguage = (language: 'en' | 'sv') => { Alert.alert("Language Change", `Selected: ${language === 'en' ? 'English' : 'Swedish'}. (Impl needed)`); };
  const handleResetPassword = () => setIsForgotModalVisible(true);
  const handleLogout = async () => { Alert.alert("Confirm Logout", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Log Out", style: "destructive", onPress: signOut }]); };
  // Removed handleToggle24x7


  // --- Render Logic ---
   if (isAuthLoading) { /* ... loading indicator ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
   if (!session) { /* ... logged out view ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><Ionicons name="person-circle-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} /><Text style={styles.loggedOutMessage}>Log in or create an account to view your profile.</Text><TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}><Text style={styles.loginButtonText}>LOG IN</Text></TouchableOpacity></View></SafeAreaView> ); }
   if (isLoadingProfile) { /* ... loading indicator ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
   if (error || !profileData) { /* ... error view ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/><Text style={styles.errorText}>{error || 'Could not load profile data.'}</Text><TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>Log Out</Text></TouchableOpacity></View></SafeAreaView> ); }

  // --- Render User or Partner Profile Content ---
   const renderContent = () => {
       if (session.type === 'user') {
           const user = profileData as UserProfile;
           // User profile rendering remains the same (assumes single county/muni)
           return (
               <>
                 {/* User Info Section */}
                 <View style={styles.userInfoSection}>
                     <View style={styles.profilePicPlaceholder}><Ionicons name="person" size={40} color={COLORS.textSecondary} /></View>
                     <View style={styles.userDetails}>
                         <Text style={styles.userName}>{user?.userName ?? 'N/A'}</Text>
                         <Text style={styles.userEmail}>{user?.emailId ?? session.email}</Text>
                     </View>
                 </View>
                 {/* Phone Number */}
                 <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{user?.mobileNumber ?? 'N/A'}</Text>
                 </View>
                  {/* County Section (User - assumes single) */}
                  <View style={[styles.infoRow, styles.locationSection]}>
                     <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View>
                     <Text style={styles.locationValue}>{user?.countyName ?? 'N/A'}</Text>
                  </View>
                  {/* Municipality Section (User - assumes single) */}
                   <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                     <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View>
                     <Text style={styles.locationValue}>{user?.municipalityName ?? 'N/A'}</Text>
                  </View>
               </>
           );
       } else { // Partner profile
           const partner = profileData as PartnerProfile;
           const serviceNames = partner?.serviceList?.map(s => s.serviceName).join(', ') || 'N/A';

           // --- FIX: De-duplicate County List ---
           const uniqueCounties = new Map<number, string | null>();
           partner?.countyList?.forEach(county => {
               if (county && !uniqueCounties.has(county.countyId)) {
                   uniqueCounties.set(county.countyId, county.countyName);
               }
           });
           const countyNames = Array.from(uniqueCounties.values()).filter(name => !!name).join(', ') || 'N/A';
           // -------------------------------------

            // --- FIX: De-duplicate Municipality List ---
           const uniqueMunicipalities = new Map<number, string | null>();
           partner?.municipalityList?.forEach(muni => {
               if (muni && !uniqueMunicipalities.has(muni.municipalityId)) {
                   uniqueMunicipalities.set(muni.municipalityId, muni.municipalityName);
               }
           });
           const municipalityNames = Array.from(uniqueMunicipalities.values()).filter(name => !!name).join(', ') || 'N/A';
           // -----------------------------------------

            return (
               <>
                   {/* Partner Info Section */}
                   <View style={styles.userInfoSection}>
                       {partner?.logoImagePath ? (
                           <Image source={{ uri: partner.logoImagePath }} style={styles.partnerLogo} resizeMode="contain" />
                       ) : (
                           <View style={[styles.profilePicPlaceholder, styles.partnerLogoPlaceholder]}><Ionicons name="business" size={30} color={COLORS.textSecondary} /></View>
                       )}
                       <View style={styles.userDetails}>
                           <Text style={styles.userName}>{partner?.companyName ?? 'N/A'}</Text>
                           <Text style={styles.userEmail}>{partner?.emailId ?? session.email}</Text>
                           <Text style={styles.regNumber}>Reg. No. {partner?.companyRegistrationNumber ?? 'N/A'}</Text>
                       </View>
                       {/* REMOVED 24x7 Toggle */}
                   </View>

                   {/* About Section */}
                   <View style={[styles.infoRow, styles.locationSection]}>
                       <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>About</Text></View>
                       <Text style={styles.locationValue}>{partner?.companyPresentation ?? 'N/A'}</Text>
                   </View>

                    {/* Service Category Section */}
                    <View style={[styles.infoRow, styles.locationSection]}>
                        <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Service Category</Text></View>
                        <Text style={styles.locationValue}>{serviceNames}</Text>
                    </View>

                   {/* Phone Number */}
                   <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                      <Text style={styles.infoText}>{partner?.mobileNumber ?? 'N/A'}</Text>
                   </View>

                    {/* County Section - Uses de-duplicated names */}
                    <View style={[styles.infoRow, styles.locationSection]}>
                        <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View>
                        <Text style={styles.locationValue}>{countyNames}</Text>
                    </View>

                    {/* Municipality Section - Uses de-duplicated names */}
                    <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                         <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View>
                        <Text style={styles.locationValue}>{municipalityNames}</Text>
                    </View>
               </>
           );
       }
   };

  // --- Main Return for Logged In User ---
  return (
    <SafeAreaView style={styles.safeArea}>
       <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
          headerRight: () => (
             <TouchableOpacity onPress={handleOpenLanguageModal} style={{ marginRight: 15 }} >
              <Ionicons name="settings-outline" size={24} color={COLORS.iconColor} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
         <View style={styles.container}>
             {renderContent()} {/* Render User or Partner content */}

             {/* Shared Actions */}
             <TouchableOpacity style={styles.actionRow} onPress={handleResetPassword}>
                <MaterialCommunityIcons name="lock-reset" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                <Text style={styles.actionText}>Reset Password</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
             </TouchableOpacity>

             <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Log Out</Text>
             </TouchableOpacity>

             <Text style={styles.versionText}>v0.0.1</Text>
         </View>
      </ScrollView>

       {/* Modals */}
      <ForgotPasswordModal
         visible={isForgotModalVisible}
        onClose={() => setIsForgotModalVisible(false)}
      />
      <LanguageSelectionModal
        visible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
        onSelectLanguage={handleSelectLanguage}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
// Styles remain largely the same, removed styles related to the switch
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 20, },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, },
  loggedOutMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24, },
  loginButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', },
  loginButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  userInfoSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 30, },
  profilePicPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.locationBg, justifyContent: 'center', alignItems: 'center', marginRight: 15, },
  partnerLogo: { width: 60, height: 60, borderRadius: 8, marginRight: 15, borderWidth: 1, borderColor: COLORS.borderColor },
  partnerLogoPlaceholder:{ borderRadius: 8, width: 60, height: 60, backgroundColor: COLORS.locationBg, justifyContent: 'center', alignItems: 'center', marginRight: 15},
  userDetails: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4, },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4, },
  regNumber: { fontSize: 12, color: COLORS.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, },
  locationSection: { backgroundColor: COLORS.locationBg, paddingHorizontal: 15, marginHorizontal: -15, alignItems: 'flex-start', paddingVertical: 10, },
  locationLabelContainer: { width: 120, // Adjust width as needed
    marginRight: 10, paddingTop: 2, },
  locationLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', },
  locationValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, lineHeight: 22, }, // Allow wrapping
  infoIcon: { marginRight: 15, },
  infoText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, marginTop: 20, },
  actionText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, },
  logoutButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 40, },
  logoutButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  versionText: { textAlign: 'center', marginTop: 20, marginBottom: 10, color: COLORS.versionText, fontSize: 12, },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', }
});