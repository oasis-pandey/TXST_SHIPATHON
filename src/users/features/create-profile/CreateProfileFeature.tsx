import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/users/data/auth-context';
import { createProfile, getMyProfile } from '@/users/data/profile-service';
import { normalizeProfile, validateProfile } from '@/users/data/profile-types';
import { CreateProfileForm, type ProfileFormValues } from '@/users/ui/CreateProfileForm';

export function CreateProfileFeature() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const saving = useRef(false);
  const activeScreen = useRef(true);

  useEffect(() => {
    let active = true;
    activeScreen.current = true;
    async function load() {
      try {
        const profile = await getMyProfile();
        if (!active) return;
        if (profile) router.replace('/(tabs)/index');
        else setReady(true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; activeScreen.current = false; };
  }, [attempt, router]);

  async function submit(values: ProfileFormValues) {
    if (saving.current) return;
    const input = normalizeProfile({ ...values, tech_stack: values.tech_stack.split(','), interests: values.interests.split(','), preferred_roles: values.preferred_roles.split(',') });
    const errors = validateProfile(input);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    saving.current = true;
    setSubmitting(true);
    try {
      await createProfile(input);
      await refreshProfile();
      if (activeScreen.current) router.replace('/(tabs)/index');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile. Please try again.');
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {loading ? <ActivityIndicator accessibilityLabel="Loading profile" /> : ready ? (
              <CreateProfileForm onSubmit={submit} submitting={submitting} error={error} fieldErrors={fieldErrors} />
            ) : <>
              <ThemedText accessibilityRole="alert">{error}</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  setAttempt(value => value + 1);
                }}>
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
              <Link href="/sign-in"><ThemedText type="linkPrimary">Sign in</ThemedText></Link>
            </>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
});
