import { Link, router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { useResource } from '@/shared/hooks/use-resource';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { ThemedText } from '@/shared/ui/themed-text';

import { isChatBackendMissing, listConversations } from '@/chat/data-access/chat-service';
import { subscribeToConversationList } from '@/chat/data-access/chat-realtime';
import {
  ChatButton,
  ChatEmptyState,
  ChatErrorState,
  ChatLoadingState,
  ChatScreen,
  chatStyles,
} from '@/chat/ui/ChatComponents';
import { ConversationRow } from '@/chat/ui/ConversationRow';

/**
 * Every conversation the user belongs to, in one generic list. Direct and team
 * conversations are the same row backed by the same query.
 */
export default function ConversationListFeature() {
  // A project without the chat migration is an empty inbox, not a broken
  // screen, so it resolves to the same empty state instead of an error.
  const loader = useCallback(async () => {
    try {
      return { conversations: await listConversations(), backendReady: true };
    } catch (cause) {
      if (!isChatBackendMissing(cause)) throw cause;
      return { conversations: [], backendReady: false };
    }
  }, []);
  const resource = useResource(loader);
  const refresh = resource.refresh;
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (!isSupabaseConfigured) {
    return (
      <ChatScreen>
        <ChatErrorState message="Add the Supabase URL and publishable key to enable Chat." />
      </ChatScreen>
    );
  }

  const conversations = resource.data?.conversations ?? [];

  return (
    <ChatScreen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Chat</ThemedText>
        <Link href="/chat/new" asChild>
          <ChatButton label="Start chat" onPress={() => {}} />
        </Link>
      </View>

      {resource.error ? (
        <ChatErrorState message={resource.error} onRetry={() => void resource.refresh()} />
      ) : null}

      {resource.loading && !resource.data ? <ChatLoadingState label="Loading conversations" /> : null}

      {resource.data && !conversations.length ? (
        <ChatEmptyState
          title="No active conversations"
          action={<ChatButton label="Start chat" onPress={() => router.push('/chat/new')} />}>
          {resource.data.backendReady
            ? 'Message someone you matched with, or open the conversation for one of your teams.'
            : 'Chat is not set up on this Supabase project yet. Apply the chat migration to start messaging.'}
        </ChatEmptyState>
      ) : null}

      {conversations.length ? (
        <FlatList
          style={chatStyles.fill}
          data={conversations}
          keyExtractor={(conversation) => conversation.id}
          refreshing={resource.loading}
          onRefresh={() => void resource.refresh()}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() =>
                router.push({
                  pathname: '/chat/[conversationId]',
                  params: { conversationId: item.id },
                })
              }
            />
          )}
        />
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
});
