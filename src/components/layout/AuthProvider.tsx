import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '@/core/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  developerBypass: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { console.error("CRITICAL ERROR: signIn called, but AuthContext is not properly initialized!"); },
  logOut: async () => { console.error("CRITICAL ERROR: logOut called, but AuthContext is not properly initialized!"); },
  developerBypass: () => { console.error("CRITICAL ERROR: developerBypass called, but AuthContext is not properly initialized!"); },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              numAssetsToWatch: 5,
              alertThreshold: 5.0,
              balance: 100000.0, // Initial $100,000 balance
              role: 'user'
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    console.log("Starting Google Sign-In with popup...");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Sign-in Error:", error.code, error.message);
      if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized in Firebase. Please add " + window.location.hostname + " to the authorized domains in your Firebase Console.");
      }
    }
  };

  const developerBypass = () => {
    console.log("Bypassing authentication for development...");
    const mockUser = {
      uid: 'dev-guest-user',
      email: 'guest@example.com',
      displayName: 'Guest Trader',
      photoURL: 'https://via.placeholder.com/150'
    } as User;

    // For Guest Bypass, we also want to ensure a "profile" logic is handled if needed
    // In this app, we'll just treat the Guest as having a transient profile with $100k
    setUser(mockUser);
    setLoading(false);
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut, developerBypass }}>
      {children}
    </AuthContext.Provider>
  );
};
