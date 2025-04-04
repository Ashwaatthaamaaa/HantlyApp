// File: app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext'; // Import AuthProvider and useAuth

SplashScreen.preventAutoHideAsync();

// This component handles the redirection logic
const InitialLayout = () => {
  const { session, isLoading } = useAuth();
  const segments = useSegments(); // Needed to know current location
  const router = useRouter(); // Needed for potential future redirects (e.g., post-login)

  useEffect(() => {
    if (!isLoading) { // Only run logic once session status is known
        // --- Removed Redirect Logic ---
        // We no longer automatically redirect to /login if !session.
        // The app will now render the default route (likely '(tabs)/home')
        // regardless of login state initially.

        // --- Optional: Redirect *after* login ---
        // You might want logic *elsewhere* (e.g., in the login screen itself)
        // to redirect to home *after* a successful login.
        // The profile screen already handles redirecting *away* if the session is lost.

        // Hide splash screen
        SplashScreen.hideAsync();
    }
  }, [session, isLoading, router]); // Dependencies

   // Show nothing while loading session status
   if (isLoading) {
       return null; // Or a global loading indicator
   }

  // Render the main Stack Navigator. Expo Router shows the appropriate initial route.
  // Since we removed the redirect, it will default to rendering the '(tabs)' layout.
  return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="register-partner" options={{ headerShown: false }} />
        <Stack.Screen name="create-job-card" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
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