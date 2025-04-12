// File: app/(app)/_layout.tsx
import React from 'react';
// ** Removed useEffect, useRouter, Redirect, ActivityIndicator, View **
import { Stack } from 'expo-router';
// ** Removed useAuth import **

export default function AppLayout() {
  // ** Removed isLoading and session checks/hooks **
  // ** Removed useEffect for redirection **
  // ** Removed loading indicator return **
  // ** Removed safeguard redirect **

  // If the root layout determined the user is authenticated, render the app stack
  console.log("[AppLayout] Rendering App Stack (Protection handled by root)");
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
    </Stack>
  );
}