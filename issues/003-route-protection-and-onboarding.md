## Parent PRD

`issues/prd.md`

## What to build
Connect the global auth/onboarding state to Expo Router so public auth routes, create-profile onboarding, and the main application are protected and redirect deterministically. Prevent route flashes and loops, allow retry after profile lookup failure, and expose sign-out from the authenticated application shell.

## Acceptance criteria

- [x] Unauthenticated users can access sign-in/sign-up but are redirected away from onboarding and application routes.
- [x] Authenticated users without a profile are redirected to create-profile.
- [x] Authenticated users with a profile are redirected to the main application.
- [x] Session restoration displays loading/splash state without flashing sign-in or the main app.
- [x] Auth changes and logout cannot leave stale protected screens accessible.
- [x] Existing create-profile behavior continues to save a profile and enter the main app.
- [x] Route transitions do not create redirect loops for direct links or app reopen.

## Blocked by

- Blocked by `issues/002-session-onboarding-state.md`

## User stories addressed

- User story 5
- User story 6
- User story 9
- User story 10
