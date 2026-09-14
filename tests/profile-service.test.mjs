import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Keep persistence tests offline while exercising the real auth and profile services.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/shared/lib/supabase') return { url: 'pairup-test:supabase', shortCircuit: true };
    if (specifier.startsWith('./') && context.parentURL?.includes('/src/users/data/')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'pairup-test:supabase') return {
      format: 'module', shortCircuit: true,
      source: 'export function getSupabase() { return globalThis.profileTestClient; }',
    };
    return nextLoad(url, context);
  },
});

const { createProfile } = await import('../src/users/data/profile-service.ts');
const input = {
  display_name: ' Ada ', bio: '', github_url: '', skill_level: '', availability: '',
  discovery_mode: 'both', tech_stack: ['React'], interests: [], preferred_roles: [],
};

function client({ user = { id: 'authenticated-user' }, insertError = null, existing = null } = {}) {
  const calls = [];
  globalThis.profileTestClient = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        insert(row) {
          calls.push(row);
          return { select: () => ({ single: async () => ({ data: insertError ? null : row, error: insertError }) }) };
        },
        select() {
          return { eq(column, id) {
            assert.equal(column, 'id');
            assert.equal(id, 'authenticated-user');
            return { maybeSingle: async () => ({ data: existing, error: null }) };
          } };
        },
      };
    },
  };
  return calls;
}

test('insert takes identity only from Auth, strips extra properties, and returns saved data', async () => {
  const calls = client();
  const result = await createProfile({ ...input, id: 'forged-user', avatar_url: 'unexpected' });
  assert.equal(result.id, 'authenticated-user');
  assert.equal(calls[0].display_name, 'Ada');
  assert.equal(calls[0].avatar_url, undefined);
  assert.equal(calls.length, 1);
});

test('unauthenticated and invalid submissions do not write', async () => {
  const calls = client({ user: null });
  await assert.rejects(createProfile(input), /sign in/);
  await assert.rejects(createProfile({ ...input, display_name: ' ' }), /display name/);
  assert.equal(calls.length, 0);
});

test('duplicate retries return the existing profile without updating it', async () => {
  const existing = { id: 'authenticated-user', display_name: 'Original' };
  client({ insertError: { code: '23505' }, existing });
  assert.equal(await createProfile(input), existing);
});

test('database failure reports a retryable error instead of success', async () => {
  client({ insertError: { code: '42501' } });
  await assert.rejects(createProfile(input), /Could not save/);
});
