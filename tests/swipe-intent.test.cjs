const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync("src/matching/swipe/swipe-intent.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });

test("right, left, and incomplete gestures map to one swipe intent", () => {
  assert.equal(moduleExports.getSwipeIntent(111, 110), "like");
  assert.equal(moduleExports.getSwipeIntent(-111, 110), "pass");
  assert.equal(moduleExports.getSwipeIntent(110, 110), "reset");
  assert.equal(moduleExports.getSwipeIntent(-110, 110), "reset");
});
