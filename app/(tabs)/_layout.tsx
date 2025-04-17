import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { t, langEventEmitter, LANGUAGE_CHANGE_EVENT } from '@/config/i18n';
// Example icon sets

export default function TabLayout() {
  // Add a state to force re-renders on language change
  const [, setLanguageChanged] = useState(0);

  // Listen for language change events to trigger re-renders
  useEffect(() => {
    const handleLanguageChange = () => {
      // Increment to force re-render
      setLanguageChanged(prev => prev + 1);
    };
    
    // Subscribe to language change events
    langEventEmitter.on(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    
    // Clean up on unmount
    return () => {
      langEventEmitter.off(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        
        // tabBarActiveTintColor: 'blue', // Example: Set active tab color - Use Figma color!
        // headerShown: false, // Set to false if you manage headers inside each screen
      }}
    >
      <Tabs.Screen
        name="home" // This refers to app/(tabs)/home.tsx
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => ( // Type added
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          // Hide header if you want a custom one in home.tsx
           headerShown: false,
        }}
      />
      <Tabs.Screen
        name="bookings" // This refers to app/(tabs)/bookings.tsx
        options={{
          title: t('bookings'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => ( // Type added
            <MaterialCommunityIcons name="calendar-check-outline" size={size} color={color} />
          ),
           headerTitleAlign: 'center', // Example header styling
        }}
      />
      <Tabs.Screen
        name="profile" // This refers to app/(tabs)/profile.tsx
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => ( // Type added
            <Ionicons name="person-outline" size={size} color={color} />
          ),
           headerTitleAlign: 'center',
        }}
      />
      {/* Add more Tabs.Screen for other tabs here */}
    </Tabs>
  );
}