const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "supabase/functions/populate-user-recommendation-queue/index.ts",
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  Response,
  console,
  require(name) {
    if (name === "@supabase/functions-js/edge-runtime.d.ts") return {};
    assert.equal(name, "@supabase/server");
    return { withSupabase: (_options, handler) => handler };
  },
});

test("recommendations exclude every profile with an existing swipe decision", () => {
  const profiles = [
    { id: "new-profile" },
    { id: "liked-profile" },
    { id: "passed-profile" },
  ];

  const result = moduleExports.excludeDecidedCandidates(
    profiles,
    ["liked-profile", "passed-profile"],
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    [{ id: "new-profile" }],
  );
});

test("queue migration dequeues both inserted and updated swipe decisions", () => {
  const migration = fs.readFileSync(
    "supabase/migrations/20260915010433_prevent_decided_user_recommendations.sql",
    "utf8",
  );

  assert.match(migration, /after insert or update of decision on public\.swipes/i);
  assert.match(
    migration,
    /delete from public\.recommendation_queue[\s\S]*using public\.swipes/i,
  );
});
