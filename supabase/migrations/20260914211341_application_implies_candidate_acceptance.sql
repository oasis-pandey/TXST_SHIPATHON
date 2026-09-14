-- Applying to a team is itself the candidate's affirmative consent. Existing
-- team members decide the application through team_membership_votes.
create function public.enforce_team_application_candidate_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.proposal_type = 'user_swiped_team' then
    if tg_op = 'UPDATE'
      and old.proposal_type = 'user_swiped_team'
      and new.candidate_response is distinct from 'accepted' then
      raise exception 'A team application already includes candidate acceptance';
    end if;

    new.candidate_response := 'accepted';
  end if;

  return new;
end;
$$;

create trigger team_membership_proposals_application_consent
before insert or update of proposal_type, candidate_response
on public.team_membership_proposals
for each row execute function public.enforce_team_application_candidate_consent();

update public.team_membership_proposals
set candidate_response = 'accepted'
where proposal_type = 'user_swiped_team'
  and status = 'pending'
  and candidate_response <> 'accepted';

revoke execute on function public.enforce_team_application_candidate_consent()
from public, anon, authenticated;
