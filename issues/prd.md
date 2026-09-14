# PairUp Teams Tab Product Requirements Document

## Problem Statement

PairUp users need one clear place to create, discover, understand, and manage hackathon teams. The current Teams experience exposes most of the underlying capabilities, but it presents owned teams, invitations, discovery, notifications, roster management, proposal creation, and voting as similarly weighted lists and buttons. This makes it difficult for users to understand what needs attention, what state has already been saved, and which action belongs to which team.

The Teams tab must become a calm, mobile-first workspace that keeps related information together, uses cards and responsive grids to make teams easy to scan, and gives urgent items such as invitations and required votes clear priority. All durable state must remain in Supabase so that creating or editing a team, responding to an invitation, and voting survive navigation, refreshes, sign-out, and use on another device. The UI must reflect server-confirmed state and must not pretend an operation succeeded when the database rejected it.

## Solution

Redesign the Teams tab as a focused dashboard with three primary areas: an attention summary, the signed-in user's teams, and team discovery. Use responsive team-card grids that render one column on narrow phones and two or more columns where width permits, while keeping cards readable and touch targets accessible. Move invitations, applications, votes, and notification history into clearly labeled task-oriented views instead of mixing them into the team catalog.

Each team gets a structured detail workspace with an overview, roster, membership activity, and member-only management actions. Team creation and editing use short, grouped forms with clear validation, unsaved-change protection, server-backed submission states, and a visible confirmation after persistence. Membership proposals use four explicit entry paths—team swipe, user application, direct invite, and teammate-match promotion—and all paths converge on one proposal review experience showing candidate acceptance, the fixed vote requirement, current votes, remaining capacity, and final outcome.

Supabase remains the source of truth for teams, members, proposals, votes, and team-related notifications. Trusted database workflows continue to enforce admission atomically: the candidate must accept, the proposal must be accepted, the stored `required_yes_votes` threshold must be reached, and capacity must remain. `required_yes_votes` is captured at proposal creation and is never recomputed in the client or database afterward.

## User Stories

