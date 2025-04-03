import React from 'react';
import { Redirect } from 'expo-router';

export default function StartPage() {
  // Redirects immediately to the home screen within the tabs layout
  return <Redirect href="/(tabs)/home" />;
}