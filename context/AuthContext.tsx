// File: context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store'; // Import SecureStore

const BASE_URL = 'http://3.110.124.83:2030';
const SESSION_STORAGE_KEY = 'userSession'; // Key for storing session data

// --- Types ---
interface Session {
  type: 'user' | 'partner';
  email: string;
  id: number; // Store userId or companyId (pCompId) here
  // Add token here if/when API provides it
}

interface AuthData {
  session: Session | null;
  isLoading: boolean; // Indicates if loading session from storage initially
  signIn: (email: string, password: string, isPartner: boolean) => Promise<boolean>;
  signOut: () => void;
}

// --- Context Definition ---
const AuthContext = createContext<AuthData | undefined>(undefined);

// --- Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to check storage

  // --- Check storage on initial load ---
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true); // Ensure loading is true while checking
      try {
        const storedSessionJson = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (storedSessionJson) {
          const storedSession = JSON.parse(storedSessionJson);
          // Optional: Add validation here to ensure storedSession has expected fields/types
          setSession(storedSession);
          console.log("Session loaded from storage.");
        } else {
          setSession(null);
          console.log("No session found in storage.");
        }
      } catch (e) {
        console.error("Failed to load session from storage", e);
        setSession(null); // Default to logged out on error
      } finally {
        setIsLoading(false); // Done checking storage
      }
    };
    loadSession();
  }, []); // Run only once on mount

  // --- Sign In Function ---
  const signIn = async (email: string, password: string, isPartner: boolean): Promise<boolean> => {
    // Use a separate loading state for the sign-in process itself if needed
    // setIsLoading(true); // Or use a different state like isSigningIn

    const trimmedEmail = email.trim();
    const endpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
    const loginUrl = `${BASE_URL}${endpoint}`;
    const loginRequestBody = { emailId: trimmedEmail, password: password, active: true };

    try {
      // 1. Validate Credentials
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginRequestBody),
      });
      const loginResponseText = await loginResponse.text();
      if (!loginResponse.ok) {
         let errorMessage = `Login failed (Status: ${loginResponse.status})`;
         try { const errorData = JSON.parse(loginResponseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || loginResponseText || errorMessage; } catch (e) { errorMessage = loginResponseText || errorMessage; }
         throw new Error(errorMessage);
      }
      // Optional: Check statusCode/statusMessage

      // 2. Fetch User/Company ID
      const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
      const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`;
      const detailResponse = await fetch(detailUrl);
      if (!detailResponse.ok) {
           const detailErrorText = await detailResponse.text();
           throw new Error(`Failed to fetch details after login (Status: ${detailResponse.status}): ${detailErrorText}`);
      }
      const detailData = await detailResponse.json();
      const currentId = isPartner ? detailData?.pCompId : detailData?.userId;
      if (!currentId) { throw new Error("Could not retrieve valid User/Company ID after login."); }

      // 3. Create and Store Session
      const newSession: Session = {
        type: isPartner ? 'partner' : 'user',
        email: trimmedEmail,
        id: currentId,
      };

      // --- Store session in SecureStore ---
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      // ------------------------------------

      setSession(newSession); // Update state
      // setIsLoading(false); // Or use isSigningIn state
      console.log("Sign in successful, session stored.");
      return true; // Indicate success

    } catch (error: any) {
      console.error("Sign in error:", error);
      Alert.alert('Sign In Failed', error.message);
      // setIsLoading(false); // Or use isSigningIn state
      return false; // Indicate failure
    }
  };

  // --- Sign Out Function ---
  const signOut = async () => {
    // setIsLoading(true); // Optional: loading state for sign out
    try {
        // --- Delete session from SecureStore ---
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        // ---------------------------------------
        setSession(null); // Update state
        console.log("Sign out successful, session cleared.");
    } catch (error: any) {
        console.error("Sign out error:", error);
        Alert.alert('Sign Out Failed', error.message);
    } finally {
        // setIsLoading(false); // Optional: loading state for sign out
    }
    // Navigation is handled by the root layout effect watching the session state
  };

  // Provide the context value (session state is now loaded/managed with persistence)
  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = (): AuthData => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};