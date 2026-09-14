import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/shared/lib/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';

/** Presentational chat primitives. Nothing here talks to Supabase. */

export function ChatScreen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
      edges={['bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function ChatCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

export function ChatLoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color="#3c87f7" />
      {label ? (
        <ThemedText themeColor="textSecondary" type="small">{label}</ThemedText>
      ) : null}
    </View>
  );
}

export function ChatEmptyState({
  title,
  children,
  action,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.centeredState}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" type="small" style={styles.centeredCopy}>
        {children}
      </ThemedText>
      {action}
    </View>
  );
}

export function ChatErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <ThemedText style={styles.errorText}>{message}</ThemedText>
      {onRetry ? <ChatButton label="Try again" tone="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function ChatButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' ? styles.primaryButton : styles.secondaryButton,
        (pressed || disabled) && styles.buttonMuted,
      ]}>
      <ThemedText type="smallBold" style={tone === 'primary' ? styles.primaryLabel : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function initialsFor(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part[0] ?? '').join('');
  return (initials || '?').toUpperCase();
}

export function ConversationAvatar({
  title,
  avatarUrl,
  badge,
}: {
  title: string;
  avatarUrl?: string | null;
  badge?: string;
}) {
  return (
    <View>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <ThemedText type="smallBold" style={styles.avatarInitials}>
            {initialsFor(title)}
          </ThemedText>
        </View>
      )}
      {badge ? (
        <View style={styles.avatarBadge}>
          <ThemedText type="code" style={styles.avatarBadgeText}>{badge}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function UnreadPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.unread}>
      <ThemedText type="code" style={styles.unreadText}>
        {count > 99 ? '99+' : String(count)}
      </ThemedText>
    </View>
  );
}

export function ConnectionNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.connectionNotice}>
      <ThemedText type="small" style={styles.connectionText}>
        Reconnecting… new messages will appear once you are back online.
      </ThemedText>
    </View>
  );
}

export const chatStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fill: { flex: 1 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.12)',
  },
  centeredState: {
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredCopy: { textAlign: 'center', maxWidth: 360 },
  errorBox: {
    backgroundColor: '#4f1d1d',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    margin: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  errorText: { color: '#ffd7d7' },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: '#1677ff' },
  secondaryButton: { backgroundColor: 'rgba(127, 127, 127, 0.18)' },
  buttonMuted: { opacity: 0.55 },
  primaryLabel: { color: '#ffffff' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(60, 135, 247, 0.16)' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#2764B7' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#2764B7',
  },
  avatarBadgeText: { color: '#ffffff' },
  unread: {
    minWidth: 22,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#1677ff',
    alignItems: 'center',
  },
  unreadText: { color: '#ffffff' },
  connectionNotice: {
    backgroundColor: 'rgba(224, 155, 61, 0.22)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  connectionText: { color: '#8a5d00' },
});
