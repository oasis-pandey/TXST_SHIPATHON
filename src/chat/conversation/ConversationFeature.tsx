import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  getConversation,
  getCurrentUserId,
  listMessages,
  listMessagesSince,
  markConversationRead,
  sendMessage,
} from '@/chat/data-access/chat-service';
import { subscribeToConversation, type RealtimeStatus } from '@/chat/data-access/chat-realtime';
import {
  createClientMessageId,
  createOptimisticMessage,
  latestPersistedTimestamp,
  markMessageStatus,
  mergeMessages,
} from '@/chat/data-access/message-log';
import type { ConversationSummary, Message } from '@/chat/data-access/chat-types';
import {
  ChatEmptyState,
  ChatErrorState,
  ChatLoadingState,
  ChatScreen,
  ConnectionNotice,
  chatStyles,
} from '@/chat/ui/ChatComponents';
import { MessageComposer } from '@/chat/ui/MessageComposer';
import { MessageList } from '@/chat/ui/MessageList';

function messageOf(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'message' in cause &&
      typeof cause.message === 'string') return cause.message;
  return fallback;
}

/**
 * The one conversation screen. It receives a conversation id and renders
 * whatever that conversation is: a direct message, a team conversation, or a
 * future group. Context only changes the title and whether sender names are
 * worth showing.
 */
export default function ConversationFeature() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  // Keyed per conversation: switching conversations mounts a fresh view, so no
  // messages, subscription, or draft can leak from the previous one.
  return <ConversationView key={conversationId} conversationId={conversationId} />;
}

function ConversationView({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  // Callbacks that outlive a render (realtime, focus) read the log from here.
  const messagesRef = useRef<Message[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const [userId, summary] = await Promise.all([getCurrentUserId(), getConversation(conversationId)]);
      setCurrentUserId(userId);
      if (!summary) {
        setUnavailable(true);
        return;
      }
      setConversation(summary);

      const page = await listMessages(conversationId);
      // Merged, not replaced: a realtime message may already have landed.
      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
      loadedRef.current = true;
      void markConversationRead(conversationId).catch(() => {});
    } catch (cause) {
      setError(messageOf(cause, 'Could not open this conversation. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);


  /** Pulls anything the client missed while the channel was down. */
  const catchUp = useCallback(async () => {
    if (!loadedRef.current) return;
    const since = latestPersistedTimestamp(messagesRef.current);
    try {
      const missed = since
        ? await listMessagesSince(conversationId, since)
        : (await listMessages(conversationId)).messages;
      if (missed.length) setMessages((current) => mergeMessages(current, missed));
    } catch {
      // The persisted history is still correct; the next focus or reconnect retries.
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToConversation(conversationId, {
      onMessage: (message) => {
        if (message.conversationId !== conversationId) return;
        setMessages((current) => mergeMessages(current, [message]));
        void markConversationRead(conversationId).catch(() => {});
      },
      onStatus: setRealtimeStatus,
      onResync: () => void catchUp(),
    });

    return unsubscribe;
  }, [catchUp, conversationId]);

  // First focus loads history; every later focus only pulls what was missed.
  useFocusEffect(useCallback(() => {
    if (loadedRef.current) void catchUp();
    else void load();
  }, [catchUp, load]));

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.find((message) => message.status === 'sent');
    if (!oldest || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const page = await listMessages(conversationId, { before: oldest.createdAt });
      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
    } catch (cause) {
      setSendError(messageOf(cause, 'Could not load earlier messages.'));
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder]);

  const deliver = useCallback(async (optimistic: Message) => {
    setSendError(null);
    try {
      const saved = await sendMessage(
        conversationId,
        optimistic.content,
        optimistic.clientMessageId!,
      );
      setMessages((current) => mergeMessages(current, [saved]));
    } catch (cause) {
      setMessages((current) => markMessageStatus(current, optimistic.id, 'failed'));
      setSendError(messageOf(cause, 'Could not send that message.'));
    }
  }, [conversationId]);

  const handleSend = useCallback((content: string) => {
    if (!currentUserId) return;

    const optimistic = createOptimisticMessage({
      conversationId,
      clientMessageId: createClientMessageId(),
      senderId: currentUserId,
      senderDisplayName: 'You',
      content,
    });
    setMessages((current) => mergeMessages(current, [optimistic]));
    void deliver(optimistic);
  }, [conversationId, currentUserId, deliver]);

  const handleRetry = useCallback((message: Message) => {
    if (message.status !== 'failed' || !message.clientMessageId) return;
    setMessages((current) => markMessageStatus(current, message.id, 'pending'));
    // Same client_message_id, so a send that actually succeeded resolves to
    // that stored message instead of creating a second one.
    void deliver({ ...message, status: 'pending' });
  }, [deliver]);

  if (unavailable) {
    return (
      <ChatScreen>
        <Stack.Screen options={{ title: 'Conversation' }} />
        <ChatEmptyState title="Conversation unavailable">
          You are no longer part of this conversation, or it no longer exists.
        </ChatEmptyState>
      </ChatScreen>
    );
  }

  return (
    <ChatScreen>
      <Stack.Screen options={{ title: conversation?.title ?? 'Conversation' }} />
      <KeyboardAvoidingView
        style={chatStyles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <ConnectionNotice visible={realtimeStatus === 'offline'} />

        {error ? <ChatErrorState message={error} onRetry={() => void load()} /> : null}
        {loading && !messages.length && !error ? (
          <ChatLoadingState label="Loading messages" />
        ) : null}

        {!loading || messages.length ? (
          <View style={chatStyles.fill}>
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              showSenderNames={conversation?.type !== 'direct'}
              hasMore={hasMore}
              loadingOlder={loadingOlder}
              onLoadOlder={() => void loadOlder()}
              onRetry={handleRetry}
              emptyState={
                <ChatEmptyState title="No messages yet">
                  {conversation?.type === 'team'
                    ? 'Kick things off for your team.'
                    : 'Send the first message to get started.'}
                </ChatEmptyState>
              }
            />
          </View>
        ) : null}

        {sendError ? (
          <ThemedText type="small" style={styles.sendError}>{sendError}</ThemedText>
        ) : null}

        <MessageComposer
          onSend={handleSend}
          disabled={loading || Boolean(error)}
          placeholder={
            conversation?.type === 'team'
              ? `Message ${conversation.title}`
              : 'Write a message'
          }
        />
      </KeyboardAvoidingView>
    </ChatScreen>
  );
}

const styles = StyleSheet.create({
  sendError: {
    color: '#c73737',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
