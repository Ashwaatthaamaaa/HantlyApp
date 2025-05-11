// File: app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import LanguageSelectionModal from '@/components/LanguageSelectionModal';
import { useAuth } from '@/context/AuthContext'; // Used for session/logout
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/config/i18n';

// --- Types ---
// Local types needed for local state and fetch function
interface UserProfile { userId: number; username: string; emailId: string; mobileNumber: string; countyName: string; municipalityName: string; }
interface CountyMaster { countyId: number; countyName: string | null; }
interface MunicipalityMaster { municipalityId: number; municipalityName: string | null; countyId?: number; countyName?: string | null; }
interface PartnerProfile {
    pCompId: number; username: string; emailId: string; companyRegistrationNumber: string; logoImagePath: string | null; is24X7: boolean | null; companyPresentation: string | null; serviceList: { serviceName: string }[]; mobileNumber: string; countyList: CountyMaster[] | null; municipalityList: MunicipalityMaster[] | null;
    contactPerson?: string | null; companyName?: string | null;
}

// --- Colors ---
const COLORS = { background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#555555', accent: '#696969', headerBg: '#FFFFFF', headerText: '#333333', error: '#D9534F', borderColor: '#E0E0E0', buttonBg: '#696969', buttonText: '#FFFFFF', locationBg: '#F0F0F0', iconColor: '#555555', versionText: '#AAAAAA', switchThumb: '#FFFFFF', switchTrackTrue: '#696969', switchTrackFalse: '#CCCCCC', };

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isLoading: isAuthLoading } = useAuth();

  // Local state for profile data
  const [profileData, setProfileData] = useState<UserProfile | PartnerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);

  // Local fetchProfileDetails function
  const fetchProfileDetails = useCallback(async () => {
      if (!session || isAuthLoading) { setIsLoadingProfile(false); setProfileData(null); setError(null); return; }
      setIsLoadingProfile(true); setError(null); setProfileData(null);
      const detailEndpoint = session.type === 'partner' ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
      const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(session.email)}`;
      console.log(`ProfileScreen: Fetching profile locally from ${detailUrl}`);
      try {
          const response = await fetch(detailUrl);
          if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed profile details (${response.status}): ${errorText}`); }
          const data = await response.json();
          setProfileData(data);
      } catch (err: any) { setError(`Failed profile: ${err.message}`); setProfileData(null); }
      finally { setIsLoadingProfile(false); }
  }, [session, isAuthLoading]);

  // Fetch Profile Data Locally on Focus
  useFocusEffect( useCallback(() => { fetchProfileDetails(); }, [fetchProfileDetails]) );

  // --- Handlers ---
  const handleOpenLanguageModal = () => setIsLanguageModalVisible(true);
  const handleSelectLanguage = async (language: 'en' | 'sv') => {
    try {
      await SecureStore.setItemAsync('language', language);
      i18n.locale = language;
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(t('error'), t('couldnotsavelanguage'));
    }
  };
  const handleResetPassword = () => setIsForgotModalVisible(true);
  const handleLogout = async () => { 
    Alert.alert(
      t('logoutconfirm'), 
      t('logoutmessage'), 
      [
        { text: t('cancel'), style: "cancel" }, 
        { text: t('logout'), style: "destructive", onPress: signOut }
      ]
    ); 
  };

  // Partner Specific: Toggle 24x7 Status handler (uses local fetch)
  const handleToggle24x7 = (currentValue: boolean | null) => {
      if (!session || session.type !== 'partner' || !profileData || typeof session.id === 'undefined' || isUpdatingStatus) return;
      const newValue = !currentValue;
      const message = `${t('changeavailability')} ${newValue ? 'Yes' : 'No'}?`;
      Alert.alert(
        t('confirmavailability'), 
        message,
        [
          { text: t('cancel'), style: "cancel" }, 
          { text: "YES", onPress: async () => {
              setIsUpdatingStatus(true);
              const url = `${BASE_URL}/api/Company/UpdateCompanyIs24X7?companyId=${session.id}&is24X7=${newValue}`;
              console.log(`Updating 24x7 Status: URL=${url}`);
              try {
                  const response = await fetch(url, { method: 'POST' });
                  if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to update status (${response.status}): ${errorText}`); }
                  console.log("Status updated via API, refetching profile locally...");
                  await fetchProfileDetails();
                  Alert.alert(
                    t('statusupdated'), 
                    `${t('availabilityset')} ${newValue ? '24x7' : t('regularhours')}.`
                  );
              } catch (err: any) { 
                console.error("Failed to update 24x7 status:", err); 
                Alert.alert(t('error'), `${t('couldnotupdatestatus')}: ${err.message}`); 
              }
              finally { setIsUpdatingStatus(false); } 
            } 
          }
        ]
      );
  };

  // --- Render Logic ---
   if (isAuthLoading) { 
     return ( 
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('profile') }} />
         <View style={styles.containerCentered}>
           <ActivityIndicator size="large" color={COLORS.accent} />
         </View>
       </SafeAreaView> 
     ); 
   }
   if (!session) { 
     return ( 
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('profile') }} />
         <View style={styles.containerCentered}>
           <Ionicons name="person-circle-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 20 }} />
           <Text style={styles.loggedOutMessage}>{t('logincreateaccount')}</Text>
           <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
             <Text style={styles.loginButtonText}>{t('login')}</Text>
           </TouchableOpacity>
         </View>
       </SafeAreaView> 
     ); 
   }
   if (isLoadingProfile) { 
     return ( 
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('profile') }} />
         <View style={styles.containerCentered}>
           <ActivityIndicator size="large" color={COLORS.accent} />
         </View>
       </SafeAreaView> 
     ); 
   }
   if (error || !profileData) {
     return ( 
       <SafeAreaView style={styles.safeArea}>
         <Stack.Screen options={{ title: t('profile') }} />
         <View style={styles.containerCentered}>
           <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} style={{ marginBottom: 15 }}/>
           <Text style={styles.errorText}>{error || t('couldnotloadprofile')}</Text>
           <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
             <Text style={styles.logoutButtonText}>{t('logout')}</Text>
           </TouchableOpacity>
         </View>
       </SafeAreaView> 
     );
   }

  // --- Render User or Partner Profile Content ---
   const renderContent = () => {
       if (session.type === 'user') {
           const user = profileData as UserProfile | null;
           return (
             <>
                <View style={styles.userInfoSection}>
                    <View style={styles.profilePicPlaceholder}>
                       <Ionicons name="person" size={40} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.userDetails}>
                       <Text style={styles.userName}>{user?.username ?? session.name ?? 'User'}</Text>
                       <Text style={styles.userEmail}>{user?.emailId ?? session.email}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{user?.mobileNumber ?? 'N/A'}</Text>
                </View>

                <View style={[styles.infoRow, styles.locationSection]}>
                     <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('county')}</Text>
                     </View>
                     <Text style={styles.locationValue}>{user?.countyName ?? 'N/A'}</Text>
                </View>

                <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                     <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('municipality')}</Text>
                     </View>
                     <Text style={styles.locationValue}>{user?.municipalityName ?? 'N/A'}</Text>
                </View>
             </>
           );
       } else {
           const partner = profileData as PartnerProfile | null;
           if (!partner) return null;

           const uniqueCounties = new Map<number, string | null>(); 
           partner?.countyList?.forEach(county => { 
             if (county && !uniqueCounties.has(county.countyId)) 
               uniqueCounties.set(county.countyId, county.countyName); 
           }); 
           const countyNames = Array.from(uniqueCounties.values()).filter(name => !!name).join(', ') || 'N/A';

           const uniqueMunicipalities = new Map<number, string | null>(); 
           partner?.municipalityList?.forEach(muni => { 
             if (muni && !uniqueMunicipalities.has(muni.municipalityId)) 
               uniqueMunicipalities.set(muni.municipalityId, muni.municipalityName); 
           }); 
           const municipalityNames = Array.from(uniqueMunicipalities.values()).filter(name => !!name).join(', ') || 'N/A';

           const serviceNames = partner?.serviceList?.map(s => s.serviceName).join(', ') || 'N/A';

           return (
               <>
                   <View style={styles.userInfoSection}>
                       {partner?.logoImagePath ? ( 
                         <Image source={{ uri: partner.logoImagePath }} style={styles.avatarImage} resizeMode="contain" /> 
                       ) : ( 
                         <View style={[styles.profilePicPlaceholder, styles.avatarPlaceholder]}>
                           <Ionicons name="business" size={30} color={COLORS.textSecondary} />
                         </View> 
                       )}
                       <View style={styles.userDetails}>
                           <Text style={styles.userName}>{session.name ?? partner?.username ?? 'N/A'}</Text>
                           <Text style={styles.userEmail}>{partner?.emailId ?? session.email}</Text>
                           <Text style={styles.regNumber}>{t('regno')} {partner?.companyRegistrationNumber ?? 'N/A'}</Text>
                       </View>
                       <View style={styles.statusToggle}>
                           <Switch
                               trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.switchTrackTrue }}
                               thumbColor={COLORS.switchThumb}
                               ios_backgroundColor={COLORS.switchTrackFalse}
                               value={!!partner?.is24X7}
                               onValueChange={() => handleToggle24x7(partner?.is24X7 ?? false)}
                               disabled={isUpdatingStatus || isLoadingProfile}
                           />
                           <Text style={styles.statusText}>{t('twenty_four_seven')}</Text>
                           {isUpdatingStatus && <ActivityIndicator size="small" color={COLORS.accent} style={{marginLeft: 5}}/>}
                       </View>
                   </View>
                    <View style={[styles.infoRow, styles.locationSection]}>
                      <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('about')}</Text>
                      </View>
                      <Text style={styles.locationValue}>{partner?.companyPresentation ?? 'N/A'}</Text>
                    </View>
                    <View style={[styles.infoRow, styles.locationSection]}>
                      <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('servicecategory')}</Text>
                      </View>
                      <Text style={styles.locationValue}>{serviceNames}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
                      <Text style={styles.infoText}>{partner?.mobileNumber ?? 'N/A'}</Text>
                    </View>
                    <View style={[styles.infoRow, styles.locationSection]}>
                      <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('county')}</Text>
                      </View>
                      <Text style={styles.locationValue}>{countyNames}</Text>
                    </View>
                    <View style={[styles.infoRow, styles.locationSection, { borderBottomWidth: 0 }]}>
                      <View style={styles.locationLabelContainer}>
                        <Text style={styles.locationLabel}>{t('municipality')}</Text>
                      </View>
                      <Text style={styles.locationValue}>{municipalityNames}</Text>
                    </View>
               </>
           );
       }
   };

  // --- Main Return for Logged In User ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
       <Stack.Screen
        options={{ 
          title: t('profile'), 
          headerStyle: { backgroundColor: COLORS.headerBg }, 
          headerTintColor: COLORS.headerText, 
          headerTitleStyle: { fontWeight: 'bold' }, 
          headerTitleAlign: 'center', 
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 10 }}>
              {session.type === 'user' ? (
                <TouchableOpacity 
                  onPress={() => router.push('/edit-profile')} 
                  style={{ marginRight: 15 }} 
                  disabled={isUpdatingStatus}
                >
                  <Ionicons name="create-outline" size={24} color={COLORS.iconColor} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => router.push('/edit-company')} 
                  style={{ marginRight: 15 }} 
                  disabled={isUpdatingStatus}
                >
                  <Ionicons name="create-outline" size={24} color={COLORS.iconColor} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                onPress={handleOpenLanguageModal} 
                disabled={isUpdatingStatus}
              >
                <Ionicons name="settings-outline" size={24} color={COLORS.iconColor} />
              </TouchableOpacity>
            </View>
          ), 
        }}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
             {renderContent()}
             {/* Shared Actions */}
             <TouchableOpacity style={styles.actionRow} onPress={handleResetPassword}>
               <MaterialCommunityIcons name="lock-reset" size={24} color={COLORS.iconColor} style={styles.infoIcon} />
               <Text style={styles.actionText}>{t('resetpassword')}</Text>
               <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
               <Text style={styles.logoutButtonText}>{t('logout')}</Text>
             </TouchableOpacity>
             <Text style={styles.versionText}>{t('version')}</Text>
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
    safeArea: { flex: 1, backgroundColor: COLORS.background, }, scrollView: { flex: 1, }, container: { flex: 1, paddingHorizontal: 20, paddingVertical: 20, }, containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20, }, loggedOutMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24, }, loginButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', }, loginButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, userInfoSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 30, }, profilePicPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.locationBg, justifyContent: 'center', alignItems: 'center', marginRight: 15, }, partnerLogo: { width: 60, height: 60, borderRadius: 8, marginRight: 15, borderWidth: 1, borderColor: COLORS.borderColor }, partnerLogoPlaceholder:{ borderRadius: 8, width: 60, height: 60, backgroundColor: COLORS.locationBg, justifyContent: 'center', alignItems: 'center', marginRight: 15}, userDetails: { flex: 1, justifyContent: 'center' }, userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4, }, userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4, }, regNumber: { fontSize: 12, color: COLORS.textSecondary }, statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 10, paddingTop: 4, }, statusText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 2 }, infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, }, locationSection: { backgroundColor: COLORS.locationBg, paddingHorizontal: 15, marginHorizontal: -15, alignItems: 'flex-start', paddingVertical: 10, }, locationLabelContainer: { width: 120, marginRight: 10, paddingTop: 2, }, locationLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', }, locationValue: { fontSize: 16, color: COLORS.textPrimary, flex: 1, lineHeight: 22, }, infoIcon: { marginRight: 15, }, infoText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, }, actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, marginTop: 20, }, actionText: { fontSize: 16, color: COLORS.textPrimary, flex: 1, }, logoutButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 40, }, logoutButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold', }, versionText: { textAlign: 'center', marginTop: 20, marginBottom: 10, color: COLORS.versionText, fontSize: 12, }, errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', },// Replace the partnerLogo style with:
avatarImage: {
  width: 60,
  height: 60,
  borderRadius: 30, // Changed from 8 to 30 for circular shape
  marginRight: 15,
  borderWidth: 1,
  borderColor: COLORS.borderColor,
},
avatarPlaceholder: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: COLORS.locationBg,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 15,
}
});