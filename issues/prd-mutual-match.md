# PairUp Mutual Match Product Requirements Document

## Problem Statement

PairUp currently saves a developer Like, but it stops before determining whether the interest is mutual. When two developers Like each other, no match row is created, the second user receives no immediate confirmation, and downstream features that require an active match—such as direct-message eligibility and teammate-match promotion—remain unavailable.

The missing behavior cannot safely be added in the Expo client. Authenticated users may read their own match rows, but they intentionally have no direct INSERT permission on `matches`. Match creation also has concurrency requirements: two opposite Likes can arrive at nearly the same time, and a unique constraint alone prevents duplicate rows but does not guarantee that either transaction observes the other Like. PairUp needs one trusted, atomic backend workflow that owns Like persistence, reciprocal-Like detection, and idempotent match creation.

## Solution

Extend the existing Like flow so its Edge Function invokes one authenticated trusted database workflow. The workflow derives the actor from the authenticated session, validates both profiles, locks the two profile rows in canonical UUID order, upserts the user-to-user Like, checks for the reciprocal Like, and creates at most one canonical match row with status exactly `active`.

The workflow returns the saved swipe together with three match fields: whether an active match now exists, whether this invocation created it, and its ID when active. This stable result lets a retry recover after a lost response without creating duplicate rows or suppressing the match experience.

The existing matching service and Like hook expose the result to Discover. A successful Like continues to advance the deck exactly once. When the result is mutual, Discover retains the matched profile's presentation data long enough to show an accessible, dismissible “It’s a Match” overlay after advancement. The overlay offers a keep-swiping action only. Realtime delivery to the other user, match notifications, and eager direct-conversation creation are deferred.

## User Stories

1. As a signed-in developer, I want my Like saved durably, so that my interest survives navigation, restart, and sign-in on another device.
2. As a signed-in developer, I want all positive Discover interactions to use the same Like workflow, so that heart, Favorite, and right swipe behave consistently.
3. As a developer who previously passed on someone, I want a later Like to replace that decision, so that my current intent is authoritative.
4. As a developer receiving a reciprocal Like, I want one match created, so that PairUp recognizes our mutual interest.
5. As a developer whose Like is not reciprocal, I want no match created, so that one-sided interest remains private.
6. As a match participant, I want our match stored once in canonical user order, so that the same pair cannot have duplicate or reversed rows.
7. As a match participant, I want the new match to use status exactly `active`, so that existing messageability and teammate-promotion rules recognize it.
8. As a developer retrying the same Like, I want the request to remain idempotent, so that retries cannot duplicate the swipe or match.
9. As either participant in simultaneous opposite Likes, I want a match to be created reliably, so that transaction timing cannot cause a missed match.
10. As a developer retrying after a lost response, I want the response to report an already-active mutual match, so that the app can recover the intended experience.
11. As a client consumer, I want to know both whether an active match exists and whether this call created it, so that outcome and insertion semantics are unambiguous.
12. As the developer completing a mutual Like, I want to see an “It’s a Match” confirmation, so that I understand the connection was created.
13. As the developer viewing the confirmation, I want it to identify the person I matched with, so that the result has clear context.
14. As a developer who submitted a successful Like, I want the current card to advance exactly once before the match confirmation settles, so that the deck remains consistent.
15. As a developer viewing the match confirmation, I want to dismiss it and keep swiping, so that the celebration does not block Discover.
16. As a screen-reader or keyboard user, I want the match confirmation and dismissal action announced and operable, so that I receive the same result as other users.
17. As a developer whose Like is one-sided or failed, I do not want a match confirmation, so that the UI never claims a match that the backend did not confirm.
18. As a PairUp user, I want match creation limited to authenticated callers, so that anonymous requests cannot create relationships.
19. As a PairUp user, I want the backend to derive the liking user from the authenticated session, so that a caller cannot impersonate another profile.
20. As a PairUp user, I want self-Likes rejected, so that a profile cannot match with itself.
21. As a PairUp user, I want Likes to missing profiles rejected, so that orphaned swipes and matches are not created.
22. As a security-conscious user, I want the Expo client to remain unable to insert match rows directly, so that trusted rules cannot be bypassed.
23. As a match participant, I want only the two participants to read the match through the existing client-facing table access, so that mutual interest stays private.
24. As a developer, I want reciprocal-Like detection to run in the trusted database workflow, so that row visibility rules cannot hide the other user's Like from the decision.
25. As a developer, I want the Edge Function to remain the HTTP, authentication, validation, and error-mapping boundary, so that the mobile contract stays consistent.
26. As a developer, I want Like persistence and match determination to commit atomically, so that a successful response never represents a partial backend operation.
27. As a user encountering an invalid target, expired session, permission failure, or backend error, I want a short actionable message, so that I know whether and how to retry.
28. As a developer, I want one typed success contract for swipe and match data, so that the Edge Function, data-access service, hook, and UI agree on the result.
29. As a tester, I want executable database coverage for ordinary, repeated, simultaneous, and conflicting match scenarios, so that persistence correctness is verified rather than inferred from SQL text.
30. As a tester, I want Edge Function tests for successful and failed RPC outcomes, so that transport and domain errors remain correctly mapped.
31. As a tester, I want data-access and hook tests for the extended result and duplicate-submit guard, so that client orchestration remains stable.
32. As a tester, I want Discover tests for advancement, match presentation, dismissal, failure retention, and accessibility, so that users see only server-confirmed outcomes.
33. As a matched developer, I want the active match to satisfy existing direct-message eligibility, so that the connection can be used by the current chat workflow.
34. As a matched developer, I do not want a conversation created merely because we matched, so that chat remains lazy and controlled by its existing start-conversation workflow.
35. As a Discover user, I want current pending, retry, animation, and local Pass behavior preserved, so that mutual matching does not regress the Like experience.
36. As a maintainer, I want deployment verified only with controlled non-production users and cleanup, so that acceptance does not alter production users, matches, notifications, or conversations.

