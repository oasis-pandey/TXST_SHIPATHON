alter table public.teams
add column match_id uuid
  references public.matches (id) on delete set null;

alter table public.teams
add constraint teams_match_id_unique unique (match_id);

comment on column public.teams.match_id is
  'The canonical user match that automatically created this team. Null for manually created teams.';

-- The match linkage is backend-owned. Manual team creation already uses
-- create_team_with_creator, so authenticated clients do not need direct INSERT.
revoke insert on table public.teams from authenticated;

create function public.create_team_with_initial_members(
  p_name text,
  p_description text,
  p_project_idea text,
  p_repo_url text,
  p_tech_stack text[],
  p_max_members integer,
  p_creator_role text,
  p_creator_id uuid,
  p_initial_member_ids uuid[],
  p_match_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  created_team_id uuid;
  initial_member_id uuid;
  distinct_initial_member_count integer;
begin
  if p_creator_id is null
    or not exists (select 1 from public.profiles where id = p_creator_id)
  then
    raise exception 'Create a profile before creating a team';
  end if;

  select count(distinct member_id)::integer
    into distinct_initial_member_count
    from unnest(coalesce(p_initial_member_ids, '{}'::uuid[]))
      as initial_members(member_id);

  if distinct_initial_member_count = 0
    or not (p_creator_id = any(coalesce(p_initial_member_ids, '{}'::uuid[])))
  then
    raise exception 'The team creator must be an initial member';
  end if;

  if distinct_initial_member_count > p_max_members then
    raise exception 'Initial membership exceeds team capacity';
  end if;

  if p_match_id is null then
    if distinct_initial_member_count <> 1 then
      raise exception 'A manually created team must begin with only its creator';
    end if;
  elsif distinct_initial_member_count <> 2 or not exists (
    select 1
    from public.matches as source_match
    where source_match.id = p_match_id
      and source_match.status = 'active'
      and source_match.user_1_id = any(p_initial_member_ids)
      and source_match.user_2_id = any(p_initial_member_ids)
      and p_creator_id in (source_match.user_1_id, source_match.user_2_id)
  ) then
    raise exception 'A match-created team must begin with both matched users';
  end if;

  insert into public.teams (
    name,
    description,
    project_idea,
    repo_url,
    tech_stack,
    max_members,
    created_by,
    match_id
  ) values (
    p_name,
    nullif(btrim(p_description), ''),
    nullif(btrim(p_project_idea), ''),
    nullif(btrim(p_repo_url), ''),
    coalesce(p_tech_stack, '{}'),
    p_max_members,
    p_creator_id,
    p_match_id
  )
  returning id into created_team_id;

  -- Creator bootstrap remains the first admission, as required by the existing
  -- team membership guard.
  insert into public.team_members (team_id, user_id, role)
  values (created_team_id, p_creator_id, nullif(btrim(p_creator_role), ''));

  for initial_member_id in
    select distinct member_id
    from unnest(p_initial_member_ids) as initial_members(member_id)
    where member_id <> p_creator_id
  loop
    insert into public.team_members (team_id, user_id, role)
    values (created_team_id, initial_member_id, null);
  end loop;

  return created_team_id;
end;
$$;

revoke execute on function public.create_team_with_initial_members(
  text, text, text, text, text[], integer, text, uuid, uuid[], uuid
) from public, anon, authenticated;

create or replace function public.validate_team_member_admission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_member_count integer;
  team_capacity integer;
  team_creator uuid;
  source_match_id uuid;
begin
  select max_members, created_by, match_id
    into team_capacity, team_creator, source_match_id
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

  -- The second initial member of an automatically created team is admitted by
  -- the active canonical match. Future members still require a normal accepted
  -- proposal and creator-approved vote.
  if source_match_id is not null and exists (
    select 1
    from public.matches as source_match
    where source_match.id = source_match_id
      and source_match.status = 'active'
      and new.user_id in (source_match.user_1_id, source_match.user_2_id)
      and team_creator in (source_match.user_1_id, source_match.user_2_id)
  ) then
    return new;
  end if;

  if not exists (
    select 1
    from public.team_membership_proposals proposal
    where proposal.team_id = new.team_id
      and proposal.candidate_user_id = new.user_id
      and proposal.status = 'accepted'
      and proposal.candidate_response = 'accepted'
      and exists (
        select 1
        from public.team_membership_votes creator_vote
        where creator_vote.proposal_id = proposal.id
          and creator_vote.voter_user_id = team_creator
          and creator_vote.decision = 'accept'
      )
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

create or replace function public.create_team_with_creator(
  p_name text,
  p_description text default null,
  p_project_idea text default null,
  p_repo_url text default null,
  p_tech_stack text[] default '{}',
  p_max_members integer default 4,
  p_creator_role text default 'Creator'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  return public.create_team_with_initial_members(
    p_name,
    p_description,
    p_project_idea,
    p_repo_url,
    p_tech_stack,
    p_max_members,
    p_creator_role,
    caller_id,
    array[caller_id],
    null
  );
end;
$$;

drop function public.create_user_like_and_match(uuid);

create function public.create_user_like_and_match(p_target_user_id uuid)
returns table (
  swipe_id uuid,
  target_user_id uuid,
  decision text,
  created_at timestamptz,
  matched boolean,
  match_created boolean,
  match_id uuid,
  team_created boolean,
  team_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  first_user_id uuid;
  second_user_id uuid;
  locked_profile_count integer;
  saved_swipe public.swipes%rowtype;
  created_match_id uuid;
  active_match_id uuid;
  created_team_id uuid;
  active_team_id uuid;
  first_display_name text;
  second_display_name text;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_target_user_id is null then
    raise exception 'Target profile does not exist';
  end if;

  if caller_id = p_target_user_id then
    raise exception 'You cannot Like your own developer profile';
  end if;

  first_user_id := least(caller_id, p_target_user_id);
  second_user_id := greatest(caller_id, p_target_user_id);

  perform profile.id
  from public.profiles as profile
  where profile.id in (first_user_id, second_user_id)
  order by profile.id
  for update;

  get diagnostics locked_profile_count = row_count;

  if locked_profile_count <> 2 then
    if not exists (
      select 1 from public.profiles as profile where profile.id = caller_id
    ) then
      raise exception 'Create a profile before Liking a developer';
    end if;

    raise exception 'Target profile does not exist';
  end if;

  insert into public.swipes (
    actor_type,
    actor_id,
    target_type,
    target_id,
    decision,
    created_by_user_id,
    created_at
  ) values (
    'user',
    caller_id,
    'user',
    p_target_user_id,
    'like',
    caller_id,
    now()
  )
  on conflict (actor_type, actor_id, target_type, target_id)
  do update set
    decision = excluded.decision,
    created_by_user_id = excluded.created_by_user_id,
    created_at = excluded.created_at
  returning * into saved_swipe;

  if exists (
    select 1
    from public.swipes as reciprocal
    where reciprocal.actor_type = 'user'
      and reciprocal.actor_id = p_target_user_id
      and reciprocal.target_type = 'user'
      and reciprocal.target_id = caller_id
      and reciprocal.decision = 'like'
  ) then
    insert into public.matches (user_1_id, user_2_id, status)
    values (first_user_id, second_user_id, 'active')
    on conflict (user_1_id, user_2_id) do nothing
    returning id into created_match_id;

    if created_match_id is not null then
      active_match_id := created_match_id;

      select
        max(profile.display_name) filter (where profile.id = first_user_id),
        max(profile.display_name) filter (where profile.id = second_user_id)
      into first_display_name, second_display_name
      from public.profiles as profile
      where profile.id in (first_user_id, second_user_id);

      created_team_id := public.create_team_with_initial_members(
        format('%s + %s', first_display_name, second_display_name),
        null,
        null,
        null,
        '{}',
        4,
        'Creator',
        caller_id,
        array[caller_id, p_target_user_id],
        created_match_id
      );
      active_team_id := created_team_id;
    else
      select existing_match.id
        into active_match_id
        from public.matches as existing_match
        where existing_match.user_1_id = first_user_id
          and existing_match.user_2_id = second_user_id
          and existing_match.status = 'active';

      select existing_team.id
        into active_team_id
        from public.teams as existing_team
        where existing_team.match_id = active_match_id;
    end if;
  end if;

  return query
  select
    saved_swipe.id,
    saved_swipe.target_id,
    saved_swipe.decision,
    saved_swipe.created_at,
    active_match_id is not null,
    created_match_id is not null,
    active_match_id,
    created_team_id is not null,
    active_team_id;
end;
$$;

comment on function public.create_user_like_and_match(uuid) is
  'Atomically stores the authenticated user Like and creates one active canonical match and one standard-capacity team when the reciprocal Like exists.';

revoke execute on function public.create_user_like_and_match(uuid)
from public, anon;

grant execute on function public.create_user_like_and_match(uuid)
to authenticated;
