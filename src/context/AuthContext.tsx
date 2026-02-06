import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authBridge, isInIframe, type AuthUser } from '../services/authBridge';
import { signInAnonymouslyIfNeeded, signInWithCustomToken, isFirebaseConfigured, setOverrideUserId } from '../lib/firebase';

interface AuthContextType {
  user: AuthUser | null;
  idToken: string | null;
  isLoading: boolean;
  isInHub: boolean;
  firebaseUserId: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInHub = isInIframe();

  useEffect(() => {
    // Start listening for auth messages from Hub
    authBridge.startListening();

    // Subscribe to auth changes
    const unsubscribe = authBridge.onAuthChange(async (authUser, token) => {
      setUser(authUser);
      setIdToken(token);

      // If we received auth from Hub, use it for Firebase
      if (authUser && token && isFirebaseConfigured()) {
        try {
          // Try to sign in with the Hub token
          const uid = await signInWithCustomToken(token);
          setFirebaseUserId(uid);
          setOverrideUserId(uid);
        } catch (error) {
          console.warn('Failed to sign in with Hub token, using Hub UID directly:', error);
          // Use the Hub user's UID directly
          setFirebaseUserId(authUser.uid);
          setOverrideUserId(authUser.uid);
        }
      } else if (!authUser && isFirebaseConfigured()) {
        // No Hub auth, fall back to anonymous auth if standalone
        if (!isInHub) {
          const anonId = await signInAnonymouslyIfNeeded();
          setFirebaseUserId(anonId);
          setOverrideUserId(null); // Use Firebase's own auth
        } else {
          setFirebaseUserId(null);
          setOverrideUserId(null);
        }
      }

      setIsLoading(false);
    });

    // If not in iframe, handle standalone mode
    if (!isInHub && isFirebaseConfigured()) {
      signInAnonymouslyIfNeeded().then((anonId) => {
        setFirebaseUserId(anonId);
        setIsLoading(false);
      });
    } else if (!isInHub) {
      setIsLoading(false);
    }

    // Request auth state again after a short delay
    const retryTimeout = setTimeout(() => {
      if (!user && isInHub) {
        authBridge.requestAuthState();
      }
    }, 1000);

    return () => {
      clearTimeout(retryTimeout);
      unsubscribe();
      authBridge.stopListening();
    };
  }, [isInHub, user]);

  return (
    <AuthContext.Provider value={{ user, idToken, isLoading, isInHub, firebaseUserId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthUser };
