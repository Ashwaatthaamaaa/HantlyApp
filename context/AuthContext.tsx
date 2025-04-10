// File: context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '@/constants/Api'; // Adjust path if needed
// --- Import background task and storage functions ---
import { registerBackgroundFetchAsync, unregisterBackgroundFetchAsync } from '../tasks/JobPollingTask'; // Adjust path
import { storeCompanyId, removeCompanyId, clearKnownJobIds } from '../utils/storage'; // Adjust path

const SESSION_STORAGE_KEY = 'userSession';

interface Session {
  type: 'user' | 'partner';
  email: string;
  id: number;
  name: string;
}

interface AuthData {
  session: Session | null;
  isLoading: boolean; // Indicates if loading session from storage initially
  signIn: (email: string, password: string, isPartner: boolean) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthData | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading

  // --- Check storage on initial load ---
  useEffect(() => {
    const loadSession = async () => {
      console.log("[AuthContext] loadSession: Starting to load session...");
      setIsLoading(true); // Ensure loading is true at start
      try {
        const storedSessionJson = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (storedSessionJson) {
          const storedSession: Session = JSON.parse(storedSessionJson);
          // Basic validation of stored data
          if (storedSession && storedSession.email && storedSession.id && storedSession.type && storedSession.name) {
             setSession(storedSession);
             console.log("[AuthContext] loadSession: Session loaded from storage:", storedSession);
             // --- Re-register background task if partner session loaded ---
             if (storedSession.type === 'partner') {
                console.log("[AuthContext] loadSession: Partner session loaded, ensuring background task is registered.");
                await storeCompanyId(storedSession.id); // Ensure ID is stored
                await registerBackgroundFetchAsync();
             }
          } else {
             // Clear invalid stored session
             console.warn("[AuthContext] loadSession: Stored session data is invalid. Clearing.");
             await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
             setSession(null);
             // --- Clean up on invalid session ---
             await unregisterBackgroundFetchAsync();
             await removeCompanyId();
             await clearKnownJobIds();
          }
        } else {
          setSession(null);
          console.log("[AuthContext] loadSession: No session found in storage.");
        }
      } catch (e) {
        console.error("[AuthContext] loadSession: Failed to load session from storage", e);
        setSession(null); // Ensure session is null on error
      } finally {
        // *** ADDED LOGGING HERE ***
        console.log("[AuthContext] loadSession finally block: Setting isLoading to false.");
        setIsLoading(false);
      }
    };
    loadSession();
  }, []); // Empty dependency array ensures this runs only once on mount

