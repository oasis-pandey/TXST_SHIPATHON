create function public.create_user_like_and_match(p_target_user_id uuid)
returns table (
  swipe_id uuid,
  target_user_id uuid,
  decision text,
  created_at timestamptz,
  matched boolean,
  match_created boolean,
  match_id uuid
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

  -- Serialize all work for this pair before either swipe is written. Locking in
  -- canonical order prevents deadlocks and ensures a concurrent opposite Like
  -- observes the first transaction after it commits.
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
    else
      select existing_match.id
      into active_match_id
      from public.matches as existing_match
      where existing_match.user_1_id = first_user_id
        and existing_match.user_2_id = second_user_id
        and existing_match.status = 'active';
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
    active_match_id;
end;
$$;

comment on function public.create_user_like_and_match(uuid) is
  'Atomically stores the authenticated user Like and creates one active canonical match when the reciprocal Like exists.';

revoke execute on function public.create_user_like_and_match(uuid)
from public, anon;

grant execute on function public.create_user_like_and_match(uuid)
to authenticated;