1. As an authenticated user, I want the Teams tab to restore my current server-backed state when I open it, so that I can continue where I left off.
2. As an authenticated user, I want a clear loading state while team data is being fetched, so that I know the app is working.
3. As an authenticated user, I want a useful retry state when team data cannot load, so that a temporary network problem does not leave me stuck.
4. As an authenticated user, I want to refresh the Teams dashboard, so that I can see changes made by other members.
5. As an authenticated user, I want the Teams dashboard to refresh after I return from a create, edit, vote, or response flow, so that stale information is not shown.
6. As an authenticated user, I want an at-a-glance attention area showing invitations, applications, and votes that need me, so that urgent work is easy to find.
7. As an authenticated user, I want unread team notifications to have a visible count, so that I know whether anything changed.
8. As an authenticated user, I want an uncluttered empty state when I have no teams, so that I understand what to do next.
9. As an authenticated user, I want primary and secondary actions to look distinct, so that I can quickly identify the safest next action.
10. As a screen-reader or keyboard user, I want every team card, action, field, status, and progress indicator to have a meaningful accessible label and focus behavior, so that I can complete the same workflows.
11. As a phone user, I want team cards in a single readable column, so that text and controls are not cramped.
12. As a tablet or web user, I want team cards arranged in a responsive grid, so that available space is used effectively.
13. As a user, I want cards within a grid row to have consistent structure, so that I can compare teams quickly.
14. As a user, I want each team card to show its name, short purpose, technology tags, member count, capacity, and my relationship to it, so that I can decide whether to open it.
15. As a user, I want cards to limit long descriptions and excessive tags, so that the dashboard remains scannable.
16. As a user, I want an entire team card to be a clear navigation target, so that I do not have to hunt for a small link.
17. As a user, I want teams I belong to separated from teams I can discover, so that ownership and discovery are not confused.
18. As a user, I want full teams marked clearly and their application action disabled, so that I do not start an impossible workflow.
19. As a user, I want teams I already belong to excluded from discovery, so that I do not see irrelevant application actions.
20. As a user, I want a concise explanation when no discoverable teams are available, so that the empty grid does not look broken.
21. As a user without a team, I want a prominent Create team action, so that I can start organizing collaborators.
22. As a team creator, I want to enter a team name, description, project idea, repository URL, technology stack, capacity, and my role, so that the team starts with useful context.
23. As a team creator, I want the creation form grouped into Basics, Project, and Team setup sections, so that it is easy to follow.
24. As a team creator, I want required fields and validation errors shown next to the relevant input, so that I can fix problems quickly.
25. As a team creator, I want repository URLs validated before submission, so that malformed links are not saved.
26. As a team creator, I want technology entries converted into clean, deduplicated tags, so that team cards remain consistent.
27. As a team creator, I want to choose only a supported capacity of two or four members, so that the UI matches database rules.
28. As a team creator, I want the submit button to prevent duplicate submissions while saving, so that only one team is created.
29. As a team creator, I want to leave the screen without losing work accidentally, so that a mistaken back action does not discard an unfinished form.
30. As a team creator, I want to see the created team only after Supabase confirms both the team and creator membership, so that the UI never shows a partially created team.
31. As a team creator, I want to land on the new team's detail screen after creation, so that I can immediately review and recruit.
32. As a team member, I want a team overview that shows the description, project idea, repository, technologies, capacity, and recent membership activity, so that I understand the team's current state.
33. As a team member, I want member-only actions grouped separately from public team information, so that management controls are easy to recognize.
34. As a non-member, I want to view discoverable team details without seeing controls I cannot use, so that the interface does not mislead me.
35. As a team member, I want to see the full roster as a clean grid or compact list depending on screen width, so that member information is easy to scan.
36. As a team member, I want each roster card to show the member's avatar or initials, display name, role, preferred roles, technology tags, and join date, so that I understand the team's composition.
37. As a user, I want the team capacity shown as both a number and simple visual progress, so that remaining space is immediately clear.
38. As a team member, I want a clear path from the team detail screen to proposals and votes, so that recruitment work stays connected to its team.
39. As an authorized team editor, I want to edit the team's supported profile fields, so that team information stays current.
40. As an authorized team editor, I want the edit form prefilled with saved values, so that I can make a small change without recreating the profile.
41. As an authorized team editor, I want a success confirmation after an edit is persisted, so that I know the save completed.
42. As an authorized team editor, I want failed saves to preserve my form input, so that I can retry without retyping.
43. As an authorized team editor, I want capacity reductions blocked when they would be lower than the existing roster size, so that the saved team remains valid.
44. As a team member, I want proposals grouped by Needs action, Pending, Accepted, and Rejected, so that active decisions are not buried in history.
45. As a team member, I want each proposal card to show the candidate, source path, candidate response, vote progress, creation time, and status, so that I can assess it without opening every record.
46. As a team member, I want proposal cards displayed in a responsive grid, so that multiple candidates are easy to compare.
47. As a team member, I want the UI to state that the required yes-vote count was fixed when the proposal was created, so that membership changes do not make the count seem inconsistent.
48. As a team member, I want to start a team-swipe proposal for a discoverable developer, so that the team can express interest in that user.
49. As a user, I want to apply to a team from my existing user-to-team like, so that my discovery action can enter the team's approval flow.
50. As a team member, I want to directly invite a developer, so that I can recruit someone without a prior swipe.
51. As a team member, I want to promote my active one-to-one match into a team proposal, so that an existing match can become a teammate.
52. As a proposal initiator, I want only candidates eligible for the selected path to be selectable, so that invalid proposals are prevented before submission.
53. As a proposal initiator, I want existing members and the signed-in user excluded when they are not valid candidates, so that I cannot choose an impossible target.
54. As a proposal initiator, I want a search field and concise candidate cards, so that I can find one person without scrolling through a cluttered list.
55. As a proposal initiator, I want each proposal path explained in plain language, so that I understand its prerequisites.
56. As a proposal initiator, I want prerequisite failures such as a missing like or inactive match explained clearly, so that I know what action is needed outside the Teams feature.
57. As a proposal initiator, I want duplicate pending proposals prevented, so that the same team and candidate do not have parallel votes.
58. As a proposal initiator, I want a visible saving state and duplicate-submit protection, so that only one proposal is created.
59. As a candidate, I want incoming invitations and proposals shown in my attention area, so that I can respond promptly.
60. As a candidate, I want proposal details to identify the team, proposal source, current status, and what acceptance means, so that I can make an informed choice.
61. As a candidate, I want to accept or decline a pending proposal, so that joining always requires my consent.
62. As a candidate, I want my accepted or declined response persisted and reflected after refresh or sign-in on another device, so that I never have to respond twice.
63. As a candidate, I want response controls hidden once the proposal is resolved, so that completed decisions cannot be repeated.
64. As a candidate, I want a clear explanation if acceptance does not immediately add me because votes are still pending, so that the workflow is understandable.
65. As a current team member, I want proposals requiring my vote listed in the attention area, so that I can act quickly.
66. As a current team member, I want to cast a yes or no vote on a pending proposal, so that I can participate in admissions.
67. As a current team member, I want my current vote highlighted, so that I can see what I selected.
68. As a current team member, I want to change my vote while a proposal remains pending, so that my latest decision is the one stored.
69. As a current team member, I want vote actions disabled while the save is in progress, so that rapid taps do not create confusing states.
70. As a current team member, I want the server-confirmed vote and proposal state reloaded after voting, so that admission results appear immediately.
71. As a non-member, I want vote totals and controls limited according to the existing access rules, so that private team decisions are not exposed.
72. As a user, I want proposal progress to distinguish candidate acceptance from member approval, so that the two requirements are not confused.
73. As a user, I want a completed proposal to display whether the candidate joined, declined, was rejected, or lost the final space, so that every outcome is understandable.
74. As a user, I want admission to occur only after candidate acceptance, proposal acceptance, the stored vote threshold, and remaining capacity are all satisfied, so that no UI sequence can bypass team rules.
75. As a user, I want concurrent admissions to respect capacity atomically, so that two accepted proposals cannot overfill a team.
76. As a user, I want a proposal closed when another candidate fills the last space first, so that stale pending work does not imply a space remains.
77. As a user, I want team membership to remain saved after app restart, sign-out, and sign-in, so that the roster is reliable.
78. As a user, I want notifications for applications, invitations, votes needed, candidate responses, successful joins, and capacity closures, so that important team events are visible.
79. As a user, I want unread notifications visually distinct from read notifications, so that I can scan for new activity.
80. As a user, I want to mark a notification read and have that state persist, so that dismissed items stay dismissed across devices.
81. As a user, I want a notification to open the related proposal or team when a valid reference exists, so that I can act without searching.
82. As a user, I want notification history ordered newest first, so that recent events are easiest to find.
83. As a user, I want an empty notification state that confirms there is no activity, so that a blank page does not look broken.
84. As a user, I want technical database errors translated into short actionable messages, so that I can recover without understanding PostgreSQL.
85. As a user on an unreliable network, I want existing loaded data to remain visible during refresh failures, so that a temporary failure does not erase context.
86. As a user, I want destructive or irreversible team actions to require explicit confirmation, so that accidental taps do not cause loss.
87. As a developer, I want all durable Teams state stored in the existing Supabase tables and trusted workflows, so that the frontend remains replaceable and consistent.
88. As a developer, I want transient UI state such as selected filters and open sections separated from persisted domain state, so that navigation behavior is predictable.
89. As a developer, I want server queries and mutations isolated from visual components, so that the UI can be tested without a live backend.
90. As a developer, I want shared grid, card, status, progress, empty, loading, and error components, so that all Teams screens remain visually consistent.
91. As a developer, I want each mutation to invalidate or refresh only the affected team, proposal, roster, and notification data, so that state remains correct without excessive queries.
92. As a developer, I want the Teams UI to work on Expo SDK 57 across Expo Go, Android, iOS, and web, so that testing reflects the supported runtime.
93. As a tester, I want a documented five-user scenario, so that creation, invitations, voting thresholds, capacity, and permissions can be exercised end to end.
94. As a tester, I want deterministic test data labels and reset instructions, so that results are repeatable.
95. As a tester, I want to verify both happy paths and rejected server operations, so that the app is trustworthy under invalid and concurrent actions.

