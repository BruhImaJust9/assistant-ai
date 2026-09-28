// Auth context — the swappable authentication boundary.
//
// Uses Supabase email/password by default. To swap providers, replace the
// implementation of `signIn`, `signUp`, `signOut`, and the session listener
// here; the rest of the app consumes `useAuth()` and never touches the provider
// directly.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { upsertProfile } from '@/lib/data';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True when the app should run without auth (no Supabase or no sign-in). */
  localMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const localMode = !isSupabaseConfigured;

  useEffect(() => {
    if (localMode) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, [localMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      localMode,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        // Create the profile row immediately if a session was returned.
        if (data.user) {
          await upsertProfile(data.user.id, email, displayName).catch(() => {});
        }
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading, localMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
