const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('src/matching/data-access/team-service.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup({ existing = null, likeError = null, rpcError = null } = {}) {
  const events = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'candidate' } }, error: null }) },
    from(table) {
      if (table === 'team_membership_proposals') {
        const query = {
          select() { return query; },
          eq() { return query; },
          async maybeSingle() { return { data: existing, error: null }; },
          async single() {
            return {
              data: {
                status: 'pending',
                candidate_response: existing?.candidate_response ?? 'pending',
              },
              error: null,
            };
          },
        };
        return query;
      }
      assert.equal(table, 'swipes');
      return { async upsert(row, options) {
        events.push({ kind: 'like', row, options });
        return { error: likeError };
      } };
    },
    async rpc(name, args) {
      events.push({
        kind: name === 'create_team_membership_proposal' ? 'proposal' : 'consent',
        name,
        args,
      });
      return { data: 'proposal-id', error: rpcError };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, '@/shared/lib/supabase');
      return { requireSupabase: () => client };
    },
  });
  return { create: exports.createProposal, events };
}

test('applying persists the signed-in candidate interest before requesting admission review', async () => {
  const { create, events } = setup();
  assert.equal(await create('team', 'candidate', 'user_swiped_team'), 'proposal-id');
  assert.deepEqual(events.map(e => e.kind), ['like', 'proposal', 'consent']);
  assert.equal(events[0].row.actor_id, 'candidate');
  assert.equal(events[0].row.target_id, 'team');
  assert.equal(events[0].row.decision, 'like');
  assert.equal(events[1].name, 'create_team_membership_proposal');
});

test('retry reopens an accepted pending application without creating another write', async () => {
  const { create, events } = setup({
    existing: { id: 'pending-id', candidate_response: 'accepted' },
  });
  assert.equal(await create('team', 'candidate', 'user_swiped_team'), 'pending-id');
  assert.equal(events.length, 0);
});

test('retry records consent for an application created before the database migration', async () => {
  const { create, events } = setup({
    existing: { id: 'pending-id', candidate_response: 'pending' },
  });
  assert.equal(await create('team', 'candidate', 'user_swiped_team'), 'pending-id');
  assert.deepEqual(events.map(e => e.kind), ['consent']);
});

test('a failed interest write prevents proposal creation and exposes the reason', async () => {
  const { create, events } = setup({ likeError: { message: 'Permission denied' } });
  await assert.rejects(create('team', 'candidate', 'user_swiped_team'), /Permission denied/);
  assert.equal(events.length, 1);
});

test('a user cannot apply as another candidate', async () => {
  const { create, events } = setup();
  await assert.rejects(create('team', 'someone-else', 'user_swiped_team'), /as yourself/);
  assert.equal(events.length, 0);
});

test('direct invitations keep their existing workflow and preserve database errors', async () => {
  const { create, events } = setup({ rpcError: { message: 'Team is full' } });
  await assert.rejects(create('team', 'candidate', 'direct_invite'), /Team is full/);
  assert.deepEqual(events.map(e => e.kind), ['proposal']);
});
