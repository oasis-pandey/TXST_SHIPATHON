create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  bio text,
  avatar_url text,
  github_url text,
  skill_level text,
  availability text,
  discovery_mode text not null default 'both'
    check (discovery_mode in ('people', 'teams', 'both')),
  tech_stack text[] not null default '{}',
  interests text[] not null default '{}',
  preferred_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text,
  project_idea text,
  repo_url text,
  tech_stack text[] not null default '{}',
  max_members integer not null default 4
    check (max_members in (2, 4)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

comment on table public.team_members is
  'Relational team membership. Members are not stored as an array on teams.';

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('user', 'team')),
  actor_id uuid not null,
  target_type text not null check (target_type in ('user', 'team')),
  target_id uuid not null,
  decision text not null check (decision in ('like', 'pass')),
  created_by_user_id uuid not null
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint swipes_supported_direction_check check (
    (actor_type = 'user' and target_type in ('user', 'team'))
    or (actor_type = 'team' and target_type = 'user')
  ),
  constraint swipes_distinct_user_check check (
    actor_type <> 'user'
    or target_type <> 'user'
    or actor_id <> target_id
  ),
  constraint swipes_user_actor_owner_check check (
    actor_type <> 'user' or actor_id = created_by_user_id
  ),
  constraint swipes_actor_target_unique
    unique (actor_type, actor_id, target_type, target_id)
);

comment on table public.swipes is
  'Discovery actions for user-to-user, user-to-team, and team-to-user. actor_id and target_id are polymorphic; application and Edge Function logic must validate that each ID belongs to the table named by its type.';
comment on column public.swipes.actor_id is
  'Polymorphic reference to profiles.id or teams.id according to actor_type; validated by trusted application logic.';
comment on column public.swipes.target_id is
  'Polymorphic reference to profiles.id or teams.id according to target_type; validated by trusted application logic.';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid not null references public.profiles (id) on delete cascade,
  user_2_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint matches_canonical_user_order_check check (user_1_id < user_2_id),
  constraint matches_user_pair_unique unique (user_1_id, user_2_id)
);

comment on table public.matches is
  'Reciprocal solo user-to-user matches. Callers must store the lower UUID in user_1_id so each pair has one canonical row.';

create table public.team_membership_proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  candidate_user_id uuid not null
    references public.profiles (id) on delete cascade,
  proposal_type text not null check (
    proposal_type in (
      'team_swiped_user',
      'user_swiped_team',
      'direct_invite',
      'teammate_match'
    )
  ),
  initiated_by_user_id uuid
    references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  candidate_response text not null default 'pending'
    check (candidate_response in ('pending', 'accepted', 'rejected')),
  required_yes_votes integer not null check (required_yes_votes > 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint team_membership_proposals_resolution_check check (
    (status = 'pending' and resolved_at is null)
    or (status in ('accepted', 'rejected') and resolved_at is not null)
  )
);

create unique index team_membership_proposals_one_pending_idx
  on public.team_membership_proposals (team_id, candidate_user_id)
  where status = 'pending';

