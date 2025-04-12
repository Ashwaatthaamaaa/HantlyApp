// File: app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Example icon sets

// Define approximate colors or import from your constants if needed for active tint, etc.
const COLORS = {
    tabActive: '#A0522D', // Example accent color
    tabInactive: '#6C757D', // Example grey color
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.tabActive, // Example: Set active tab color
        tabBarInactiveTintColor: COLORS.tabInactive, // Example: Set inactive tab color
        // You might want to control headers from the parent Stack navigator in (app)/_layout.tsx
        // Or define them here per tab if needed.
        // headerShown: false, // Example: If parent stack handles headers
      }}
    >
      <Tabs.Screen
        name="home" // Refers to app/(tabs)/home.tsx (now within (app) group)
        options={{
          title: 'Home',
          headerShown: false, // Keep header from home.tsx if it has one defined via Stack.Screen
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings" // Refers to app/(tabs)/bookings.tsx (now within (app) group)
        options={{
          title: 'Bookings',
          headerTitleAlign: 'center', // Keep header consistent
           tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile" // Refers to app/(tabs)/profile.tsx (now within (app) group)
        options={{
          title: 'Profile',
          headerTitleAlign: 'center', // Keep header consistent
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Add more Tabs.Screen for other tabs here if you have them */}
    </Tabs>
  );
}