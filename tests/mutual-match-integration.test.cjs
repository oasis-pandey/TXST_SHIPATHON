const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const testUrl = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const hasLocalConfig = Boolean(testUrl && anonKey && serviceRoleKey);

function clientFor(key) {
  return createClient(testUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

test(
  "atomic mutual-match workflow persists secure, idempotent, race-safe results",
  { skip: !hasLocalConfig },
  async () => {
    const hostname = new URL(testUrl).hostname;
    assert.ok(
      hostname === "127.0.0.1" || hostname === "localhost",
      "integration tests are restricted to local Supabase",
    );

    const admin = clientFor(serviceRoleKey);
    const password = "PairUp-local-test-42!";
    const users = Array.from({ length: 6 }, (_, index) => ({
      email: `mutual-match-${index}-${randomUUID()}@example.test`,
      displayName: `Mutual Match ${index}`,
      id: undefined,
    }));

    try {
      for (const user of users) {
        const { data, error } = await admin.auth.admin.createUser({
          email: user.email,
          password,
          email_confirm: true,
        });
        assert.ifError(error);
        assert.ok(data.user);
        user.id = data.user.id;
      }

      const { error: profileError } = await admin.from("profiles").insert(
        users.map((user) => ({
          id: user.id,
          display_name: user.displayName,
        })),
      );
      assert.ifError(profileError);

      const clients = await Promise.all(
        users.map(async (user) => {
          const client = clientFor(anonKey);
          const { error } = await client.auth.signInWithPassword({
            email: user.email,
            password,
          });
          assert.ifError(error);
          return client;
        }),
      );

      const like = (actorIndex, targetIndex) =>
        clients[actorIndex]
          .rpc("create_user_like_and_match", {
            p_target_user_id: users[targetIndex].id,
          })
          .single();

      const oneSided = await like(0, 1);
      assert.ifError(oneSided.error);
      assert.equal(oneSided.data.matched, false);
      assert.equal(oneSided.data.match_created, false);
      assert.equal(oneSided.data.match_id, null);

      const reciprocal = await like(1, 0);
      assert.ifError(reciprocal.error);
      assert.equal(reciprocal.data.matched, true);
      assert.equal(reciprocal.data.match_created, true);
      assert.ok(reciprocal.data.match_id);

      const retry = await like(0, 1);
      assert.ifError(retry.error);
      assert.equal(retry.data.matched, true);
      assert.equal(retry.data.match_created, false);
      assert.equal(retry.data.match_id, reciprocal.data.match_id);

      const canonicalPair = [users[0].id, users[1].id].sort();
      const { data: ordinaryMatches, error: ordinaryMatchError } = await admin
        .from("matches")
        .select("id,user_1_id,user_2_id,status")
        .eq("user_1_id", canonicalPair[0])
        .eq("user_2_id", canonicalPair[1]);
      assert.ifError(ordinaryMatchError);
      assert.equal(ordinaryMatches.length, 1);
      assert.equal(ordinaryMatches[0].status, "active");

      const { error: passError } = await admin.from("swipes").insert({
        actor_type: "user",
        actor_id: users[2].id,
        target_type: "user",
        target_id: users[3].id,
        decision: "pass",
        created_by_user_id: users[2].id,
      });
      assert.ifError(passError);

      const passToLike = await like(2, 3);
      assert.ifError(passToLike.error);
      assert.equal(passToLike.data.matched, false);
      const { data: updatedSwipe, error: updatedSwipeError } = await admin
        .from("swipes")
        .select("decision")
        .eq("actor_id", users[2].id)
        .eq("target_id", users[3].id)
        .single();
      assert.ifError(updatedSwipeError);
      assert.equal(updatedSwipe.decision, "like");

      const inactivePair = [users[0].id, users[2].id].sort();
      const { error: inactiveInsertError } = await admin.from("matches").insert({
        user_1_id: inactivePair[0],
        user_2_id: inactivePair[1],
        status: "inactive",
      });
      assert.ifError(inactiveInsertError);
      assert.ifError((await like(0, 2)).error);
      const inactiveResult = await like(2, 0);
      assert.ifError(inactiveResult.error);
      assert.equal(inactiveResult.data.matched, false);
      assert.equal(inactiveResult.data.match_created, false);
      assert.equal(inactiveResult.data.match_id, null);

      const [concurrentA, concurrentB] = await Promise.all([
        like(4, 5),
        like(5, 4),
      ]);
      assert.ifError(concurrentA.error);
      assert.ifError(concurrentB.error);
      assert.ok(concurrentA.data.matched || concurrentB.data.matched);

      const concurrentPair = [users[4].id, users[5].id].sort();
      const { data: concurrentMatches, error: concurrentMatchError } =
        await admin
          .from("matches")
          .select("id,status")
          .eq("user_1_id", concurrentPair[0])
          .eq("user_2_id", concurrentPair[1]);
      assert.ifError(concurrentMatchError);
      assert.equal(concurrentMatches.length, 1);
      assert.equal(concurrentMatches[0].status, "active");

      const anonymous = clientFor(anonKey);
      const { error: anonymousError } = await anonymous.rpc(
        "create_user_like_and_match",
        { p_target_user_id: users[0].id },
      );
      assert.ok(anonymousError);

      const { error: directInsertError } = await clients[0]
        .from("matches")
        .insert({
          user_1_id: concurrentPair[0],
          user_2_id: concurrentPair[1],
          status: "active",
        });
      assert.ok(directInsertError);

      const { error: selfError } = await clients[0].rpc(
        "create_user_like_and_match",
        { p_target_user_id: users[0].id },
      );
      assert.match(selfError?.message ?? "", /cannot Like your own/i);

      const { error: missingTargetError } = await clients[0].rpc(
        "create_user_like_and_match",
        { p_target_user_id: randomUUID() },
      );
      assert.match(missingTargetError?.message ?? "", /Target profile does not exist/i);
    } finally {
      await Promise.allSettled(
        users
          .filter((user) => user.id)
          .map((user) => admin.auth.admin.deleteUser(user.id)),
      );
    }
  },
);