## Implementation Decisions

- The Teams tab will use a dashboard information architecture rather than one continuous mixed list.
- The dashboard order will be: page identity and primary action, attention summary, Your teams grid, Discover teams grid, and a secondary link to notification history.
- Invitations and required votes will appear as counts and concise task cards in the attention summary. Full lists will live in dedicated screens.
- Team collections will use a responsive grid abstraction. The default is one column on narrow phones, two columns on larger phones/tablets, and up to three columns on wide web layouts when cards retain an appropriate minimum width.
- Team cards will share one visual contract: team identity, two-line summary, member-capacity indicator, a capped technology preview, relationship/status label, and one clear navigation target.
- Card grids will use stable IDs, spacing tokens, and consistent card heights where practical. Long content will be truncated with a route to full details.
- The design will support light and dark themes and reuse the application's theme tokens instead of embedding unrelated screen-specific colors.
- The Teams feature will have a small component system for page shells, responsive grids, team cards, roster cards, proposal cards, attention cards, status badges, capacity progress, form sections, inline errors, loading skeletons, and empty states.
- The team detail view will separate Overview, Roster, and Membership activity into visually distinct sections. Member-only management actions will be grouped in one action area.
- Team creation and editing will share one form module and validation contract. The form will group fields semantically and keep entered values intact after a failed save.
- The UI will warn before abandoning a dirty create or edit form. Drafts are transient UI state; completed teams and edits are not considered saved until Supabase confirms them.
- Team creation will continue through the trusted atomic workflow that creates the team and its creator membership together.
- Team edits will persist only supported mutable fields and will rely on existing authorization and capacity enforcement. This PRD does not change RLS policies.
- Durable domain state will remain in `teams`, `team_members`, `team_membership_proposals`, `team_membership_votes`, and team-related rows in `notifications`.
- The frontend will treat Supabase as the source of truth. After successful mutations, it will refresh affected data before showing final state; after failed mutations, it will preserve the last confirmed data and display an actionable error.
- Data access will remain isolated behind a Teams repository/service boundary. Screens and reusable UI components will not issue raw Supabase calls directly.
- A state/query layer will expose focused resources for dashboard summary, team detail and roster, proposals needing action, proposal detail, and notifications. It will support initial loading, background refreshing, errors, retry, and mutation-in-progress state.
- The dashboard will refresh on first load, explicit user refresh, and return to focus after a mutation screen. Existing content will stay visible during background refresh.
- No optimistic update will claim that a team, vote, response, membership, or notification-read change is saved before the server confirms it. Lightweight pressed/selected UI feedback is allowed.
- Proposal creation will present only the paths allowed for the current user's relationship to the team: members may initiate team swipe, direct invite, or teammate-match promotion; a non-member candidate may initiate a user application.
- The four proposal paths will remain distinct in copy and eligibility checks but converge on the same trusted proposal record and review interface.
- User-application UI will depend on an existing user-to-team like. Team-swipe UI will create/update the team-to-user like through the trusted workflow. Teammate-match promotion will require an active match. The Teams feature will consume these existing records but will not take ownership of the general swipe or match systems.
- Candidate selection will support search and filter invalid candidates. The server remains authoritative even when the client pre-filters.
- Proposal cards and details will render `required_yes_votes` exactly as stored. No client code will derive it from the current roster.
- Proposal progress will show candidate response and member votes as separate requirements. A pending proposal can therefore clearly show “candidate accepted; waiting for 1 vote,” or the reverse.
- Member votes will continue to be upserted as one vote per member. The UI will highlight the signed-in member's latest server-confirmed decision.
- Candidate responses and member votes will call trusted workflows that may finalize admission. The UI will always reload the proposal and roster after either action.
- The single trusted admission path remains authoritative and atomic. It must verify candidate acceptance, accepted proposal state, stored vote threshold, and capacity immediately before membership insertion.
- Concurrent proposals competing for the final space will be serialized by the backend. The losing proposal will display the capacity-closed outcome instead of retrying admission from the client.
- Notifications will use a typed mapping from event type to title, explanation, severity, and destination. Unknown types will have a safe generic presentation.
- Notification navigation will resolve a valid `reference_id` to the related proposal/team destination. A missing or inaccessible reference will show a non-blocking explanation.
- Team-related notification state will be persisted in Supabase; marking read will update only the signed-in user's row and then refresh the unread count.
- All controls will meet a minimum 44-point touch target, expose accessible roles and labels, support keyboard focus on web, and avoid communicating status by color alone.
- User-visible copy will replace internal terms where possible. For example, “Team interest,” “Application,” “Direct invite,” and “Matched developer” may be shown while canonical proposal-type values remain internal.
- Server/database messages will be mapped into user-facing categories such as authentication required, prerequisite missing, already a member, duplicate pending proposal, team full, no longer pending, and permission denied.
- Existing RLS policies are explicitly unchanged. Client code will use a publishable key and the authenticated user session; no service-role secret will be placed in the Expo app.
- The implementation will target Expo SDK 57 and use APIs supported by that version on Android, iOS, Expo Go, and web.
- The current route hierarchy can remain, but screen responsibilities will be narrowed so dashboard, team workspace, proposal inbox, proposal creation, proposal review, editing, and notifications each have a single purpose.
- No schema migration is required for the visual redesign. Any backend defect discovered during testing will be documented separately before a database change is proposed.

