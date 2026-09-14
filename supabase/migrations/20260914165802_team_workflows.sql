-- Trusted team workflows. Existing row-level security policies are intentionally
-- unchanged; clients receive execute permission only on the four entry points.

create function public.create_team_with_creator(
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
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (select 1 from public.profiles where id = caller_id) then
    raise exception 'Create a profile before creating a team';
  end if;

  insert into public.teams (
    name,
    description,
    project_idea,
    repo_url,
    tech_stack,
    max_members,
    created_by
  ) values (
    p_name,
    nullif(btrim(p_description), ''),
    nullif(btrim(p_project_idea), ''),
    nullif(btrim(p_repo_url), ''),
    coalesce(p_tech_stack, '{}'),
    p_max_members,
    caller_id
  )
  returning id into created_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (created_team_id, caller_id, nullif(btrim(p_creator_role), ''));

  return created_team_id;
end;
$$;

create function public.finalize_team_membership_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposal public.team_membership_proposals%rowtype;
  proposal_team_id uuid;
  proposal_candidate_id uuid;
  team_capacity integer;
  current_member_count integer;
  accepting_vote_count integer;
begin
  -- Read identifiers first, then lock in one consistent order everywhere:
  -- team -> proposal. This serializes capacity and admission decisions.
  select team_id, candidate_user_id
    into proposal_team_id, proposal_candidate_id
    from public.team_membership_proposals
    where id = p_proposal_id;

  if not found then
    raise exception 'Membership proposal % does not exist', p_proposal_id;
  end if;

  select max_members
    into team_capacity
    from public.teams
    where id = proposal_team_id
    for update;

  if not found then
    raise exception 'Team % does not exist', proposal_team_id;
  end if;

  select *
    into proposal
    from public.team_membership_proposals
    where id = p_proposal_id
    for update;

  if proposal.status = 'accepted' then
    return exists (
      select 1
      from public.team_members
      where team_id = proposal.team_id
        and user_id = proposal.candidate_user_id
    );
  end if;

  if proposal.status <> 'pending' or proposal.candidate_response <> 'accepted' then
    return false;
  end if;

  select count(*)::integer
    into accepting_vote_count
    from public.team_membership_votes
    where proposal_id = proposal.id
      and decision = 'accept';

  -- Use the stored snapshot. Never derive the threshold from current membership.
  if accepting_vote_count < proposal.required_yes_votes then
    return false;
  end if;

  select count(*)::integer
    into current_member_count
    from public.team_members
    where team_id = proposal.team_id;

  if current_member_count >= team_capacity then
    update public.team_membership_proposals
      set status = 'rejected', resolved_at = now()
      where id = proposal.id;

    insert into public.notifications (user_id, type, reference_id)
    select proposal.candidate_user_id, 'team_proposal_closed_capacity', proposal.id
    union
    select member.user_id, 'team_proposal_closed_capacity', proposal.id
    from public.team_members member
    where member.team_id = proposal.team_id;

    return false;
  end if;

  update public.team_membership_proposals
    set status = 'accepted', resolved_at = now()
    where id = proposal.id;

  -- validate_team_member_admission is the final database guard and verifies the
  -- accepted proposal, candidate acceptance, stored vote threshold, and capacity.
  insert into public.team_members (team_id, user_id, role)
  values (proposal.team_id, proposal.candidate_user_id, null)
  on conflict (team_id, user_id) do nothing;

  insert into public.notifications (user_id, type, reference_id)
  select member.user_id, 'team_member_joined', proposal.id
  from public.team_members member
  where member.team_id = proposal.team_id
  on conflict do nothing;

  return true;
end;
$$;

create function public.prevent_proposal_vote_threshold_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.required_yes_votes is distinct from old.required_yes_votes then
    raise exception 'required_yes_votes is fixed when a proposal is created';
  end if;

  return new;
end;
$$;

create trigger team_membership_proposals_keep_vote_threshold
before update of required_yes_votes on public.team_membership_proposals
for each row execute function public.prevent_proposal_vote_threshold_update();

create function public.create_team_membership_proposal(
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

  -- Lock the team before creating the proposal so capacity is checked against a
  -- stable roster and uses the same lock order as final admission.
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

    if not exists (
      select 1
      from public.swipes
      where actor_type = 'user'
        and actor_id = caller_id
        and target_type = 'team'
        and target_id = p_team_id
        and decision = 'like'
        and created_by_user_id = caller_id
    ) then
      raise exception 'A user-to-team like is required before creating an application';
    end if;
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
    do update set decision = 'like', created_by_user_id = excluded.created_by_user_id,
      created_at = now();
  elsif p_proposal_type = 'teammate_match' and not exists (
    select 1
    from public.matches
    where status = 'active'
      and (
        (user_1_id = least(caller_id, p_candidate_user_id)
          and user_2_id = greatest(caller_id, p_candidate_user_id))
      )
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
    1 -- overwritten by snapshot_proposal_vote_threshold before constraints run
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

create function public.respond_to_team_membership_proposal(
  p_proposal_id uuid,
  p_response text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  proposal_team_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_response not in ('accepted', 'rejected') then
    raise exception 'Response must be accepted or rejected';
  end if;

  select team_id
    into proposal_team_id
    from public.team_membership_proposals
    where id = p_proposal_id and candidate_user_id = caller_id;

  if not found then
    raise exception 'Pending proposal % is not available to this candidate', p_proposal_id;
  end if;

  perform 1 from public.teams where id = proposal_team_id for update;
  perform 1
    from public.team_membership_proposals
    where id = p_proposal_id and candidate_user_id = caller_id and status = 'pending'
    for update;

  if not found then
    raise exception 'Pending proposal % is not available to this candidate', p_proposal_id;
  end if;

  update public.team_membership_proposals
    set candidate_response = p_response,
      status = case when p_response = 'rejected' then 'rejected' else status end
    where id = p_proposal_id;

  insert into public.notifications (user_id, type, reference_id)
  select member.user_id,
    case when p_response = 'accepted'
      then 'team_candidate_accepted'
      else 'team_candidate_rejected'
    end,
    p_proposal_id
  from public.team_members member
  where member.team_id = proposal_team_id;

  if p_response = 'rejected' then
    return false;
  end if;

  return public.finalize_team_membership_proposal(p_proposal_id);
end;
$$;

create function public.cast_team_membership_vote(
  p_proposal_id uuid,
  p_decision text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  proposal_team_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_decision not in ('accept', 'reject') then
    raise exception 'Decision must be accept or reject';
  end if;

  select team_id
    into proposal_team_id
    from public.team_membership_proposals
    where id = p_proposal_id;

  if not found then
    raise exception 'Membership proposal % does not exist', p_proposal_id;
  end if;

  perform 1 from public.teams where id = proposal_team_id for update;
  perform 1
    from public.team_membership_proposals
    where id = p_proposal_id and status = 'pending'
    for update;

  if not found then
    raise exception 'Membership proposal % is no longer pending', p_proposal_id;
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = proposal_team_id and user_id = caller_id
  ) then
    raise exception 'Only current team members can vote on this proposal';
  end if;

  insert into public.team_membership_votes (
    proposal_id,
    voter_user_id,
    decision
  ) values (
    p_proposal_id,
    caller_id,
    p_decision
  )
  on conflict (proposal_id, voter_user_id)
  do update set decision = excluded.decision, created_at = now();

  return public.finalize_team_membership_proposal(p_proposal_id);
end;
$$;

revoke execute on function public.create_team_with_creator(
  text, text, text, text, text[], integer, text
) from public, anon;
revoke execute on function public.create_team_membership_proposal(
  uuid, uuid, text
) from public, anon;
revoke execute on function public.respond_to_team_membership_proposal(
  uuid, text
) from public, anon;
revoke execute on function public.cast_team_membership_vote(
  uuid, text
) from public, anon;
revoke execute on function public.finalize_team_membership_proposal(uuid)
from public, anon, authenticated;
revoke execute on function public.prevent_proposal_vote_threshold_update()
from public, anon, authenticated;

grant execute on function public.create_team_with_creator(
  text, text, text, text, text[], integer, text
) to authenticated;
grant execute on function public.create_team_membership_proposal(
  uuid, uuid, text
) to authenticated;
grant execute on function public.respond_to_team_membership_proposal(
  uuid, text
) to authenticated;
grant execute on function public.cast_team_membership_vote(
  uuid, text
) to authenticated;
