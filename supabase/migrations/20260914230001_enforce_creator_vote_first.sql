create or replace function public.cast_team_membership_vote(
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
  team_creator uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_decision not in ('accept', 'reject') then
    raise exception 'Decision must be accept or reject';
  end if;

  select team_id into proposal_team_id
  from public.team_membership_proposals
  where id = p_proposal_id;

  if not found then
    raise exception 'Membership proposal % does not exist', p_proposal_id;
  end if;

  select created_by into team_creator
  from public.teams
  where id = proposal_team_id
  for update;

  if not found then
    raise exception 'Team % does not exist', proposal_team_id;
  end if;

  if team_creator is null then
    raise exception 'Team % does not have a creator who can approve', proposal_team_id;
  end if;

  perform 1
  from public.team_membership_proposals
  where id = p_proposal_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Membership proposal % is no longer pending', p_proposal_id;
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = proposal_team_id
      and user_id = caller_id
  ) then
    raise exception 'Only current team members can vote on this proposal';
  end if;

  if caller_id <> team_creator and not exists (
    select 1
    from public.team_membership_votes
    where proposal_id = p_proposal_id
      and voter_user_id = team_creator
      and decision = 'accept'
  ) then
    raise exception 'The team creator must approve before other members can vote';
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

revoke execute on function public.cast_team_membership_vote(uuid, text)
from public, anon;
grant execute on function public.cast_team_membership_vote(uuid, text)
to authenticated;
