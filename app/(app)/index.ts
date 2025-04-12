// File: app/(app)/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';

// This component serves as the entry point for the (app) group.
// It immediately redirects to the actual home screen within the (tabs) group.
export default function AppGroupIndex() {
  // Redirect to the home screen inside the (tabs) layout,
  // relative to the current (app) layout.
  return <Redirect href="/(app)/(tabs)/home" />;
    // Alternatively, use the full path if needed:
  // return <Redirect href="/(app)/(tabs)/home" />;
}