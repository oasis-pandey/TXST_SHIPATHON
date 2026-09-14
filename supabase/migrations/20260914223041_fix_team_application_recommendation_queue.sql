-- Team applications previously inserted the prerequisite swipe from the client.
-- That caused the recommendation dequeue trigger to execute as `authenticated`,
-- which intentionally has no DELETE grant on the backend-owned queue. Keep the
-- queue private and make the existing trusted proposal RPC own the whole write.
create or replace function public.create_team_membership_proposal(
  p_team_id uuid,
  p_candidate_user_id uuid,
  p_proposal_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  created_proposal_id uuid;
  caller_is_member boolean;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_proposal_type not in (
    'team_swiped_user',
    'user_swiped_team',
    'direct_invite',
    'teammate_match'
  ) then
    raise exception 'Unsupported proposal type %', p_proposal_type;
  end if;

  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Team % does not exist', p_team_id;
  end if;

  if not exists (select 1 from public.profiles where id = p_candidate_user_id) then
    raise exception 'Candidate profile % does not exist', p_candidate_user_id;
  end if;

  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = caller_id
  ) into caller_is_member;

  if p_proposal_type = 'user_swiped_team' then
    if caller_id <> p_candidate_user_id then
      raise exception 'Only the candidate can promote their team application';
    end if;

    insert into public.swipes (
      actor_type,
      actor_id,
      target_type,
      target_id,
      decision,
      created_by_user_id
    ) values (
      'user', caller_id, 'team', p_team_id, 'like', caller_id
    )
    on conflict (actor_type, actor_id, target_type, target_id)
    do update set
      decision = 'like',
      created_by_user_id = excluded.created_by_user_id,
      created_at = now();
  elsif not caller_is_member then
    raise exception 'Only current team members can start this proposal path';
  end if;

  if p_proposal_type = 'team_swiped_user' then
    insert into public.swipes (
      actor_type,
      actor_id,
      target_type,
      target_id,
      decision,
      created_by_user_id
    ) values (
      'team', p_team_id, 'user', p_candidate_user_id, 'like', caller_id
    )
    on conflict (actor_type, actor_id, target_type, target_id)
    do update set
      decision = 'like',
      created_by_user_id = excluded.created_by_user_id,
      created_at = now();
  elsif p_proposal_type = 'teammate_match' and not exists (
    select 1
    from public.matches
    where status = 'active'
      and user_1_id = least(caller_id, p_candidate_user_id)
      and user_2_id = greatest(caller_id, p_candidate_user_id)
  ) then
    raise exception 'An active match with the candidate is required for promotion';
  end if;

  insert into public.team_membership_proposals (
    team_id,
    candidate_user_id,
    proposal_type,
    initiated_by_user_id,
    required_yes_votes
  ) values (
    p_team_id,
    p_candidate_user_id,
    p_proposal_type,
    caller_id,
    1
  )
  returning id into created_proposal_id;

  if p_proposal_type = 'user_swiped_team' then
    insert into public.notifications (user_id, type, reference_id)
    select member.user_id, 'team_application_received', created_proposal_id
    from public.team_members member
    where member.team_id = p_team_id;
  else
    insert into public.notifications (user_id, type, reference_id)
    values (p_candidate_user_id, 'team_proposal_received', created_proposal_id);

    insert into public.notifications (user_id, type, reference_id)
    select member.user_id, 'team_vote_needed', created_proposal_id
    from public.team_members member
    where member.team_id = p_team_id;
  end if;

  return created_proposal_id;
end;
$$;

revoke execute on function public.create_team_membership_proposal(uuid, uuid, text)
  from public, anon;
grant execute on function public.create_team_membership_proposal(uuid, uuid, text)
  to authenticated;
