## Problem Statement

PairUp’s Expo application currently contains direct Supabase database and RPC access alongside its authentication code. This makes SQL-facing data-access modules part of the mobile bundle, blurs the frontend/backend trust boundary, and lets client code depend on the database schema and query details.

The app must retain Supabase Auth on the client for sign-up, sign-in, sign-out, session restoration, and auth-state observation. Every database read, write, and RPC workflow must instead execute in trusted Supabase Edge Functions without changing existing user-visible behavior.

## Solution

Create an authenticated, use-case-oriented Edge Function API for all profile, team, proposal, vote, and notification workflows. The Expo app will use a minimal auth-only Supabase client and a typed backend gateway that invokes those functions with the current user’s JWT. No Expo module may import database types or issue direct table queries or RPC calls.

The Edge Functions will validate input, identify the authenticated caller, perform existing reads or invoke the existing trusted SQL workflows, and return stable response contracts. Existing database schema, RLS policies, and SQL workflow functions remain the backend implementation unless a narrowly necessary security or correctness change is identified.

## User Stories

1. As a signed-out developer, I want to sign up with email and password, so that I can create a PairUp account.
2. As a registered developer, I want to sign in from the Expo app, so that I can access my PairUp account.
3. As a signed-in developer, I want my session restored after reopening the app, so that I do not have to sign in every time.
4. As a signed-in developer, I want to sign out, so that I can safely end my session on a device.
5. As a signed-in developer without a profile, I want the app to determine that I need onboarding, so that I can create my profile before using PairUp.
6. As a developer, I want to create my profile, so that I can participate in discovery and team workflows.
7. As a developer, I want a failed profile read or creation to show the same helpful error behavior, so that I know whether and how to retry.
8. As a developer, I want profile data to be read through a trusted backend API, so that the mobile app never queries the profiles table directly.
9. As a developer, I want to view my teams, so that I can manage collaborations I already belong to.
10. As a developer, I want to browse discoverable teams, so that I can identify collaboration opportunities.
11. As a developer, I want to view a team’s details and roster, so that I can understand its project and members.
12. As a developer, I want to create a team with my initial role and capacity, so that I can begin recruiting collaborators.
13. As an authorized team member, I want to edit team details, so that the team profile stays accurate.
14. As a developer, I want to browse candidate profiles when creating an eligible proposal, so that I can select an appropriate collaborator.
15. As a team member, I want to create a membership proposal, so that my team can consider a candidate through a supported path.
16. As a proposal candidate, I want to view proposals directed to me, so that I can respond to team invitations or applications.
17. As a team member, I want to view a proposal’s candidate, status, and votes, so that I can make an informed decision.
18. As an eligible team member, I want to vote yes or no on a pending proposal, so that the team can make a membership decision.
19. As a proposal candidate, I want to accept or decline a pending proposal, so that my consent is represented before admission.
20. As a developer, I want the existing capacity, majority, and proposal-finalization rules to remain enforced, so that this refactor does not change admission behavior.
21. As a developer, I want to view team-related notifications, so that I know about applications, votes, decisions, and membership changes.
22. As a developer, I want to mark a team notification as read, so that I can manage my notification state.
23. As a developer, I want requests made with no valid session to be rejected consistently, so that private information and actions remain protected.
24. As a developer, I want unauthorized requests to be rejected even if a user manipulates the mobile client, so that team and proposal permissions remain enforced on the backend.
25. As a mobile developer, I want the Expo bundle to contain only authentication and backend invocation code, so that it contains no database-query implementation.
26. As a maintainer, I want stable typed request and response contracts for each backend use case, so that frontend features are isolated from SQL and schema details.
27. As a maintainer, I want validation and authorization tests around every backend use case, so that a routing refactor cannot silently weaken access controls.
28. As a maintainer, I want existing authentication and profile validation behavior covered by tests, so that the refactor preserves the current user experience.

## Implementation Decisions

