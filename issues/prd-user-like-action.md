# PairUp Developer Like Action Product Requirements Document

## Problem Statement

PairUp's Discover screen lets a signed-in user swipe right or tap Like on a displayed developer, but the action currently only advances a deck of display-only mock profiles. The displayed profile has no durable user identifier, no swipe-specific feature action coordinates the interaction, no matching data-access service invokes a backend workflow, and no deployed Edge Function persists the decision. As a result, a Like is lost immediately and cannot become an input to future matching.

The Like flow must persist a user-to-user decision against the real developer profile currently supplied by Discover. It must respect PairUp's matching-domain boundaries, derive the acting user from Supabase authentication, and use the live `swipes` schema without exposing database writes in the UI. A failed request must not remove the current card, and repeated taps, gestures, or network retries must not create conflicting records.

This work must integrate cleanly with a separate incremental Discover loader that will fetch real profiles in pages and maintain the deck. The Like feature must consume only the current card's real profile ID and must not fetch candidates, own pagination, seed accounts, or assume how the deck is populated.

## Solution

Add one authenticated user-to-user Like capability within the existing matching domain. A single shared Like handler will receive the current developer's real profile ID from the deck, prevent concurrent submissions, and delegate to a matching data-access operation. The data-access operation will invoke a use-case-specific Supabase Edge Function and expose a small typed result without leaking transport or database details into the UI.

The Edge Function will authenticate the caller, validate the request and target profile, reject self-swipes, and derive the acting user from the verified session. It will idempotently upsert one `like` row for the authenticated user and target user through the existing caller-scoped RLS policies. It will not inspect reciprocal swipes or create matches.

The Discover UI will use the same Like handler for the heart button, Favorite star, and right-swipe gesture. It will keep the current card visible while persistence is pending, then animate and advance only after backend success. On failure it will retain the current developer and show an inline retryable error. Left swipe and Discard will remain local behavior in this scope.

## User Stories

1. As a signed-in developer, I want to Like the developer currently displayed in Discover, so that my interest is saved.
2. As a signed-in developer, I want the Like to target the exact profile shown on the current card, so that my action is never applied to the wrong person.
3. As a signed-in developer, I want tapping the heart to save a Like, so that the primary action works without a gesture.
4. As a signed-in developer, I want swiping right to save the same Like as tapping the heart, so that both interactions have identical meaning.
5. As a signed-in developer, I want tapping Favorite to save the same Like in this release, so that every current positive action follows one reliable path.
6. As a signed-in developer, I want only one Like request in progress at a time, so that rapid taps and gestures do not submit duplicates.
7. As a signed-in developer, I want the current card to remain visible while my Like is saving, so that the UI does not claim success early.
8. As a signed-in developer, I want the deck to advance only after the backend confirms my Like, so that the visible state reflects durable state.
9. As a signed-in developer, I want a failed Like to leave the same developer visible, so that I can retry without losing the card.
10. As a signed-in developer, I want a concise inline error after a failed Like, so that I understand the action was not saved.
11. As a signed-in developer, I want to retry a failed Like from the same controls, so that temporary network failures are recoverable.
12. As a signed-in developer, I want a repeated Like to succeed idempotently, so that retries do not produce duplicate or confusing errors.
13. As a signed-in developer, I want a previous Pass decision for the same developer to become a Like if I intentionally Like again, so that my latest positive decision is saved.
14. As a signed-in developer, I want the Like action disabled when a temporary or legacy card has no real profile ID, so that mock data cannot create invalid swipe rows.
15. As a signed-in developer, I want right-swipe attempts on an ID-less card to remain on that card, so that the app does not silently lose an unsaved action.
16. As a signed-out user, I want the Like endpoint to reject my request, so that private actions require authentication.
17. As a user, I want the backend to determine my acting user from my verified session, so that a manipulated client cannot Like as somebody else.
18. As a user, I want the backend to reject malformed target IDs, so that invalid requests do not reach persistence.
19. As a user, I want the backend to reject a target that does not identify an existing developer profile, so that polymorphic swipe IDs remain valid.
20. As a user, I want the backend to reject self-Likes, so that invalid user-to-user swipes are not stored.
21. As a mobile developer, I want Discover to pass only the current profile ID into the Like feature, so that candidate loading and swipe persistence remain independent.
22. As a mobile developer, I want the future paginated deck to provide profiles without knowing how Likes are persisted, so that both features can evolve independently.
23. As a mobile developer, I want swipe workflow logic inside the matching swipe feature, so that PairUp's domain-first architecture remains predictable.
24. As a mobile developer, I want Supabase Edge Function communication isolated in matching data access, so that UI components contain no raw backend calls.
25. As a mobile developer, I want transient submission and error state kept local to the swipe experience, so that Redux is not expanded without a shared-state need.
26. As a backend developer, I want the Edge Function to use the existing `swipes` constraints and RLS policies, so that the database remains authoritative.
27. As a backend developer, I want a small typed request and response contract, so that the mobile client is insulated from table details.
28. As a backend developer, I want duplicate-safe persistence to use the existing actor-target uniqueness rule, so that one pair has one current decision.
29. As a tester, I want Like behavior covered for success, failure, malformed input, unauthenticated access, and retries, so that regressions are detected.
30. As a tester, I want deployment verification to avoid creating users or fake developer profiles, so that existing Supabase data remains clean.

