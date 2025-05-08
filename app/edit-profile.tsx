// File: app/edit-profile.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  Keyboard, TouchableWithoutFeedback, ScrollView, Modal, FlatList, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/constants/Api';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { t } from '@/config/i18n';

export const screenOptions = {
  headerShown: false,
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Ensure only users can access this screen
  useEffect(() => {
    if (!session) {
      Alert.alert(t('access_denied'), t('login_access_profile'));
      router.replace('/login');
      return;
    }
    
    if (session.type !== 'user') {
      Alert.alert(t('access_denied'), t('user_only_page'));
      router.back();
      return;
    }
  }, [session, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<number>(0);
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [emailId, setEmailId] = useState('');
  const [username, setUsername] = useState('');
  const [countyId, setCountyId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [locationId, setLocationId] = useState('');

  const [counties, setCounties] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);
  const [selectedCountyName, setSelectedCountyName] = useState('');
  const [selectedMunicipalityName, setSelectedMunicipalityName] = useState('');
  
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  const isFormValid = () => {
    return (
      mobileNumber.trim().length === 10 &&
      emailId.trim() !== '' &&
      userId !== 0 &&
      countyId !== '' &&
      municipalityId !== ''
    );
  };  

  useEffect(() => {
    Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      })
    ).start();
    
    const fetchProfile = async () => {
      try {
        const endpoint = session?.type === 'partner'
          ? '/api/Company/GetCompanyDetail'
          : '/api/User/GetUserDetail';

        const res = await fetch(`${BASE_URL}${endpoint}?EmailId=${encodeURIComponent(session?.email ?? '')}`);
        const data = await res.json();

        setUserId(data.userId ?? session?.id ?? 0);
        setUsername(data.username ?? '');
        setMobileNumber(data.mobileNumber ?? '');
        setContactPerson(data.contactPerson ?? '');
        setEmailId(data.emailId ?? session?.email ?? '');
        setCountyId(data.countyId?.toString() ?? '');
        setMunicipalityId(data.municipalityId?.toString() ?? '');
        setLocationId(data.locationId?.toString() ?? '0');

        if (data.countyId) {
          const countyRes = await fetch(`${BASE_URL}/api/County/GetCountyList`);
          const countyData = await countyRes.json();
          const county = countyData.find((c: any) => c.countyId.toString() === data.countyId.toString());
          if (county) setSelectedCountyName(county.countyName);
        }

        if (data.municipalityId) {
          const muniRes = await fetch(`${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${data.countyId}`);
          const muniData = await muniRes.json();
          const municipality = muniData.find((m: any) => m.municipalityId.toString() === data.municipalityId.toString());
          if (municipality) setSelectedMunicipalityName(municipality.municipalityName);
        }
      } catch (err) {
        Alert.alert(t('error'), t('could_not_fetch_profile'));
      } finally {
        setLoading(false);
      }
    };

    const fetchCounties = async () => {
      const res = await fetch(`${BASE_URL}/api/County/GetCountyList`);
      const data = await res.json();
      setCounties(data);
    };

    fetchProfile();
    fetchCounties();
  }, [session]);

  useEffect(() => {
    if (countyId) {
      const fetchMunicipalities = async () => {
        const res = await fetch(`${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`);
        const data = await res.json();
        setMunicipalities(data);
      };
      fetchMunicipalities();
    }
  }, [countyId]);

  const handleSave = async () => {
    setSaving(true);
  
    if (!isFormValid()) {
      Alert.alert(t('incomplete_form'), t('complete_all_fields'));
      setSaving(false);
      return;
    }
  
    const payload = {
      userId,
      locationId: parseInt(locationId),
      mobileNumber,
      contactPerson,
      emailId,
      countyId: parseInt(countyId),
      municipalityId: parseInt(municipalityId),
    };
  
    try {
      const res = await fetch(`${BASE_URL}/api/User/UpdateUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Update failed');
      }
  
      Alert.alert(t('success'), t('profile_updated'));
      router.back();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setSaving(false);
    }
  };  

  const showBottomSheet = (type: 'county' | 'municipality') => {
    if (type === 'county') {
      setShowCountyModal(true);
    } else {
      if (!countyId) {
        Alert.alert(t('required'), t('select_county_required'));
        return;
      }
      setShowMunicipalityModal(true);
    }

    Animated.timing(bottomSheetAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowCountyModal(false);
      setShowMunicipalityModal(false);
    });
  };

  const selectCounty = (id: string, name: string) => {
    setCountyId(id);
    setSelectedCountyName(name);
    setMunicipalityId('');
    setSelectedMunicipalityName('');
    hideBottomSheet();
  };

  const selectMunicipality = (id: string, name: string) => {
    setMunicipalityId(id);
    setSelectedMunicipalityName(name);
    hideBottomSheet();
  };

  const bottomSheetTranslateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0]
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="auto" />
        <Animated.View style={{
          transform: [{ rotate: loadingAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg']
          })}]
        }}>
          <Ionicons name="sync-outline" size={50} color="#4A90E2" />
        </Animated.View>
        <Text style={styles.loadingText}>{t('loading_profile')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('edit')} {t('profile')}</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* -- [Personal Info] -- */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.usernameDisplay}>{username}</Text>
            <Text style={styles.emailDisplay}>{emailId}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('personalIngo')}</Text>

          {/* -- Mobile -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('phonenumber')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={mobileNumber} 
                onChangeText={setMobileNumber} 
                keyboardType="phone-pad"
                placeholder={t('enter_mobile_number')}
                maxLength={10} // <-- limit to 10 digits
              />
            </View>
          </View>

          {/* -- Contact Person -- */}
          <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('name')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              Toast.show({
                type: 'info',
                text1: "Username can't be edited",
                position: 'bottom',
                visibilityTime: 2000
              })
            }
            style={styles.inputContainer}
          >
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <Text style={[styles.input, { paddingVertical: 12, color: '#999' }]}>
              {username || t('not_available')}
            </Text>
          </TouchableOpacity>
        </View>

          {/* -- Location Section -- */}
          <Text style={styles.sectionTitle}>{t('location')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('county')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => showBottomSheet('county')}>
              <Text style={selectedCountyName ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {selectedCountyName || t('select_county')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('municipality')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => showBottomSheet('municipality')}>
              <Text style={selectedMunicipalityName ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {selectedMunicipalityName || t('select_municipality')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('location_id')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={locationId} 
                onChangeText={setLocationId} 
                keyboardType="number-pad"
                placeholder={t('enter_location_id')} 
              />
            </View>
          </View> */}

          {/* -- Save Button -- */}
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.savingButton]} 
            onPress={handleSave} 
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('save')} {t('changes')}</Text>
              </>
            )}
          </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* -- Modal for County/Municipality -- */}
        <Modal
          visible={showCountyModal || showMunicipalityModal}
          transparent
          animationType="none"
          onRequestClose={hideBottomSheet}
        >
          <TouchableWithoutFeedback onPress={hideBottomSheet}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={50} style={StyleSheet.absoluteFill} />
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: bottomSheetTranslateY }] }]}>
                  <View style={styles.bottomSheetHeader}>
                    <Text style={styles.bottomSheetTitle}>
                      {showCountyModal ? t('select_county') : t('select_municipality')}
                    </Text>
                    <TouchableOpacity onPress={hideBottomSheet}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={showCountyModal ? counties : municipalities}
                    keyExtractor={(item) => showCountyModal ? item.countyId.toString() : item.municipalityId.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={() => {
                          if (showCountyModal) {
                            selectCounty(item.countyId.toString(), item.countyName);
                          } else {
                            selectMunicipality(item.municipalityId.toString(), item.municipalityName);
                          }
                        }}
                      >
                        <Text style={styles.optionText}>
                          {showCountyModal ? item.countyName : item.municipalityName}
                        </Text>
                        {(showCountyModal && countyId === item.countyId.toString()) || 
                         (!showCountyModal && municipalityId === item.municipalityId.toString()) ? (
                          <Ionicons name="checkmark" size={24} color="#4A90E2" />
                        ) : null}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF'
  },
  backButton: {
    padding: 5
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  placeholder: {
    width: 24
  },
  scrollContent: {
    flex: 1,
    padding: 20
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 25
  },
  avatarContainer: {
    marginBottom: 10
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  usernameDisplay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5
  },
  emailDisplay: {
    fontSize: 16,
    color: '#666666'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
    marginTop: 10
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333'
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  pickerValueText: {
    fontSize: 16,
    color: '#333333'
  },
  pickerPlaceholderText: {
    fontSize: 16,
    color: '#999999'
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 15,
    marginVertical: 20
  },
  savingButton: {
    backgroundColor: '#7AADEB'
  },
  buttonIcon: {
    marginRight: 10
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666666'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%'
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20
  },
  optionText: {
    fontSize: 16,
    color: '#333333'
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE'
  }
});