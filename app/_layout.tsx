// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
// Import View and ActivityIndicator
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext'; // Import AuthProvider and useAuth

SplashScreen.preventAutoHideAsync();

// This component now primarily handles hiding the splash screen
const InitialLayout = () => {
  const { isLoading } = useAuth();
  // Only need isLoading here
  // const segments = useSegments();
  // No longer needed for this simplified effect
  // const router = useRouter();
  // No longer needed for this simplified effect

  useEffect(() => {
    // Hide the splash screen once the auth state is loaded (isLoading is false)
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log("Auth state loaded, hiding splash screen.");
    }
    // We removed the dependency on `session` and `router` to prevent this effect
    // from causing navigation side-effects when the session changes (e.g., on failed login).
  }, [isLoading]);
  // Only depend on isLoading

   // Show nothing while loading initial session status from storage
   if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={/* Choose an appropriate color e.g., COLORS.accent */ '#696969'} />
        </View>
    );
 }

  // Render the main Stack Navigator. Expo Router handles the initial route.
  // Explicit navigation for login success/logout is handled elsewhere (login.tsx, useAuth hook)
  return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="register-partner" options={{ headerShown: false }} />
        {/* FIX: Removed headerShown: false from create-job-card */}
        <Stack.Screen name="create-job-card" />
        {/* FIX: Removed headerShown: false from categories */}
        <Stack.Screen name="categories" />
         {/* Add other screens outside the main tabs here if needed */}
         {/* <Stack.Screen name="+not-found" /> */}
      </Stack>
  );
 }


// Main Root Layout wraps everything with the AuthProvider
export default function RootLayout() {
  // No font loading or other setup shown here, assuming it exists elsewhere or isn't needed for this example

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}