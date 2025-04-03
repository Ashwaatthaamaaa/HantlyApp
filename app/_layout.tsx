import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  useEffect(() => { /* ... existing prepare logic ... */
     async function prepare() {
       try {
         await new Promise(resolve => setTimeout(resolve, 2000)); // Keep simulation
       } catch (e: unknown) { console.warn(e); }
       finally { setAppIsReady(true); }
     }
     prepare();
  }, []);

  useEffect(() => { /* ... existing hideSplash logic ... */
     const hideSplash = async () => {
       if (appIsReady) { await SplashScreen.hideAsync(); }
     };
     hideSplash();
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  // Render the main Stack Navigator
  return (
    <Stack>
      {/* Main entry point is now the Tabs layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Auth screens */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />

      {/* Optional: If app/index.tsx is needed as a separate screen, define it here */}
      {/* <Stack.Screen name="index" options={{ title: 'Welcome' }} /> */}
    </Stack>
  );
}