## Implementation Decisions

- One trusted database function will own the complete persistence operation for a user-to-user Like and possible match.
- The function will be `SECURITY DEFINER`, set an empty `search_path`, qualify database objects explicitly, derive the caller with `auth.uid()`, and reject unauthenticated callers.
- Execute permission will be revoked from `PUBLIC` and `anon` and granted only to `authenticated`. Match-table INSERT will not be granted to authenticated clients.
- The function will accept only the target profile ID. Actor identity, actor type, target type, decision, creator identity, timestamps, and match status will not be caller-controlled.
- The database will authoritatively reject a missing caller profile, missing target profile, and self-targeting request even when the Edge Function has already performed request-level validation.
- The function will lock both participating profile rows in ascending UUID order before writing the swipe or checking reciprocity. This serializes concurrent work for the same pair without introducing global contention or advisory-lock hashing.
- The user-to-user swipe will be upserted against the existing actor-target uniqueness constraint. A prior Pass becomes Like, and a repeated Like updates the existing row rather than adding another.
- Reciprocal detection will require the opposite user-to-user swipe to have decision `like`. It will not infer reciprocity from teams, proposals, notifications, or match rows.
- A reciprocal Like will insert a canonical match using `least()` for `user_1_id`, `greatest()` for `user_2_id`, and literal status `active`.
- The existing canonical-order check and unique pair constraint remain the final database guards. Conflict-safe insertion will distinguish the transaction that inserted the row from a retry that found an existing active row.
- An existing non-active match row will not be reactivated. In that case the result will not claim an active match.
- The function result will include the swipe ID, target user ID, `like` decision, swipe timestamp, `matched`, `matchCreated`, and nullable `matchId`.
- `matched` means an active canonical match exists after the operation. `matchCreated` means the current transaction inserted it. A retry after a lost success response can therefore return `matched: true` and `matchCreated: false`.
- The Edge Function will continue to accept only POST and OPTIONS, enforce the existing request shape, validate the Bearer token, and map trusted-workflow errors to the existing small error contract.
- The Edge Function will invoke the database function using a caller-scoped Supabase client. No service-role key will be introduced into the Expo app or required for match creation.
- The Edge Function will no longer perform a separate direct swipe upsert; doing so would split persistence and matching across transactions.
- The matching data-access service will remain the only Expo module that invokes the Edge Function. Visual components will not call Supabase or insert into `swipes` or `matches`.
- The Like hook will preserve its one-request-at-a-time guard and expose the extended typed result without deciding whether a mutual match exists.
- Discover will use the returned `matched` value as the authority for showing the overlay. It will not reproduce reciprocal-Like logic or query `matches` after the request.
- On successful persistence, Discover will capture the matched profile's display name and avatar data, advance the submitted card once through the existing queue path, and then present the overlay.
- The overlay will be a focused modal-style layer with an “It’s a Match” heading, matched-developer context, and one keep-swiping/dismiss action.
- The overlay will provide appropriate accessibility role, labels, focus behavior where supported, and live announcement behavior without relying on color alone.
- Left swipe and Discard remain local queue advancement and do not create Pass rows.
- Existing direct-message eligibility remains based on a canonical match with status `active`. This feature will not create a direct conversation; the existing conversation workflow remains lazy.
- Match notifications, Realtime publication changes, Realtime subscriptions, push notifications, and other-user live presentation are deferred.
- The connected database's conversation/message schema and trusted messageability functions are compatibility constraints, not modules owned by this feature.
- Local migrations currently do not contain the conversation/message objects deployed in the connected database. This pre-existing drift will be documented and will not be “fixed” incidentally by the mutual-match migration.
- The project uses imperative Supabase migrations. Implementation will create the migration through the Supabase CLI's migration command rather than inventing a timestamp manually.
- Generated database types will be refreshed after the migration if the new function appears in the generated API surface.

