import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { MESSAGE_MAX_LENGTH } from '@/chat/data-access/chat-service';

/**
 * Owns only the draft text. Whether a send succeeds, retries, or is rejected is
 * the feature's concern.
 */
export function MessageComposer({
  onSend,
  disabled,
  placeholder = 'Write a message',
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();
  const canSend = !disabled && trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH;

  const submit = () => {
    if (!canSend) return;
    // Clearing first keeps a fast double tap from sending the same text twice.
    setDraft('');
    onSend(trimmed);
  };

  return (
    <View style={[styles.composer, { borderTopColor: theme.backgroundSelected }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        editable={!disabled}
        multiline
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Message"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!canSend}
        onPress={submit}
        style={({ pressed }) => [
          styles.send,
          (!canSend || pressed) && styles.sendMuted,
        ]}>
        <ThemedText type="smallBold" style={styles.sendLabel}>Send</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  send: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: '#1677ff',
  },
  sendMuted: { opacity: 0.5 },
  sendLabel: { color: '#ffffff' },
});
