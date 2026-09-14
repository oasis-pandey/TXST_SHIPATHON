# Create Profile

Copy `.env.example` to `.env.local` and supply the project's public URL and publishable key. Restart Expo after changing environment variables. Never use a service-role key in the app.

Open **Create your PairUp profile** on Home, or `/create-profile`. A missing session routes to `/sign-in`, which supports existing Supabase email/password accounts. Account registration is not implemented. Sessions persist using AsyncStorage on native and Supabase's browser storage on web.

The checked-in migrations have no auth signup trigger. The feature checks for an existing profile and returns existing users to `/` (the current starter Home screen). New profiles use an explicit insert; the data layer validates the authenticated user with `auth.getUser()` and supplies their ID. The form cannot supply an ID. RLS and the existing foreign key enforce ownership. A duplicate insert retry reads the existing profile instead of overwriting it.

The form supports display name, bio, GitHub profile URL, skill level, availability, discovery mode, tech stack, interests, and preferred roles. Text is trimmed; blank optional text becomes null; comma-separated lists become trimmed, case-insensitively deduplicated arrays. Discovery mode matches the database's people/teams/both constraint. Skill level and availability remain free text, as defined in the schema. Text and list limits are UI safeguards, not new database constraints. Avatar uploads are deferred.

Routes compose features; features orchestrate validation, state, persistence, and navigation; domain UI only emits values; domain data owns Supabase queries. Generated database types are reused without modification.

## Verification

- `node --test tests/*.test.mjs` (Node 22.18+ for native TypeScript stripping)
- `npx tsc --noEmit`
- `npm run lint`
- With configured Supabase and an existing confirmed test account, sign in, enter a name and matching preferences, submit, and confirm Home appears. Verify the saved profile ID equals the authenticated account ID.
- Reopen Create Profile; it should return Home without overwriting the row. Test empty names, invalid GitHub URLs, network failure/retry, sign-out, and the mobile keyboard.

No migrations or RLS changes are required. Full discovery/matching UI and account registration remain separate features.
