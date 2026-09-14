import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ThemedView } from '@/shared/ui/themed-view';
import { ThemedText } from '@/shared/ui/themed-text';
import { MaxContentWidth, Spacing } from '@/shared/lib/theme';
import { signUp } from '@/users/data-access/auth-service';
import { SignUpForm } from '@/users/ui/SignUpForm';

export function SignUpFeature() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const saving = useRef(false);

  async function submit(email: string, password: string, confirmPassword: string) {
    if (saving.current) return;
    saving.current = true;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await signUp(email, password, confirmPassword);
      if (!result.hasSession) setMessage('Account created. Check your email to confirm your account, then sign in.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your account. Please try again.');
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  }

  return <ThemedView style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <SignUpForm onSubmit={submit} submitting={submitting} error={error} message={message} />
        <Link href="/sign-in"><ThemedText type="linkPrimary">Already have an account? Sign in</ThemedText></Link>
      </ScrollView>
    </KeyboardAvoidingView>
  </ThemedView>;
}
