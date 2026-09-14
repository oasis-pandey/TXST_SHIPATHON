# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Database Architecture

PairUp helps developers discover collaborators and form hackathon teams. Solo
developers can discover other solo developers or existing teams, while team
members can discover solo candidates on behalf of their team. A team has a
capacity of either 2 or 4 people.

A **match** is reciprocal interest between two solo users; it does not add
either user to a team. A **team membership proposal** represents a candidate
being considered by an existing team and records the candidate's response and
the current members' votes before membership can be created.

### Majority approval

When a proposal is created, the database snapshots the required majority:

```text
required_yes_votes = floor(current_member_count / 2) + 1
```

For example, a three-person team requires two accepting votes to add a fourth
member. The threshold does not change if team membership changes afterward.
The database only permits final membership after the proposal is accepted, the
candidate has accepted, and the stored vote threshold has been reached. The
team creator is the only exception, so they can create the first membership.

### Discovery flows

```text
Solo user <-> Solo user
        -> Match
        -> Create team

User -> Team
        -> Membership proposal
        -> Team vote
        -> Candidate acceptance
        -> Team membership

Team -> User
        -> Candidate interest
        -> Membership proposal
        -> Team vote
        -> Candidate acceptance
        -> Team membership
```

The `swipes` table supports user-to-user, user-to-team, and team-to-user
discovery. Actor and target IDs are polymorphic, so trusted application or Edge
Function logic must verify that each ID belongs to `profiles` or `teams` as
declared by its type.

### Primary relationships

```text
auth.users
  -> profiles
      -> team_members
          -> teams
              -> team_membership_proposals
                  -> team_membership_votes
```

Profiles also connect to swipes, solo matches, proposal candidates and
initiators, votes, and notifications.

### `profiles`

Purpose: Stores application metadata and discovery preferences for a Supabase
Auth user.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key linked to `auth.users.id` |
| `display_name` | `text` | Required public developer name |
| `bio` | `text` | Optional profile summary |
| `avatar_url` | `text` | Optional avatar location |
| `github_url` | `text` | Optional GitHub profile |
| `skill_level` | `text` | Self-described experience level |
| `availability` | `text` | Availability information |
| `discovery_mode` | `text` | `people`, `teams`, or `both` |
| `tech_stack` | `text[]` | Technologies the developer uses |
| `interests` | `text[]` | Project or technical interests |
| `preferred_roles` | `text[]` | Roles the developer prefers |
| `created_at`, `updated_at` | `timestamptz` | Creation and last-update times |

Authenticated users can read profiles for discovery and can only create,
update, or delete their own profile.

### `teams`

Purpose: Stores the project/team profile shown during discovery.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Team primary key |
| `name` | `text` | Required team name |
| `description` | `text` | Team summary |
| `project_idea` | `text` | Proposed project |
| `repo_url` | `text` | Optional source repository |
| `tech_stack` | `text[]` | Planned technologies |
| `max_members` | `integer` | Capacity constrained to 2 or 4 |
| `created_by` | `uuid` | Profile that created the team |
| `created_at`, `updated_at` | `timestamptz` | Creation and last-update times |

Authenticated users can read teams. Creators can create and delete their teams;
the creator or a current member can update the team profile.

### `team_members`

Purpose: Implements the many-to-many relationship between profiles and teams.
Members are relational rows, not an array on `teams`.

| Column | Type | Purpose |
| --- | --- | --- |
| `team_id` | `uuid` | References `teams.id` |
| `user_id` | `uuid` | References `profiles.id` |
| `role` | `text` | Member's team role |
| `joined_at` | `timestamptz` | Membership creation time |

The composite primary key is (`team_id`, `user_id`). Authenticated users can
read membership for team discovery. New members after the creator must pass the
proposal, candidate-response, vote-threshold, and team-capacity checks.

### `swipes`

Purpose: Stores discovery decisions for all supported actor/target directions.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Swipe primary key |
| `actor_type` | `text` | `user` or `team` |
| `actor_id` | `uuid` | Polymorphic actor ID |
| `target_type` | `text` | `user` or `team` |
| `target_id` | `uuid` | Polymorphic target ID |
| `decision` | `text` | `like` or `pass` |
| `created_by_user_id` | `uuid` | Profile performing the action |
| `created_at` | `timestamptz` | Action time |

Only user-to-user, user-to-team, and team-to-user combinations are valid. One
current decision is stored per actor/target pair. A user can manage their own
swipes; a team swipe also requires the acting user to be a current team member.

### `matches`

Purpose: Stores reciprocal interest between two solo users.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Match primary key |
| `user_1_id` | `uuid` | First matched profile |
| `user_2_id` | `uuid` | Second matched profile |
| `status` | `text` | Match lifecycle status |
| `created_at` | `timestamptz` | Match time |

The lower UUID must be stored in `user_1_id`. That canonical ordering plus a
unique constraint prevents duplicate rows for the same pair. Only participants
can read a match.

### `team_membership_proposals`

Purpose: Tracks a candidate being considered because of a team swipe, user
application, direct invitation, or teammate match.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Proposal primary key |
| `team_id` | `uuid` | Team considering the candidate |
| `candidate_user_id` | `uuid` | Candidate profile |
| `proposal_type` | `text` | `team_swiped_user`, `user_swiped_team`, `direct_invite`, or `teammate_match` |
| `initiated_by_user_id` | `uuid` | Profile that initiated the workflow |
| `status` | `text` | `pending`, `accepted`, or `rejected` |
| `candidate_response` | `text` | `pending`, `accepted`, or `rejected` |
| `required_yes_votes` | `integer` | Majority threshold captured at creation |
| `created_at` | `timestamptz` | Proposal time |
| `resolved_at` | `timestamptz` | Acceptance or rejection time |

Only one pending proposal can exist per team/candidate pair. The candidate and
current team members can read the proposal; trusted backend workflows perform
multi-step proposal changes.

### `team_membership_votes`

Purpose: Stores each current member's decision on a membership proposal.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Vote primary key |
| `proposal_id` | `uuid` | Membership proposal being reviewed |
| `voter_user_id` | `uuid` | Current member casting the vote |
| `decision` | `text` | `accept` or `reject` |
| `created_at` | `timestamptz` | Vote time |

The (`proposal_id`, `voter_user_id`) uniqueness constraint permits one vote per
member. Current members of the proposal's team can read its votes.

### `notifications`

Purpose: Stores in-app notifications such as new matches, candidate reviews,
team invitations, votes needed, and proposal results.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Notification primary key |
| `user_id` | `uuid` | Recipient profile |
| `type` | `text` | Notification category |
| `reference_id` | `uuid` | Polymorphic related record ID |
| `read` | `boolean` | Whether the recipient has read it |
| `created_at` | `timestamptz` | Notification time |

Users can only read their own notifications and update the `read` column. The
notification type determines what `reference_id` points to; trusted backend
logic validates that relationship and creates notifications.
