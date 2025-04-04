// File: app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react'; // Removed useCallback as fetchData moved to context
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native'; // Removed AppState for this example
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { SafeAreaView } from 'react-native-safe-area-context';

// --- REMOVED Placeholder AuthService ---

// --- Types (Keep UserProfile, PartnerProfile if needed, or define inline) ---
// These might need adjustment based on actual API response structure fetched AFTER login
interface UserProfile {
  userId: number;
  userName: string;
  emailId: string;
  mobileNumber: string;
  countyName: string;
  municipalityName: string;
}

interface PartnerProfile {
    pCompId: number;
    companyName: string;
    emailId: string;
    companyRegistrationNumber: string;
    logoImagePath: string | null;
    is24X7: boolean | null;
    companyPresentation: string | null;
    serviceList: { serviceName: string }[]; // Assuming this structure is fetched post-login
    mobileNumber: string;
    countyList: { countyName: string }[];
    municipalityList: { municipalityName: string }[];
}


// --- Base URL (Still needed for update API) ---
const BASE_URL = 'http://3.110.124.83:2030';

// --- Colors (Keep consistent) ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969',
  buttonText: '#FFFFFF', locationBg: '#F0F0F0', iconColor: '#555555',
  versionText: '#AAAAAA', switchThumb: '#FFFFFF', switchTrackTrue: '#696969',
  switchTrackFalse: '#CCCCCC',
};

