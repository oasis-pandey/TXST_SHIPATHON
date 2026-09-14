import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { signIn } from '@/users/data/auth-service';
import { SignInForm } from '@/users/ui/SignInForm';

export function SignInFeature() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  async function submit(email: string, password: string) {
    if (saving.current) return;
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    saving.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.');
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  }
  return <ThemedView style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <SignInForm onSubmit={submit} submitting={submitting} error={error} />
        <Link href="/sign-up"><ThemedText type="linkPrimary">Need an account? Sign up</ThemedText></Link>
      </ScrollView>
    </KeyboardAvoidingView>
  </ThemedView>;
}
