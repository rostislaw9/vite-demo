import { initializeApp } from 'firebase/app';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { getOrCreateUser, getUserInfo } from '@/utils/api';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
  };

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const token = await fbUser.getIdToken();
      const res = await getOrCreateUser(
        fbUser.email ?? '',
        fbUser.uid,
        token,
        fbUser.displayName,
      );
      const userData = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userData.id);
      setFirebaseUser(fbUser);
      setUser(userData);
    } catch (err) {
      console.error('Login failed:', err);
      setError(true);
      await logout();
    }
  };

  const refreshProfile = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await getUserInfo(userId);
      setUser(res.data.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        console.warn('User not found in backend, logging out.');
        await logout();
      } else {
        console.error('Failed to refresh profile:', err);
        setError(true);
      }
    }
  };

  const clearError = () => setError(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const token = await fbUser.getIdToken();
          localStorage.setItem('token', token);

          let userId = localStorage.getItem('userId');
          if (!userId) {
            const res = await getOrCreateUser(
              fbUser.email ?? '',
              fbUser.uid,
              token,
              fbUser.displayName,
            );
            const userData = res.data.data;
            localStorage.setItem('userId', userData.id);
            setUser(userData);
          } else {
            await refreshProfile();
          }
        } else {
          await logout();
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        login,
        logout,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
