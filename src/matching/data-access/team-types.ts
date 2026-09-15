import type { Tables } from '@/shared/types/database.types';

export type Team = Tables<'teams'>;
export type TeamMemberRow = Tables<'team_members'>;
export type TeamProposalRow = Tables<'team_membership_proposals'>;
export type TeamVoteRow = Tables<'team_membership_votes'>;
export type ProfileSummary = Pick<
  Tables<'profiles'>,
  'id' | 'display_name' | 'avatar_url' | 'preferred_roles' | 'tech_stack'
>;
export type ApplicantProfile = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'display_name'
  | 'avatar_url'
  | 'bio'
  | 'github_url'
  | 'skill_level'
  | 'availability'
  | 'preferred_roles'
  | 'tech_stack'
  | 'interests'
>;

export type ProposalType =
  | 'team_swiped_user'
  | 'user_swiped_team'
  | 'direct_invite'
  | 'teammate_match';

export type ProposalDecision = 'accept' | 'reject';
export type CandidateResponse = 'accepted' | 'rejected';

export type TeamWithMembership = Team & {
  membershipRole: string | null;
};

export type TeamMember = TeamMemberRow & {
  profile: ApplicantProfile | null;
};

export type ProposalWithDetails = Omit<TeamProposalRow, 'proposal_type'> & {
  proposal_type: ProposalType;
  candidate: ApplicantProfile | null;
  team: Team | null;
  votes: TeamVoteRow[];
};

export type TeamDraft = {
  name: string;
  description: string;
  projectIdea: string;
  repoUrl: string;
  techStack: string;
  maxMembers: 2 | 4;
  creatorRole: string;
};

export const proposalTypeLabels: Record<ProposalType, string> = {
  team_swiped_user: 'Team swipe',
  user_swiped_team: 'User application',
  direct_invite: 'Direct invite',
  teammate_match: 'Promote teammate match',
};

export const proposalTypeDescriptions: Record<ProposalType, string> = {
  team_swiped_user: 'Like a developer on behalf of this team and open a proposal.',
  user_swiped_team: 'Express interest in this team and send an application for member review.',
  direct_invite: 'Invite a developer directly, then collect member votes.',
  teammate_match: 'Promote your active one-to-one match into this team.',
};