create table public.team_membership_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null
    references public.team_membership_proposals (id) on delete cascade,
  voter_user_id uuid not null
    references public.profiles (id) on delete cascade,
  decision text not null check (decision in ('accept', 'reject')),
  created_at timestamptz not null default now(),
  constraint team_membership_votes_proposal_voter_unique
    unique (proposal_id, voter_user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (length(btrim(type)) > 0),
  reference_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.notifications.reference_id is
  'Polymorphic reference interpreted from notification type and validated by trusted application logic.';

create index teams_created_by_idx
  on public.teams (created_by);
create index team_members_user_id_idx
  on public.team_members (user_id);
create index swipes_created_by_user_id_idx
  on public.swipes (created_by_user_id);
create index swipes_target_lookup_idx
  on public.swipes (target_type, target_id, decision);
create index matches_user_2_id_idx
  on public.matches (user_2_id);
create index team_membership_proposals_team_status_idx
  on public.team_membership_proposals (team_id, status);
create index team_membership_proposals_candidate_status_idx
  on public.team_membership_proposals (candidate_user_id, status);
create index team_membership_proposals_initiated_by_idx
  on public.team_membership_proposals (initiated_by_user_id);
create index team_membership_votes_voter_user_id_idx
  on public.team_membership_votes (voter_user_id);
create index notifications_unread_user_created_idx
  on public.notifications (user_id, created_at desc)
  where read = false;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create function public.snapshot_proposal_vote_threshold()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_member_count integer;
  team_capacity integer;
begin
  select max_members
    into team_capacity
    from public.teams
    where id = new.team_id
    for update;

  if not found then
    raise exception 'Team % does not exist', new.team_id;
  end if;

  select count(*)::integer
    into current_member_count
    from public.team_members
    where team_id = new.team_id;

  if current_member_count = 0 then
    raise exception 'A membership proposal requires at least one current team member';
  end if;

  if current_member_count >= team_capacity then
    raise exception 'Team % is already at its maximum capacity', new.team_id;
  end if;

  if exists (
    select 1
    from public.team_members
    where team_id = new.team_id
      and user_id = new.candidate_user_id
  ) then
    raise exception 'Candidate % is already a member of team %',
      new.candidate_user_id, new.team_id;
  end if;

  new.required_yes_votes := (current_member_count / 2) + 1;
  return new;
end;
$$;

create trigger team_membership_proposals_snapshot_threshold
before insert on public.team_membership_proposals
for each row execute function public.snapshot_proposal_vote_threshold();

create function public.validate_proposal_resolution()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  accepting_vote_count integer;
begin
  if new.status = 'pending' then
    new.resolved_at := null;
    return new;
  end if;

  if new.status = 'accepted' then
    if new.candidate_response <> 'accepted' then
      raise exception 'Candidate must accept before proposal % can be accepted', new.id;
    end if;

    select count(*)::integer
      into accepting_vote_count
      from public.team_membership_votes
      where proposal_id = new.id
        and decision = 'accept';

    if accepting_vote_count < new.required_yes_votes then
      raise exception 'Proposal % requires % accepting votes but has %',
        new.id, new.required_yes_votes, accepting_vote_count;
    end if;
  end if;

  new.resolved_at := coalesce(new.resolved_at, now());
  return new;
end;
$$;

create trigger team_membership_proposals_validate_resolution
before insert or update of status, candidate_response
on public.team_membership_proposals
for each row execute function public.validate_proposal_resolution();

create function public.validate_team_member_admission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_member_count integer;
  team_capacity integer;
  team_creator uuid;
begin
  select max_members, created_by
    into team_capacity, team_creator
    from public.teams
    where id = new.team_id
    for update;

  if not found then
    raise exception 'Team % does not exist', new.team_id;
  end if;

  select count(*)::integer
    into current_member_count
    from public.team_members
    where team_id = new.team_id;

  if current_member_count >= team_capacity then
    raise exception 'Team % is already at its maximum capacity', new.team_id;
  end if;

  if current_member_count = 0 and new.user_id = team_creator then
    return new;
  end if;

  if not exists (
    select 1
    from public.team_membership_proposals proposal
    where proposal.team_id = new.team_id
      and proposal.candidate_user_id = new.user_id
      and proposal.status = 'accepted'
      and proposal.candidate_response = 'accepted'
      and (
        select count(*)
        from public.team_membership_votes vote
        where vote.proposal_id = proposal.id
          and vote.decision = 'accept'
      ) >= proposal.required_yes_votes
  ) then
    raise exception 'User % does not have an approved membership proposal for team %',
      new.user_id, new.team_id;
  end if;

  return new;
end;
$$;

create trigger team_members_validate_admission
before insert on public.team_members
for each row execute function public.validate_team_member_admission();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.snapshot_proposal_vote_threshold() from public, anon, authenticated;
revoke execute on function public.validate_proposal_resolution() from public, anon, authenticated;
revoke execute on function public.validate_team_member_admission() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.team_membership_proposals enable row level security;
alter table public.team_membership_votes enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;
revoke all on table public.swipes from anon, authenticated;
revoke all on table public.matches from anon, authenticated;
revoke all on table public.team_membership_proposals from anon, authenticated;
revoke all on table public.team_membership_votes from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;
grant select, insert on table public.team_members to authenticated;
grant select, insert, update, delete on table public.swipes to authenticated;
grant select on table public.matches to authenticated;
grant select on table public.team_membership_proposals to authenticated;
grant select on table public.team_membership_votes to authenticated;
grant select on table public.notifications to authenticated;
grant update (read) on table public.notifications to authenticated;

create policy profiles_authenticated_read
on public.profiles
for select
to authenticated
using (true);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

create policy teams_authenticated_read
on public.teams
for select
to authenticated
using (true);

create policy teams_insert_as_creator
on public.teams
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy teams_update_by_member_or_creator
on public.teams
for update
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.team_members
    where team_members.team_id = teams.id
      and team_members.user_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.team_members
    where team_members.team_id = teams.id
      and team_members.user_id = (select auth.uid())
  )
);

