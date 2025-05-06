// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router'; // [cite: 28]
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext'; // [cite: 28]
import { TranslationProvider } from '@/context/TranslationContext'; // [cite: 29]
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device'; // [cite: 29]
import { BASE_URL } from '@/constants/Api'; // [cite: 30]
import { t } from '@/config/i18n'; // [cite: 30] // Import t
import Constants from 'expo-constants';

SplashScreen.preventAutoHideAsync();

// 🛠️ Notification display config when app is in foreground
Notifications.setNotificationHandler({ // [cite: 31]
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Set to true if you want sound
    shouldSetBadge: false,
  }),
});

const InitialLayout = () => {
  // Get session details from AuthContext
  const { session, isLoading } = useAuth(); // [cite: 32, 1308] - Ensure session includes id and type

  // ✅ Register for push notifications (NOW ONLY FOR PARTNERS)
  const registerForPushNotificationsAsync = async () => { // [cite: 33]
    // Ensure it's a partner and we have their ID
    if (!session || session.type !== 'partner' || typeof session.id !== 'number') {
        console.log("Push notification registration skipped: Not a partner or session ID missing.");
        return;
    }

    const partnerId = session.id; // Use the partner's ID from the session

    if (Device.isDevice) { // [cite: 33]
      const { status: existingStatus } = await Notifications.getPermissionsAsync(); // [cite: 33]
      let finalStatus = existingStatus; // [cite: 34]

      if (existingStatus !== 'granted') { // [cite: 34]
        const { status } = await Notifications.requestPermissionsAsync(); // [cite: 34]
        finalStatus = status; // [cite: 35]
      }

      if (finalStatus !== 'granted') { // [cite: 35]
        Alert.alert(t('permissionrequired_title'), t('permissionrequired_message')); // [cite: 35]
        return; // [cite: 36]
      }

      try {
        // Get projectId from Constants
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        console.log('Project ID for push notifications:', projectId);

        // Get push token with projectId
        const tokenData = await Notifications.getExpoPushTokenAsync({ 
          projectId: projectId 
        });
        const token = tokenData.data; // [cite: 36]
        console.log('Expo Push Token obtained for Partner ID:', partnerId, 'Token:', token); // [cite: 36]

        // ✅ Send to backend (USING DYNAMIC PARTNER ID)
        console.log(`Sending token for Partner ID ${partnerId} to backend...`);
        await fetch(`${BASE_URL}/api/DeviceToken/SaveDeviceToken`, { // [cite: 37]
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pCompId: partnerId, // <-- Use dynamic partnerId from session
            token: token,
            platform: Platform.OS,
          }),
        })
          .then(async res => { // [cite: 37]
            const text = await res.text(); // [cite: 38]
            console.log(`✅ Response status for SaveDeviceToken (Partner ${partnerId}):`, res.status); // [cite: 38]
            console.log('✅ Raw response for SaveDeviceToken:', text || '(No body)'); // [cite: 38]
            if (!res.ok) {
                // Optionally throw an error or log more prominently if the save failed
                console.error(`❌ Failed to save device token for Partner ${partnerId}. Status: ${res.status}`);
            }
          })
          .catch(error => { // [cite: 38]
            console.log(`❌ Error sending token to backend for Partner ${partnerId}:`, error); // [cite: 38]
          });
      } catch (tokenError) {
          console.error("❌ Error getting Expo push token:", tokenError);
          // Handle cases where token generation itself fails
          Alert.alert(t('error'), 'Could not retrieve notification token.');
      }

    } else { // [cite: 39]
      Alert.alert(t('physicaldevice_title'), t('physicaldevice_message')); // [cite: 39]
    }
  };

  useEffect(() => { // [cite: 40]
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log('Auth state loaded, hiding splash screen.');

      // *** ADDED CHECK: Only register if the user is a partner ***
      if (session?.type === 'partner') {
          console.log("User is a partner. Attempting push notification registration.");
          registerForPushNotificationsAsync(); // Call the registration function
      } else {
          console.log("User is not a partner or not logged in. Skipping push notification registration.");
      }

      // ✅ Foreground notification listener (this can remain for all users if needed, or be moved inside the 'partner' check too)
      const subscription = Notifications.addNotificationReceivedListener(notification => { // [cite: 40]
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        console.log(`Foreground notification received: Title='${title}', Body='${body}'`);
        // Consider if this alert is needed or if notifications should just appear in the system tray
        Alert.alert(title || t('jobalert_title'), body || t('jobalert_message')); // [cite: 40]
      });

      return () => { // [cite: 40]
        subscription.remove(); // [cite: 41]
      };
    }
  }, [isLoading, session]); // Added session as a dependency

  if (isLoading) { // [cite: 42]
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#696969" />
      </View>
    );
  }

  // Stack navigation remains the same
  return ( // [cite: 43]
    <Stack
    screenOptions={{
      headerBackVisible: true,
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#696969' },
      headerTintColor: '#FFFFFF',
    }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="register-partner" options={{ headerShown: false }} />
      <Stack.Screen name="create-job-card" /> {/* [cite: 44] */}
      <Stack.Screen name="categories" /> {/* [cite: 44] */}
      <Stack.Screen name="urgentJobList" /> {/* [cite: 44] */}
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
    </Stack>
  );
}; // [cite: 44]

// RootLayout remains the same
const RootLayout = () => { // [cite: 45]
  return (
    <AuthProvider>
      <TranslationProvider>
        <InitialLayout />
      </TranslationProvider>
    </AuthProvider>
  );
}; // [cite: 45]

export default RootLayout; // [cite: 46]