  const signIn = async (email: string, password: string, isPartner: boolean): Promise<boolean> => {
    setIsLoading(true); // Indicate loading during sign-in attempt
    console.log("[AuthContext] signIn: Attempting sign in...");
    const trimmedEmail = email.trim();
    const loginEndpoint = isPartner ? '/api/Company/CompanySignIn' : '/api/User/UserSignIn';
    const loginUrl = `${BASE_URL}${loginEndpoint}`;
    const loginRequestBody = { emailId: trimmedEmail, password: password, active: true };

    let retrievedId: number | null = null;
    let retrievedName: string | null = null;

    try {
        console.log(`[AuthContext] signIn: Attempting login to: ${loginUrl}`);
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'text/plain' },
            body: JSON.stringify(loginRequestBody),
        });
        const loginResponseText = await loginResponse.text();
        console.log(`[AuthContext] signIn: Login Raw Response Text: ${loginResponseText}`);
        console.log(`[AuthContext] signIn: Login Status Code: ${loginResponse.status}`);

        if (!loginResponse.ok) {
            let httpErrorMessage = `Login request failed (HTTP Status: ${loginResponse.status})`;
            try { const errorData = JSON.parse(loginResponseText); httpErrorMessage = errorData?.statusMessage || errorData?.title || errorData?.detail || loginResponseText || httpErrorMessage; } catch (e) { httpErrorMessage = loginResponseText || httpErrorMessage; }
            throw new Error(httpErrorMessage);
        }

        const loginResult = JSON.parse(loginResponseText);
        if (typeof loginResult?.statusCode !== 'number' || loginResult.statusCode <= 0) {
            const failureMessage = loginResult?.statusMessage || "Invalid credentials or user not found.";
            console.warn(`[AuthContext] signIn: Login failed logically: statusCode=${loginResult?.statusCode}, message='${failureMessage}'`);
            throw new Error(failureMessage);
        }

        retrievedId = loginResult.statusCode;
        console.log(`[AuthContext] signIn: Login validation successful. Retrieved ID: ${retrievedId}`);

        // Fetch details for name
        const detailEndpoint = isPartner ? '/api/Company/GetCompanyDetail' : '/api/User/GetUserDetail';
        const detailUrl = `${BASE_URL}${detailEndpoint}?EmailId=${encodeURIComponent(trimmedEmail)}`;
        console.log(`[AuthContext] signIn: Fetching details (for name) from: ${detailUrl}`);
        try {
            const detailResponse = await fetch(detailUrl);
            if (!detailResponse.ok) {
                 const detailErrorText = await detailResponse.text();
                 console.error(`[AuthContext] signIn: Failed details fetch (Status: ${detailResponse.status}): ${detailErrorText}`);
                 retrievedName = '';
            } else {
                 const detailData = await detailResponse.json();
                 if (isPartner) { retrievedName = detailData?.contactPerson || detailData?.companyName || ''; }
                 else { retrievedName = detailData?.username || ''; }
                 console.log(`[AuthContext] signIn: Retrieved name: ${retrievedName}`);
            }
        } catch (detailError: any) {
             console.error("[AuthContext] signIn: Error fetching details:", detailError);
             retrievedName = '';
        }

        // Create and Store Session
        const newSession: Session = {
            type: isPartner ? 'partner' : 'user',
            email: trimmedEmail,
            id: retrievedId!,
            name: retrievedName || 'Unknown',
        };

        await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession); // Update session state
        console.log("[AuthContext] signIn: Sign in successful, session stored:", newSession);

        // --- Register background task & store ID ONLY if partner ---
        if (isPartner) {
            await storeCompanyId(newSession.id);
            await clearKnownJobIds(); // Reset known jobs on new login
            await registerBackgroundFetchAsync();
        } else {
             await unregisterBackgroundFetchAsync();
             await removeCompanyId();
             await clearKnownJobIds();
        }

        setIsLoading(false); // Set loading false after successful sign in
        return true;

    } catch (error: any) {
        console.error("[AuthContext] signIn: Sign in error:", error);
        let alertMessage = error.message;
        if (error.message?.toLowerCase().includes("invalid user") || error.message?.toLowerCase().includes("invalid credentials")) { alertMessage = "Please check your email or password."; }
        Alert.alert('Sign In Failed', alertMessage);

        // Clean up on failed sign in
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        setSession(null);
        await unregisterBackgroundFetchAsync();
        await removeCompanyId();
        await clearKnownJobIds();
        setIsLoading(false); // Set loading false after failed sign in
        return false;
    }
  };

  // --- Sign Out Function ---
  const signOut = async () => {
    // Don't necessarily need setIsLoading(true) for sign out unless there's async work before clearing session
    console.log("[AuthContext] signOut: Signing out...");
    try {
        // --- Unregister background task BEFORE clearing session ---
        await unregisterBackgroundFetchAsync();
        await removeCompanyId();
        await clearKnownJobIds();
        // --- ------------------------------------------------- ---

        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        setSession(null); // Update session state
        console.log("[AuthContext] signOut: Sign out successful, session cleared.");
    } catch (error: any) {
        console.error("[AuthContext] signOut: Sign out error:", error);
        Alert.alert('Sign Out Failed', error.message);
    } finally {
        // No loading state change needed here usually
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