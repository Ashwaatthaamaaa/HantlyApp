// File: app/edit-profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<number>(0);
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [emailId, setEmailId] = useState('');
  const [countyId, setCountyId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const endpoint = session?.type === 'partner'
          ? '/api/Company/GetCompanyDetail'
          : '/api/User/GetUserDetail';
        const res = await fetch(`${BASE_URL}${endpoint}?EmailId=${encodeURIComponent(session?.email ?? '')}`);
        const data = await res.json();

        setUserId(data.userId ?? session?.id ?? 0);
        setMobileNumber(data.mobileNumber ?? '');
        setContactPerson(data.contactPerson ?? '');
        setEmailId(data.emailId ?? session?.email ?? '');
        setCountyId(String(data.countyId ?? ''));
        setMunicipalityId(String(data.municipalityId ?? ''));
        setLocationId(String(data.locationId ?? '0'));

        console.log('Fetched for edit:', { userId: data.userId, emailId: data.emailId });
      } catch (err) {
        Alert.alert("Error", "Could not fetch profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session]);

  const handleSave = async () => {
    setSaving(true);

    if (!emailId || userId === 0 || isNaN(Number(locationId))) {
      Alert.alert("Validation Failed", "Missing or invalid required fields.");
      setSaving(false);
      return;
    }

    const payload = {
      userId,
      locationId: Number(locationId),
      mobileNumber,
      contactPerson,
      emailId,
      countyId: Number(countyId),
      municipalityId: Number(municipalityId),
    };

    try {
      console.log('Updating to:', `${BASE_URL}/api/User/UpdateUser`);
      console.log('Payload:', payload);

      const res = await fetch(`${BASE_URL}/api/User/UpdateUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log('Response:', res.status, text);

      if (!res.ok) throw new Error(text || 'Update failed');

      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (err: any) {
      console.error('Update failed:', err);
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput style={styles.input} value={mobileNumber} onChangeText={setMobileNumber} keyboardType="phone-pad" />

        <Text style={styles.label}>Contact Person</Text>
        <TextInput style={styles.input} value={contactPerson} onChangeText={setContactPerson} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={emailId} editable={false} />

        <Text style={styles.label}>County ID</Text>
        <TextInput style={styles.input} value={countyId} onChangeText={setCountyId} keyboardType="number-pad" />

        <Text style={styles.label}>Municipality ID</Text>
        <TextInput style={styles.input} value={municipalityId} onChangeText={setMunicipalityId} keyboardType="number-pad" />

        <Text style={styles.label}>Location ID</Text>
        <TextInput style={styles.input} value={locationId} onChangeText={setLocationId} keyboardType="number-pad" />

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { marginTop: 15, fontSize: 16, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 5 },
  button: { marginTop: 30, backgroundColor: '#696969', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
