import { Link, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { useResource } from '@/shared/hooks/use-resource';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  isChatBackendMissing,
  listConversations,
  listMessageTargets,
  openTeamConversation,
  openConversationWith,
} from '@/chat/data-access/chat-service';
import { joinTeamByCode } from '@/matching/data-access/team-service';
import type { MessageTarget, MessageTargetType } from '@/chat/data-access/chat-types';
import { subscribeToConversationList } from '@/chat/data-access/chat-realtime';
import {
  ChatEmptyState,
  ChatErrorState,
  ChatButton,
  ChatIconButton,
  ChatLoadingState,
  ChatScreen,
  ConversationAvatar,
  chatStyles,
} from '@/chat/ui/ChatComponents';
import { ConversationRow } from '@/chat/ui/ConversationRow';

type ChatListData = {
  conversations: Awaited<ReturnType<typeof listConversations>>;
  targets: MessageTarget[];
  backendReady: boolean;
};

/**
 * Every conversation the user belongs to, in one generic list. Direct and team
 * conversations are the same row backed by the same query.
 */
export default function ConversationListFeature() {
  // A project without the chat migration is an empty inbox, not a broken
  // screen, so it resolves to the same empty state instead of an error.
  const loader = useCallback(async () => {
    try {
      const [conversations, targets] = await Promise.all([
        listConversations(),
        listMessageTargets(),
      ]);
      return { conversations, targets, backendReady: true } satisfies ChatListData;
    } catch (cause) {
      if (!isChatBackendMissing(cause)) throw cause;
      return { conversations: [], targets: [], backendReady: false } satisfies ChatListData;
    }
  }, []);
  const resource = useResource(loader);
  const refresh = resource.refresh;
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [context, setContext] = useState<MessageTargetType>('person');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Conversation activity arrives far more often than the list needs to be
    // rebuilt, so bursts collapse into one refetch.
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refresh(), 300);
    };

    const unsubscribe = subscribeToConversationList({
      onActivity: scheduleRefresh,
      onResync: scheduleRefresh,
    });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [refresh]);

  const openTarget = useCallback(async (target: MessageTarget) => {
    setOpeningId(target.targetId);
    setOpenError(null);
    try {
      const conversationId = await openConversationWith(target);
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch (cause) {
      setOpenError(
        cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
          ? cause.message
          : 'Could not open that conversation. Please try again.',
      );
    } finally {
      setOpeningId(null);
    }
  }, []);

  const joinTeam = useCallback(async () => {
    setJoining(true);
    setOpenError(null);
    try {
      const teamId = await joinTeamByCode(joinCode);
      setJoinCode('');
      setJoinOpen(false);
      await refresh();
      const conversationId = await openTeamConversation(teamId);
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch (cause) {
      setOpenError(
        cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
          ? cause.message
          : 'Could not join that team.',
      );
    } finally {
      setJoining(false);
    }
  }, [joinCode, refresh]);

  if (!isSupabaseConfigured) {
    return (
      <ChatScreen>
        <ChatErrorState message="Add the Supabase URL and publishable key to enable Chat." />
      </ChatScreen>
    );
  }

  const conversations = resource.data?.conversations ?? [];
  const targets = (resource.data?.targets ?? []).filter((target) => target.targetType === context);
  const sectionTitle = context === 'person' ? 'Your Matches' : 'Your Teams';

  return (
    <ChatScreen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Chat</ThemedText>
        <Link href="/chat/new" asChild>
          <ChatIconButton accessibilityLabel="Start a new chat" onPress={() => {}} />
        </Link>
      </View>

      <View style={styles.switcher}>
        {(['person', 'team'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: item === context }}
            onPress={() => setContext(item)}
            style={[styles.switch, item === context && styles.switchActive]}>
            <ThemedText type="smallBold" themeColor={item === context ? 'text' : 'textSecondary'}>
              {item === 'person' ? 'Users' : 'Teams'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {context === 'team' ? (
        <View style={styles.teamActions}>
          <Link href="/teams/new" asChild>
            <ChatButton label="Create team" onPress={() => {}} />
          </Link>
          <ChatButton
            label={joinOpen ? 'Close join' : 'Join team'}
            tone="secondary"
            onPress={() => {
              setJoinOpen((value) => !value);
              setOpenError(null);
            }}
          />
        </View>
      ) : null}

      {context === 'team' && joinOpen ? (
        <View style={styles.joinPanel}>
          <ThemedText type="smallBold">Enter a team code</ThemedText>
          <TextInput
            accessibilityLabel="Four-digit team code"
            value={joinCode}
            onChangeText={(value) => setJoinCode(value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            keyboardType="number-pad"
            maxLength={4}
            style={styles.joinInput}
          />
          <ChatButton
            label={joining ? 'Joining…' : 'Join team'}
            disabled={joining || joinCode.length !== 4}
            onPress={() => void joinTeam()}
          />
        </View>
      ) : null}

      {openError ? <ChatErrorState message={openError} /> : null}
      {resource.error ? (
        <ChatErrorState message={resource.error} onRetry={() => void resource.refresh()} />
      ) : null}

      {resource.loading && !resource.data ? <ChatLoadingState label="Loading conversations" /> : null}

      {resource.data && !targets.length && !conversations.length ? (
        <ChatEmptyState
          title={context === 'person' ? 'No matches yet' : 'No teams yet'}
          action={
            <ChatIconButton
              accessibilityLabel="Start a new chat"
              onPress={() => router.push('/chat/new')}
            />
          }>
          {resource.data.backendReady
            ? context === 'person'
              ? 'Your matches will appear here when you connect with someone in Discover.'
              : 'Your team conversations will appear here when you join or create a team.'
            : 'Chat is not set up on this Supabase project yet. Apply the chat migration to start messaging.'}
        </ChatEmptyState>
      ) : null}

      {resource.data ? (
        <ScrollView
          style={chatStyles.fill}
          refreshControl={undefined}
          contentContainerStyle={styles.content}
          onScrollBeginDrag={() => undefined}>
          {conversations.length ? (
            <View>
              <ThemedText type="smallBold" style={styles.sectionTitle}>Recent conversations</ThemedText>
              {conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } })}
                />
              ))}
            </View>
          ) : null}

          {targets.length ? (
            <View>
              <ThemedText type="smallBold" style={styles.sectionTitle}>{sectionTitle}</ThemedText>
              {targets.map((target) => (
                <Pressable
                  key={`${target.targetType}:${target.targetId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat with ${target.title}`}
                  disabled={openingId !== null}
                  onPress={() => void openTarget(target)}
                  style={({ pressed }) => [styles.targetRow, pressed && styles.pressed]}>
                  <ConversationAvatar
                    title={target.title}
                    avatarUrl={target.avatarUrl}
                    badge={target.targetType === 'team' ? 'T' : undefined}
                  />
                  <View style={chatStyles.fill}>
                    <ThemedText type="smallBold" numberOfLines={1}>{target.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {openingId === target.targetId
                        ? 'Opening…'
                        : target.conversationId ? 'Continue conversation' : 'Open conversation'}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  switcher: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  switch: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999, backgroundColor: 'rgba(127, 127, 127, 0.16)' },
  switchActive: { backgroundColor: 'rgba(60, 135, 247, 0.24)' },
  content: { paddingBottom: Spacing.four },
  sectionTitle: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
  teamActions: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  joinPanel: { marginHorizontal: Spacing.three, marginBottom: Spacing.two, padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.two, backgroundColor: 'rgba(127, 127, 127, 0.12)' },
  joinInput: { minHeight: 48, borderWidth: 1, borderColor: 'rgba(127, 127, 127, 0.32)', borderRadius: Spacing.two, paddingHorizontal: Spacing.three, fontSize: 24, letterSpacing: 6, textAlign: 'center' },
});
