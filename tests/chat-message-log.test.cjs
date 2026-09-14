const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('src/chat/data-access/message-log.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

// Same realm as the test so assertions compare like for like; `globalThis` is
// shadowed to prove the uuid fallback works without a crypto implementation.
const module_ = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('module', 'exports', 'require', 'globalThis', compiled)(
  module_,
  module_.exports,
  require,
  { crypto: undefined },
);

const {
  createClientMessageId,
  createOptimisticMessage,
  latestPersistedTimestamp,
  mergeMessages,
  optimisticIdFor,
} = module_.exports;

function persisted(id, createdAt, extra = {}) {
  return {
    id,
    conversationId: 'conversation-1',
    senderId: 'user-1',
    senderDisplayName: 'Alex',
    content: `message ${id}`,
    clientMessageId: null,
    createdAt,
    status: 'sent',
    ...extra,
  };
}

test('a realtime echo replaces the optimistic copy instead of rendering twice', () => {
  const optimistic = createOptimisticMessage({
    conversationId: 'conversation-1',
    clientMessageId: 'client-1',
    senderId: 'user-1',
    senderDisplayName: 'You',
    content: 'hello',
  });
  const log = mergeMessages([], [optimistic]);
  assert.equal(log.length, 1);
  assert.equal(log[0].id, optimisticIdFor('client-1'));

  const stored = persisted('server-1', '2026-09-14T10:00:00.000Z', {
    clientMessageId: 'client-1',
    content: 'hello',
  });
  const reconciled = mergeMessages(log, [stored]);
  assert.deepEqual(reconciled.map((message) => message.id), ['server-1']);
  assert.equal(reconciled[0].status, 'sent');
});

test('a duplicate realtime event for the same row is ignored', () => {
  const stored = persisted('server-1', '2026-09-14T10:00:00.000Z');
  const log = mergeMessages(mergeMessages([], [stored]), [stored]);
  assert.equal(log.length, 1);
});

test('messages are ordered by database timestamp, with id breaking ties', () => {
  const log = mergeMessages([], [
    persisted('c', '2026-09-14T10:00:05.000Z'),
    persisted('a', '2026-09-14T10:00:00.000Z'),
    persisted('b', '2026-09-14T10:00:05.000Z'),
  ]);
  assert.deepEqual(log.map((message) => message.id), ['a', 'b', 'c']);
});

test('history pages merge with messages that already arrived over realtime', () => {
  const live = persisted('server-2', '2026-09-14T10:00:10.000Z');
  const history = [
    persisted('server-0', '2026-09-14T09:00:00.000Z'),
    persisted('server-1', '2026-09-14T09:30:00.000Z'),
    live,
  ];
  const log = mergeMessages(mergeMessages([], [live]), history);
  assert.deepEqual(log.map((message) => message.id), ['server-0', 'server-1', 'server-2']);
});

test('the reconnect cursor ignores messages that are not persisted yet', () => {
  const optimistic = createOptimisticMessage({
    conversationId: 'conversation-1',
    clientMessageId: 'client-2',
    senderId: 'user-1',
    senderDisplayName: 'You',
    content: 'pending',
  });
  const log = mergeMessages([persisted('server-1', '2026-09-14T10:00:00.000Z')], [optimistic]);
  assert.equal(latestPersistedTimestamp(log), '2026-09-14T10:00:00.000Z');
  assert.equal(latestPersistedTimestamp([]), null);
});

test('client message ids are uuids even without a crypto implementation', () => {
  const id = createClientMessageId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(id, createClientMessageId());
});
