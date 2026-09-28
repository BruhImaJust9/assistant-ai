// Auth screen — sign in / sign up gate. Shown when Supabase is configured
// but the user has no session.

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName || email.split('@')[0]);
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password.');
      } else if (msg.includes('already registered')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('password')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 border border-white/[0.08] shadow-glow">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 6.5c1.6 3.7 3.2 5.3 6.9 6.9-3.7 1.6-5.3 3.2-6.9 6.9-1.6-3.7-3.2-5.3-6.9-6.9 3.7-1.6 5.3-3.2 6.9-6.9Z" fill="#22d3ee" />
              <circle cx="22" cy="22" r="2.2" fill="#34d399" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Nova</h1>
          <p className="mt-1 text-sm text-ink-400">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-2xs font-medium text-ink-300">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="input-field"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-2xs font-medium text-ink-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-2xs font-medium text-ink-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input-field"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? <Spinner size={16} /> : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-400">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="font-medium text-brand-300 hover:text-brand-200"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
