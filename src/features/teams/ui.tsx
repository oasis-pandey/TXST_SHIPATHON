import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TeamScreen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {action}
    </View>
  );
}

export function Card({ children }: PropsWithChildren) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {children}
    </ThemedView>
  );
}

export function EmptyState({ children }: PropsWithChildren) {
  return (
    <Card>
      <ThemedText themeColor="textSecondary">{children}</ThemedText>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <ThemedText style={styles.errorText}>{message}</ThemedText>
    </View>
  );
}

export function LoadingState() {
  return <ActivityIndicator size="large" color="#3c87f7" style={styles.loading} />;
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.primaryButton,
        tone === 'secondary' && styles.secondaryButton,
        tone === 'danger' && styles.dangerButton,
        (pressed || disabled) && styles.buttonMuted,
      ]}>
      <ThemedText type="smallBold" style={tone === 'secondary' ? undefined : styles.buttonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.backgroundSelected },
          props.multiline && styles.multiline,
          props.style,
        ]}
      />
    </View>
  );
}

export function Chips({ values }: { values: string[] }) {
  if (!values.length) return null;
  return (
    <View style={styles.chips}>
      {values.map((value) => (
        <View key={value} style={styles.chip}>
          <ThemedText type="code">{value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function StatusPill({ value }: { value: string }) {
  const backgroundColor =
    value === 'accepted' ? '#16794d' : value === 'rejected' ? '#c73737' : '#8a5d00';
  return (
    <View style={[styles.status, { backgroundColor }]}>
      <ThemedText type="code" style={styles.buttonText}>
        {value.toUpperCase()}
      </ThemedText>
    </View>
  );
}

export const teamStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  stack: { gap: Spacing.two },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  meta: { color: '#687076' },
  actions: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', marginTop: Spacing.two },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitle: { fontSize: 24, lineHeight: 32 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  errorBox: { backgroundColor: '#4f1d1d', padding: Spacing.three, borderRadius: Spacing.three },
  errorText: { color: '#ffd7d7' },
  loading: { marginVertical: Spacing.six },
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
  dangerButton: { backgroundColor: '#c73737' },
  buttonMuted: { opacity: 0.55 },
  buttonText: { color: '#fff' },
  field: { gap: Spacing.one },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  chip: { backgroundColor: 'rgba(60, 135, 247, 0.16)', borderRadius: 999, padding: Spacing.two },
  status: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
});
