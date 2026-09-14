import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { getSession, observeAuth, signOut as signOutUser } from './auth-service';
import { getMyProfile } from './profile-service';
import type { Tables } from '@/shared/types/database.types';

type AuthStatus = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Tables<'profiles'> | null;
  error: string | null;
  retry: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function resolveSession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      setError(null);
      if (!nextSession) {
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }
      setStatus('loading');
      try {
        const nextProfile = await getMyProfile();
        if (!active) return;
        setProfile(nextProfile);
        setStatus(nextProfile ? 'authenticated' : 'onboarding');
      } catch (cause) {
        if (!active) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
      }
    }

    async function initialize() {
      try {
        const initialSession = await getSession();
        await resolveSession(initialSession);
      } catch (cause) {
        if (!active) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not restore your session.');
      }
    }

    void initialize();
    const unsubscribe = observeAuth((event: AuthChangeEvent, nextSession: Session | null) => {
      if (event === 'SIGNED_OUT' || !nextSession) {
        void resolveSession(null);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void resolveSession(nextSession);
      } else if (active) {
        setSession(nextSession);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    user: session?.user ?? null,
    profile,
    error,
    retry: () => setAttempt(current => current + 1),
    refreshProfile: async () => {
      if (!session) return;
      setStatus('loading');
      setError(null);
      try {
        const nextProfile = await getMyProfile();
        setProfile(nextProfile);
        setStatus(nextProfile ? 'authenticated' : 'onboarding');
      } catch (cause) {
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
      }
    },
    signOut: async () => {
      await signOutUser();
      if (status !== 'unauthenticated') {
        setSession(null);
        setProfile(null);
        setStatus('unauthenticated');
      }
    },
  }), [error, profile, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
