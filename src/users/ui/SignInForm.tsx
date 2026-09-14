import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/shared/ui/themed-text';
import { useTheme } from '@/shared/hooks/use-theme';

export function SignInForm({ onSubmit, submitting, error }: {
  onSubmit: (email: string, password: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const theme = useTheme();
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  return <View style={styles.form}>
    <ThemedText type="subtitle">Sign in to PairUp</ThemedText>
    <ThemedText>Use your existing account to create your profile.</ThemedText>
    <ThemedText>Email</ThemedText>
    <TextInput accessibilityLabel="Email" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} editable={!submitting} style={inputStyle} />
    <ThemedText>Password</ThemedText>
    <TextInput accessibilityLabel="Password" autoComplete="current-password" autoCapitalize="none" secureTextEntry value={password} onChangeText={setPassword} editable={!submitting} style={inputStyle} />
    {error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={() => onSubmit(email, password)} style={[styles.input, { backgroundColor: theme.backgroundSelected }]}>
      {submitting && <ActivityIndicator color={theme.text} />}
      <ThemedText>{submitting ? 'Signing in…' : 'Sign in'}</ThemedText>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({ form: { gap: 16 }, input: { padding: 16, borderRadius: 8, minHeight: 48, fontSize: 16 } });
