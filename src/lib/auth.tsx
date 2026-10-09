// Auth context — simplified to no-auth mode.
//
// The app runs without a login screen. Conversations are stored in browser
// memory. AI features (chat, web search, image generation) use Supabase Edge
// Functions with server-side API keys, accessed via the anon key (no JWT
// required).

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  localMode: boolean;
  signIn: (_email: string, _password: string) => Promise<void>;
  signUp: (_email: string, _password: string, _displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      session: null,
      user: null,
      loading: false,
      localMode: true,
      async signIn() {},
      async signUp() {},
      async signOut() {},
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
