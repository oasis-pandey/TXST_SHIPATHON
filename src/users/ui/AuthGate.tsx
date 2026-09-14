import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Spacing } from '@/shared/lib/theme';
import { useAuth } from '@/users/data-access/auth-context';

export function AuthGate() {
  const { status, error, retry } = useAuth();

  if (status === 'loading') {
    return <AuthStateScreen><ActivityIndicator accessibilityLabel="Restoring session" /></AuthStateScreen>;
  }

  if (status === 'error') {
    return <AuthStateScreen>
      <ThemedText accessibilityRole="alert">{error ?? 'Could not load your session.'}</ThemedText>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
        <ThemedText type="linkPrimary">Try again</ThemedText>
      </Pressable>
    </AuthStateScreen>;
  }

  return null;
}

function AuthStateScreen({ children }: { children: ReactNode }) {
  return <ThemedView style={styles.screen}>
    <View style={styles.content}>{children}</View>
  </ThemedView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  retry: { minHeight: 48, justifyContent: 'center' },
});
