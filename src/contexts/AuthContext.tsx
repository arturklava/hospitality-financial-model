/**
 * Authentication Context (v4.0.2: Guest Access Mode)
 * 
 * Provides authentication state and methods throughout the application.
 * Monitors Supabase auth state changes and exposes user, loading, signIn, and signOut.
 * 
 * **Critical**: All auth methods MUST explicitly pass redirect URIs to ensure
 * Supabase knows where to send users after authentication (Localhost vs Production).
 * 
 * **v4.0.2**: Added Guest Mode to allow access without Supabase Auth for AI Agents and quick demos.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Gets the explicit redirect URI for the current environment.
 * This ensures Supabase knows where to send users after authentication.
 * 
 * @returns The origin URL (e.g., "http://localhost:5173" or "https://production.com")
 */
function getRedirectUri(): string {
  return window.location.origin;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Monitor auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Debug helper: Log all auth state changes
      console.log('Auth State Changed:', event, session);
      
      // Handle SIGNED_IN event explicitly
      if (event === 'SIGNED_IN' && session) {
        // Clear the URL hash (removes #access_token=... from URL)
        // Supabase may not always do this automatically
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (hashParams.has('access_token') || hashParams.has('refresh_token')) {
            // Replace the hash with just '#' to clean the URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            console.log('Cleared URL hash after successful sign-in');
          }
        }
        // Exit guest mode when user signs in
        setIsGuest(false);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Exit guest mode on sign out
    setIsGuest(false);
  };

  /**
   * Signs in as guest, allowing access without Supabase authentication.
   * This enables AI Agents and quick demos to use the app without auth setup.
   * 
   * **Note**: Guest mode uses localStorage for data storage (v3.6 behavior).
   * Users can sign in later to migrate to cloud storage.
   */
  const signInAsGuest = () => {
    setIsGuest(true);
  };

  /**
   * Exits guest mode, returning to the authentication flow.
   */
  const exitGuestMode = () => {
    setIsGuest(false);
  };

  /**
   * Signs in with magic link (email OTP).
   * 
   * **Critical**: Explicitly passes `emailRedirectTo` to ensure Supabase
   * redirects users back to the correct origin after clicking the magic link.
   * 
   * @param email - User's email address
   * @returns Error object if authentication fails
   */
  const signInWithMagicLink = async (email: string) => {
    const redirectUri = getRedirectUri();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUri,
      },
    });
    
    // Enhance error message for redirect URL configuration issues
    if (error) {
      const enhancedError = enhanceRedirectError(error, redirectUri);
      return { error: enhancedError };
    }
    
    return { error: null };
  };

  /**
   * Signs in with Google OAuth.
   * 
   * **Critical**: Explicitly passes `redirectTo` to ensure Supabase
   * redirects users back to the correct origin after OAuth callback.
   * 
   * @returns Error object if authentication fails
   */
  const signInWithGoogle = async () => {
    const redirectUri = getRedirectUri();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
      },
    });
    
    // Enhance error message for redirect URL configuration issues
    if (error) {
      const enhancedError = enhanceRedirectError(error, redirectUri);
      return { error: enhancedError };
    }
    
    return { error: null };
  };

  /**
   * Enhances error messages to provide helpful hints about redirect URL configuration.
   * 
   * @param error - Original Supabase error
   * @param redirectUri - The redirect URI that was used
   * @returns Enhanced error with better messaging
   */
  function enhanceRedirectError(error: Error, redirectUri: string): Error {
    const errorMessage = error.message.toLowerCase();
    
    // Check for common redirect URL errors
    if (
      errorMessage.includes('redirect') ||
      errorMessage.includes('url') ||
      errorMessage.includes('not allowed') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('configuration')
    ) {
      const enhancedMessage = `${error.message}\n\n` +
        `⚠️ Redirect URL Configuration Issue\n` +
        `The redirect URI "${redirectUri}" may not be configured in your Supabase Dashboard.\n` +
        `Please check:\n` +
        `1. Go to Supabase Dashboard → Authentication → URL Configuration\n` +
        `2. Add "${redirectUri}" to the "Redirect URLs" list\n` +
        `3. For localhost, add "http://localhost:*" or the specific port\n` +
        `4. For production, add your production domain`;
      
      return new Error(enhancedMessage);
    }
    
    return error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest,
        signIn,
        signOut,
        signUp,
        signInWithMagicLink,
        signInWithGoogle,
        signInAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

