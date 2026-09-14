import type { Message, MessageStatus } from './chat-types';

/**
 * Pure helpers for the message log. Realtime events, history pages, and
 * optimistic sends all flow through here, so ordering and de-duplication are
 * decided in one place instead of inside a component.
 */

/** Oldest first. `created_at` comes from the database; id breaks exact ties. */
export function compareMessages(a: Message, b: Message) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function optimisticIdFor(clientMessageId: string) {
  return `pending:${clientMessageId}`;
}

export function createOptimisticMessage(input: {
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  senderDisplayName: string;
  content: string;
}): Message {
  return {
    id: optimisticIdFor(input.clientMessageId),
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderDisplayName: input.senderDisplayName,
    content: input.content,
    clientMessageId: input.clientMessageId,
    // Sorts last until the database timestamp replaces it.
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Merges persisted messages into the log. A persisted message replaces its own
 * optimistic copy (matched on client_message_id), so a realtime echo and the
 * send response can arrive in either order without rendering twice.
 */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  if (!incoming.length) return current;

  const byId = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    if (message.clientMessageId) {
      byId.delete(optimisticIdFor(message.clientMessageId));
    }
    byId.set(message.id, message);
  }

  return [...byId.values()].sort(compareMessages);
}

export function markMessageStatus(
  current: Message[],
  messageId: string,
  status: MessageStatus,
): Message[] {
  return current.map((message) =>
    message.id === messageId ? { ...message, status } : message);
}

export function removeMessage(current: Message[], messageId: string): Message[] {
  return current.filter((message) => message.id !== messageId);
}

/** The newest persisted timestamp, used to refetch only what a reconnect missed. */
export function latestPersistedTimestamp(messages: Message[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].status === 'sent') return messages[index].createdAt;
  }
  return null;
}

/**
 * Idempotency key for a send. Generated on the client so a retry after a lost
 * response resolves to the message that was already stored.
 */
export function createClientMessageId(): string {
  const source = globalThis.crypto;
  if (source?.randomUUID) return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (source?.getRandomValues) {
    source.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