## Implementation Decisions

- Swiping remains part of the existing matching domain. No new top-level domain will be introduced.
- The swipe feature will expose a narrow Like action whose required input is a target developer profile ID.
- The Discover deck and its incremental candidate-loading implementation remain separate from the Like workflow. The Like action will not fetch, paginate, replenish, reorder, or filter candidates.
- The current profile model will expose a profile ID seam. Legacy or transitional cards without an ID will remain representable only so concurrent deck work can integrate safely; positive actions on such cards will be disabled.
- The existing queue abstraction will remain the owner of the current card and advancement position. The Like workflow will request advancement only after persistence succeeds.
- The heart button, Favorite star, and right-swipe gesture will call one shared Like handler.
- Positive controls and gestures will be guarded while a Like request is pending.
- A right-swipe gesture will settle the current card while persistence runs. The successful response will trigger the outgoing animation and queue advance.
- A failed Like will preserve the current card, reset any gesture displacement, clear the pending state, and expose an inline retryable error.
- Left swipe and Discard will continue to advance locally without writing a Pass row. Pass persistence is a separate capability.
- Submission and mutation error state will remain local to the swipe experience. The existing Redux-backed queue will not be expanded into a mutation store.
- A matching-domain data-access service will be the only Expo-side module that invokes the create-swipe Edge Function.
- The data-access service will own the typed request and response contract and normalize Edge Function failures into user-consumable errors.
- The client request will contain only the target profile ID and the `like` decision. It will not contain an acting user ID.
- The Edge Function will accept authenticated POST requests and support the necessary preflight behavior for Expo web.
- The Edge Function will verify the caller through the request's user JWT and use a per-request Supabase client scoped to that caller.
- The Edge Function will derive `actor_id` and `created_by_user_id` from the authenticated user.
- The persisted row will use a user actor, a user target, and a Like decision.
- The Edge Function will validate request shape, UUID format, target existence, and the self-swipe rule before persistence.
- Target existence will be checked against profiles through the caller-scoped client. Existing profile-read RLS permits authenticated profile discovery.
- Persistence will idempotently upsert on the existing actor-target unique key. An existing Pass may be updated to Like, and an existing Like may return success.
- The upsert will return a small stable response containing only identifiers, decision, and creation timestamp needed by the client.
- Expected authentication, validation, not-found, self-swipe, and database failures will return typed JSON errors with appropriate HTTP statuses.
- Raw PostgreSQL messages and implementation details will not be exposed as user-facing copy.
- The existing `swipes` table, constraints, foreign key, indexes, grants, and RLS policies are sufficient. No database migration or generated database-type change is planned.
- The function will use caller-scoped RLS rather than a service-role bypass.
- No new Supabase users, profiles, or seed accounts will be created for implementation or deployment verification.
- The create-swipe function will be deployed to the connected PairUp Supabase project after local checks pass.

