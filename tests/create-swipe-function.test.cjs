const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync("supabase/functions/create-swipe/index.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

function setup({ user = { id: actorId }, target = { id: targetId } } = {}) {
  let handler;
  const writes = [];
  const client = {
    auth: {
      async getUser() {
        return user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: "Invalid token" } };
      },
    },
    from(table) {
      if (table === "profiles") {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          async maybeSingle() {
            return { data: target, error: null };
          },
        };
        return query;
      }

      assert.equal(table, "swipes");
      const query = {
        upsert(row, options) {
          writes.push({ row, options });
          return query;
        },
        select() {
          return query;
        },
        async single() {
          return {
            data: {
              id: "swipe-id",
              target_id: targetId,
              decision: "like",
              created_at: "2026-09-14T22:00:00.000Z",
            },
            error: null,
          };
        },
      };
      return query;
    },
  };

  vm.runInNewContext(compiled, {
    exports: {},
    console,
    Date,
    JSON,
    Object,
    Request,
    Response,
    Deno: {
      env: {
        get(name) {
          if (name === "SUPABASE_URL") return "https://example.supabase.co";
          if (name === "SUPABASE_ANON_KEY") return "anon-key";
          return undefined;
        },
      },
      serve(fn) {
        handler = fn;
      },
    },
    require(name) {
      if (name === "jsr:@supabase/functions-js/edge-runtime.d.ts") return {};
      assert.equal(name, "npm:@supabase/supabase-js@2.116.0");
      return { createClient: () => client };
    },
  });

  return { handler, writes };
}

function post(body, token = "valid-token") {
  return new Request("https://example.supabase.co/functions/v1/create-swipe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("create-swipe rejects unauthenticated requests", async () => {
  const { handler, writes } = setup();
  const response = await handler(
    new Request("https://example.supabase.co/functions/v1/create-swipe", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "authentication_required");
  assert.equal(writes.length, 0);
});

test("create-swipe validates the target UUID and Like decision", async () => {
  const { handler, writes } = setup();
  const invalidId = await handler(post({ targetUserId: "not-a-uuid", decision: "like" }));
  const invalidDecision = await handler(post({ targetUserId: targetId, decision: "pass" }));

  assert.equal(invalidId.status, 400);
  assert.equal(invalidDecision.status, 400);
  assert.equal(writes.length, 0);
});

test("create-swipe rejects an expired caller and self-swipes", async () => {
  const expired = setup({ user: null });
  const expiredResponse = await expired.handler(
    post({ targetUserId: targetId, decision: "like" }),
  );
  assert.equal(expiredResponse.status, 401);

  const self = setup({ target: { id: actorId } });
  const selfResponse = await self.handler(
    post({ targetUserId: actorId, decision: "like" }),
  );
  assert.equal(selfResponse.status, 400);
  assert.equal((await selfResponse.json()).error.code, "self_swipe");
  assert.equal(self.writes.length, 0);
});

test("create-swipe rejects a missing target profile", async () => {
  const { handler, writes } = setup({ target: null });
  const response = await handler(post({ targetUserId: targetId, decision: "like" }));

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "target_not_found");
  assert.equal(writes.length, 0);
});

test("create-swipe derives ownership and idempotently upserts a user Like", async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ targetUserId: targetId, decision: "like" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.targetUserId, targetId);
  assert.equal(body.data.decision, "like");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row.actor_type, "user");
  assert.equal(writes[0].row.actor_id, actorId);
  assert.equal(writes[0].row.target_type, "user");
  assert.equal(writes[0].row.target_id, targetId);
  assert.equal(writes[0].row.created_by_user_id, actorId);
  assert.equal(writes[0].row.decision, "like");
  assert.equal(
    writes[0].options.onConflict,
    "actor_type,actor_id,target_type,target_id",
  );
});
