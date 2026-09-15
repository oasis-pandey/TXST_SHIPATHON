## Parent PRD

`issues/prd-mutual-match.md`

## What to build

Deliver the trusted end-to-end persistence and result contract from the parent PRD: a signed-in developer's positive Discover interaction reaches the existing `create-swipe` Edge Function, one atomic authenticated database workflow saves the Like and safely detects reciprocity, and the typed client receives whether an active match exists, whether this invocation created it, and the active match ID.

This slice replaces the Edge Function's direct `swipes` upsert with the trusted workflow. It must serialize each canonical user pair before writing or checking, create at most one match with canonical ordering and status exactly `active`, preserve stable retry semantics, and leave authenticated clients without direct `matches` INSERT access. It exposes the complete result through matching data access and the Like hook but does not add the visual Match overlay.

## Acceptance criteria

- [ ] A new imperative Supabase migration is created through the project's CLI workflow rather than by inventing a migration timestamp.
- [ ] The migration adds one database workflow that accepts only a target profile ID and returns the saved swipe fields plus `matched`, `match_created`, and nullable `match_id`.
- [ ] The workflow is `SECURITY DEFINER`, uses an empty `search_path`, explicitly qualifies database objects, and derives the actor from `auth.uid()`.
- [ ] Execute permission is revoked from `PUBLIC` and `anon`, granted to `authenticated`, and direct authenticated INSERT privilege on `matches` remains absent.
- [ ] The workflow rejects an unauthenticated caller, missing caller profile, missing target profile, and self-Like before creating durable state.
- [ ] Both profile rows are locked in ascending UUID order before the swipe write and reciprocal check so simultaneous opposite Likes cannot both miss one another.
- [ ] The caller's user-to-user decision is idempotently stored as `like` using the existing actor-target uniqueness rule.
- [ ] Repeating a Like does not create a second swipe, and an existing Pass for the same actor-target pair becomes Like.
- [ ] The reciprocal check runs inside the trusted workflow and requires the opposite user-to-user decision to be `like`.
- [ ] A one-sided Like returns `matched = false`, `match_created = false`, and `match_id = null` without creating a match.
- [ ] A reciprocal Like inserts one row with `user_1_id = least(actor, target)`, `user_2_id = greatest(actor, target)`, and `status = 'active'`.
- [ ] Match insertion is conflict-safe against `matches_user_pair_unique`; repeated and concurrent calls cannot create duplicate or reversed pair rows.
- [ ] The invocation that inserts the active match returns `matched = true`, `match_created = true`, and the new match ID.
- [ ] A retry or repeated Like against an existing active match returns `matched = true`, `match_created = false`, and the existing match ID.
- [ ] An existing non-active pair row is not reactivated and is not reported as an active match.
- [ ] Like persistence and match determination commit in one transaction; the Edge Function does not perform a separate direct `swipes` upsert.
- [ ] The Edge Function keeps the current POST/OPTIONS, CORS, JSON shape, UUID, Bearer-token, expired-session, and self-Like handling.
- [ ] The Edge Function invokes the workflow with the caller's authenticated Supabase client and maps workflow failures into the existing small typed error response.
- [ ] No service-role key is added to the Expo client or required by the mutual-match path.
- [ ] Edge success responses contain camel-cased `swipeId`, `targetUserId`, `decision`, `createdAt`, `matched`, `matchCreated`, and nullable `matchId`.
- [ ] Matching data access exposes the extended typed result while continuing to send only `targetUserId` and decision `like` to `create-swipe`.
- [ ] The Like hook preserves its duplicate-submit guard, pending state, error state, and successful result propagation.
- [ ] Discover continues to treat a successful extended result as one successful Like and does not query `matches` or decide reciprocity itself.
- [ ] Database integration tests cover no reciprocal Like, ordinary reciprocity, Pass-to-Like, repeated Like, existing active match, existing non-active match, canonical ordering, literal active status, and anonymous/impersonation attempts.
- [ ] A deterministic concurrent integration test submits opposite Likes together and proves that exactly one active canonical match exists and at least one response observes the match.
- [ ] Edge Function tests cover workflow success, match-result mapping, authentication and request failures, database failures, and the absence of direct table writes.
- [ ] Matching-service and hook tests cover the extended contract, stable retry result, invalid responses, error propagation, and duplicate submission.
- [ ] Generated Supabase types are refreshed if the new workflow is represented in the generated database API types.
- [ ] The existing direct-message eligibility and messageable-target functions recognize a newly created active match in a non-production environment containing the deployed chat baseline.
- [ ] Match creation does not create a conversation, conversation participants, notification, or Realtime subscription/publication change.
- [ ] Focused tests, TypeScript checking, Expo lint, and local Supabase integration tests pass.
- [ ] The migration and updated Edge Function are deployed and smoke-tested only against an approved non-production target using controlled synthetic users, with created swipe/match fixtures cleaned up afterward.
- [ ] Verification does not create or modify production users, matches, notifications, conversations, or messages.

## Blocked by

- Blocked by `issues/007-unify-positive-swipe-interactions.md`

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 4
- User story 5
- User story 6
- User story 7
- User story 8
- User story 9
- User story 10
- User story 11
- User story 18
- User story 19
- User story 20
- User story 21
- User story 22
- User story 23
- User story 24
- User story 25
- User story 26
- User story 27
- User story 28
- User story 29
- User story 30
- User story 31
- User story 33
- User story 36
