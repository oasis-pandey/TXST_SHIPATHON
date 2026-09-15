import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { useResource } from '@/shared/hooks/use-resource';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  isChatBackendMissing,
  listMessageTargets,
  openConversationWith,
} from '@/chat/data-access/chat-service';
import type { MessageTarget, MessageTargetType } from '@/chat/data-access/chat-types';
import {
  ChatEmptyState,
  ChatErrorState,
  ChatLoadingState,
  ChatScreen,
  ConversationAvatar,
  chatStyles,
} from '@/chat/ui/ChatComponents';

const contexts: { key: MessageTargetType; label: string; empty: string }[] = [
  {
    key: 'person',
    label: 'Person',
    empty: 'You can message people once you match with them in Discover.',
  },
  {
    key: 'team',
    label: 'Team',
    empty: 'Join or create a team to open its conversation.',
  },
];

/**
 * Choosing a context, not a messaging system. Every option resolves to the
 * same conversation screen, so adding a Group option later is one more entry
 * here plus one backend rule.
 */
export default function NewConversationFeature() {
  const loader = useCallback(async () => {
    try {
      return { targets: await listMessageTargets(), backendReady: true };
    } catch (cause) {
      if (!isChatBackendMissing(cause)) throw cause;
      return { targets: [], backendReady: false };
    }
  }, []);
  const resource = useResource(loader);
  const [context, setContext] = useState<MessageTargetType>('person');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const open = useCallback(async (target: MessageTarget) => {
    setOpeningId(target.targetId);
    setOpenError(null);
    try {
      const conversationId = await openConversationWith(target);
      // Replace so Back returns to the list rather than this picker.
      router.replace({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch (cause) {
      setOpenError(
        cause && typeof cause === 'object' && 'message' in cause &&
        typeof cause.message === 'string'
          ? cause.message
          : 'Could not open that conversation. Please try again.',
      );
    } finally {
      setOpeningId(null);
    }
  }, []);

  const active = contexts.find((item) => item.key === context)!;
  const targets = (resource.data?.targets ?? [])
    .filter((target) => target.targetType === context);
  const emptyCopy = resource.data?.backendReady === false
    ? 'Chat is not set up on this Supabase project yet. Apply the chat migration to start messaging.'
    : active.empty;

  return (
    <ChatScreen>
      <View style={styles.header}>
        <ThemedText type="smallBold">Who do you want to message?</ThemedText>
        <View style={styles.switcher}>
          {contexts.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: item.key === context }}
              onPress={() => setContext(item.key)}
              style={[styles.switch, item.key === context && styles.switchActive]}>
              <ThemedText
                type="smallBold"
                themeColor={item.key === context ? 'text' : 'textSecondary'}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {openError ? <ChatErrorState message={openError} /> : null}
      {resource.error ? (
        <ChatErrorState message={resource.error} onRetry={() => void resource.refresh()} />
      ) : null}
      {resource.loading && !resource.data ? <ChatLoadingState /> : null}

      {resource.data && !targets.length ? (
        <ChatEmptyState title={`No ${active.label.toLowerCase()} options yet`}>
          {emptyCopy}
        </ChatEmptyState>
      ) : null}

      {targets.length ? (
        <FlatList
          style={chatStyles.fill}
          data={targets}
          keyExtractor={(target) => `${target.targetType}:${target.targetId}`}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Message ${item.title}`}
              disabled={openingId !== null}
              onPress={() => void open(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ConversationAvatar
                title={item.title}
                avatarUrl={item.avatarUrl}
                badge={item.targetType === 'team' ? 'T' : undefined}
              />
              <View style={chatStyles.fill}>
                <ThemedText type="smallBold" numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {openingId === item.targetId
                    ? 'Opening…'
                    : item.subtitle ?? (item.conversationId ? 'Continue conversation' : 'Start a conversation')}
                </ThemedText>
              </View>
            </Pressable>
          )}
        />
      ) : null}
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.three, gap: Spacing.two },
  switcher: { flexDirection: 'row', gap: Spacing.two },
  switch: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(127, 127, 127, 0.16)',
  },
  switchActive: { backgroundColor: 'rgba(60, 135, 247, 0.24)' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
