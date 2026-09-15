const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationName = fs
  .readdirSync("supabase/migrations")
  .find((name) => name.endsWith("_create_team_for_new_match.sql"));

assert.ok(migrationName, "automatic match-team migration must exist");

const sql = fs.readFileSync(
  path.join("supabase/migrations", migrationName),
  "utf8",
);

test("a match can own only one backend-created standard team", () => {
  assert.match(
    sql,
    /add column match_id uuid\s+references public\.matches \(id\)/i,
  );
  assert.match(
    sql,
    /add constraint teams_match_id_unique unique \(match_id\)/i,
  );
  assert.match(sql, /revoke insert on table public\.teams from authenticated/i);
  assert.match(
    sql,
    /revoke execute on function public\.create_team_with_initial_members\([\s\S]*from public, anon, authenticated/i,
  );
});

test("manual and match-created teams share the existing creation workflow", () => {
  assert.match(
    sql,
    /create or replace function public\.create_team_with_creator[\s\S]*return public\.create_team_with_initial_members/i,
  );
  assert.match(
    sql,
    /created_team_id := public\.create_team_with_initial_members\([\s\S]*\n\s*4,\s*\n\s*'Creator'/i,
  );
  assert.match(
    sql,
    /array\[caller_id, p_target_user_id\],[\s\S]*created_match_id/i,
  );
});

test("the workflow returns one team only for a newly inserted match", () => {
  assert.match(
    sql,
    /returning id into created_match_id;[\s\S]*if created_match_id is not null then[\s\S]*created_team_id :=/i,
  );
  assert.match(
    sql,
    /team_created boolean,\s*team_id uuid/i,
  );
  assert.match(
    sql,
    /created_team_id is not null,\s*active_team_id/i,
  );
});
