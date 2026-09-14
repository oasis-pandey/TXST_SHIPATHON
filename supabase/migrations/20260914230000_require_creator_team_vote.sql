-- Require team creator approval in addition to the snapshotted majority.

create or replace function public.validate_proposal_resolution()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  accepting_vote_count integer;
  team_creator uuid;
begin
  if new.status = 'pending' then
    new.resolved_at := null;
    return new;
  end if;

  if new.status = 'accepted' then
    if new.candidate_response <> 'accepted' then
      raise exception 'Candidate must accept before proposal % can be accepted', new.id;
    end if;

    select created_by into team_creator
    from public.teams
    where id = new.team_id;

    if team_creator is null or not exists (
      select 1
      from public.team_membership_votes
      where proposal_id = new.id
        and voter_user_id = team_creator
        and decision = 'accept'
    ) then
      raise exception 'Team creator must approve proposal % before it can be accepted', new.id;
    end if;

    select count(*)::integer into accepting_vote_count
    from public.team_membership_votes
    where proposal_id = new.id
      and decision = 'accept';

    if accepting_vote_count < new.required_yes_votes then
      raise exception 'Proposal % requires % accepting votes but has %',
        new.id, new.required_yes_votes, accepting_vote_count;
    end if;
  end if;

  new.resolved_at := coalesce(new.resolved_at, now());
  return new;
end;
$$;

create or replace function public.validate_team_member_admission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_member_count integer;
  team_capacity integer;
  team_creator uuid;
begin
  select max_members, created_by
    into team_capacity, team_creator
    from public.teams
    where id = new.team_id
    for update;

  if not found then
    raise exception 'Team % does not exist', new.team_id;
  end if;

  select count(*)::integer into current_member_count
  from public.team_members
  where team_id = new.team_id;

  if current_member_count >= team_capacity then
    raise exception 'Team % is already at its maximum capacity', new.team_id;
  end if;

  if current_member_count = 0 and new.user_id = team_creator then
    return new;
  end if;

  if not exists (
    select 1
    from public.team_membership_proposals proposal
    where proposal.team_id = new.team_id
      and proposal.candidate_user_id = new.user_id
      and proposal.status = 'accepted'
      and proposal.candidate_response = 'accepted'
      and exists (
        select 1
        from public.team_membership_votes creator_vote
        where creator_vote.proposal_id = proposal.id
          and creator_vote.voter_user_id = team_creator
          and creator_vote.decision = 'accept'
      )
      and (
        select count(*)
        from public.team_membership_votes vote
        where vote.proposal_id = proposal.id
          and vote.decision = 'accept'
      ) >= proposal.required_yes_votes
  ) then
    raise exception 'User % does not have an approved membership proposal for team %',
      new.user_id, new.team_id;
  end if;

  return new;
end;
$$;

create or replace function public.finalize_team_membership_proposal(p_proposal_id uuid)
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
  team_creator uuid;
  current_member_count integer;
  accepting_vote_count integer;
begin
  select team_id, candidate_user_id
    into proposal_team_id, proposal_candidate_id
    from public.team_membership_proposals
    where id = p_proposal_id;

  if not found then
    raise exception 'Membership proposal % does not exist', p_proposal_id;
  end if;

  select max_members, created_by
    into team_capacity, team_creator
    from public.teams
    where id = proposal_team_id
    for update;

  if not found then
    raise exception 'Team % does not exist', proposal_team_id;
  end if;

  select * into proposal
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

  if team_creator is null or not exists (
    select 1
    from public.team_membership_votes
    where proposal_id = proposal.id
      and voter_user_id = team_creator
      and decision = 'accept'
  ) then
    return false;
  end if;

  select count(*)::integer into accepting_vote_count
  from public.team_membership_votes
  where proposal_id = proposal.id
    and decision = 'accept';

  -- Use the stored snapshot. Never derive the threshold from current membership.
  if accepting_vote_count < proposal.required_yes_votes then
    return false;
  end if;

  select count(*)::integer into current_member_count
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

  -- This trigger-backed insert is the final trusted admission boundary.
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

revoke execute on function public.validate_proposal_resolution()
from public, anon, authenticated;
revoke execute on function public.validate_team_member_admission()
from public, anon, authenticated;
revoke execute on function public.finalize_team_membership_proposal(uuid)
from public, anon, authenticated;
