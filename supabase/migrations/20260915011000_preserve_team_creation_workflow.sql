create or replace function public.create_team_with_initial_members(
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
  candidate_code text;
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

  loop
    candidate_code := lpad((floor(random() * 10000))::integer::text, 4, '0');
    begin
      insert into public.teams (
        name,
        description,
        project_idea,
        repo_url,
        tech_stack,
        max_members,
        created_by,
        match_id,
        join_code
      ) values (
        p_name,
        nullif(btrim(p_description), ''),
        nullif(btrim(p_project_idea), ''),
        nullif(btrim(p_repo_url), ''),
        coalesce(p_tech_stack, '{}'),
        p_max_members,
        p_creator_id,
        p_match_id,
        candidate_code
      )
      returning id into created_team_id;
      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

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