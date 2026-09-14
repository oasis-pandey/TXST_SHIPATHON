import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { ConversationAvatar, UnreadPill, chatStyles } from './ChatComponents';
import { formatActivityTime } from './format';
import type { ConversationSummary } from '@/chat/data-access/chat-types';

/**
 * One row shape for every context. Direct, team, and future group conversations
 * differ only in the metadata they carry, never in the messaging behaviour.
 */
export function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const preview = conversation.lastMessagePreview
    ? conversation.type === 'direct'
      ? conversation.lastMessagePreview
      : `${conversation.lastMessageSenderName ?? 'Someone'}: ${conversation.lastMessagePreview}`
    : 'No messages yet. Say hello.';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${conversation.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ConversationAvatar
        title={conversation.title}
        avatarUrl={conversation.avatarUrl}
        badge={conversation.type === 'direct' ? undefined : conversation.type === 'team' ? 'T' : 'G'}
      />
      <View style={chatStyles.fill}>
        <View style={chatStyles.spread}>
          <ThemedText type="smallBold" numberOfLines={1} style={chatStyles.fill}>
            {conversation.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatActivityTime(conversation.lastMessageAt ?? conversation.createdAt)}
          </ThemedText>
        </View>
        <View style={chatStyles.spread}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={chatStyles.fill}>
            {preview}
          </ThemedText>
          <UnreadPill count={conversation.unreadCount} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
