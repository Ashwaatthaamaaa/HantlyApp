// File: context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Use the updated BASE_URL
const BASE_URL = 'http://3.110.124.83:2030';
const SESSION_STORAGE_KEY = 'userSession';

// --- Types ---
interface Session {
  type: 'user' | 'partner';
  email: string;
  id: number; // userId or companyId (pCompId)
  name: string; // Add field for username or company/contact name
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- Check storage on initial load ---
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const storedSessionJson = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (storedSessionJson) {
          const storedSession: Session = JSON.parse(storedSessionJson);
          // Basic validation of stored data
          if (storedSession && storedSession.email && storedSession.id && storedSession.type && storedSession.name) {
             setSession(storedSession);
             console.log("Session loaded from storage.");
          } else {
             // Clear invalid stored session
             console.warn("Stored session data is invalid. Clearing.");
             await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
             setSession(null);
          }
        } else {
          setSession(null);
          console.log("No session found in storage.");
        }
      } catch (e) {
        console.error("Failed to load session from storage", e);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

// Updated signIn function for context/AuthContext.tsx

const signIn = async (email: string, password: string, isPartner: boolean): Promise<boolean> => {
    setIsLoading(true);
    const trimmedEmail = email.trim();
    const loginEndpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
    const loginUrl = `${BASE_URL}${loginEndpoint}`;
    const loginRequestBody = { emailId: trimmedEmail, password: password, active: true };

    let retrievedId: number | null = null;
    let retrievedName: string | null = null;

    try {
      // 1. Validate Credentials & Get ID from statusCode
      console.log(`Attempting login to: ${loginUrl}`);
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginRequestBody),
      });
      const loginResponseText = await loginResponse.text();
      console.log(`Login Status: ${loginResponse.status}`);
      if (!loginResponse.ok) {
         let errorMessage = `Login failed (Status: ${loginResponse.status})`;
         try { const errorData = JSON.parse(loginResponseText); errorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || loginResponseText || errorMessage; } catch (e) { errorMessage = loginResponseText || errorMessage; }
         throw new Error(errorMessage);
      }

      // --- Parse response and get ID from statusCode ---
      const loginResult = JSON.parse(loginResponseText);
      if (typeof loginResult?.statusCode !== 'number') {
          throw new Error("Login succeeded but response did not contain a valid statusCode (UserId/CompanyId).");
      }
      retrievedId = loginResult.statusCode;
      console.log(`Login validation successful. Retrieved ID from statusCode: ${retrievedId}`);
      // --- End ID extraction ---


      // 2. Fetch User/Company Name using the detail API
      const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
      const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`; // Fetch details using email
      console.log(`Workspaceing details (for name) from: ${detailUrl}`);
      const detailResponse = await fetch(detailUrl);
      if (!detailResponse.ok) {
           const detailErrorText = await detailResponse.text();
           // Log error but proceed, session can be created without name if needed, though name is preferred
           console.error(`Failed to fetch details after login (Status: ${detailResponse.status}): ${detailErrorText}`);
           // Throwing error here would prevent login if detail fetch fails, might not be desired
           // throw new Error(`Failed to fetch details after login (Status: ${detailResponse.status}): ${detailErrorText}`);
           retrievedName = ''; // Set name to empty if fetch fails but login succeeded
      } else {
          const detailData = await detailResponse.json();
          console.log("Details received:", JSON.stringify(detailData, null, 2));

          // Extract Name
          if (isPartner) {
               retrievedName = detailData?.contactPerson || detailData?.companyName || ''; // Fallback to empty string
          } else {
               retrievedName = detailData?.username || ''; // Use username (lowercase u), fallback to empty
          }
          console.log(`Retrieved name: ${retrievedName}`);
      }

      // 3. Create and Store Session (ID is mandatory, name is best-effort)
      if (retrievedId === null || retrievedId <= 0) { // Double check ID is valid
           throw new Error("Login succeeded but could not obtain a valid User/Company ID.");
      }

      const newSession: Session = {
        type: isPartner ? 'partner' : 'user',
        email: trimmedEmail,
        id: retrievedId, // Use ID from statusCode
        name: retrievedName || 'Unknown', // Use retrieved name, fallback if fetch failed
      };

      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      console.log("Sign in successful, session stored:", JSON.stringify(newSession));
      setIsLoading(false);
      return true; // Indicate success

    } catch (error: any) {
      console.error("Sign in error:", error);
      Alert.alert('Sign In Failed', error.message);
      // Clear any potentially partially stored data if needed
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
      setSession(null);
      setIsLoading(false);
      return false; // Indicate failure
    }
  }; // End of signIn function
  // --- Sign Out Function ---
  const signOut = async () => {
    setIsLoading(true);
    try {
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        setSession(null);
        console.log("Sign out successful, session cleared.");
    } catch (error: any) {
        console.error("Sign out error:", error);
        Alert.alert('Sign Out Failed', error.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Provide the context value
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