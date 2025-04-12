// File: app/(app)/_layout.tsx
import React, { useEffect } from 'react';
// ** Import Redirect for safeguarding **
import { Stack, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check authentication state after loading is complete
    if (!isLoading && !session) {
      // If not logged in and not loading, redirect to the login screen
      console.log("[AppLayout] No session, redirecting from app group to login...");
      // ** Ensure correct login path including group **
      router.replace('/(auth)/login'); // More explicit path
    } else if (!isLoading && session) {
        console.log("[AppLayout] Session found, user is authenticated.");
    }
  }, [session, isLoading, router]);

  // Show loading indicator while session is loading
  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#696969" />
        </View>
    );
  }

  // Safeguard: If somehow this point is reached without a session after loading, redirect.
  if (!session) {
     console.log("[AppLayout] Render reached with no session (safeguard redirect).");
     // Use Redirect component for cleaner handling in render phase
     return <Redirect href="/(auth)/login" />;
  }

  // User is authenticated, render the main app stack
  console.log("[AppLayout] Rendering App Stack")
  return (
    <Stack>
      {/* Main Tabs Navigator */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Other screens accessible from within the app */}
      <Stack.Screen name="create-job-card" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="urgentJobList" />

      {/* Nested screens */}
      <Stack.Screen name="bookings/[ticketId]" />
      <Stack.Screen name="bookings/update-status/[ticketId]" />
      <Stack.Screen name="chat/[ticketId]" />
      {/* Removed findPartners screen */}
    </Stack>
  );
}