## Testing Decisions

- Good tests will assert observable contracts and state transitions rather than exact helper calls, internal hook structure, animation implementation details, or SQL formatting.
- Matching data-access tests will verify that a Like invokes the correct Edge Function with the target profile ID and Like decision, returns the typed result, and surfaces normalized backend errors.
- Swipe action tests will verify duplicate-submit prevention, success completion, retained state on failure, and retry behavior through its public interface where the current test tooling supports it.
- Discover behavior will be tested or structured for verification that heart, Favorite, and right swipe share one Like action.
- Discover behavior will verify that queue advancement follows backend success and does not occur after backend failure.
- Discover behavior will verify that positive actions are unavailable without a real target profile ID while left-swipe behavior remains unchanged.
- Edge Function validation will cover unsupported methods, malformed JSON, missing target IDs, invalid UUIDs, unsupported decisions, nonexistent profiles, and self-swipes.
- Edge Function authentication will cover missing or invalid caller credentials.
- Edge Function persistence will cover a new Like, a repeated Like, and conversion of an existing Pass to Like without creating a second actor-target row.
- Edge Function response tests will verify the small success and error contracts rather than raw Supabase response objects.
- Existing matching/team swipe behavior will remain covered by its current tests and must not regress.
- The repository's existing Node test style for service modules will be used as prior art where practical.
- TypeScript checking and Expo lint will run across changed code, followed by the complete existing test suite.
- Deployment verification will confirm that the Edge Function is active and that an unauthenticated request is rejected.
- Because no test users will be created and no credentials will be stored, authenticated production-project insertion will be verified through an existing signed-in app session when available. Deployment checks alone must not create swipe rows.
- A post-verification database read will confirm that unauthenticated testing caused no unintended `swipes` changes.

## Out of Scope

- Fetching the first ten developer profiles.
- Incremental loading, pagination, deck replenishment, low-watermark behavior, or candidate caching.
- Creating users, profiles, fixtures, or fake developer accounts.
- Hard-coding existing production profile UUIDs into mock cards.
- Persisting left-swipe or Pass decisions.
- Introducing a distinct Favorite, super-like, or priority-like decision.
- Mutual-like detection.
- Creating rows in `matches`.
- Match notifications, chat creation, project-room creation, or any post-match workflow.
- User-to-team or team-to-user swipe behavior.
- Changing team proposal workflows that already use `swipes`.
- Changing the `swipes` schema, constraints, indexes, grants, foreign keys, or RLS policies.
- Adding service-role credentials to the Expo application or bypassing RLS in the Edge Function.
- Refactoring unrelated matching UI, routes, team management, authentication, or profile editing.

## Further Notes

- The live Supabase project was inspected before this PRD. The `swipes` table has UUID identifiers, supports user-to-user directions, restricts decisions to Like or Pass, prevents self-swipes, requires user actors to own their rows, and enforces one row per actor-target pair.
- The only foreign key on `swipes` is for the creating user. Actor and target IDs are polymorphic, so trusted backend target validation is required.
- Current swipe RLS allows authenticated users to read their own created rows and insert or update user-actor rows only when the actor and creator equal the authenticated user.
- The live project has no deployed Edge Functions at the time of planning.
- Discover currently uses a Redux-backed queue but seeds display-only mock profiles. A separate contributor is implementing the real paginated profile loader; this work must avoid taking ownership of or duplicating that flow.
- The current positive controls all share a right-swipe path, while left swipe only advances the local queue. This PRD preserves that Pass behavior while making positive actions durable.
- Expo SDK 57 versioned documentation and current Supabase Edge Function documentation were inspected during planning and must be rechecked if implementation occurs after relevant dependencies change.
