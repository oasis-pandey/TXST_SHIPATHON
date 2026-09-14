import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { ChatButton } from './ChatComponents';
import { formatDayLabel, formatMessageTime } from './format';
import type { Message } from '@/chat/data-access/chat-types';

function MessageBubble({
  message,
  isOwn,
  showSender,
  onRetry,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  onRetry?: () => void;
}) {
  const failed = message.status === 'failed';

  return (
    <View style={[styles.bubbleRow, isOwn ? styles.alignEnd : styles.alignStart]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          message.status === 'pending' && styles.pendingBubble,
          failed && styles.failedBubble,
        ]}>
        {showSender && !isOwn ? (
          <ThemedText type="code" style={styles.sender}>
            {message.senderDisplayName}
          </ThemedText>
        ) : null}
        <ThemedText style={isOwn ? styles.ownText : undefined}>{message.content}</ThemedText>
        <View style={styles.metaRow}>
          <ThemedText type="code" style={isOwn ? styles.ownMeta : styles.meta}>
            {message.status === 'pending' ? 'Sending…' : formatMessageTime(message.createdAt)}
          </ThemedText>
        </View>
      </View>
      {failed && onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <ThemedText type="code" style={styles.retry}>Not sent. Tap to retry.</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Renders the message log oldest to newest. The list is inverted so it sticks
 * to the latest message, which also puts "load earlier" at the visual top.
 */
export function MessageList({
  messages,
  currentUserId,
  showSenderNames,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onRetry,
  emptyState,
}: {
  messages: Message[];
  currentUserId: string | null;
  showSenderNames: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetry: (message: Message) => void;
  emptyState: React.ReactNode;
}) {
  // Newest first for the inverted list; `messages` itself stays oldest first.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);

  if (!messages.length) {
    return <View style={styles.emptyContainer}>{emptyState}</View>;
  }

  return (
    <FlatList
      inverted
      data={newestFirst}
      keyExtractor={(message) => message.id}
      contentContainerStyle={styles.list}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      renderItem={({ item, index }) => {
        const older = newestFirst[index + 1];
        const startsNewDay =
          !older ||
          new Date(older.createdAt).toDateString() !== new Date(item.createdAt).toDateString();

        return (
          <View>
            <MessageBubble
              message={item}
              isOwn={item.senderId === currentUserId}
              showSender={showSenderNames}
              onRetry={() => onRetry(item)}
            />
            {startsNewDay ? (
              <ThemedText type="code" themeColor="textSecondary" style={styles.dayLabel}>
                {formatDayLabel(item.createdAt)}
              </ThemedText>
            ) : null}
          </View>
        );
      }}
      ListFooterComponent={
        hasMore ? (
          <View style={styles.loadOlder}>
            {loadingOlder ? (
              <ActivityIndicator color="#3c87f7" />
            ) : (
              <ChatButton label="Load earlier messages" tone="secondary" onPress={onLoadOlder} />
            )}
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  bubbleRow: { gap: Spacing.one, marginBottom: Spacing.two },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '84%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  ownBubble: { backgroundColor: '#1677ff', borderBottomRightRadius: Spacing.one },
  otherBubble: {
    backgroundColor: 'rgba(127, 127, 127, 0.16)',
    borderBottomLeftRadius: Spacing.one,
  },
  pendingBubble: { opacity: 0.65 },
  failedBubble: { backgroundColor: '#8c2f2f' },
  ownText: { color: '#ffffff' },
  sender: { color: '#2764B7' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  meta: { color: '#687076' },
  ownMeta: { color: 'rgba(255, 255, 255, 0.8)' },
  retry: { color: '#c73737' },
  dayLabel: { textAlign: 'center', paddingVertical: Spacing.two },
  loadOlder: { alignItems: 'center', paddingVertical: Spacing.three },
});
