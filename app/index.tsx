// File: app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react'; // Import React if not already present

// This screen's only purpose is to redirect to the actual starting screen.
export default function StartPage() {
  return <Redirect href="/(tabs)/home" />;
}