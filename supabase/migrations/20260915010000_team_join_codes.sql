alter table public.teams
  add column join_code text;

do $$
declare
  team_record record;
  candidate_code text;
begin
  for team_record in
    select id from public.teams where join_code is null
  loop
    loop
      candidate_code := lpad((floor(random() * 10000))::integer::text, 4, '0');
      exit when not exists (
        select 1 from public.teams where join_code = candidate_code
      );
    end loop;

    update public.teams
      set join_code = candidate_code
      where id = team_record.id;
  end loop;
end;
$$;

alter table public.teams
  alter column join_code set not null;

alter table public.teams
  add constraint teams_join_code_format_check check (join_code ~ '^[0-9]{4}$');

create unique index teams_join_code_idx on public.teams (join_code);

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
  created_team_id uuid;
  candidate_code text;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (select 1 from public.profiles where id = caller_id) then
    raise exception 'Create a profile before creating a team';
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
        join_code
      ) values (
        p_name,
        nullif(btrim(p_description), ''),
        nullif(btrim(p_project_idea), ''),
        nullif(btrim(p_repo_url), ''),
        coalesce(p_tech_stack, '{}'),
        p_max_members,
        caller_id,
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
  values (created_team_id, caller_id, nullif(btrim(p_creator_role), ''));

  return created_team_id;
end;
$$;

create function public.join_team_by_code(p_join_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_code text := btrim(p_join_code);
  target_team public.teams%rowtype;
  member_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if normalized_code !~ '^[0-9]{4}$' then
    raise exception 'Enter a four-digit team code';
  end if;

  select *
    into target_team
    from public.teams
    where join_code = normalized_code
    for update;

  if not found then
    raise exception 'No team was found with that code';
  end if;

  if exists (
    select 1
    from public.team_members
    where team_id = target_team.id and user_id = caller_id
  ) then
    return target_team.id;
  end if;

  select count(*)::integer
    into member_count
    from public.team_members
    where team_id = target_team.id;

  if member_count >= target_team.max_members then
    raise exception 'That team is full';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (target_team.id, caller_id, 'Member');

  return target_team.id;
end;
$$;

revoke execute on function public.join_team_by_code(text) from public, anon;
grant execute on function public.join_team_by_code(text) to authenticated;