---
name: pairup-domain-feature-architecture
description: Architecture rules for PairUp, a React Native + Expo application using domain-first organization with feature-based design inside each domain and Supabase Edge Functions for backend business logic. Use when creating, moving, reviewing, or refactoring PairUp frontend or backend code.
---

# PairUp Domain + Feature Architecture

## Purpose

Use this skill whenever working on PairUp architecture, adding features, creating folders, deciding where code belongs, or reviewing imports.

PairUp intentionally combines two ideas:

1. **Domain-driven organization at the top level** — code is grouped by business domain rather than technical type.
2. **Feature-based organization inside each domain** — each domain owns multiple user-facing features, shared domain data access, and reusable presentational UI.

This is a lightweight DDD approach for a hackathon. Do not introduce aggregates, repositories, events, factories, or extra layers unless the business logic actually requires them.

---

# Core Rule

Organize code around **business concepts first**.

Prefer:

```text
src/
├── users/
├── matching/
├── project-room/
├── shared/
└── app/
```

Do not create:

```text
src/
├── components/
├── hooks/
├── services/
├── models/
└── screens/
```

as global technical buckets.

The top-level folders such as `users`, `matching`, and `project-room` are the application domains/bounded business areas.

---

# Frontend Structure

Use this structure:

```text
src/
├── app/                       # Expo Router routes and app composition only
│
├── users/                     # Domain
│   ├── features/              # Smart feature modules
│   │   ├── sign-in/
│   │   ├── create-profile/
│   │   ├── edit-profile/
│   │   └── view-profile/
│   ├── data/                  # Domain data access, API calls, types/models
│   └── ui/                    # Dumb/presentational domain UI
│
├── matching/                  # Domain
│   ├── features/
│   │   ├── discover/
│   │   ├── swipe/
│   │   └── view-matches/
│   ├── data/
│   └── ui/
│
├── project-room/              # Domain
│   ├── features/
│   │   ├── room/
│   │   ├── goals/
│   │   └── sprint-timer/
│   ├── data/
│   └── ui/
│
└── shared/
    ├── ui/
    ├── lib/
    ├── hooks/
    ├── utils/
    └── types/
```

---

# Domain Rules

A domain is a major business concept with its own vocabulary and responsibilities.

For PairUp:

- `users` owns developer identity, profile, skills, availability, authentication-facing behavior, and profile editing.
- `matching` owns discovery, swipes, mutual matches, candidate filtering, and match presentation.
- `project-room` owns collaboration after a match: goals, repo links, sprint timer, and room state.
- `shared` owns code that has no knowledge of a specific PairUp domain.
- `app` owns routing, providers, bootstrapping, navigation composition, and top-level layouts.

Use domain language in names. Prefer `DeveloperProfile`, `Swipe`, `Match`, `ProjectRoom`, and `SprintGoal` over generic names such as `Item`, `Manager`, or `DataObject`.

If the same concept begins meaning different things in two areas, treat that as a signal that the domain boundary may need refinement.

---

# Feature Rules

A feature represents a concrete user capability or use case within a domain.

Examples:

```text
users/features/create-profile
matching/features/discover
matching/features/swipe
project-room/features/goals
```

A feature is a **smart component/module**. It may:

- own local state
- orchestrate domain behavior
- call functions from its domain's `data/` folder
- compose components from its domain's `ui/` folder
- compose components from `shared/ui/`
- handle loading/error/success state
- translate route/user interaction into domain actions

A feature should not contain raw duplicated Supabase query logic when that logic belongs in `data/`.

Example flow:

```text
Expo route
   ↓
Feature / smart component
   ├── domain data
   └── domain UI
          ↓
       shared UI
```

---

# Data Rules

Each domain's `data/` folder owns communication with external data sources for that domain.

Examples:

```text
matching/data/
├── matching-service.ts
├── matching-types.ts
└── matching-mappers.ts
```

The data layer may contain:

- Supabase client calls
- Edge Function invocations
- DTOs
- TypeScript domain-facing types
- mapping functions
- query helpers

The data layer must not import presentational UI.

Avoid direct Supabase calls inside screens and dumb UI components.

Prefer:

```ts
await matchingService.swipeDeveloper(targetUserId, "like");
```

instead of placing this directly in a component:

```ts
await supabase.from("swipes").insert(...);
```

When important business behavior requires multiple database operations, call an Edge Function instead of orchestrating those operations on the client.

---

# UI Rules

A domain's `ui/` folder contains reusable presentational components that belong specifically to that domain.

Examples:

```text
matching/ui/
├── DeveloperCard.tsx
├── MatchCard.tsx
└── SwipeActions.tsx
```

UI components should:

- receive data through props
- emit user actions through callbacks
- focus on rendering and interaction
- avoid knowing how persistence works
- avoid directly calling Supabase
- avoid owning cross-screen business workflows

Example:

```tsx
<DeveloperCard
  developer={developer}
  onLike={() => handleSwipe("like")}
  onPass={() => handleSwipe("pass")}
/>
```

`DeveloperCard` renders the card. The feature decides what liking or passing actually does.

---

# Shared Rules

`shared/` contains only code that can be used across domains without depending on one of them.

Good examples:

