revoke update on table public.teams from authenticated;

grant update (
  name,
  description,
  project_idea,
  repo_url,
  tech_stack,
  max_members
) on table public.teams to authenticated;

create function public.validate_team_capacity_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_member_count integer;
begin
  select count(*)::integer
    into current_member_count
    from public.team_members
    where team_id = new.id;

  if new.max_members < current_member_count then
    raise exception 'Team % has % members and cannot have capacity %',
      new.id, current_member_count, new.max_members;
  end if;

  return new;
end;
$$;

create trigger teams_validate_capacity_update
before update of max_members on public.teams
for each row execute function public.validate_team_capacity_update();

revoke execute on function public.validate_team_capacity_update()
from public, anon, authenticated;
