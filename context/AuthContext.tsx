// File: context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '@/constants/Api';

// Use the updated BASE_URL
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


const signIn = async (email: string, password: string, isPartner: boolean): Promise<boolean> => {
  setIsLoading(true);
  const trimmedEmail = email.trim();
  const loginEndpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
  const loginUrl = `${BASE_URL}${loginEndpoint}`;
  const loginRequestBody = { emailId: trimmedEmail, password: password, active: true };

  let retrievedId: number | null = null;
  let retrievedName: string | null = null;

  try {
      // 1. Attempt Login API Call
      console.log(`Attempting login to: ${loginUrl}`);
      const loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'accept': 'text/plain' },
          body: JSON.stringify(loginRequestBody),
      });

      const loginResponseText = await loginResponse.text();
      console.log(`Login Raw Response Text: ${loginResponseText}`);
      console.log(`Login Status Code: ${loginResponse.status}`);

      if (!loginResponse.ok) {
          let httpErrorMessage = `Login request failed (HTTP Status: ${loginResponse.status})`;
          try {
              const errorData = JSON.parse(loginResponseText);
              httpErrorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || loginResponseText || httpErrorMessage;
          } catch (e) { httpErrorMessage = loginResponseText || httpErrorMessage; }
           throw new Error(httpErrorMessage);
      }

      // 2. Parse the response and check the logical status via statusCode
      const loginResult = JSON.parse(loginResponseText);

      if (typeof loginResult?.statusCode !== 'number' || loginResult.statusCode <= 0) {
          // Use API message or a default for logical failure
          const failureMessage = loginResult?.statusMessage || "Invalid credentials or user not found.";
          console.warn(`Login failed logically: statusCode=${loginResult?.statusCode}, message='${failureMessage}'`);
          // Throw the specific failure message so the catch block can identify it
          throw new Error(failureMessage);
      }

      // --- If statusCode > 0, proceed as success ---
      retrievedId = loginResult.statusCode;
      console.log(`Login validation successful. Retrieved ID from statusCode: ${retrievedId}`);

      // 3. Fetch User/Company Name using the detail API
      const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
      const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`;
      console.log(`Workspaceing details (for name) from: ${detailUrl}`);

      try {
          const detailResponse = await fetch(detailUrl);
          if (!detailResponse.ok) {
               const detailErrorText = await detailResponse.text();
               console.error(`Failed to fetch details after login (Status: ${detailResponse.status}): ${detailErrorText}`);
               retrievedName = '';
          } else {
               const detailData = await detailResponse.json();
               console.log("Details received:", JSON.stringify(detailData, null, 2));
               if (isPartner) {
                    retrievedName = detailData?.contactPerson || detailData?.companyName || '';
               } else {
                    retrievedName = detailData?.username || '';
               }
               console.log(`Retrieved name: ${retrievedName}`);
          }
      } catch (detailError: any) {
           console.error("Error fetching user/company details after login:", detailError);
           retrievedName = '';
      }

      // 4. Create and Store Session
      const newSession: Session = {
          type: isPartner ? 'partner' : 'user',
          email: trimmedEmail,
          id: retrievedId!, // Use non-null assertion based on previous logic
          name: retrievedName || 'Unknown',
      };

      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      console.log("Sign in successful, session stored:", JSON.stringify(newSession));
      setIsLoading(false);
      return true;

  } catch (error: any) {
      console.error("Sign in error:", error);

      // ** FIX START: Check for specific credential error message **
      let alertMessage = error.message; // Default to the error message we caught
      // Check if the error message indicates invalid credentials (customize based on actual API messages)
      if (error.message?.toLowerCase().includes("invalid user") || error.message?.toLowerCase().includes("invalid credentials")) {
          alertMessage = "Please check your email or password."; // Use user-friendly message
      }
      // ** FIX END **

      Alert.alert('Sign In Failed', alertMessage); // Show the determined alert message

      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
      setSession(null);
      setIsLoading(false);
      return false;
  }
};
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