```text
shared/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Avatar.tsx
├── lib/
│   └── supabase.ts
├── hooks/
├── utils/
└── types/
```

Do not move code into `shared/` simply because two files use it.

Move code into `shared/` only when it is genuinely domain-independent.

Bad:

```text
shared/utils/calculateMatchCompatibility.ts
```

That belongs to `matching` because compatibility is matching-domain behavior.

---

# Import Direction

Keep dependencies predictable.

Allowed direction:

```text
app
 ↓
domain/features
 ├── domain/data
 ├── domain/ui
 └── shared

 domain/data ──→ shared
 domain/ui   ──→ shared
 shared      ──→ external libraries only
```

Rules:

1. `app/` may compose features from multiple domains.
2. A feature may use its own domain's `data` and `ui` code.
3. Domain `ui` must not import domain `data`.
4. Domain `data` must not import domain `ui`.
5. `shared` must not import from `users`, `matching`, or `project-room`.
6. Avoid direct imports between unrelated domains.
7. If two domains must coordinate, compose them in `app/`, a higher-level feature, or through a clear backend contract rather than tightly coupling internals.

---

# Expo Router Rules

Treat `app/` as routing and composition, not the place where business logic lives.

Routes should be thin.

Prefer:

```tsx
export default function DiscoverScreen() {
  return <DiscoverFeature />;
}
```

Avoid putting fetching, matching rules, swipe state, or Supabase mutations directly inside route files.

---

# Backend Structure

Use Supabase Edge Functions for backend workflows that contain business logic or multiple database operations.

```text
supabase/
├── functions/
│   ├── _shared/
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   ├── response.ts
│   │   └── validation.ts
│   │
│   ├── create-swipe/
│   │   └── index.ts
│   │
│   ├── get-candidates/
│   │   └── index.ts
│   │
│   ├── create-project-room/
│   │   └── index.ts
│   │
│   └── update-project-goal/
│       └── index.ts
│
└── migrations/
```

Organize Edge Functions around **use cases**, not generic controller/service/repository folders.

---

# Backend Business Logic Rule

An Edge Function should own workflows that must remain consistent on the backend.

Example: `create-swipe`

```text
receive authenticated user
        ↓
validate target user
        ↓
store swipe
        ↓
check reciprocal swipe
        ↓
create match if reciprocal
        ↓
return result
```

Do not make the React Native app perform five independent database operations for a single business action.

The client should think in terms of domain actions:

```ts
swipeDeveloper(targetUserId, "like")
```

not database operations.

---

# DDD Guidance for PairUp

Use DDD primarily for **boundaries and language**, not ceremony.

Apply:

- clear domain boundaries
- ubiquitous domain vocabulary
- business rules near the domain that owns them
- explicit contracts between domains
- domain-oriented names

Do NOT automatically add:

- repository interfaces
- aggregate roots
- domain event buses
- CQRS
- event sourcing
- factories
- dependency injection containers

PairUp is a small hackathon application. Add those patterns only when a concrete business rule requires them.

---

# Where Does This Code Go?

Use this decision process:

```text
Is it routing/app setup?
  → app/

Does it belong to one business domain?
  → that domain

Is it a complete user capability/use case?
  → domain/features/<feature>

Does it fetch/store/map data for the domain?
  → domain/data/

Is it reusable presentation specific to the domain?
  → domain/ui/

Is it truly independent of all domains?
  → shared/

Does it perform trusted multi-step backend business logic?
  → Supabase Edge Function
```

---

# Example: Matching Domain

```text
matching/
├── features/
│   ├── discover/
│   │   └── DiscoverFeature.tsx
│   ├── swipe/
│   │   └── SwipeFeature.tsx
│   └── view-matches/
│       └── ViewMatchesFeature.tsx
│
├── data/
│   ├── matching-service.ts
│   ├── matching-types.ts
│   └── matching-mappers.ts
│
└── ui/
    ├── DeveloperCard.tsx
    ├── MatchCard.tsx
    └── SwipeActions.tsx
```

Possible flow:

```text
app/discover.tsx
      ↓
DiscoverFeature
      ↓
matching/data/matching-service
      ↓
get-candidates Edge Function
```

For a swipe:

```text
SwipeFeature
   ↓
matchingService.swipeDeveloper()
   ↓
create-swipe Edge Function
   ↓
Postgres
```

---

# Code Review Checklist

Before accepting new PairUp code, verify:

- Is the file inside the correct business domain?
- Is a feature a smart orchestrator rather than a giant UI file?
- Are presentational components kept in `ui/`?
- Are Supabase/Edge Function calls isolated in `data/`?
- Are route files thin?
- Does `shared/` remain domain-independent?
- Are domain terms used consistently?
- Is business logic on the trusted backend when it needs atomicity or security?
- Are unrelated domains loosely coupled?
- Has unnecessary architecture been avoided?

---

# Project Priority

For this hackathon, optimize for:

1. clarity
2. predictable file placement
3. strong domain boundaries
4. easy parallel development
5. testable business logic
6. minimal architecture overhead

When choosing between architectural purity and shipping a clear, maintainable feature during the hackathon, prefer the simplest design that preserves the domain boundary and dependency rules above.
