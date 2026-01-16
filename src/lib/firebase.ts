import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
}

// Singleton instances
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Initialize Firebase (lazy initialization)
export function initializeFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } | null {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Cloud sync is disabled.');
    return null;
  }

  if (!app) {
    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }

  if (!db) {
    db = getFirestore(app);
  }

  if (!auth) {
    auth = getAuth(app);
  }

  return { app, db, auth };
}

// Get Firebase instances (returns null if not configured)
export function getFirebaseInstances(): { db: Firestore; auth: Auth } | null {
  const result = initializeFirebase();
  if (!result) return null;
  return { db: result.db, auth: result.auth };
}

// Anonymous authentication
export async function signInAnonymouslyIfNeeded(): Promise<string | null> {
  const instances = getFirebaseInstances();
  if (!instances) return null;

  const { auth } = instances;

  return new Promise((resolve) => {
    // Check if already signed in
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (user) {
        resolve(user.uid);
      } else {
        try {
          const result = await signInAnonymously(auth);
          resolve(result.user.uid);
        } catch (error) {
          console.error('Anonymous sign-in failed:', error);
          resolve(null);
        }
      }
    });
  });
}

// Get current user ID
export function getCurrentUserId(): string | null {
  const instances = getFirebaseInstances();
  if (!instances) return null;
  return instances.auth.currentUser?.uid ?? null;
}
