import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { setApiAuthToken, getAuthStatus } from '../lib/api';
import { AuthStatusData } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  backendAuthStatus: AuthStatusData | null;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  enableDevUser: (email?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_TOKEN_KEY = 'tatvik_dev_auth_token';
const DEV_USER_KEY = 'tatvik_dev_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAuthStatus, setBackendAuthStatus] = useState<AuthStatusData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const configured = isSupabaseConfigured();

  // Load backend configuration status and session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const statusRes = await getAuthStatus();
        if (isMounted && statusRes.success && statusRes.data) {
          setBackendAuthStatus(statusRes.data);
        }
      } catch (err) {
        console.warn('Failed to load auth status from backend', err);
      }

      if (configured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (isMounted && data.session) {
            setSession(data.session);
            setUser(data.session.user);
            setToken(data.session.access_token);
            setApiAuthToken(data.session.access_token);
          }
        } catch (err) {
          console.warn('Failed to restore Supabase session', err);
        }
      } else {
        // Check for local dev session saved in localStorage
        const savedDevToken = localStorage.getItem(DEV_TOKEN_KEY);
        const savedDevUser = localStorage.getItem(DEV_USER_KEY);
        if (savedDevToken && savedDevUser) {
          try {
            const parsedUser = JSON.parse(savedDevUser);
            if (isMounted) {
              setToken(savedDevToken);
              setApiAuthToken(savedDevToken);
              setUser(parsedUser as User);
            }
          } catch {
            localStorage.removeItem(DEV_TOKEN_KEY);
            localStorage.removeItem(DEV_USER_KEY);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen for auth state changes if Supabase is configured
    if (configured) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user || null);
        const tok = currentSession?.access_token || null;
        setToken(tok);
        setApiAuthToken(tok);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [configured]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!configured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured in environment variables. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setToken(data.session.access_token);
        setApiAuthToken(data.session.access_token);
        setShowAuthModal(false);
        return { success: true };
      }

      return { success: false, error: 'Sign in succeeded but no active session was returned.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication request failed.';
      return { success: false, error: msg };
    }
  };

  const signUp = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!configured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured in environment variables. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setToken(data.session.access_token);
        setApiAuthToken(data.session.access_token);
        setShowAuthModal(false);
        return { success: true, message: 'Account created successfully!' };
      }

      return {
        success: true,
        message: 'Account created. Please check your email inbox to confirm your registration.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration request failed.';
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    if (configured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_USER_KEY);
    setSession(null);
    setUser(null);
    setToken(null);
    setApiAuthToken(null);
  };

  // Helper for quick local development when Supabase cloud is not configured
  const enableDevUser = (email: string = 'reviewer@tatvik.local') => {
    const devUserId = 'usr-dev-local';
    const devToken = `dev:${devUserId}:${email}`;
    const devUserObj = {
      id: devUserId,
      email,
      role: 'authenticated',
      app_metadata: {},
      user_metadata: { name: 'Development Reviewer' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    localStorage.setItem(DEV_TOKEN_KEY, devToken);
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(devUserObj));
    setToken(devToken);
    setApiAuthToken(devToken);
    setUser(devUserObj);
    setShowAuthModal(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        isLoading,
        isConfigured: configured,
        backendAuthStatus,
        showAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        signIn,
        signUp,
        signOut,
        enableDevUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
