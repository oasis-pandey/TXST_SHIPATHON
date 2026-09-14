import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/shared/lib/supabase') return { url: 'pairup-test:supabase', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'pairup-test:supabase') return {
      format: 'module', shortCircuit: true,
      source: 'export function getSupabase() { return globalThis.authTestClient; }',
    };
    return nextLoad(url, context);
  },
});

const { getSession, observeAuth, signIn, signUp, signOut, validateCredentials } = await import('../src/users/data/auth-service.ts');

function client(overrides = {}) {
  const calls = [];
  globalThis.authTestClient = {
    auth: {
      signInWithPassword: async input => { calls.push(['signIn', input]); return { data: { session: { access_token: 'token' } }, error: null }; },
      signUp: async input => { calls.push(['signUp', input]); return { data: { user: { id: 'user' }, session: null }, error: null }; },
      signOut: async () => { calls.push(['signOut']); return { error: null }; },
      ...overrides,
    },
  };
  return calls;
}

test('validates credentials before contacting Supabase', () => {
  assert.equal(validateCredentials('', 'password'), 'Enter your email address.');
  assert.equal(validateCredentials('not-an-email', 'password'), 'Enter a valid email address.');
  assert.equal(validateCredentials('a@b.com', 'short'), 'Use a password with at least 6 characters.');
  assert.equal(validateCredentials('a@b.com', 'password', 'different'), 'Passwords do not match.');
});

test('runs sign in, sign up, and sign out through Supabase auth', async () => {
  const calls = client();
  assert.ok((await signIn('a@b.com', 'password')).access_token);
  const signup = await signUp('a@b.com', 'password', 'password');
  assert.equal(signup.hasSession, false);
  await signOut();
  assert.deepEqual(calls.map(([name]) => name), ['signIn', 'signUp', 'signOut']);
});

test('maps common auth failures to understandable messages', async () => {
  client({ signInWithPassword: async () => ({ data: { session: null }, error: { message: 'Invalid login credentials' } }) });
  await assert.rejects(signIn('a@b.com', 'password'), /email or password is incorrect/);
});

test('restores a session and cleans up auth listeners', async () => {
  const session = { access_token: 'token' };
  let listener;
  let unsubscribed = false;
  client({
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: callback => {
      listener = callback;
      return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
    },
  });
  assert.equal(await getSession(), session);
  const changes = [];
  const unsubscribe = observeAuth((event, nextSession) => changes.push([event, nextSession]));
  listener('SIGNED_IN', session);
  unsubscribe();
  assert.deepEqual(changes, [['SIGNED_IN', session]]);
  assert.equal(unsubscribed, true);
});
