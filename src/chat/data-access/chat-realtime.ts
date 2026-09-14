import type { RealtimeChannel } from '@supabase/supabase-js';

import { requireSupabase } from '@/shared/lib/supabase';

import { toMessage } from './chat-service';
import type { Message, MessageRow } from './chat-types';

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

/**
 * Realtime is used only for delivery. The database stays the source of truth:
 * every event carries a persisted row, and the features refetch from Postgres
 * whenever a channel recovers from a drop.
 *
 * Postgres Changes (not Broadcast) is the mechanism here because the events we
 * care about are exactly the committed rows, and Realtime re-evaluates the RLS
 * select policies for each subscriber, so an unauthorized client receives
 * nothing even if it guesses a conversation id.
 */

// One channel per topic. Re-subscribing to a topic tears the previous channel
// down first, so remounts and fast conversation switching cannot leave a
// duplicate listener behind.
const channelsByTopic = new Map<string, RealtimeChannel>();
let signOutWatcherStarted = false;

function watchSignOut() {
  if (signOutWatcherStarted) return;
  signOutWatcherStarted = true;
  requireSupabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') void closeAllChatChannels();
  });
}

export async function closeAllChatChannels() {
  const supabase = requireSupabase();
  const channels = [...channelsByTopic.values()];
  channelsByTopic.clear();
  await Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
}

function releaseTopic(topic: string) {
  const existing = channelsByTopic.get(topic);
  if (!existing) return;
  channelsByTopic.delete(topic);
  void requireSupabase().removeChannel(existing);
}

type ChannelHandlers = {
  onStatus?: (status: RealtimeStatus) => void;
  /** Fires when a channel comes back after a drop, so history can be healed. */
  onResync?: () => void;
};

function openChannel(
  topic: string,
  configure: (channel: RealtimeChannel) => RealtimeChannel,
  handlers: ChannelHandlers,
) {
  watchSignOut();
  releaseTopic(topic);

  const supabase = requireSupabase();
  let hasSubscribed = false;
  const channel = configure(supabase.channel(topic)).subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      handlers.onStatus?.('live');
      if (hasSubscribed) handlers.onResync?.();
      hasSubscribed = true;
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      handlers.onStatus?.('offline');
    }
  });

  channelsByTopic.set(topic, channel);
  handlers.onStatus?.('connecting');

  return () => {
    if (channelsByTopic.get(topic) === channel) channelsByTopic.delete(topic);
    void supabase.removeChannel(channel);
  };
}

/** New messages in the conversation the user currently has open. */
export function subscribeToConversation(
  conversationId: string,
  handlers: ChannelHandlers & { onMessage: (message: Message) => void },
) {
  return openChannel(
    `chat:conversation:${conversationId}`,
    (channel) =>
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => handlers.onMessage(toMessage(payload.new as MessageRow)),
      ),
    handlers,
  );
}

/**
 * Conversation-list activity. One channel for every conversation the user
 * belongs to instead of one channel per row: each message bumps the
 * conversation's denormalized activity columns, and RLS scopes the updates to
 * conversations the subscriber participates in.
 */
export function subscribeToConversationList(
  handlers: ChannelHandlers & { onActivity: () => void },
) {
  return openChannel(
    'chat:conversations',
    (channel) =>
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => handlers.onActivity(),
      ),
    handlers,
  );
}
