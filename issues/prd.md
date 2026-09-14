# PairUp Authentication PRD

## Problem Statement
PairUp needs a reliable email/password authentication flow that restores existing Supabase sessions, keeps authentication state available across the app, and routes users according to whether they have completed their developer profile.

## Solution
Implement Supabase email/password signup, sign-in, and sign-out in the users domain. Add a global auth/session provider that restores the session on app launch, listens for auth changes, checks the authenticated user's profile row, and protects public, onboarding, and application routes without flashing the wrong screen.

## User Stories
1. As a new user, I want to create an account with email and password so that I can use PairUp.
2. As a returning user, I want to sign in with email and password so that I can resume PairUp.
3. As an authenticated user, I want my session restored when the app reopens so that I do not sign in repeatedly.
4. As an authenticated user, I want the app to know whether my PairUp profile exists so that onboarding resumes correctly.
5. As an authenticated user without a profile, I want to be sent to create-profile before entering the main app.
6. As an authenticated user with a profile, I want to enter the main app directly.
7. As a signed-in user, I want to sign out so that my account is removed from the current device.
8. As a user, I want useful validation and understandable errors for invalid credentials, duplicate signup, network failures, and incomplete input.
9. As a user, I want a loading state during session restoration so that the app does not briefly show the wrong route.
10. As a developer, I want auth listeners cleaned up and stale profile state cleared so that logout and session changes do not create navigation loops.

## Implementation Decisions
- Keep authentication in the users domain and keep Supabase calls in domain data access.
- Reuse the existing `profiles.id -> auth.users.id` relationship and existing RLS policies.
- Use a lightweight React context/provider for global auth state because no shared state library is installed and auth state is app-wide but small.
- Treat a profile row as completed onboarding for this hackathon; profile field validation remains owned by create-profile.
- Keep password reset, OAuth, magic links, and email verification UI out of scope.

## Testing Decisions
- Test auth service behavior through its public functions with a fake Supabase client.
- Test input validation and user-facing error mapping without testing component internals.
- Typecheck and run the existing Node test suite after each implementation slice.
- Verify route behavior manually or with the available Expo/web tooling when possible.

## Out of Scope
Password reset, OAuth, magic links, MFA, account deletion, profile editing, and backend workflows unrelated to authentication/onboarding.

## Further Notes
Supabase email confirmation may be enabled per project. Signup must handle a returned user with no active session by showing a confirmation message instead of navigating into protected routes.
