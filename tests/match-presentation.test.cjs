const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync("src/matching/swipe/match-presentation.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });

const profile = {
  id: "profile-id",
  display_name: "Ada",
  avatar_url: "https://example.com/ada.png",
};

test("matched Like advances once before presenting the captured profile", async () => {
  const events = [];

  await moduleExports.completeSuccessfulLike({
    result: { matched: true, matchCreated: true },
    profile,
    advance: async () => {
      events.push("advance");
      return true;
    },
    present: (match) => events.push({ match }),
  });

  assert.deepEqual(JSON.parse(JSON.stringify(events)), [
    "advance",
    {
      match: {
        profileId: "profile-id",
        displayName: "Ada",
        avatarUrl: "https://example.com/ada.png",
      },
    },
  ]);
});

test("stable existing-match result still presents after advancement", async () => {
  let presented;

  await moduleExports.completeSuccessfulLike({
    result: { matched: true, matchCreated: false },
    profile: { ...profile, avatar_url: null },
    advance: async () => true,
    present: (match) => {
      presented = match;
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(presented)), {
    profileId: "profile-id",
    displayName: "Ada",
    avatarUrl: null,
  });
});

test("unmatched Like advances without presenting an overlay", async () => {
  let advanceCount = 0;
  let presentCount = 0;

  await moduleExports.completeSuccessfulLike({
    result: { matched: false, matchCreated: false },
    profile,
    advance: async () => {
      advanceCount += 1;
      return true;
    },
    present: () => {
      presentCount += 1;
    },
  });

  assert.equal(advanceCount, 1);
  assert.equal(presentCount, 0);
});

test("cancelled advancement never presents an overlay", async () => {
  let presentCount = 0;

  await moduleExports.completeSuccessfulLike({
    result: { matched: true, matchCreated: true },
    profile,
    advance: async () => false,
    present: () => {
      presentCount += 1;
    },
  });

  assert.equal(presentCount, 0);
});