export default function ProfileScreen() {
  const router = useRouter();
  // Use Auth Context
  const { session, signOut, isLoading: isAuthLoading } = useAuth();

  // State specific to this screen
  const [profileData, setProfileData] = useState<UserProfile | PartnerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); // Loading for profile fetch
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false); // For 24x7 toggle

  // Modals visibility
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);

  // --- Fetch Profile Data using Session info ---
  useEffect(() => {
      const fetchProfileDetails = async () => {
          if (!session) {
              // If session becomes null (e.g., due to logout elsewhere), redirect
              // This might be redundant if _layout handles it, but safe fallback
              // router.replace('/login');
              setIsLoadingProfile(false); // Not loading if no session
              setProfileData(null); // Ensure no stale data
              return;
          }

          setIsLoadingProfile(true);
          setError(null);

          // Determine endpoint based on session type
          const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
          const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`;

          try {
              console.log(`Workspaceing profile details from: ${detailUrl}`);
              const response = await fetch(detailUrl);
              if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Failed to fetch profile details (${response.status}): ${errorText}`);
              }
              const data = await response.json();
              console.log("Profile details received:", data);
              setProfileData(data); // Assuming API response matches UserProfile/PartnerProfile types

          } catch (err: any) {
              console.error("Failed to load profile details:", err);
              setError(`Failed to load profile: ${err.message}`);
          } finally {
              setIsLoadingProfile(false);
          }
      };

      fetchProfileDetails();

      // Rerun if the session email changes (e.g., user logs out and back in as someone else)
  }, [session]); // Depend on the session object from context


  // --- Handlers (Keep existing handlers) ---
  const handleOpenLanguageModal = () => setIsLanguageModalVisible(true);
  const handleSelectLanguage = (language: 'en' | 'sv') => {
    Alert.alert("Language Change", `Selected: ${language === 'en' ? 'English' : 'Swedish'}. (Implementation needed)`);
    // TODO: Implement actual language change logic
  };

  const handleResetPassword = () => setIsForgotModalVisible(true);

  // Use signOut from context
  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?",
        [{ text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => signOut() } // Call signOut from context
        ]
    );
  };

  // Keep Partner Specific: Toggle 24x7 Status handler
  const handleToggle24x7 = (currentValue: boolean | null) => {
      // Ensure session and companyId exist
      if (!session || session.type !== 'partner' || typeof session.id === 'undefined') return;

      const newValue = !currentValue;
      const message = `Change Status to Working 24x7 to ${newValue ? 'Yes' : 'No'}?`;

      Alert.alert("Confirm Availability", message,
          [{ text: "CANCEL", style: "cancel" },
              { text: "YES", onPress: async () => {
                      setIsUpdatingStatus(true);
                      // Use session.id which holds the companyId for partners
                      const url = `${BASE_URL}/api/Company/UpdateCompanyIs24X7?companyId=${session.id}&is24X7=${newValue}`;
                      try {
                          const response = await fetch(url, { method: 'POST' });
                           if (!response.ok) {
                              const errorText = await response.text();
                              throw new Error(`Failed to update status (${response.status}): ${errorText}`);
                          }
                           // Update local state on success
                           setProfileData(prev => {
                               // Type guard to ensure prev is PartnerProfile
                               if (prev && 'is24X7' in prev) {
                                   return { ...prev, is24X7: newValue };
                               }
                               return prev;
                           });
                           Alert.alert("Status Updated", `Availability set to ${newValue ? '24x7' : 'Regular Hours'}.`);
                      } catch (err: any) {
                           console.error("Failed to update 24x7 status:", err);
                           Alert.alert("Error", `Could not update status: ${err.message}`);
                      } finally {
                           setIsUpdatingStatus(false);
                      }
                  }
              }
          ]
      );
  };


  // --- Render Logic ---

   // Handle Auth Loading state from context
   if (isAuthLoading) {
       return <View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
   }

   // Handle Profile Data Loading state
   if (isLoadingProfile) {
        return <View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
   }

  // Error State
  if (error && !profileData) {
    return <View style={styles.containerCentered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  // If session is null now (e.g., logout finished), layout effect should redirect
  // If profileData is null but session exists, show error or loading indicator
   if (!session || !profileData) {
       return (
          <SafeAreaView style={styles.safeArea}>
               <Stack.Screen options={{ title: 'Profile' }} />
               <View style={styles.containerCentered}>
                  {error ? <Text style={styles.errorText}>{error}</Text> : <Text>Could not load profile data.</Text>}
                  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                      <Text style={styles.logoutButtonText}>Log Out</Text>
                   </TouchableOpacity>
              </View>
          </SafeAreaView>
       );
   }

  // --- Render User or Partner Profile ---
   const renderContent = () => {
       // Use session.type from context
       if (session.type === 'user') {
           const user = profileData as UserProfile; // Cast based on type check
           // ... (Keep User UI rendering from previous version) ...
           return (
               <>
                 {/* User Info Section */}
                 <View style={styles.userInfoSection}>
                     <View style={styles.profilePicPlaceholder}><Ionicons name="person" size={40} color={COLORS.textSecondary} /></View>
                     <View style={styles.userDetails}>
                         {/* Use optional chaining or provide defaults */}
                         <Text style={styles.userName}>{user?.userName ?? 'N/A'}</Text>
                         <Text style={styles.userEmail}>{user?.emailId ?? session.email}</Text> {/* Fallback to session email */}
                     </View>
                 </View>
                 {/* Phone Number */}
                 <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{user?.mobileNumber ?? 'N/A'}</Text>
                 </View>
                  {/* County Section */}
                  <View style={[styles.infoRow, styles.locationSection]}>
                     <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View>
                     <Text style={styles.locationValue}>{user?.countyName ?? 'N/A'}</Text>
                  </View>
                  {/* Municipality Section */}
                   <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                     <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View>
                     <Text style={styles.locationValue}>{user?.municipalityName ?? 'N/A'}</Text>
                  </View>
               </>
           );
       } else { // Implies session.type === 'partner'
           const partner = profileData as PartnerProfile; // Cast based on type check
           const serviceNames = partner?.serviceList?.map(s => s.serviceName).join(', ') || 'N/A';
           const countyNames = partner?.countyList?.map(c => c.countyName).join(', ') || 'N/A';
           const municipalityNames = partner?.municipalityList?.map(m => m.municipalityName).join(', ') || 'N/A';
           // ... (Keep Partner UI rendering from previous version) ...
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
                       {/* 24x7 Toggle Area */}
                       <View style={styles.statusToggle}>
                           <Switch
                               trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.switchTrackTrue }}
                               thumbColor={COLORS.switchThumb}
                               ios_backgroundColor={COLORS.switchTrackFalse}
                               onValueChange={() => handleToggle24x7(partner?.is24X7 ?? false)}
                               value={!!partner?.is24X7}
                               disabled={isUpdatingStatus}
                           />
                           <Text style={styles.statusText}> 24x7</Text>
                            {isUpdatingStatus && <ActivityIndicator size="small" color={COLORS.accent} style={{marginLeft: 5}}/>}
                       </View>
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

                    {/* County Section */}
                    <View style={[styles.infoRow, styles.locationSection]}>
                        <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View>
                        <Text style={styles.locationValue}>{countyNames}</Text>
                    </View>

                    {/* Municipality Section */}
                    <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                        <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View>
                        <Text style={styles.locationValue}>{municipalityNames}</Text>
                    </View>
               </>
           );
       }
   };

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
            <TouchableOpacity onPress={handleOpenLanguageModal} style={{ marginRight: 15 }} disabled={isUpdatingStatus}>
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
                <Text style={styles.logoutButtonText}>LogOut</Text>
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

// --- Styles (Keep existing styles) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  scrollView: { flex: 1, },
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 20, },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, },
  userInfoSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 30, },
  profilePicPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.locationBg, justifyContent: 'center', alignItems: 'center', marginRight: 15, },
  partnerLogo: { width: 60, height: 60, borderRadius: 8, marginRight: 15, borderWidth: 1, borderColor: COLORS.borderColor },
  partnerLogoPlaceholder:{ borderRadius: 8 },
  userDetails: { flex: 1, },
  userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4, },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4, },
  regNumber: { fontSize: 12, color: COLORS.textSecondary },
  statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 10, paddingTop: 4, },
  statusText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, },
  locationSection: { backgroundColor: COLORS.locationBg, paddingHorizontal: 15, marginHorizontal: -15, alignItems: 'flex-start', paddingVertical: 10, },
  locationLabelContainer: { width: 120, marginRight: 10, paddingTop: 2, },
  locationLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', },
  locationValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, lineHeight: 22, },
  infoIcon: { marginRight: 15, },
  infoText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, marginTop: 20, },
  actionText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, },
  logoutButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 40, },
  logoutButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', },
  versionText: { textAlign: 'center', marginTop: 20, marginBottom: 10, color: COLORS.versionText, fontSize: 12, },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', }
});