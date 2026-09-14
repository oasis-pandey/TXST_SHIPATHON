## Parent PRD

`issues/prd.md`

## What to build
Create global auth/session state for the app. Restore the Supabase session on startup, subscribe to auth state changes, derive the current user and profile/onboarding status, expose loading/error/retry state, and clear stale state after sign-out or session loss.

## Acceptance criteria

- [x] App startup waits for `getSession()` before choosing a route.
- [x] Auth state changes update global user/session state and clean up the subscription on unmount.
- [x] An authenticated user with no `profiles` row is marked onboarding-incomplete.
- [x] An authenticated user with a profile row is marked onboarding-complete.
- [x] Profile lookup failures surface a retryable error instead of being treated as logged out.
- [x] Sign-out clears the user, session, and profile state.
- [x] Service tests cover session restoration and auth listener cleanup; profile service tests cover missing/existing profile persistence and lookup failures.

## Blocked by

- Blocked by `issues/001-auth-account-lifecycle.md`

## User stories addressed

- User story 3
- User story 4
- User story 9
- User story 10
