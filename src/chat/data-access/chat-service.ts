import { requireSupabase } from '@/shared/lib/supabase';

import type {
  ConversationSummary,
  ConversationType,
  Message,
  MessageRow,
  MessageTarget,
  MessageTargetType,
} from './chat-types';

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_PAGE_SIZE = 50;

export async function getCurrentUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to use chat.');
  return data.user.id;
}

type ConversationRpcRow = {
  conversation_id: string;
  conversation_type: string;
  context_id: string | null;
  title: string | null;
  avatar_url: string | null;
  counterpart_user_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  last_message_sender_name: string | null;
  unread_count: number | null;
  created_at: string;
};

function toConversationSummary(row: ConversationRpcRow): ConversationSummary {
  return {
    id: row.conversation_id,
    type: row.conversation_type as ConversationType,
    contextId: row.context_id,
    title: row.title ?? 'Conversation',
    avatarUrl: row.avatar_url,
    counterpartUserId: row.counterpart_user_id,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    lastMessageSenderId: row.last_message_sender_id,
    lastMessageSenderName: row.last_message_sender_name,
    unreadCount: row.unread_count ?? 0,
    createdAt: row.created_at,
  };
}

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderDisplayName: row.sender_display_name,
    content: row.content,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
    status: 'sent',
  };
}

/**
 * True when the chat migration has not been applied to this Supabase project.
 * PostgREST reports a missing function as PGRST202 and a missing table as
 * PGRST205; both mean the same thing here, and neither is a user error.
 */
export function isChatBackendMissing(cause: unknown) {
  if (!cause || typeof cause !== 'object' || !('code' in cause)) return false;
  return cause.code === 'PGRST202' || cause.code === 'PGRST205';
}

export async function listConversations(): Promise<ConversationSummary[]> {
  // The argument is passed explicitly rather than relying on its default, so
  // PostgREST always resolves the same single signature.
  const { data, error } = await requireSupabase()
    .rpc('list_my_conversations', { p_conversation_id: null });
  if (error) throw error;
  return (data ?? []).map((row) => toConversationSummary(row as ConversationRpcRow));
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationSummary | null> {
  const { data, error } = await requireSupabase()
    .rpc('list_my_conversations', { p_conversation_id: conversationId });
  if (error) throw error;
  const [row] = (data ?? []) as ConversationRpcRow[];
  return row ? toConversationSummary(row) : null;
}

/**
 * Newest page first from the database, returned oldest-first for rendering.
 * `before` pages backwards through history instead of loading everything.
 */
export async function listMessages(
  conversationId: string,
  options: { before?: string | null; limit?: number } = {},
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const limit = options.limit ?? MESSAGE_PAGE_SIZE;
  let query = requireSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (options.before) query = query.lt('created_at', options.before);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const page = rows.slice(0, limit).map(toMessage);
  page.reverse();
  return { messages: page, hasMore: rows.length > limit };
}

/** Everything persisted after `since`, used to heal a realtime gap. */
export async function listMessagesSince(
  conversationId: string,
  since: string,
): Promise<Message[]> {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(toMessage);
}

/**
 * Sending is idempotent on the backend: retrying with the same
 * `clientMessageId` returns the message that was already stored.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  clientMessageId: string,
): Promise<Message> {
  const { data, error } = await requireSupabase().rpc('send_message', {
    p_conversation_id: conversationId,
    p_content: content,
    p_client_message_id: clientMessageId,
  });
  if (error) throw error;
  if (!data) throw new Error('Could not send that message. Please try again.');
  return toMessage(data as MessageRow);
}

export async function markConversationRead(conversationId: string) {
  const userId = await getCurrentUserId();
  const { error } = await requireSupabase()
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

type TargetRpcRow = {
  target_type: string;
  target_id: string;
  title: string | null;
  subtitle: string | null;
  avatar_url: string | null;
  conversation_id: string | null;
};

/**
 * Who the signed-in user may start a conversation with. Matching decides the
 * people and the team domain decides the teams; chat only renders the answer.
 */
export async function listMessageTargets(): Promise<MessageTarget[]> {
  const { data, error } = await requireSupabase().rpc('list_messageable_targets');
  if (error) throw error;
  return ((data ?? []) as TargetRpcRow[]).map((row) => ({
    targetType: row.target_type as MessageTargetType,
    targetId: row.target_id,
    title: row.title ?? 'Conversation',
    subtitle: row.subtitle,
    avatarUrl: row.avatar_url,
    conversationId: row.conversation_id,
  }));
}

export async function startDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .rpc('start_direct_conversation', { p_other_user_id: otherUserId });
  if (error) throw error;
  if (!data) throw new Error('Could not open that conversation. Please try again.');
  return data;
}

export async function openTeamConversation(teamId: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .rpc('ensure_team_conversation', { p_team_id: teamId });
  if (error) throw error;
  if (!data) throw new Error('Could not open that conversation. Please try again.');
  return data;
}

export function openConversationWith(target: MessageTarget): Promise<string> {
  return target.targetType === 'person'
    ? startDirectConversation(target.targetId)
    : openTeamConversation(target.targetId);
}
