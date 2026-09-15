const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationName = fs
  .readdirSync("supabase/migrations")
  .find((name) => name.endsWith("_create_user_like_and_match.sql"));

assert.ok(migrationName, "mutual-match migration must exist");

const sql = fs.readFileSync(
  path.join("supabase/migrations", migrationName),
  "utf8",
);

test("mutual-match workflow has a locked authenticated security boundary", () => {
  assert.match(
    sql,
    /create function public\.create_user_like_and_match\(p_target_user_id uuid\)/i,
  );
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /order by profile\.id\s+for update/i);
  assert.match(
    sql,
    /revoke execute on function public\.create_user_like_and_match\(uuid\)\s+from public, anon/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.create_user_like_and_match\(uuid\)\s+to authenticated/i,
  );
});

test("mutual-match workflow persists one canonical active match", () => {
  assert.match(
    sql,
    /on conflict \(actor_type, actor_id, target_type, target_id\)\s+do update/i,
  );
  assert.match(sql, /reciprocal\.decision = 'like'/i);
  assert.match(
    sql,
    /insert into public\.matches \(user_1_id, user_2_id, status\)\s+values \(first_user_id, second_user_id, 'active'\)/i,
  );
  assert.match(
    sql,
    /on conflict \(user_1_id, user_2_id\) do nothing/i,
  );
  assert.match(sql, /existing_match\.status = 'active'/i);
});
