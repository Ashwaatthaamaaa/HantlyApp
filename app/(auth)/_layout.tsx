// File: app/(auth)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

// This layout component wraps the screens in the (auth) group
export default function AuthLayout() {
  return (
    // Set up a basic Stack navigator for the authentication flow
    // We hide the header here because the login/register screens
    // likely don't need a shared header bar.
    <Stack screenOptions={{ headerShown: false }} />
  );
}