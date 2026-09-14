## Parent PRD

`issues/prd.md`

## What to build
Verify the complete authentication and onboarding flow across service, provider, and routing boundaries. Add focused regression coverage and document the remaining project-level assumptions, especially email confirmation configuration and profile RLS.

## Acceptance criteria

- [x] New user signup routes to create-profile only when a session is active; otherwise confirmation guidance is shown.
- [x] Returning users with and without profiles reach the correct destination after sign-in and app reopen.
- [x] Bad credentials remain on auth screens with a useful error.
- [x] Logout returns to the auth flow and clears local auth/profile state.
- [x] Temporary profile lookup failure supports retry without an infinite redirect loop.
- [x] Typecheck, tests, and the available lint command are run and their results recorded.
- [x] No service-role key or local environment secret is committed.

## Blocked by

- Blocked by `issues/003-route-protection-and-onboarding.md`

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
