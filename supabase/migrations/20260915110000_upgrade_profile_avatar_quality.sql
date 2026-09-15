create or replace function public.assign_default_profile_avatar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  avatar_number integer;
begin
  if new.avatar_url is null then
    avatar_number := 1 + (get_byte(decode(md5(new.id::text), 'hex'), 0) % 70);
    new.avatar_url := 'https://i.pravatar.cc/512?img=' || avatar_number::text;
  end if;
  return new;
end;
$$;

with numbered_profiles as (
  select
    id,
    row_number() over (order by display_name, id)::integer as profile_number
  from public.profiles
)
update public.profiles as profiles
set avatar_url = 'https://i.pravatar.cc/512?img=' ||
  (1 + ((numbered_profiles.profile_number - 1) % 70))::text
from numbered_profiles
where profiles.id = numbered_profiles.id;
