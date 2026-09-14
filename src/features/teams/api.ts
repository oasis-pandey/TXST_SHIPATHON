import { requireSupabase } from '@/lib/supabase';

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
} from './types';

function splitTechStack(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
  const { data, error } = await requireSupabase().rpc('create_team_membership_proposal', {
    p_team_id: teamId,
    p_candidate_user_id: candidateUserId,
    p_proposal_type: proposalType,
  });
  if (error) throw error;
  return data;
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
  return data as unknown as ProposalWithDetails;
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
