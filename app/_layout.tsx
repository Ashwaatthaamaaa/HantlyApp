// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert, Platform, LogBox } from 'react-native';
// ** Use Slot instead of Stack **
import { Slot, SplashScreen as ExpoSplashScreen } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { BASE_URL } from '@/constants/Api';

// Ignore specific text warning
LogBox.ignoreLogs(["Text strings must be rendered within a <Text> component."]);

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync();

// Notification display config
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Main layout component logic
function RootLayoutNav() {
  const { isLoading } = useAuth(); // Only need isLoading here now

  // Push Notification setup (remains the same - displays token)
  const registerForPushNotificationsAsync = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Push notification permission needed for updates.');
        return null;
      }
      try {
        console.log("[Push Token] Attempting to get Expo Push Token...");
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('Expo Push Token:', token);
        Alert.alert('Expo Push Token', token || 'Could not retrieve token');
        return token;
      } catch (error: any) {
        console.error("❌ Error getting Expo Push Token:", error.message);
        Alert.alert('Error', 'Failed to get push token.');
        return null;
      }
    } else {
      console.log("Not on physical device, skipping push token.");
      return null;
    }
  };


  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log("[RootLayout] Auth state loaded, hiding splash screen.");

      // Run notification setup after loading is done
      registerForPushNotificationsAsync();

      const notificationListener = Notifications.addNotificationReceivedListener(notification => { console.log("FG Notify Rcvd"); Alert.alert(notification.request.content.title || 'Notification', notification.request.content.body || ''); });
      const responseListener = Notifications.addNotificationResponseReceivedListener(response => { console.log("Notify Tapped"); /* Handle tap later */ });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };
    }
  }, [isLoading]);


  if (isLoading) {
    // Keep splash screen visible while loading auth state
    return null;
  }

  // ** Render Slot: Expo Router determines which group layout ((app) or (auth)) to render **
  // ** Protection logic is moved to (app)/_layout.tsx **
  return <Slot />;
}

// Root component wrapping everything with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}