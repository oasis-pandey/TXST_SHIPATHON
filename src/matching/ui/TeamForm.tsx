import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';

import type { TeamDraft } from '@/matching/data-access/team-types';
import { Button, Field } from './TeamComponents';

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
      <Field label="Team name" value={draft.name} onChangeText={(value) => set('name', value)} />
      <Field
        label="Description"
        value={draft.description}
        onChangeText={(value) => set('description', value)}
        multiline
      />
      <Field
        label="Project idea"
        value={draft.projectIdea}
        onChangeText={(value) => set('projectIdea', value)}
        multiline
      />
      <Field
        label="Repository URL"
        value={draft.repoUrl}
        onChangeText={(value) => set('repoUrl', value)}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Field
        label="Tech stack (comma separated)"
        value={draft.techStack}
        onChangeText={(value) => set('techStack', value)}
        autoCapitalize="none"
      />
      {includeCreatorRole && (
        <Field
          label="Your role"
          value={draft.creatorRole}
          onChangeText={(value) => set('creatorRole', value)}
        />
      )}

      <View style={styles.capacityRow}>
        <ThemedText type="smallBold">Team capacity</ThemedText>
        {([2, 4] as const).map((capacity) => (
          <Pressable
            key={capacity}
            onPress={() => set('maxMembers', capacity)}
            style={[
              styles.capacity,
              draft.maxMembers === capacity && styles.selectedCapacity,
            ]}>
            <ThemedText type="smallBold" style={draft.maxMembers === capacity && styles.selectedText}>
              {capacity} members
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <Button label={saving ? 'Saving…' : submitLabel} onPress={submit} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  capacityRow: { gap: Spacing.two },
  capacity: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: 'rgba(127, 127, 127, 0.18)',
  },
  selectedCapacity: { backgroundColor: '#1677ff' },
  selectedText: { color: '#fff' },
  error: { color: '#e5484d' },
});
