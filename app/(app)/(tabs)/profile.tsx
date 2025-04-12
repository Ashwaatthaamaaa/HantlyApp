// File: app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native'; // Re-added Switch
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { useAuth } from '@/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/constants/Api';

// --- Types ---
interface UserProfile { /* ... same as before ... */ userId: number; username: string; emailId: string; mobileNumber: string; countyName: string; municipalityName: string; }
interface CountyMaster { /* ... same as before ... */ countyId: number; countyName: string | null; }
interface MunicipalityMaster { /* ... same as before ... */ municipalityId: number; municipalityName: string | null; countyId?: number; countyName?: string | null; }

interface PartnerProfile {
    pCompId: number;
    username: string;
    emailId: string;
    companyRegistrationNumber: string;
    logoImagePath: string | null;
    is24X7: boolean | null; // Keep this field
    companyPresentation: string | null;
    serviceList: { serviceName: string }[];
    mobileNumber: string;
    countyList: CountyMaster[] | null;
    municipalityList: MunicipalityMaster[] | null;
}

// --- Colors ---
const COLORS = {
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555',
  accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333',
  error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969',
  buttonText: '#FFFFFF', locationBg: '#F0F0F0', iconColor: '#555555',
  versionText: '#AAAAAA',
  // Re-add switch colors
  switchThumb: '#FFFFFF', switchTrackTrue: '#696969', switchTrackFalse: '#CCCCCC',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isLoading: isAuthLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | PartnerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Re-add state for toggle update
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Modals visibility
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);

  // --- Fetch Profile Data (remains same) ---
  useEffect(() => { /* ... fetch logic ... */ const fetchProfileDetails = async () => { if (!session) { setIsLoadingProfile(false); setProfileData(null); setError(null); return; } setIsLoadingProfile(true); setError(null); setProfileData(null); const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail'; const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`; try { const response = await fetch(detailUrl); if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed profile details (${response.status}): ${errorText}`); } const data = await response.json(); setProfileData(data); } catch (err: any) { setError(`Failed profile: ${err.message}`); setProfileData(null); } finally { setIsLoadingProfile(false); } }; fetchProfileDetails(); }, [session]);

  // --- Handlers ---
  const handleOpenLanguageModal = () => setIsLanguageModalVisible(true);
  const handleSelectLanguage = (language: 'en' | 'sv') => { Alert.alert("Language Change", `Selected: ${language === 'en' ? 'English' : 'Swedish'}. (Impl needed)`); };
  const handleResetPassword = () => setIsForgotModalVisible(true);
  const handleLogout = async () => { Alert.alert("Confirm Logout", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Log Out", style: "destructive", onPress: signOut }]); };

  // Re-add Partner Specific: Toggle 24x7 Status handler
  const handleToggle24x7 = (currentValue: boolean | null) => {
      if (!session || session.type !== 'partner' || typeof session.id === 'undefined' || !(profileData && 'is24X7' in profileData)) return;

      const newValue = !currentValue;
      const message = `Change availability to 24x7 ${newValue ? 'Yes' : 'No'}?`;

      Alert.alert("Confirm Availability", message,
          [{ text: "Cancel", style: "cancel" },
              { text: "YES", onPress: async () => {
                      setIsUpdatingStatus(true);
                      // Use session.id which holds the companyId for partners
                      const url = `${BASE_URL}/api/Company/UpdateCompanyIs24X7?companyId=${session.id}&is24X7=${newValue}`;
                      console.log(`Updating 24x7 Status: URL=${url}`);
                      try {
                          const response = await fetch(url, { method: 'POST' }); // Assuming POST based on original logic
                          if (!response.ok) {
                              const errorText = await response.text();
                              throw new Error(`Failed to update status (${response.status}): ${errorText}`);
                          }
                          // Update local state on success ONLY if profileData is not null
                           setProfileData(prev => {
                               if (prev && 'is24X7' in prev) { // Type guard
                                   return { ...prev, is24X7: newValue };
                               }
                               return prev; // Return previous state if type doesn't match (shouldn't happen here)
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
   if (isAuthLoading) { /* ... loading ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
   if (!session) { /* ... logged out ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><Ionicons name="person-circle-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} /><Text style={styles.loggedOutMessage}>Log in or create an account.</Text><TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}><Text style={styles.loginButtonText}>LOG IN</Text></TouchableOpacity></View></SafeAreaView> ); }
   if (isLoadingProfile) { /* ... loading ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><ActivityIndicator size="large" color={COLORS.accent} /></View></SafeAreaView> ); }
   if (error || !profileData) { /* ... error ... */ return ( <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ title: 'Profile' }} /><View style={styles.containerCentered}><Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/><Text style={styles.errorText}>{error || 'Could not load profile.'}</Text><TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>Log Out</Text></TouchableOpacity></View></SafeAreaView> ); }

  // --- Render User or Partner Profile Content ---
   const renderContent = () => {
       if (session.type === 'user') {
           // User profile rendering remains the same
           const user = profileData as UserProfile;
           return ( /* ... user profile JSX ... */ <> <View style={styles.userInfoSection}> <View style={styles.profilePicPlaceholder}><Ionicons name="person" size={40} color={COLORS.textSecondary} /></View> <View style={styles.userDetails}> <Text style={styles.userName}>{user?.username ?? 'N/A'}</Text> <Text style={styles.userEmail}>{user?.emailId ?? session.email}</Text> </View> </View> <View style={styles.infoRow}> <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} /> <Text style={styles.infoText}>{user?.mobileNumber ?? 'N/A'}</Text> </View> <View style={[styles.infoRow, styles.locationSection]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View> <Text style={styles.locationValue}>{user?.countyName ?? 'N/A'}</Text> </View> <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View> <Text style={styles.locationValue}>{user?.municipalityName ?? 'N/A'}</Text> </View> </> );
       } else { // Partner profile
           const partner = profileData as PartnerProfile;
           // De-duplicate lists (logic remains same)
           const uniqueCounties = new Map<number, string | null>(); partner?.countyList?.forEach(county => { if (county && !uniqueCounties.has(county.countyId)) uniqueCounties.set(county.countyId, county.countyName); }); const countyNames = Array.from(uniqueCounties.values()).filter(name => !!name).join(', ') || 'N/A';
           const uniqueMunicipalities = new Map<number, string | null>(); partner?.municipalityList?.forEach(muni => { if (muni && !uniqueMunicipalities.has(muni.municipalityId)) uniqueMunicipalities.set(muni.municipalityId, muni.municipalityName); }); const municipalityNames = Array.from(uniqueMunicipalities.values()).filter(name => !!name).join(', ') || 'N/A';
           const serviceNames = partner?.serviceList?.map(s => s.serviceName).join(', ') || 'N/A';

            return (
               <>
                   {/* Partner Info Section */}
                   <View style={styles.userInfoSection}>
                       {partner?.logoImagePath ? ( <Image source={{ uri: partner.logoImagePath }} style={styles.partnerLogo} resizeMode="contain" /> ) : ( <View style={[styles.profilePicPlaceholder, styles.partnerLogoPlaceholder]}><Ionicons name="business" size={30} color={COLORS.textSecondary} /></View> )}
                       <View style={styles.userDetails}>
                           <Text style={styles.userName}>{partner?.username ?? 'N/A'}</Text>
                           <Text style={styles.userEmail}>{partner?.emailId ?? session.email}</Text>
                           <Text style={styles.regNumber}>Reg. No. {partner?.companyRegistrationNumber ?? 'N/A'}</Text>
                       </View>
                       {/* REINSTATED: 24x7 Toggle Area */}
                       <View style={styles.statusToggle}>
                           <Switch
                               trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.switchTrackTrue }}
                               thumbColor={COLORS.switchThumb}
                               ios_backgroundColor={COLORS.switchTrackFalse}
                               onValueChange={() => handleToggle24x7(partner?.is24X7 ?? false)} // Pass current value
                               value={!!partner?.is24X7} // Use !! to ensure boolean
                               disabled={isUpdatingStatus}
                           />
                           <Text style={styles.statusText}> 24x7</Text>
                            {isUpdatingStatus && <ActivityIndicator size="small" color={COLORS.accent} style={{marginLeft: 5}}/>}
                       </View>
                   </View>

                    {/* Rest of partner details */}
                    <View style={[styles.infoRow, styles.locationSection]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>About</Text></View> <Text style={styles.locationValue}>{partner?.companyPresentation ?? 'N/A'}</Text> </View>
                    <View style={[styles.infoRow, styles.locationSection]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Service Category</Text></View> <Text style={styles.locationValue}>{serviceNames}</Text> </View>
                    <View style={styles.infoRow}> <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} /> <Text style={styles.infoText}>{partner?.mobileNumber ?? 'N/A'}</Text> </View>
                    <View style={[styles.infoRow, styles.locationSection]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>County</Text></View> <Text style={styles.locationValue}>{countyNames}</Text> </View>
                    <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}> <View style={styles.locationLabelContainer}><Text style={styles.locationLabel}>Municipality</Text></View> <Text style={styles.locationValue}>{municipalityNames}</Text> </View>
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
             <TouchableOpacity onPress={handleOpenLanguageModal} style={{ marginRight: 15 }} disabled={isUpdatingStatus} /* Also disable if updating */ >
              <Ionicons name="settings-outline" size={24} color={COLORS.iconColor} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
         <View style={styles.container}>
             {renderContent()}
             {/* Shared Actions */}
             <TouchableOpacity style={styles.actionRow} onPress={handleResetPassword}> <MaterialCommunityIcons name="lock-reset" size={24} color={COLORS.iconColor} style={styles.infoIcon} /> <Text style={styles.actionText}>Reset Password</Text> <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> </TouchableOpacity>
             <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}> <Text style={styles.logoutButtonText}>Log Out</Text> </TouchableOpacity>
             <Text style={styles.versionText}>v0.0.1</Text>
         </View>
      </ScrollView>
       {/* Modals */}
      <ForgotPasswordModal visible={isForgotModalVisible} onClose={() => setIsForgotModalVisible(false)} />
      <LanguageSelectionModal visible={isLanguageModalVisible} onClose={() => setIsLanguageModalVisible(false)} onSelectLanguage={handleSelectLanguage} />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  // ... other styles remain the same ...
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
  // Re-added styles for the toggle
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