create policy teams_delete_by_creator
on public.teams
for delete
to authenticated
using (created_by = (select auth.uid()));

create policy team_members_authenticated_read
on public.team_members
for select
to authenticated
using (true);

create policy team_members_creator_bootstrap
on public.team_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.teams
    where teams.id = team_members.team_id
      and teams.created_by = (select auth.uid())
  )
  and not exists (
    select 1
    from public.team_members existing_member
    where existing_member.team_id = team_members.team_id
  )
);

create policy swipes_read_own
on public.swipes
for select
to authenticated
using (created_by_user_id = (select auth.uid()));

create policy swipes_insert_own_or_member_team
on public.swipes
for insert
to authenticated
with check (
  created_by_user_id = (select auth.uid())
  and (
    (actor_type = 'user' and actor_id = (select auth.uid()))
    or (
      actor_type = 'team'
      and exists (
        select 1
        from public.team_members
        where team_members.team_id = swipes.actor_id
          and team_members.user_id = (select auth.uid())
      )
    )
  )
);

create policy swipes_update_own_or_member_team
on public.swipes
for update
to authenticated
using (created_by_user_id = (select auth.uid()))
with check (
  created_by_user_id = (select auth.uid())
  and (
    (actor_type = 'user' and actor_id = (select auth.uid()))
    or (
      actor_type = 'team'
      and exists (
        select 1
        from public.team_members
        where team_members.team_id = swipes.actor_id
          and team_members.user_id = (select auth.uid())
      )
    )
  )
);

create policy swipes_delete_own
on public.swipes
for delete
to authenticated
using (created_by_user_id = (select auth.uid()));

create policy matches_read_participating
on public.matches
for select
to authenticated
using (
  user_1_id = (select auth.uid())
  or user_2_id = (select auth.uid())
);

create policy team_membership_proposals_read_involved
on public.team_membership_proposals
for select
to authenticated
using (
  candidate_user_id = (select auth.uid())
  or exists (
    select 1
    from public.team_members
    where team_members.team_id = team_membership_proposals.team_id
      and team_members.user_id = (select auth.uid())
  )
);

create policy team_membership_votes_read_by_team_members
on public.team_membership_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.team_membership_proposals
    join public.team_members
      on team_members.team_id = team_membership_proposals.team_id
    where team_membership_proposals.id = team_membership_votes.proposal_id
      and team_members.user_id = (select auth.uid())
  )
);

create policy notifications_read_own
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

create policy notifications_mark_own_read
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
