import { getSupabase } from '@/shared/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email: string, password: string, confirmPassword?: string) {
  if (!email.trim()) return 'Enter your email address.';
  if (!emailPattern.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter a password.';
  if (password.length < 6) return 'Use a password with at least 6 characters.';
  if (confirmPassword !== undefined && password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (normalized.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (normalized.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'Could not connect. Check your internet connection and try again.';
  return 'Authentication failed. Please try again.';
}

export async function requireUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error('Please sign in to create your profile.');
  return data.user;
}

export async function signIn(email: string, password: string) {
  const validationError = validateCredentials(email, password);
  if (validationError) throw new Error(validationError);
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(getAuthErrorMessage(error.message));
  return data.session;
}

export async function signUp(email: string, password: string, confirmPassword: string) {
  const validationError = validateCredentials(email, password, confirmPassword);
  if (validationError) throw new Error(validationError);
  const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(getAuthErrorMessage(error.message));
  return { user: data.user, hasSession: Boolean(data.session) };
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw new Error('Could not sign out. Please try again.');
}

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw new Error('Could not restore your session. Please try again.');
  return data.session;
}

export function observeAuth(onChange: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    onChange(_event, session);
  });
  return () => data.subscription.unsubscribe();
}

export function observeSession(onChange: (signedIn: boolean) => void) {
  return observeAuth((_event, session) => onChange(Boolean(session)));
}
