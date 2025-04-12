// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert, Platform, LogBox } from 'react-native';
// ** Import Stack, useRouter **
import { Stack, useRouter, SplashScreen as ExpoSplashScreen } from 'expo-router';
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
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // Push Notification setup function (unchanged)
  const registerForPushNotificationsAsync = async () => { /* ... function content from previous step ... */ if(!Device.isDevice){console.log("Not on physical device, skipping push token.");return null}const{status:e}=await Notifications.getPermissionsAsync();let t=e;if(e!=="granted"){const{status:e}=await Notifications.requestPermissionsAsync();t=e}if(t!=="granted"){Alert.alert("Permission Required","Push notification permission needed for updates.");return null}try{console.log("[Push Token] Attempting to get Expo Push Token...");const e=await Notifications.getExpoPushTokenAsync(),o=e.data;console.log("Expo Push Token:",o);Alert.alert("Expo Push Token",o||"Could not retrieve token");return o}catch(e:any){console.error("❌ Error getting Expo Push Token:",e.message);Alert.alert("Error","Failed to get push token.");return null} };

  // Effect to handle navigation after auth state is loaded
  useEffect(() => {
    console.log(`[RootLayout] Auth Loading State: ${isLoading}, Session State: ${session ? 'Exists' : 'Null'}`);
    if (isLoading) {
      return; // Don't navigate until loading is done
    }

    // Auth state is loaded now
    SplashScreen.hideAsync(); // Hide splash screen
    console.log("[RootLayout] Auth state loaded.");

    // Perform navigation action
    if (session) {
      // Logged in: Navigate to the main app area
      console.log("[RootLayout] Session exists, replacing route with App Home.");
      router.replace('/(app)/(tabs)/home');
    } else {
      // Logged out: Navigate to the login screen
      console.log("[RootLayout] No session, replacing route with Login.");
      router.replace('/(auth)/login');
    }

    // Setup notifications (can run after navigation decision)
    registerForPushNotificationsAsync();
    const notificationListener = Notifications.addNotificationReceivedListener(notification => { console.log("FG Notify Rcvd"); Alert.alert(notification.request.content.title || 'Notification', notification.request.content.body || ''); });
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => { console.log("Notify Tapped"); /* Handle tap later */ });
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };

  }, [isLoading, session, router]); // Depend on loading and session state


  // While loading, show nothing (splash screen is visible)
  if (isLoading) {
    return null;
  }

  // Render the Stack containing the groups. The useEffect above handles
  // ensuring the router navigates to the correct group initially.
  return (
      <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
      </Stack>
  );
}

// Root component wrapping everything with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}