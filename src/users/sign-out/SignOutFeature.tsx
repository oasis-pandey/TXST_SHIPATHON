import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { useAuth } from '@/users/data-access/auth-context';

export function SignOutFeature() {
  const { signOut } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    try {
      await signOut();
    } catch (cause) {
      started.current = false;
      setError(cause instanceof Error ? cause.message : 'Could not sign out. Please try again.');
    }
  }, [signOut]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void submit();
  }, [submit]);

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.content}>
        {error ? (
          <>
            <ThemedText accessibilityRole="alert">{error}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                started.current = true;
                void submit();
              }}
              style={styles.button}>
              <ThemedText type="linkPrimary">Try again</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator accessibilityLabel="Signing out" />
            <ThemedText themeColor="textSecondary">Signing out…</ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  button: { minHeight: 48, justifyContent: 'center' },
});