- Keep an Expo-resident Supabase Auth client only. It may persist sessions, refresh tokens, restore sessions, and call Auth APIs, but it must not expose database clients, table types, direct table methods, or RPC methods.
- Replace all client database access with a typed backend gateway that invokes authenticated Edge Functions. Features continue to call domain-level actions rather than knowing transport or SQL details.
- Organize Edge Functions by user capability rather than creating a generic database proxy. The initial surface covers profile retrieval and creation; team list, detail, roster, creation, and update; profile candidate listing; proposal list, detail, creation, voting, and candidate response; and notification list and read state updates.
- Require an authenticated user for every user-facing function. Functions must derive caller identity from the verified request context, not client-supplied user identifiers.
- Use per-request backend clients scoped to the caller’s JWT and RLS policies for ordinary reads and writes. Preserve existing trusted SQL functions for coordinated team workflows and invoke them only from backend code.
- Do not expose a service-role or secret API key to Expo. If a privileged backend operation becomes necessary, it must be isolated to a server-only function with explicit authorization.
- Keep existing database schema, RLS policies, constraints, and workflow behavior unchanged unless a test identifies an implementation-specific defect that blocks the new boundary.
- Keep the current user-facing route structure, screens, loading behavior, success flows, and error messages materially unchanged.
- Remove client imports of database types and eliminate direct database query and RPC syntax from all Expo-reachable code.
- Create reusable server-only helpers for authenticated request handling, input validation, response construction, and error normalization. These helpers are deep modules: they hide Supabase setup and security mechanics behind small, stable interfaces.
- Create a reusable client backend gateway that hides Edge Function invocation, session-token forwarding, and response/error mapping behind domain-facing methods.

## Testing Decisions

- Test externally observable behavior rather than internal implementation details. Tests should assert authorization outcomes, validation failures, returned data contracts, and persistence/workflow results—not helper call counts or module layout.
- Extend existing authentication service tests to verify the retained client Auth-only surface: credential validation, sign-in, sign-up, sign-out, session retrieval, and auth observation.
- Extend existing profile tests to verify profile input validation and client handling of profile Edge Function success, duplicate/retry behavior, and failure responses.
- Add tests for every Edge Function covering authenticated success, missing or invalid authentication, malformed input, forbidden actions, expected response shape, and mapped errors.
- Add integration tests for profile creation and retrieval, team creation and update authorization, team discovery/list/detail/roster reads, proposal creation, candidate response, voting, notification reads, and unchanged majority/capacity/finalization behavior.
- Test that client code cannot issue direct table or RPC operations through the retained Auth client. A static import/boundary test may enforce that database data-access modules are server-only.
- Use the existing authentication, profile-service, and profile-validation test files as prior art. Add an Edge Function test harness appropriate to the Supabase local runtime for backend contract and integration tests.

## Out of Scope

- Changing PairUp’s user interface, navigation, visual design, or product workflows.
- Altering the database schema, RLS policy model, proposal majority rules, team capacity rules, or notification semantics except when essential to preserve behavior through the new backend boundary.
- Implementing new discovery/swipe persistence behavior beyond moving currently implemented database access.
- Replacing Supabase Auth, changing authentication providers, or removing mobile session persistence.
- Adding a generic backend-for-frontend, a service-role client in Expo, or a generic database query endpoint.
- Adding project-room functionality that does not already exist.

## Further Notes

- The current discovery deck uses sample profiles and does not yet issue database queries. It remains unchanged by this refactor.
- Existing SQL workflow functions already centralize several multi-step team actions. The Edge Function layer becomes the only mobile-accessible entry point to those workflows.
- Edge Functions must be deployed and tested using the Supabase local/deployment workflow. Their authenticated requests should carry the user session JWT; authorization must never trust an ID supplied in the request body.
- The Expo app may still compile the minimal Auth client because authentication is explicitly client-side. Database access code must live outside the Expo import graph under the server-only Supabase functions area.
