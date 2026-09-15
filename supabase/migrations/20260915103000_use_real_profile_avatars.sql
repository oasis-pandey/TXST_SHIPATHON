create or replace function public.assign_default_profile_avatar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  avatar_number integer;
  avatar_gender text;
begin
  if new.avatar_url is null then
    avatar_number := 1 + (get_byte(decode(md5(new.id::text), 'hex'), 0) % 99);
    avatar_gender := case
      when get_byte(decode(md5(new.id::text), 'hex'), 1) % 2 = 0 then 'men'
      else 'women'
    end;
    new.avatar_url := 'https://randomuser.me/api/portraits/'
      || avatar_gender || '/' || avatar_number::text || '.jpg';
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
set avatar_url = 'https://randomuser.me/api/portraits/' ||
  case (numbered_profiles.profile_number % 2)
    when 0 then 'men'
    else 'women'
  end ||
  '/' ||
  (1 + (numbered_profiles.profile_number % 99))::text ||
  '.jpg'
from numbered_profiles
where profiles.id = numbered_profiles.id;
