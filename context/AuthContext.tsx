// File: context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '@/constants/Api';
import { t } from '@/config/i18n';

// Use the updated BASE_URL
const SESSION_STORAGE_KEY = 'userSession';

// --- Types ---
// Session requires name again, as it's fetched during sign-in
interface Session {
  type: 'user' | 'partner';
  email: string;
  id: number; // userId or companyId (pCompId)
  name: string; // Name fetched during sign-in
}

// Removed PartnerProfileData type from here

interface AuthData {
  session: Session | null;
  isLoading: boolean; // Indicates if loading session from storage initially
  signIn: (email: string, password: string, isPartner: boolean) => Promise<boolean>;
  signOut: () => void;
  // Removed profile caching state and function
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

  // Removed state for cached partner profile

  // --- Check storage on initial load ---
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const storedSessionJson = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (storedSessionJson) {
          const storedSession: Session = JSON.parse(storedSessionJson);
          // Basic validation - now requires name again
          if (storedSession && storedSession.email && storedSession.id && storedSession.type && storedSession.name) {
             setSession(storedSession);
             console.log("Session loaded from storage.");
          } else {
             console.warn("Stored session data is invalid (might be missing name). Clearing.");
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

  // --- Reverted signIn (fetches details immediately) ---
  const signIn = async (email: string, password: string, isPartner: boolean): Promise<boolean> => {
      setIsLoading(true);
      const trimmedEmail = email.trim();
      const loginEndpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
      const loginUrl = `${BASE_URL}${loginEndpoint}`;
      const loginRequestBody = { emailId: trimmedEmail, password: password, active: true };

      let retrievedId: number | null = null;
      let retrievedName: string | null = null; // Name fetched here

      try {
          // 1. Attempt Login API Call
          console.log(`Attempting login to: ${loginUrl}`);
          const loginResponse = await fetch(loginUrl, { /* ... headers/body ... */
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'accept': 'text/plain' },
                body: JSON.stringify(loginRequestBody),
          });
          const loginResponseText = await loginResponse.text();
          console.log(`Login Raw Response Text: ${loginResponseText}`);
          console.log(`Login Status Code: ${loginResponse.status}`);
          if (!loginResponse.ok) {
                let httpErrorMessage = `Login request failed (HTTP Status: ${loginResponse.status})`;
                try { const errorData = JSON.parse(loginResponseText); httpErrorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || loginResponseText || httpErrorMessage; } catch (e) { httpErrorMessage = loginResponseText || httpErrorMessage; }
                throw new Error(httpErrorMessage);
          }
          const loginResult = JSON.parse(loginResponseText);
          if (typeof loginResult?.statusCode !== 'number' || loginResult.statusCode <= 0) {
                const failureMessage = loginResult?.statusMessage || "Invalid credentials or user not found.";
                console.warn(`Login failed logically: statusCode=${loginResult?.statusCode}, message='${failureMessage}'`);
                throw new Error(failureMessage);
          }

          retrievedId = loginResult.statusCode;
          console.log(`Login validation successful. Retrieved ID from statusCode: ${retrievedId}`);

          // 2. Fetch User/Company Name using the detail API (IMMEDIATELY)
          const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
          const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`;
          console.log(`Workspaceing details (for name) from: ${detailUrl}`);
          try {
                const detailResponse = await fetch(detailUrl);
                if (!detailResponse.ok) {
                    const detailErrorText = await detailResponse.text();
                    console.error(`Failed to fetch details after login (Status: ${detailResponse.status}): ${detailErrorText}`);
                    retrievedName = 'Unknown'; // Assign default on error
                } else {
                    const detailData = await detailResponse.json();
                    console.log("Details received:", JSON.stringify(detailData, null, 2));
                    if (isPartner) {
                        retrievedName = detailData?.contactPerson || detailData?.companyName || 'Unknown';
                    } else {
                        retrievedName = detailData?.username || 'Unknown';
                    }
                    console.log(`Retrieved name: ${retrievedName}`);
                }
          } catch (detailError: any) {
                console.error("Error fetching user/company details after login:", detailError);
                retrievedName = 'Unknown'; // Assign default on error
          }

          // 3. Create and Store Session (using retrieved name)
          const newSession: Session = {
                type: isPartner ? 'partner' : 'user',
                email: trimmedEmail,
                id: retrievedId!, // Use non-null assertion based on previous logic
                name: retrievedName || 'Unknown', // Ensure name is a string
          };

          await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(newSession));
          setSession(newSession);
          console.log("Sign in successful, session stored:", JSON.stringify(newSession));
          setIsLoading(false);
          return true;
      } catch (error: any) {
          console.error("Sign in error:", error);
          let alertMessage = error.message;
          if (error.message?.toLowerCase().includes("invalid user") || error.message?.toLowerCase().includes("invalid credentials")) { alertMessage = "Please check your email or password."; }
          Alert.alert(t('error'), alertMessage);
          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
          setSession(null);
          setIsLoading(false);
          return false;
      }
  };
  // --- END Reverted signIn ---


  // --- Sign Out Function ---
  const signOut = async () => {
    setIsLoading(true);
    // Removed profile cache clearing
    try {
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        setSession(null);
        console.log("Sign out successful, session cleared.");
    } catch (error: any) {
        console.error("Sign out error:", error);
        Alert.alert(t('error'), error.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Provide the context value (without profile caching)
  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = (): AuthData => { // Return type reverted
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};