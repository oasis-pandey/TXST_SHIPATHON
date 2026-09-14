const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync("src/matching/data-access/matching-service.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function setup(invokeResult) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    Response,
    require(name) {
      assert.equal(name, "@/shared/lib/supabase");
      return {
        requireSupabase: () => ({
          functions: {
            async invoke(functionName, options) {
              calls.push({ functionName, options });
              return invokeResult;
            },
          },
        }),
      };
    },
  });
  return { calls, likeDeveloper: exports.likeDeveloper };
}

test("Like invokes create-swipe with only the target and Like decision", async () => {
  const response = {
    swipeId: "swipe-id",
    targetUserId: "target-id",
    decision: "like",
    createdAt: "2026-09-14T22:00:00.000Z",
  };
  const { calls, likeDeveloper } = setup({
    data: { data: response },
    error: null,
  });

  assert.deepEqual(await likeDeveloper("target-id"), response);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      functionName: "create-swipe",
      options: {
        body: {
          targetUserId: "target-id",
          decision: "like",
        },
      },
    },
  ]);
});

test("Like exposes the typed Edge Function error message", async () => {
  const functionError = new Error("Edge Function returned a non-2xx status");
  functionError.context = Response.json(
    {
      error: {
        code: "target_not_found",
        message: "That developer profile is no longer available.",
      },
    },
    { status: 404 },
  );
  const { likeDeveloper } = setup({ data: null, error: functionError });

  await assert.rejects(
    likeDeveloper("missing-target"),
    /developer profile is no longer available/,
  );
});

test("Like rejects an invalid success response", async () => {
  const { likeDeveloper } = setup({ data: {}, error: null });

  await assert.rejects(likeDeveloper("target-id"), /invalid response/);
});
