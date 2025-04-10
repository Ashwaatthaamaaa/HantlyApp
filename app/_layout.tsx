// File: app/_layout.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, ActivityIndicator, Platform, Alert } from 'react-native';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router'; // Keep useRouter for notification tap
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// --- Import Task Manager definition file ---
import '../tasks/JobPollingTask'; // Adjust path as needed

import { AuthProvider, useAuth } from '@/context/AuthContext'; // Adjust path if needed

// --- Notification Handler Configuration ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Function to request permissions
async function requestPermissionsAsync() {
    if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        Alert.alert('Permission Required','Push notifications are disabled. Please enable them in your device settings to receive updates.',[{ text: 'OK' }]);
        return false;
    }
     if (Platform.OS === 'android') {
        try {
             await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
            console.log("Notification channel 'default' set for Android.");
        } catch(e) {
            console.error("Failed to set notification channel:", e);
        }
    }
    console.log("Notification permissions granted.");
    return true;
}


const InitialLayout = () => {
  // --- Hooks needed for loading state and notifications ---
  const { isLoading: isAuthLoading, session } = useAuth(); // Still need to wait for auth state
  const router = useRouter(); // Keep for notification tap navigation
  // const segments = useSegments(); // No longer needed for redirection logic
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Determine signed-in status (used by screens within tabs, but not for redirection here)
  const isSignedIn = useMemo(() => !!session, [session]);

  console.log("[InitialLayout] Rendering - isAuthLoading:", isAuthLoading, "isSignedIn:", isSignedIn);

  // Effect for hiding splash screen & requesting permissions
  useEffect(() => {
    console.log("[InitialLayout] Splash/Permission useEffect - isAuthLoading:", isAuthLoading);
    if (!isAuthLoading) {
      SplashScreen.hideAsync();
      console.log("[InitialLayout] Auth state loaded, hiding splash screen.");
      requestPermissionsAsync();
    }
  }, [isAuthLoading]);

  // Effect for setting up notification listeners (Remains the same)
  useEffect(() => {
    console.log("[InitialLayout] Setting up notification listeners.");
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response Received:', JSON.stringify(response, null, 2));
      const data = response.notification.request.content.data;
      if (data && data.ticketId) {
        const ticketId = String(data.ticketId);
        console.log(`[InitialLayout] Notification tapped, navigating to ticket ID: ${ticketId}`);
        setTimeout(() => {
             try { router.push({ pathname: '/bookings/[ticketId]', params: { ticketId: ticketId } }); }
             catch (navError) { console.error("[InitialLayout] Navigation Error on notification tap:", navError); }
        }, 100);
      } else { console.log("[InitialLayout] Notification response data missing ticketId."); }
    });
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[InitialLayout] Notification Received (Foreground):', JSON.stringify(notification, null, 2));
    });
    return () => {
      console.log("[InitialLayout] Cleaning up notification listeners.");
      if (notificationListener.current) { Notifications.removeNotificationSubscription(notificationListener.current); }
      if (responseListener.current) { Notifications.removeNotificationSubscription(responseListener.current); }
    };
  }, [router]);

   // --- REMOVED the navigation useEffect that redirected based on isSignedIn ---


  // --- Conditional return for loading state MUST be AFTER all hooks ---
  // We still wait for auth state to load before rendering the main Stack
  // to prevent screens flashing or trying to use session data before it's ready.
  if (isAuthLoading) {
     console.log("[InitialLayout] Rendering ActivityIndicator because isAuthLoading is true.");
     return (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
             <ActivityIndicator size="large" color={'#696969'} />
         </View>
     );
  }

  console.log("[InitialLayout] Rendering Stack navigator (auth loaded).");
  // Render the main Stack Navigator. Expo Router + index.tsx redirect handle the initial route.
  return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Modals */}
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="register-partner" options={{ title: 'Register Partner', presentation: 'modal' }} />
        <Stack.Screen name="create-job-card" options={{ title: 'Create Job Request', presentation: 'modal' }} />
        <Stack.Screen name="categories" options={{ title: 'All Services', presentation: 'modal' }} />
        <Stack.Screen name="findPartners/[ticketId]" options={{ title: 'Find Partners', presentation: 'modal' }} />
        <Stack.Screen name="bookings/update-status/[ticketId]" options={{ title: 'Update Service Proof', presentation: 'modal' }} />
        {/* Screens needing back button */}
        <Stack.Screen name="bookings/[ticketId]" options={{ title: 'Booking Details' }} />
        <Stack.Screen name="chat/[ticketId]" options={{ title: 'Chat' }} />
        {/* <Stack.Screen name="+not-found" /> */}
      </Stack>
  );
}

// Main Root Layout wraps everything with the AuthProvider
export default function RootLayout() {
  SplashScreen.preventAutoHideAsync();
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}