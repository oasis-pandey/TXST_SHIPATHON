import { getSupabase } from '@/shared/lib/supabase';

export async function requireUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error('Please sign in to create your profile.');
  return data.user;
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export function observeSession(onChange: (signedIn: boolean) => void) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    onChange(Boolean(session));
  });
  return () => data.subscription.unsubscribe();
}
