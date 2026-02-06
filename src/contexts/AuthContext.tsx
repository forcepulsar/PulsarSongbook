import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase/config';

interface AuthContextType {
  currentUser: User | null;
  isApproved: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a timeout to ensure loading state is cleared even if auth fails
    const timeout = setTimeout(() => {
      console.warn('[Auth] Timeout waiting for auth state, proceeding without auth');
      setLoading(false);
    }, 5000);

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        setCurrentUser(user);

        if (user?.email) {
          try {
            // Check if user is in approved list
            const approvedDoc = await getDoc(doc(db, 'approvedUsers', user.email));
            setIsApproved(approvedDoc.exists());
          } catch (err) {
            console.error('[Auth] Error checking approved status:', err);
            setIsApproved(false);
          }
        } else {
          setIsApproved(false);
        }

        setLoading(false);
      });

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (err) {
      console.error('[Auth] Failed to initialize auth:', err);
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);

      // Check if user is approved
      if (result.user.email) {
        const approvedDoc = await getDoc(doc(db, 'approvedUsers', result.user.email));
        if (!approvedDoc.exists()) {
          await firebaseSignOut(auth);
          setError('Your email is not authorized. Please contact the administrator.');
          return;
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  const value: AuthContextType = {
    currentUser,
    isApproved,
    loading,
    signInWithGoogle,
    signOut,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
