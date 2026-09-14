const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const schema = fs.readFileSync(
  'supabase/migrations/20260914160853_create_pairup_schema.sql',
  'utf8',
);
const creatorRule = fs.readFileSync(
  'supabase/migrations/20260914230000_require_creator_team_vote.sql',
  'utf8',
);
const creatorFirstRule = fs.readFileSync(
  'supabase/migrations/20260914230001_enforce_creator_vote_first.sql',
  'utf8',
);

test('proposal creation snapshots a strict majority of current members', () => {
  assert.match(
    schema,
    /new\.required_yes_votes\s*:=\s*\(current_member_count\s*\/\s*2\)\s*\+\s*1/,
  );
});

test('the finalizer requires an accepting vote from the team creator', () => {
  assert.match(creatorRule, /team_creator is null or not exists/);
  assert.match(creatorRule, /voter_user_id = team_creator[\s\S]*decision = 'accept'/);
  assert.match(creatorRule, /accepting_vote_count < proposal\.required_yes_votes/);
});

test('the final admission guard independently checks creator approval', () => {
  assert.match(
    creatorRule,
    /creator_vote\.voter_user_id = team_creator[\s\S]*creator_vote\.decision = 'accept'/,
  );
  assert.match(creatorRule, /\) >= proposal\.required_yes_votes/);
});

test('the creator-rule migration never changes the vote snapshot', () => {
  assert.doesNotMatch(creatorRule, /set\s+required_yes_votes/i);
  assert.doesNotMatch(creatorRule, /new\.required_yes_votes\s*:=/i);
});

test('non-creator votes are blocked until the creator approves', () => {
  assert.match(creatorFirstRule, /caller_id <> team_creator and not exists/);
  assert.match(
    creatorFirstRule,
    /voter_user_id = team_creator[\s\S]*decision = 'accept'/,
  );
});
