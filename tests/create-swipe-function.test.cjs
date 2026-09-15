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

const rpcResult = {
  swipe_id: "swipe-id",
  target_user_id: targetId,
  decision: "like",
  created_at: "2026-09-14T22:00:00.000Z",
  matched: true,
  match_created: true,
  match_id: "33333333-3333-4333-8333-333333333333",
  team_created: true,
  team_id: "44444444-4444-4444-8444-444444444444",
};

function setup({
  user = { id: actorId },
  result = rpcResult,
  rpcError = null,
} = {}) {
  let handler;
  const rpcCalls = [];
  const client = {
    auth: {
      async getUser() {
        return user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: "Invalid token" } };
      },
    },
    rpc(functionName, args) {
      rpcCalls.push({ functionName, args });
      const query = {
        async single() {
          return { data: result, error: rpcError };
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

  return { handler, rpcCalls };
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
  const { handler, rpcCalls } = setup();
  const response = await handler(
    new Request("https://example.supabase.co/functions/v1/create-swipe", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "authentication_required");
  assert.equal(rpcCalls.length, 0);
});

test("create-swipe validates the target UUID and Like decision", async () => {
  const { handler, rpcCalls } = setup();
  const invalidId = await handler(post({ targetUserId: "not-a-uuid", decision: "like" }));
  const invalidDecision = await handler(post({ targetUserId: targetId, decision: "pass" }));

  assert.equal(invalidId.status, 400);
  assert.equal(invalidDecision.status, 400);
  assert.equal(rpcCalls.length, 0);
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
  assert.equal(self.rpcCalls.length, 0);
});

test("create-swipe rejects a missing target profile", async () => {
  const { handler, rpcCalls } = setup({
    result: null,
    rpcError: { code: "P0001", message: "Target profile does not exist" },
  });
  const response = await handler(post({ targetUserId: targetId, decision: "like" }));

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "target_not_found");
  assert.equal(rpcCalls.length, 1);
});

test("create-swipe delegates atomic Like persistence and maps match data", async () => {
  const { handler, rpcCalls } = setup();
  const response = await handler(post({ targetUserId: targetId, decision: "like" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(body.data)), {
    swipeId: "swipe-id",
    targetUserId: targetId,
    decision: "like",
    createdAt: "2026-09-14T22:00:00.000Z",
    matched: true,
    matchCreated: true,
    matchId: "33333333-3333-4333-8333-333333333333",
    teamCreated: true,
    teamId: "44444444-4444-4444-8444-444444444444",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls)), [
    {
      functionName: "create_user_like_and_match",
      args: { p_target_user_id: targetId },
    },
  ]);
});

test("create-swipe maps an unmatched result without a match ID", async () => {
  const { handler } = setup({
    result: {
      ...rpcResult,
      matched: false,
      match_created: false,
      match_id: null,
      team_created: false,
      team_id: null,
    },
  });

  const response = await handler(post({ targetUserId: targetId, decision: "like" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.matched, false);
  assert.equal(body.data.matchCreated, false);
  assert.equal(body.data.matchId, null);
  assert.equal(body.data.teamCreated, false);
  assert.equal(body.data.teamId, null);
});

test("create-swipe maps an atomic workflow failure", async () => {
  const { handler } = setup({
    result: null,
    rpcError: { code: "XX000", message: "database unavailable" },
  });

  const response = await handler(post({ targetUserId: targetId, decision: "like" }));

  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, "swipe_failed");
});

test("create-swipe rejects an invalid workflow result", async () => {
  const { handler } = setup({ result: { swipe_id: "incomplete" } });

  const response = await handler(post({ targetUserId: targetId, decision: "like" }));

  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, "swipe_failed");
});