## Testing Decisions

- Good tests will assert externally visible behavior and persisted outcomes rather than component internals, hook implementation, SQL formatting, or exact styling values.
- Pure presentation/state helpers will be tested for grid breakpoints, capped tag summaries, member-capacity states, proposal progress labels, allowed actions, notification mapping, and user-facing error mapping.
- Shared team form behavior will be tested for required names, URL validation, technology normalization, capacity selection, dirty-state protection, duplicate-submit prevention, retained values after failure, and success navigation.
- Dashboard behavior will be tested for loading, retry, empty state, one-column and multi-column layouts, separation of owned and discoverable teams, attention counts, exclusion of joined teams from discovery, and refresh after returning from a mutation.
- Team detail behavior will be tested for member versus non-member controls, roster presentation, full-team presentation, repository links, missing optional fields, and refresh after admission.
- Proposal creation behavior will be tested independently for all four paths, including allowed actors, prerequisite failures, candidate filtering, duplicate pending proposals, saving state, and navigation to the created proposal.
- Proposal review behavior will be tested for candidate-only response controls, member-only vote controls, highlighted current vote, vote changes, pending versus resolved state, fixed threshold display, and server-confirmed refresh.
- Notification behavior will be tested for type-to-copy mapping, unread styling/counts, newest-first order, mark-read persistence, destination navigation, inaccessible references, and empty/error states.
- Data-access contract tests will use a controllable Supabase client boundary and assert the observable query/mutation inputs and normalized outputs without testing Supabase internals.
- Backend integration tests will cover atomic team creation, creator bootstrap membership, edit authorization, capacity reduction rejection, one pending proposal per team/candidate, all four proposal prerequisites, one vote per member, candidate consent, immutable `required_yes_votes`, final admission, capacity races, and generated notifications.
- Security tests will verify that unauthenticated users cannot use Teams workflows, non-members cannot vote or start member-only proposal paths, candidates cannot respond for another user, users cannot read another user's notifications, and no client path bypasses the trusted admission workflow.
- The primary manual end-to-end fixture will use five fake authenticated users with completed profiles: one creator, two initial members, one candidate who joins, and one competing candidate.
- In the five-user scenario, User 1 creates a four-person team; Users 2 and 3 join through proposal workflows; the proposal for User 4 snapshots a two-vote requirement when the roster has three members; two existing members vote yes; User 4 accepts and becomes the fourth member.
- The same scenario will verify that the stored requirement for User 4 does not change if other proposal activity occurs after creation.
- User 5 will exercise a competing proposal for the last slot. After User 4 fills capacity, User 5's finalization must fail safely, the proposal must show the capacity-closed result, and relevant notifications must appear.
- Separate manual passes will cover team swipe, user application from an existing like, direct invite, and teammate-match promotion using the five users in different roles.
- Persistence will be verified by force-closing and reopening Expo Go, signing out and back in, refreshing the web build, and checking a second signed-in device/session after each durable mutation.
- Responsive UI testing will cover a narrow phone, a larger phone, a tablet-sized viewport, and desktop web. It will check grid column changes, truncation, scrolling, safe areas, tab overlap, keyboard use, and screen-reader labels.
- Network testing will cover slow requests, offline initial load, failure during refresh, failure during form submission, and reconnect/retry without losing last confirmed content or form input.
- Testing will include both light and dark themes and will verify readable contrast and status text independent of color.
- The repository currently has no established automated test suite for Teams. The implementation should add focused unit/component test infrastructure before relying on automated coverage, then use existing lint and TypeScript checks as baseline validation.
- Final acceptance requires lint and TypeScript checks to pass for changed code, automated tests to pass, an Expo web build to compile, and the five-user manual scenario to complete against a non-production Supabase environment.

