## Parent PRD

`issues/prd.md`

## What to build
Implement the users-domain email/password account lifecycle: signup, sign-in, and sign-out backed by the existing Supabase client. Add thin sign-up/sign-in UI flows with validation, duplicate-submit protection, understandable errors, and handling for signup responses that require email confirmation.

## Acceptance criteria

- [x] A new user can submit email, password, and confirmation and receives a Supabase signup request.
- [x] Sign-in validates required input and establishes a Supabase session on success.
- [x] A signed-in user can sign out through a domain auth action.
- [x] Duplicate submissions are ignored while a request is pending.
- [x] Duplicate email, invalid credentials, network errors, and password mismatch produce user-facing messages.
- [x] Signup with no active session does not navigate into protected routes and explains that email confirmation may be required.
- [x] Service tests cover successful and failed public auth operations.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 1
- User story 2
- User story 7
- User story 8
