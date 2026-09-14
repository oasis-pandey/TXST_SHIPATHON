const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('src/users/data-access/auth-service.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function loadSignOut(result) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, '@/shared/lib/supabase');
      return {
        getSupabase: () => ({
          auth: {
            async signOut(options) {
              calls.push(options);
              return result;
            },
          },
        }),
      };
    },
  });
  return { signOut: exports.signOut, calls };
}

test('logout clears only the current Supabase session', async () => {
  const { signOut, calls } = loadSignOut({ error: null });
  await signOut();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].scope, 'local');
});

test('logout exposes a safe error when Supabase fails', async () => {
  const { signOut } = loadSignOut({ error: { message: 'network details' } });
  await assert.rejects(signOut(), /Could not sign out/);
});
