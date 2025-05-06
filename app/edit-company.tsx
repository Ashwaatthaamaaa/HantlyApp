// File: app/edit-company.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  Keyboard, TouchableWithoutFeedback, ScrollView, Modal, FlatList, Animated, Switch 
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
import * as ImagePicker from 'expo-image-picker';

export const screenOptions = {
  headerShown: false,
};

export default function EditCompanyScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Ensure only partners can access this screen
  useEffect(() => {
    if (!session) {
      Alert.alert("Access Denied", "Please login to access your company settings.");
      router.replace('/login');
      return;
    }
    
    if (session.type !== 'partner') {
      Alert.alert("Access Denied", "This page is only accessible to partner accounts.");
      router.back();
      return;
    }
  }, [session, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company Data
  const [companyId, setCompanyId] = useState<number>(0);
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [emailId, setEmailId] = useState('');
  const [is24x7, setIs24x7] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [companyPresentation, setCompanyPresentation] = useState('');
  const [competenceDescription, setCompetenceDescription] = useState('');
  const [companyReferences, setCompanyReferences] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoImageName, setLogoImageName] = useState('');
  const [logoImagePath, setLogoImagePath] = useState('');
  const [locationId, setLocationId] = useState('');

  // Selected Lists
  const [countyIdList, setCountyIdList] = useState<string[]>([]);
  const [municipalityIdList, setMunicipalityIdList] = useState<string[]>([]);
  const [serviceIdList, setServiceIdList] = useState<string[]>([]);
  
  // Data Lists
  const [counties, setCounties] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  // UI States
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCountyNames, setSelectedCountyNames] = useState<string[]>([]);
  const [selectedMunicipalityNames, setSelectedMunicipalityNames] = useState<string[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      })
    ).start();
    
    const fetchCompanyProfile = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/Company/GetCompanyDetail?EmailId=${encodeURIComponent(session?.email ?? '')}`);
        const data = await res.json();

        setCompanyId(data.companyId ?? 0);
        setCompanyName(data.companyName ?? '');
        setCompanyRegistrationNumber(data.companyRegistrationNumber ?? '');
        setMobileNumber(data.mobileNumber ?? '');
        setContactPerson(data.contactPerson ?? '');
        setEmailId(data.emailId ?? session?.email ?? '');
        setIs24x7(data.is24X7 ?? false);
        setCompanyPresentation(data.companyPresentation ?? '');
        setCompetenceDescription(data.competenceDescription ?? '');
        setCompanyReferences(data.companyReferences ?? '');
        setLogoImagePath(data.logoImagePath ?? '');
        setLogoImageName(data.logoImageName ?? '');
        setLocationId(data.locationId?.toString() ?? '0');
        
        // Set selected IDs
        if (data.countyIdList && data.countyIdList.length) {
          setCountyIdList(data.countyIdList.map((id: number) => id.toString()));
        }
        
        if (data.municipalityIdList && data.municipalityIdList.length) {
          setMunicipalityIdList(data.municipalityIdList.map((id: number) => id.toString()));
        }
        
        if (data.serviceIdList && data.serviceIdList.length) {
          setServiceIdList(data.serviceIdList.map((id: number) => id.toString()));
        }
      } catch (err) {
        Alert.alert("Error", "Could not fetch company profile.");
      } finally {
        setLoading(false);
      }
    };

    const fetchDataLists = async () => {
      try {
        // Fetch Counties
        const countyRes = await fetch(`${BASE_URL}/api/County/GetCountyList`);
        const countyData = await countyRes.json();
        setCounties(countyData);

        // Fetch Services
        const serviceRes = await fetch(`${BASE_URL}/api/Service/GetServiceList`);
        const serviceData = await serviceRes.json();
        setServices(serviceData);
      } catch (error) {
        Alert.alert("Error", "Could not fetch necessary data.");
      }
    };

    fetchCompanyProfile();
    fetchDataLists();
  }, [session]);

  useEffect(() => {
    if (countyIdList.length > 0) {
      const fetchMunicipalities = async () => {
        try {
          const promises = countyIdList.map(countyId => 
            fetch(`${BASE_URL}/api/Municipality/GetMunicipalityList?CountyId=${countyId}`)
              .then(res => res.json())
          );
          
          const results = await Promise.all(promises);
          const allMunicipalities = results.flat();
          setMunicipalities(allMunicipalities);
        } catch (error) {
          Alert.alert("Error", "Could not fetch municipalities.");
        }
      };
      
      fetchMunicipalities();
    }
  }, [countyIdList]);

  useEffect(() => {
    if (counties.length > 0 && countyIdList.length > 0) {
      const names = countyIdList.map(id => {
        const county = counties.find(c => c.countyId.toString() === id);
        return county ? county.countyName : '';
      }).filter(name => name !== '');
      
      setSelectedCountyNames(names);
    }
  }, [counties, countyIdList]);

  useEffect(() => {
    if (municipalities.length > 0 && municipalityIdList.length > 0) {
      const names = municipalityIdList.map(id => {
        const municipality = municipalities.find(m => m.municipalityId.toString() === id);
        return municipality ? municipality.municipalityName : '';
      }).filter(name => name !== '');
      
      setSelectedMunicipalityNames(names);
    }
  }, [municipalities, municipalityIdList]);

  useEffect(() => {
    if (services.length > 0 && serviceIdList.length > 0) {
      const names = serviceIdList.map(id => {
        const service = services.find(s => s.serviceId.toString() === id);
        return service ? service.serviceName : '';
      }).filter(name => name !== '');
      
      setSelectedServiceNames(names);
    }
  }, [services, serviceIdList]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      
      // Extract filename from URI
      const uriParts = uri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      
      setLogoImage(uri);
      setLogoImageName(fileName);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    if (!emailId || companyId === 0) {
      Alert.alert("Validation Failed", "Missing required fields.");
      setSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      
      // Add basic company data
      formData.append('pCompId', companyId.toString());
      formData.append('LocationId', locationId);
      formData.append('MobileNumber', mobileNumber);
      formData.append('ContactPerson', contactPerson);
      formData.append('EmailId', emailId);
      formData.append('Is24X7', is24x7.toString());
      formData.append('CompanyName', companyName);
      formData.append('CompanyRegistrationNumber', companyRegistrationNumber);
      formData.append('CompanyPresentation', companyPresentation);
      formData.append('CompetenceDescription', competenceDescription);
      formData.append('CompanyReferences', companyReferences);
      
      // Handle logo image
      if (logoImage) {
        // On native platforms, we need to create a blob or file
        const file = {
          uri: logoImage,
          name: logoImageName,
          type: 'image/jpeg', // Assume JPEG for simplicity
        };
        formData.append('LogoImage', file as any);
      }
      
      formData.append('LogoImageName', logoImageName);
      formData.append('LogoImagePath', logoImagePath);
      
      // Add lists
      countyIdList.forEach(id => {
        formData.append('CountyIdList', id);
      });
      
      municipalityIdList.forEach(id => {
        formData.append('MunicipalityIdList', id);
      });
      
      serviceIdList.forEach(id => {
        formData.append('ServiceIdList', id);
      });

      console.log("Sending form data to API...");
      
      const res = await fetch(`${BASE_URL}/api/Company/UpdateCompany`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseText = await res.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { statusMessage: responseText };
      }

      if (res.ok) {
        Alert.alert("Success", "Company profile updated successfully!");
        router.back();
      } else {
        throw new Error(responseData.statusMessage || responseData.detail || "Update failed");
      }
    } catch (err: any) {
      console.log("Error saving company profile:", err.message);
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const showBottomSheet = (type: 'county' | 'municipality' | 'service') => {
    if (type === 'county') {
      setShowCountyModal(true);
    } else if (type === 'municipality') {
      if (countyIdList.length === 0) {
        Alert.alert("Required", "Please select at least one county first");
        return;
      }
      setShowMunicipalityModal(true);
    } else {
      setShowServiceModal(true);
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
      setShowServiceModal(false);
    });
  };

  const toggleCounty = (id: string, name: string) => {
    if (countyIdList.includes(id)) {
      setCountyIdList(countyIdList.filter(countyId => countyId !== id));
      
      // Also remove related municipalities
      const countyMunicipalities = municipalities.filter(m => m.countyId.toString() === id);
      const countyMunicipalityIds = countyMunicipalities.map(m => m.municipalityId.toString());
      setMunicipalityIdList(municipalityIdList.filter(mId => !countyMunicipalityIds.includes(mId)));
    } else {
      setCountyIdList([...countyIdList, id]);
    }
  };

  const toggleMunicipality = (id: string, name: string) => {
    if (municipalityIdList.includes(id)) {
      setMunicipalityIdList(municipalityIdList.filter(mId => mId !== id));
    } else {
      setMunicipalityIdList([...municipalityIdList, id]);
    }
  };

  const toggleService = (id: string, name: string) => {
    if (serviceIdList.includes(id)) {
      setServiceIdList(serviceIdList.filter(sId => sId !== id));
    } else {
      setServiceIdList([...serviceIdList, id]);
    }
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
        <Text style={styles.loadingText}>Loading company profile...</Text>
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
          <Text style={styles.headerTitle}>Edit Company</Text>
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
          {/* -- Company Info -- */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              {logoImage || logoImagePath ? (
                <View style={styles.avatarPlaceholder}>
                  {/* If we have a local image selected or a path to an existing image */}
                  <Text style={styles.avatarText}>{companyName.charAt(0).toUpperCase()}</Text>
                  <Ionicons name="camera" size={24} color="#FFFFFF" style={styles.cameraIcon} />
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{companyName.charAt(0).toUpperCase()}</Text>
                  <Ionicons name="camera" size={24} color="#FFFFFF" style={styles.cameraIcon} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.usernameDisplay}>{companyName}</Text>
            <Text style={styles.emailDisplay}>{emailId}</Text>
          </View>

          <Text style={styles.sectionTitle}>Company Information</Text>

          {/* -- Company Name -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={companyName} 
                onChangeText={setCompanyName} 
                placeholder="Enter company name" 
              />
            </View>
          </View>

          {/* -- Registration Number -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={companyRegistrationNumber} 
                onChangeText={setCompanyRegistrationNumber} 
                placeholder="Enter registration number" 
              />
            </View>
          </View>

          {/* -- Mobile -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={mobileNumber} 
                onChangeText={setMobileNumber} 
                keyboardType="phone-pad"
                placeholder="Enter mobile number" 
              />
            </View>
          </View>

          {/* -- Contact Person -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Person</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={contactPerson} 
                onChangeText={setContactPerson}
                placeholder="Enter contact person name" 
              />
            </View>
          </View>

          {/* -- 24x7 Switch -- */}
          <View style={styles.switchGroup}>
            <Text style={styles.label}>Available 24/7</Text>
            <Switch
              value={is24x7}
              onValueChange={setIs24x7}
              trackColor={{ false: "#d1d1d1", true: "#81b0ff" }}
              thumbColor={is24x7 ? "#4A90E2" : "#f4f3f4"}
            />
          </View>

          {/* -- Company Presentation -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Presentation</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={companyPresentation} 
                onChangeText={setCompanyPresentation}
                placeholder="Enter company presentation"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* -- Competence Description -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Competence Description</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={competenceDescription} 
                onChangeText={setCompetenceDescription}
                placeholder="Enter competence description"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* -- Company References -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company References</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={companyReferences} 
                onChangeText={setCompanyReferences}
                placeholder="Enter company references"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* -- Location Section -- */}
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location ID</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={locationId} 
                onChangeText={setLocationId} 
                keyboardType="number-pad"
                placeholder="Enter location ID" 
              />
            </View>
          </View>

          {/* -- Counties -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Counties</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => showBottomSheet('county')}>
              <Text style={selectedCountyNames.length ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {selectedCountyNames.length ? `${selectedCountyNames.length} counties selected` : "Select Counties"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {selectedCountyNames.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                {selectedCountyNames.map((name, index) => (
                  <View key={index} style={styles.selectedItem}>
                    <Text style={styles.selectedItemText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* -- Municipalities -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Municipalities</Text>
            <TouchableOpacity 
              style={[styles.pickerButton, countyIdList.length === 0 && styles.disabledButton]} 
              onPress={() => showBottomSheet('municipality')}
              disabled={countyIdList.length === 0}
            >
              <Text style={selectedMunicipalityNames.length ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {selectedMunicipalityNames.length ? `${selectedMunicipalityNames.length} municipalities selected` : "Select Municipalities"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {selectedMunicipalityNames.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                {selectedMunicipalityNames.map((name, index) => (
                  <View key={index} style={styles.selectedItem}>
                    <Text style={styles.selectedItemText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* -- Services -- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Services</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => showBottomSheet('service')}>
              <Text style={selectedServiceNames.length ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {selectedServiceNames.length ? `${selectedServiceNames.length} services selected` : "Select Services"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {selectedServiceNames.length > 0 && (
              <View style={styles.selectedItemsContainer}>
                {selectedServiceNames.map((name, index) => (
                  <View key={index} style={styles.selectedItem}>
                    <Text style={styles.selectedItemText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

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
                <Text style={styles.buttonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* -- Modal for County/Municipality/Service Selection -- */}
        <Modal
          visible={showCountyModal || showMunicipalityModal || showServiceModal}
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
                      {showCountyModal ? "Select Counties" : 
                       showMunicipalityModal ? "Select Municipalities" : "Select Services"}
                    </Text>
                    <TouchableOpacity onPress={hideBottomSheet}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={
                      showCountyModal ? counties : 
                      showMunicipalityModal ? municipalities.filter(m => 
                        countyIdList.includes(m.countyId.toString())
                      ) : services
                    }
                    keyExtractor={(item) => 
                      showCountyModal ? item.countyId.toString() : 
                      showMunicipalityModal ? item.municipalityId.toString() : 
                      item.serviceId.toString()
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={() => {
                          if (showCountyModal) {
                            toggleCounty(item.countyId.toString(), item.countyName);
                          } else if (showMunicipalityModal) {
                            toggleMunicipality(item.municipalityId.toString(), item.municipalityName);
                          } else {
                            toggleService(item.serviceId.toString(), item.serviceName);
                          }
                        }}
                      >
                        <Text style={styles.optionText}>
                          {showCountyModal ? item.countyName : 
                           showMunicipalityModal ? item.municipalityName : 
                           item.serviceName}
                        </Text>
                        <View style={styles.checkboxContainer}>
                          {((showCountyModal && countyIdList.includes(item.countyId.toString())) || 
                            (showMunicipalityModal && municipalityIdList.includes(item.municipalityId.toString())) ||
                            (showServiceModal && serviceIdList.includes(item.serviceId.toString()))) ? (
                            <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
                          ) : (
                            <Ionicons name="ellipse-outline" size={24} color="#CCCCCC" />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />

                  <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={hideBottomSheet}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Toast />
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
    marginBottom: 10,
    position: 'relative'
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
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4
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
  textAreaContainer: {
    height: 120,
    paddingVertical: 10,
    alignItems: 'flex-start'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333'
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
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
  disabledButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0'
  },
  pickerValueText: {
    fontSize: 16,
    color: '#333333'
  },
  pickerPlaceholderText: {
    fontSize: 16,
    color: '#999999'
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10
  },
  selectedItem: {
    backgroundColor: '#E6F2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8
  },
  selectedItemText: {
    color: '#4A90E2',
    fontSize: 14
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
    color: '#333333',
    flex: 1
  },
  checkboxContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE'
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  }
});