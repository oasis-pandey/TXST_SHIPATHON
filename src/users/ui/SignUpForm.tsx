import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { useTheme } from '@/shared/hooks/use-theme';

export function SignUpForm({ onSubmit, submitting, error, message }: {
  onSubmit: (email: string, password: string, confirmPassword: string) => void;
  submitting: boolean;
  error: string | null;
  message: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const theme = useTheme();
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  return <View style={styles.form}>
    <ThemedText type="subtitle">Join PairUp</ThemedText>
    <ThemedText>Create an account, then build your developer profile.</ThemedText>
    <ThemedText>Email</ThemedText>
    <TextInput accessibilityLabel="Email" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} editable={!submitting} style={inputStyle} />
    <ThemedText>Password</ThemedText>
    <TextInput accessibilityLabel="Password" autoComplete="new-password" autoCapitalize="none" secureTextEntry value={password} onChangeText={setPassword} editable={!submitting} style={inputStyle} />
    <ThemedText>Confirm password</ThemedText>
    <TextInput accessibilityLabel="Confirm password" autoComplete="new-password" autoCapitalize="none" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} editable={!submitting} style={inputStyle} />
    {message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
    {error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={() => onSubmit(email, password, confirmPassword)} style={[styles.input, { backgroundColor: theme.backgroundSelected }]}>
      {submitting && <ActivityIndicator color={theme.text} />}
      <ThemedText>{submitting ? 'Creating account...' : 'Create account'}</ThemedText>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({ form: { gap: 16 }, input: { padding: 16, borderRadius: 8, minHeight: 48, fontSize: 16 } });
