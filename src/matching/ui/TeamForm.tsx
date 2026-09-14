import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';

import type { TeamDraft } from '@/matching/data-access/team-types';
import { Button, Card, Field } from './TeamComponents';

export const emptyTeamDraft: TeamDraft = {
  name: '',
  description: '',
  projectIdea: '',
  repoUrl: '',
  techStack: '',
  maxMembers: 4,
  creatorRole: 'Creator',
};

export function TeamForm({
  initialValue = emptyTeamDraft,
  submitLabel,
  includeCreatorRole = true,
  onSubmit,
}: {
  initialValue?: TeamDraft;
  submitLabel: string;
  includeCreatorRole?: boolean;
  onSubmit: (draft: TeamDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TeamDraft>(key: K, value: TeamDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      setError('Team name is required.');
      return;
    }
    if (draft.name.trim().length > 80) {
      setError('Keep the team name under 80 characters.');
      return;
    }
    if (draft.repoUrl.trim()) {
      try {
        const url = new URL(draft.repoUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        setError('Enter a complete repository URL beginning with http:// or https://.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the team.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText style={styles.sectionTitle}>Team basics</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Give people a quick reason to open your team.
          </ThemedText>
        </View>
        <Field
          label="Team name"
          value={draft.name}
          onChangeText={(value) => set('name', value)}
          maxLength={80}
          placeholder="Example: Launch Lab"
        />
        <Field
          label="Short description"
          value={draft.description}
          onChangeText={(value) => set('description', value)}
          placeholder="What kind of team are you building?"
          maxLength={280}
          multiline
        />
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText style={styles.sectionTitle}>Project</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            These details help developers decide whether they are a fit.
          </ThemedText>
        </View>
        <Field
          label="Project idea"
          value={draft.projectIdea}
          onChangeText={(value) => set('projectIdea', value)}
          placeholder="Describe the problem and what you want to build."
          multiline
        />
        <Field
          label="Repository URL"
          value={draft.repoUrl}
          onChangeText={(value) => set('repoUrl', value)}
          placeholder="https://github.com/organization/project"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Field
          label="Tech stack"
          value={draft.techStack}
          onChangeText={(value) => set('techStack', value)}
          placeholder="Expo, TypeScript, Supabase"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Separate technologies with commas.
        </ThemedText>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText style={styles.sectionTitle}>Team setup</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose a capacity. A saved team cannot be reduced below its current roster.
          </ThemedText>
        </View>
        {includeCreatorRole && (
          <Field
            label="Your role"
            value={draft.creatorRole}
            onChangeText={(value) => set('creatorRole', value)}
            placeholder="Creator, designer, frontend…"
          />
        )}
        <View accessibilityRole="radiogroup" style={styles.capacityRow}>
          {([2, 4] as const).map((capacity) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: draft.maxMembers === capacity }}
              key={capacity}
              onPress={() => set('maxMembers', capacity)}
              style={[
                styles.capacity,
                draft.maxMembers === capacity && styles.selectedCapacity,
              ]}>
              <ThemedText
                type="smallBold"
                style={draft.maxMembers === capacity && styles.selectedText}>
                {capacity} members
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      {error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
      <Button label={saving ? 'Saving…' : submitLabel} onPress={submit} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
  section: { gap: Spacing.three },
  sectionHeading: { gap: Spacing.one },
  sectionTitle: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
  capacityRow: { flexDirection: 'row', gap: Spacing.two },
  capacity: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: 'rgba(127, 127, 127, 0.18)',
    alignItems: 'center',
  },
  selectedCapacity: { backgroundColor: '#1677ff' },
  selectedText: { color: '#fff' },
  error: { color: '#e5484d' },
});
