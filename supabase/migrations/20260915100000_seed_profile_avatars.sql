create or replace function public.assign_default_profile_avatar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.avatar_url is null then
    new.avatar_url := 'https://api.dicebear.com/9.x/avataaars/png?seed='
      || new.id::text;
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_default_profile_avatar() from public;

drop trigger if exists profiles_assign_default_avatar on public.profiles;
create trigger profiles_assign_default_avatar
before insert or update of avatar_url on public.profiles
for each row
execute function public.assign_default_profile_avatar();

update public.profiles
set avatar_url = 'https://api.dicebear.com/9.x/avataaars/png?seed='
  || id::text
where avatar_url is null;
