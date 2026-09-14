import { requireSupabase } from '@/shared/lib/supabase';

import type {
  CandidateResponse,
  ProfileSummary,
  ProposalDecision,
  ProposalType,
  ProposalWithDetails,
  Team,
  TeamDraft,
  TeamMember,
  TeamWithMembership,
} from './team-types';

function splitTechStack(value: string) {
  return [...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export async function getCurrentUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in before using team features.');
  return data.user.id;
}

export async function listMyTeams(): Promise<TeamWithMembership[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await requireSupabase()
    .from('team_members')
    .select('role, teams(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).flatMap((membership) => {
    const team = membership.teams as Team | null;
    return team ? [{ ...team, membershipRole: membership.role }] : [];
  });
}

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await requireSupabase()
    .from('teams')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTeamMemberCounts(teamIds: string[]) {
  if (!teamIds.length) return {} as Record<string, number>;

  const { data, error } = await requireSupabase()
    .from('team_members')
    .select('team_id')
    .in('team_id', teamIds);
  if (error) throw error;

  return (data ?? []).reduce<Record<string, number>>((counts, membership) => {
    counts[membership.team_id] = (counts[membership.team_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getTeam(teamId: string): Promise<Team> {
  const { data, error } = await requireSupabase()
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  if (error) throw error;
  return data;
}

export async function getTeamRoster(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await requireSupabase()
    .from('team_members')
    .select('*, profiles(id, display_name, avatar_url, preferred_roles, tech_stack)')
    .eq('team_id', teamId)
    .order('joined_at');
  if (error) throw error;

  return (data ?? []).map((member) => ({
    team_id: member.team_id,
    user_id: member.user_id,
    role: member.role,
    joined_at: member.joined_at,
    profile: member.profiles as ProfileSummary | null,
  }));
}

export async function createTeam(draft: TeamDraft) {
  const { data, error } = await requireSupabase().rpc('create_team_with_creator', {
    p_name: draft.name.trim(),
    p_description: draft.description,
    p_project_idea: draft.projectIdea,
    p_repo_url: draft.repoUrl,
    p_tech_stack: splitTechStack(draft.techStack),
    p_max_members: draft.maxMembers,
    p_creator_role: draft.creatorRole,
  });
  if (error) throw error;
  return data;
}

export async function updateTeam(teamId: string, draft: TeamDraft) {
  const { error } = await requireSupabase()
    .from('teams')
    .update({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      project_idea: draft.projectIdea.trim() || null,
      repo_url: draft.repoUrl.trim() || null,
      tech_stack: splitTechStack(draft.techStack),
      max_members: draft.maxMembers,
    })
    .eq('id', teamId);
  if (error) throw error;
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, display_name, avatar_url, preferred_roles, tech_stack')
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export async function createProposal(
  teamId: string,
  candidateUserId: string,
  proposalType: ProposalType,
) {
  const ensureApplicationConsent = async (proposalId: string) => {
    const { data: proposal, error: proposalError } = await requireSupabase()
      .from('team_membership_proposals')
      .select('status, candidate_response')
      .eq('id', proposalId)
      .single();
    if (proposalError) throw new Error(proposalError.message);

    // This keeps applications working before the accompanying database
    // migration is deployed. Applying is consent, so there is no second user
    // decision in the UI.
    if (proposal.status === 'pending' && proposal.candidate_response === 'pending') {
      const { error: responseError } = await requireSupabase().rpc(
        'respond_to_team_membership_proposal',
        { p_proposal_id: proposalId, p_response: 'accepted' },
      );
      if (responseError) throw new Error(responseError.message);
    }

    return proposalId;
  };

  if (proposalType === 'user_swiped_team') {
    const userId = await getCurrentUserId();
    if (candidateUserId !== userId) {
      throw new Error('You can only apply to a team as yourself.');
    }

    // Reopen an existing application after navigation or an interrupted request.
    const { data: existing, error: lookupError } = await requireSupabase()
      .from('team_membership_proposals')
      .select('id, candidate_response')
      .eq('team_id', teamId)
      .eq('candidate_user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing) return ensureApplicationConsent(existing.id);

    // Applying is an explicit expression of interest, just like liking a team
    // in discovery. Keep the backend prerequisite and admission checks intact.
    const { error: likeError } = await requireSupabase().from('swipes').upsert({
      actor_type: 'user',
      actor_id: userId,
      target_type: 'team',
      target_id: teamId,
      decision: 'like',
      created_by_user_id: userId,
    }, { onConflict: 'actor_type,actor_id,target_type,target_id' });
    if (likeError) throw new Error(likeError.message);
  }

  const { data, error } = await requireSupabase().rpc('create_team_membership_proposal', {
    p_team_id: teamId,
    p_candidate_user_id: candidateUserId,
    p_proposal_type: proposalType,
  });
  if (error) throw new Error(error.message);
  return proposalType === 'user_swiped_team' ? ensureApplicationConsent(data) : data;
}

const proposalSelect = `
  *,
  candidate:profiles!team_membership_proposals_candidate_user_id_fkey(
    id, display_name, avatar_url, preferred_roles, tech_stack
  ),
  team:teams(*),
  votes:team_membership_votes(*)
`;

export async function listTeamProposals(teamId: string): Promise<ProposalWithDetails[]> {
  const { data, error } = await requireSupabase()
    .from('team_membership_proposals')
    .select(proposalSelect)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProposalWithDetails[];
}

export async function listCandidateProposals(): Promise<ProposalWithDetails[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await requireSupabase()
    .from('team_membership_proposals')
    .select(proposalSelect)
    .eq('candidate_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProposalWithDetails[];
}

export async function getProposal(proposalId: string): Promise<ProposalWithDetails> {
  const { data, error } = await requireSupabase()
    .from('team_membership_proposals')
    .select(proposalSelect)
    .eq('id', proposalId)
    .single();
  if (error) throw error;
  const proposal = data as unknown as ProposalWithDetails;

  // Repair applications created before application-as-consent was introduced.
  // This is only attempted for the applicant who originally submitted it.
  if (
    proposal.proposal_type === 'user_swiped_team' &&
    proposal.status === 'pending' &&
    proposal.candidate_response === 'pending' &&
    proposal.candidate_user_id === await getCurrentUserId()
  ) {
    const { error: responseError } = await requireSupabase().rpc(
      'respond_to_team_membership_proposal',
      { p_proposal_id: proposalId, p_response: 'accepted' },
    );
    if (responseError) throw new Error(responseError.message);

    const { data: refreshed, error: refreshError } = await requireSupabase()
      .from('team_membership_proposals')
      .select(proposalSelect)
      .eq('id', proposalId)
      .single();
    if (refreshError) throw new Error(refreshError.message);
    return refreshed as unknown as ProposalWithDetails;
  }

  return proposal;
}

export async function isCurrentUserTeamMember(teamId: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await requireSupabase()
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function castProposalVote(proposalId: string, decision: ProposalDecision) {
  const { data, error } = await requireSupabase().rpc('cast_team_membership_vote', {
    p_proposal_id: proposalId,
    p_decision: decision,
  });
  if (error) throw error;
  return data;
}

export async function respondToProposal(proposalId: string, response: CandidateResponse) {
  const { data, error } = await requireSupabase().rpc('respond_to_team_membership_proposal', {
    p_proposal_id: proposalId,
    p_response: response,
  });
  if (error) throw error;
  return data;
}

const teamNotificationTypes = [
  'team_application_received',
  'team_proposal_received',
  'team_vote_needed',
  'team_candidate_accepted',
  'team_candidate_rejected',
  'team_member_joined',
  'team_proposal_closed_capacity',
];

export async function listTeamNotifications() {
  const userId = await getCurrentUserId();
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .in('type', teamNotificationTypes)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markTeamNotificationRead(notificationId: string) {
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}
