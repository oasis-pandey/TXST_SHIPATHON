import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import { useTheme } from '@/shared/hooks/use-theme';

const emptyValues = {
  display_name: '', bio: '', github_url: '', skill_level: '', availability: '',
  discovery_mode: 'both', tech_stack: '', interests: '', preferred_roles: '',
};
export type ProfileFormValues = typeof emptyValues;

type Props = {
  onSubmit: (values: ProfileFormValues) => void;
  submitting: boolean;
  error: string | null;
  fieldErrors: Partial<Record<keyof ProfileFormValues, string>>;
};

const fields = [
  { name: 'display_name', label: 'Display name *', placeholder: 'What should teammates call you?', maxLength: 80 },
  { name: 'bio', label: 'Bio', placeholder: 'What would you like to build?', maxLength: 1000 },
  { name: 'github_url', label: 'GitHub profile', placeholder: 'https://github.com/yourname', maxLength: 200 },
  { name: 'skill_level', label: 'Skill level', placeholder: 'e.g. Beginner, intermediate, or advanced', maxLength: 80 },
  { name: 'availability', label: 'Availability', placeholder: 'e.g. Weekday evenings, 5 hours per week', maxLength: 160 },
  { name: 'tech_stack', label: 'Tech stack', placeholder: 'React, TypeScript, Python', maxLength: 1200 },
  { name: 'interests', label: 'Interests', placeholder: 'Education, games, accessibility', maxLength: 1200 },
  { name: 'preferred_roles', label: 'Preferred roles', placeholder: 'Frontend, backend, design', maxLength: 1200 },
] as const;

export function CreateProfileForm({ onSubmit, submitting, error, fieldErrors }: Props) {
  const [values, setValues] = useState(emptyValues);
  const theme = useTheme();
  return (
    <View style={styles.form}>
      <ThemedText type="subtitle">Create your profile</ThemedText>
      <ThemedText>Help potential teammates get to know you. Only your display name is required.</ThemedText>
      {fields.map(({ name, label, placeholder, maxLength }) => (
        <View key={name} style={styles.field}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <TextInput
            accessibilityLabel={label}
            value={values[name]}
            onChangeText={value => setValues(current => ({ ...current, [name]: value }))}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            maxLength={maxLength}
            editable={!submitting}
            multiline={name === 'bio'}
            autoCapitalize={name === 'github_url' ? 'none' : 'sentences'}
            autoCorrect={name !== 'github_url'}
            keyboardType={name === 'github_url' ? 'url' : 'default'}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }, name === 'bio' && styles.bio]}
          />
          {['tech_stack', 'interests', 'preferred_roles'].includes(name) && <ThemedText type="small">Separate items with commas.</ThemedText>}
          {fieldErrors[name] && <ThemedText accessibilityRole="alert">{fieldErrors[name]}</ThemedText>}
        </View>
      ))}
      <ThemedText type="smallBold">I want to discover</ThemedText>
      <View style={styles.options}>
        {['people', 'teams', 'both'].map(mode => (
          <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: values.discovery_mode === mode, disabled: submitting }} disabled={submitting}
            onPress={() => setValues(current => ({ ...current, discovery_mode: mode }))}
            style={[styles.option, { backgroundColor: values.discovery_mode === mode ? theme.backgroundSelected : theme.backgroundElement }]}>
            <ThemedText>{mode === 'both' ? 'Both' : mode === 'people' ? 'People' : 'Teams'}{values.discovery_mode === mode ? ' ✓' : ''}</ThemedText>
          </Pressable>
        ))}
      </View>
      {fieldErrors.discovery_mode && <ThemedText accessibilityRole="alert">{fieldErrors.discovery_mode}</ThemedText>}
      {error && <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</ThemedText>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={() => onSubmit(values)}
        style={[styles.option, { backgroundColor: theme.backgroundSelected, opacity: submitting ? 0.6 : 1 }]}>
        {submitting && <ActivityIndicator color={theme.text} />}
        <ThemedText type="smallBold">{submitting ? 'Saving…' : 'Create profile'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three }, field: { gap: Spacing.two },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16, minHeight: 48 },
  bio: { minHeight: 120, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { minHeight: 48, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.two },
});