## Out of Scope

- Changing existing Row Level Security policies.
- Replacing the trusted database admission workflow with client-side logic.
- Recomputing `required_yes_votes` after proposal creation.
- Owning or redesigning profile creation, authentication, general user-initiated swipes, solo matching, or the full Discover experience.
- Creating matches or user-to-team likes inside Teams when their owning feature has not produced the required record; Teams will consume those records through defined integration points.
- Team chat, direct messaging, file sharing, task boards, calendars, or project management tools.
- Arbitrary team capacities outside the existing supported values of two and four.
- Member removal, voluntary leave, ownership transfer, team deletion UI, or custom permission roles unless separately approved.
- Push notifications, email notifications, or SMS notifications; this PRD covers in-app team notifications only.
- Public unauthenticated team browsing.
- Avatar upload or repository hosting integrations.
- Changes to production data or running unreviewed migrations against the live Supabase project.

## Further Notes

- Current-state audit: team creation/editing, roster display, proposal lists, the four proposal creation types, candidate responses, member voting, trusted final admission, and team notifications already have initial routes and data-access functions. The redesign should preserve this working domain logic while separating responsibilities and improving state refresh, eligibility presentation, validation, accessibility, and visual hierarchy.
- Current-state audit: the existing Teams home screen combines owned teams, invitations, discovery, notifications, create, and refresh controls in one vertical flow. This is the primary source of clutter addressed by the dashboard and grid design.
- Current-state audit: team data is already persisted in Supabase, but the UI needs a more explicit refresh/invalidation strategy after mutations and when screens regain focus. Persistence should be communicated through server-confirmed states rather than local success assumptions.
- The database's immutable proposal threshold and atomic capacity check are core product rules, not implementation details. Product copy, progress indicators, tests, and error handling must reinforce them consistently.
- The design should favor progressive disclosure: cards show decision-making essentials, while detail screens expose full descriptions, rosters, proposal histories, and action explanations.
- The five fake users should be created only in a local or dedicated test Supabase project. Their credentials must not be committed to source control, logs, screenshots, or the PRD.
- Expo SDK 57 versioned documentation and current Supabase documentation/changelog must be rechecked immediately before implementation because both platforms evolve quickly.
