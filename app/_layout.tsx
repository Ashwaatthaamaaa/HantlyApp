// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { BASE_URL } from '@/constants/Api';

SplashScreen.preventAutoHideAsync();

// 🛠️ Notification display config when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const InitialLayout = () => {
  const { isLoading } = useAuth();

  // ✅ Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission required', 'Enable notifications to receive job updates.');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log('Expo Push Token:', token);

      // ✅ Send to backend
      await fetch(`${BASE_URL}/api/DeviceToken/SaveDeviceToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pCompId: 123,
          token: token,
          platform: Platform.OS,
        }),
      })
        .then(async res => {
          const text = await res.text();
          console.log('✅ Response status:', res.status);
          console.log('✅ Raw response:', text || '(No body)');
        })
        .catch(error => {
          console.log('❌ Error sending token to backend:', error);
        });         
    } else {
      Alert.alert('Physical device required', 'Notifications only work on physical devices.');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log('Auth state loaded, hiding splash screen.');

      registerForPushNotificationsAsync();

      // ✅ Foreground notification listener
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        Alert.alert(title || 'Job Alert', body || 'You have a new update.');
      });

      return () => {
        subscription.remove();
      };
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#696969" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="register-partner" options={{ headerShown: false }} />
      <Stack.Screen name="create-job-card" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="urgentJobList" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
