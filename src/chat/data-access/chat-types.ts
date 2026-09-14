import type { Tables } from '@/shared/types/database.types';

export type ConversationType = 'direct' | 'team' | 'group';

export type ConversationRow = Tables<'conversations'>;
export type MessageRow = Tables<'messages'>;

/**
 * The context-agnostic shape every chat screen renders. `type` only changes how
 * a conversation is titled and where it came from, never how messaging works.
 */
export type ConversationSummary = {
  id: string;
  type: ConversationType;
  contextId: string | null;
  title: string;
  avatarUrl: string | null;
  counterpartUserId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
  createdAt: string;
};

export type MessageStatus = 'sent' | 'pending' | 'failed';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderDisplayName: string;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
  status: MessageStatus;
};

export type MessageTargetType = 'person' | 'team';

export type MessageTarget = {
  targetType: MessageTargetType;
  targetId: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  conversationId: string | null;
};

export const conversationTypeLabels: Record<ConversationType, string> = {
  direct: 'Direct message',
  team: 'Team',
  group: 'Group',
};