## Testing Decisions

- Good tests will assert externally observable results and persisted state rather than SQL formatting, internal helper calls, component state names, or exact animation implementation.
- Database integration tests will run in a local or dedicated non-production Supabase environment and exercise the function with authenticated identities.
- The no-reciprocal case will verify that the Like is saved, `matched` and `matchCreated` are false, `matchId` is null, and no match row exists.
- The ordinary reciprocal case will verify one canonical `active` match, a true `matched` result, and a true `matchCreated` result for the creating call.
- Retry coverage will verify that repeated Likes preserve one swipe and one match and return `matched: true`, `matchCreated: false`, and the same active match ID.
- Concurrency coverage will submit opposite Likes simultaneously and verify that pair locking prevents a missed match and that exactly one canonical row exists.
- Existing-active coverage will verify stable recovery without updating or duplicating the row.
- Existing-non-active coverage will verify that the workflow does not reactivate the row and does not claim an active match.
- Security coverage will verify anonymous rejection, actor derivation, self-target rejection, missing-profile rejection, inability to choose another actor, and the continued absence of direct authenticated INSERT privilege on `matches`.
- Canonical/status coverage will verify lower UUID first, higher UUID second, and status exactly `active`.
- Edge Function tests will mock the RPC boundary and assert the request contract, success mapping, stable match fields, authentication handling, invalid input, trusted-workflow failures, and absence of direct table writes.
- Matching-service tests will verify the unchanged request body and the complete typed response, including invalid-response rejection and user-facing error extraction.
- Hook tests will verify duplicate-submit protection, pending state, successful result propagation, error retention, and retry.
- Discover tests will verify unmatched success advancement, matched success advancement plus overlay, exactly one advancement, retained profile identity after queue movement, dismissal, no overlay on failure, current-card retention on failure, and accessibility.
- Existing swipe-intent tests will remain the prior art for gesture classification. Existing matching-service and create-swipe tests will be extended rather than replaced where practical.
- Chat compatibility will be verified only in a non-production environment containing the deployed chat baseline: both participants can read the active match, messageability returns true, and no conversation is created by matching.
- Realtime behavior will not be tested in this scope because `matches` will not be added to the Realtime publication and no subscription will be introduced.
- Final verification will include focused Node tests, local database integration tests, TypeScript checking, Expo lint, and deployment verification of the Edge Function and migration in an approved non-production target.
- Test fixtures will use synthetic accounts and deterministic UUIDs where supported. Tests must clean up created swipes and matches and must not create production users, conversations, notifications, or chats.

## Out of Scope

- Adding `matches` to the Supabase Realtime publication.
- Subscribing either participant to match INSERT events.
- Showing an unsolicited match overlay to the user whose earlier Like became reciprocal.
- Creating in-app, push, email, or SMS match notifications.
- Creating a direct conversation or conversation participants at match time.
- Adding a Start Message action to the match overlay.
- Building a matches list, match-management screen, unmatch flow, block flow, or match-status lifecycle.
- Reactivating an existing non-active match.
- Changing the current `matches.status` schema or adding new status literals.
- Granting authenticated clients direct INSERT, UPDATE, or DELETE access to `matches`.
- Moving reciprocal-Like logic into Expo or duplicating it across controls.
- Persisting Pass decisions for left swipe or Discard.
- Changing team-to-user or user-to-team matching and proposal behavior.
- Reconstructing, replacing, or otherwise reconciling the remote-only chat migrations as part of this feature.
- Creating or modifying production data for development or acceptance testing.

## Further Notes

- The current path is Discover → Like hook → matching data-access service → `create-swipe` Edge Function → caller-scoped `swipes` upsert. Mutual detection and match creation do not yet exist.
- The `swipes` actor-target unique constraint already supports idempotent Like updates, and the `matches` canonical pair unique constraint already provides the final duplicate-row guard.
- Pair serialization is still required. Without canonical row locks, simultaneous opposite transactions can each check reciprocity before the other commits, causing both to return unmatched despite two durable Likes.
- The current `matches` table has zero rows in the connected project at planning time. Its status defaults to `active` but has no status CHECK constraint.
- The connected PairUp database grants authenticated users SELECT on `matches` only and applies a participant-only SELECT policy.
- The deployed database contains direct/team conversation tables, messages, participant RLS, and trusted functions including direct-message eligibility, messageable-target listing, lazy direct-conversation creation, and message sending.
- Those deployed chat objects are absent from the repository's local migration history. Mutual-match implementation must preserve their observed contract—especially canonical ordering and literal `active`—without treating the drift as authorization to recreate or edit them.
- The deployed Realtime publication includes `messages`, not `matches`. A later feature can add match-event delivery deliberately after defining subscription lifecycle, duplicate-event handling, background behavior, and other-user UX.
- Supabase and Expo SDK 57 documentation must be rechecked immediately before implementation because both platforms evolve independently of this planning artifact.
