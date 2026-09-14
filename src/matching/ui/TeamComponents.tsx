import { Children, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Spacing } from '@/shared/lib/theme';
import { useTheme } from '@/shared/hooks/use-theme';

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

export function PageHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <ThemedText type="smallBold" style={styles.eyebrow}>{eyebrow.toUpperCase()}</ThemedText>
        <ThemedText style={styles.heroTitle}>{title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.heroDescription}>
          {description}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}

export function TeamGrid({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(Math.max(width - Spacing.four * 2, 0), 1120);
  const columns = contentWidth >= 960 ? 3 : contentWidth >= 560 ? 2 : 1;
  const itemWidth = (contentWidth - Spacing.three * (columns - 1)) / columns;

  return (
    <View style={styles.grid}>
      {Children.map(children, (child) => (
        <View style={{ width: itemWidth }}>{child}</View>
      ))}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

export function CapacityBar({ current, maximum }: { current: number; maximum: number }) {
  const percentage = maximum > 0 ? Math.min(current / maximum, 1) : 0;
  const isFull = current >= maximum;

  return (
    <View
      accessible
      accessibilityLabel={`${current} of ${maximum} team spots filled`}
      style={styles.capacityBlock}>
      <View style={styles.capacityLabelRow}>
        <ThemedText type="smallBold">{isFull ? 'Team full' : `${maximum - current} spots open`}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{current}/{maximum}</ThemedText>
      </View>
      <View style={styles.capacityTrack}>
        <View
          style={[
            styles.capacityFill,
            isFull && styles.capacityFull,
            { width: `${percentage * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
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
    maxWidth: 1168,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.four,
  },
  hero: {
    borderRadius: 28,
    padding: Spacing.four,
    minHeight: 150,
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  heroCopy: { flex: 1, minWidth: 240, gap: Spacing.one },
  eyebrow: { color: '#2764B7', letterSpacing: 1.4 },
  heroTitle: {
    color: '#000000',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroDescription: { fontSize: 16, lineHeight: 23, maxWidth: 600 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.12)',
  },
  capacityBlock: { gap: Spacing.one, marginTop: Spacing.one },
  capacityLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  capacityTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(127, 127, 127, 0.2)',
  },
  capacityFill: { height: '100%', borderRadius: 999, backgroundColor: '#3C87F7' },
  capacityFull: { backgroundColor: '#E09B3D' },
  metric: {
    minWidth: 112,
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(127, 127, 127, 0.1)',
    gap: Spacing.half,
  },
  metricValue: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
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
