## Parent PRD

`issues/prd-user-like-action.md`

## What to build

Deliver the first complete developer Like path described by the parent PRD: a signed-in user taps the heart on a Discover card backed by a real profile ID, the matching swipe feature delegates through matching data access to an authenticated Edge Function, and the existing `swipes` table idempotently stores the user-to-user Like before the deck advances.

This slice includes the profile-ID integration seam, local pending/error behavior, caller and target validation, typed client/server contracts, deployment, and focused verification. It must remain independent of the parallel candidate pagination work and must not seed users or create matches.

## Acceptance criteria

- [ ] A Discover card can expose its real `profiles.id` to the swipe feature without coupling Like persistence to deck loading or pagination.
- [ ] The heart action is disabled for a transitional card that has no real profile ID.
- [ ] Tapping the heart starts at most one in-flight request and keeps the current card visible while saving.
- [ ] Swipe workflow state and orchestration live inside the matching swipe feature; Supabase Edge Function communication lives inside matching data access.
- [ ] The Expo UI contains no direct `swipes` table insert or upsert.
- [ ] The client invokes a typed create-swipe contract with only the target profile ID and the Like decision.
- [ ] The Edge Function rejects unsupported methods, malformed input, invalid UUIDs, missing authentication, nonexistent profiles, and self-swipes with small typed errors.
- [ ] The Edge Function derives the actor and creator IDs from the authenticated caller rather than request data.
- [ ] A valid request writes a user-to-user Like through the existing caller-scoped RLS policies.
- [ ] Repeating a Like succeeds without creating a second actor-target row, and an existing Pass for the pair becomes Like.
- [ ] The card animates out and the queue advances only after persistence succeeds.
- [ ] A backend failure leaves the current card visible and displays an inline retryable error.
- [ ] Focused tests cover the client contract, error propagation, duplicate-submit guard, success advancement, and failure retention where supported by current tooling.
- [ ] Edge Function validation, authentication, response, and idempotent persistence behavior are covered by automated or local integration tests.
- [ ] Existing tests, TypeScript checking, and Expo lint pass.
- [ ] `create-swipe` is deployed to the connected PairUp project and rejects an unauthenticated verification request without writing a swipe.
- [ ] No users, profiles, matches, notifications, chats, or project rooms are created by implementation or deployment verification.

## Blocked by

None - can start immediately

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 6
- User story 8
- User story 9
- User story 10
- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
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
