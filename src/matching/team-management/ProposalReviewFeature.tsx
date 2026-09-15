import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/lib/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import {
  castProposalVote,
  getCurrentUserId,
  getProposal,
  isCurrentUserTeamMember,
  respondToProposal,
} from '@/matching/data-access/team-service';
import { proposalTypeLabels } from '@/matching/data-access/team-types';
import {
  Button,
  Card,
  Chips,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatusPill,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

export default function ProposalReviewScreen() {
  const { teamId, proposalId } = useLocalSearchParams<{
    teamId: string;
    proposalId: string;
  }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loader = useCallback(async () => {
    const [proposal, userId, member] = await Promise.all([
      getProposal(proposalId),
      getCurrentUserId(),
      isCurrentUserTeamMember(teamId),
    ]);
    return { proposal, userId, member };
  }, [proposalId, teamId]);
  const resource = useResource(loader);

  const runAction = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setActionError(null);
    try {
      await action();
      await resource.refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to update proposal.');
    } finally {
      setSaving(false);
    }
  };

  const proposal = resource.data?.proposal;
  const yesVotes = proposal?.votes.filter((vote) => vote.decision === 'accept').length ?? 0;
  const currentVote = proposal?.votes.find((vote) => vote.voter_user_id === resource.data?.userId);
  const isCandidate = proposal?.candidate_user_id === resource.data?.userId;
  const isCreator = proposal?.team?.created_by === resource.data?.userId;
  const creatorVote = proposal?.votes.find(
    (vote) => vote.voter_user_id === proposal.team?.created_by,
  );
  const creatorApproved = creatorVote?.decision === 'accept';
  const canCurrentUserVote = resource.data?.member && (isCreator || creatorApproved);

  return (
    <TeamScreen>
      {proposal && <Stack.Screen options={{ title: proposal.candidate?.display_name ?? 'Proposal' }} />}
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {proposal && resource.data && (
        <>
          <SectionHeader
            title={proposal.proposal_type === 'user_swiped_team' ? 'Applicant profile' : 'Candidate profile'}
          />
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {proposal.candidate?.avatar_url ? (
                <Image
                  source={{ uri: proposal.candidate.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                  accessibilityLabel={`${proposal.candidate.display_name}'s profile picture`}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <ThemedText style={styles.avatarInitial}>
                    {(proposal.candidate?.display_name ?? 'A').slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.profileHeading}>
                <View style={teamStyles.spread}>
                  <ThemedText type="subtitle">
                    {proposal.candidate?.display_name ?? 'Candidate'}
                  </ThemedText>
                  <StatusPill value={proposal.status} />
                </View>
                <ThemedText themeColor="textSecondary">
                  {proposal.candidate?.skill_level || 'Skill level not provided'}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="smallBold">
              {proposalTypeLabels[proposal.proposal_type]}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {proposal.candidate?.bio || 'This applicant has not added a bio yet.'}
            </ThemedText>
            <View style={styles.profileDetails}>
              <View style={styles.profileDetail}>
                <ThemedText type="smallBold">Availability</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {proposal.candidate?.availability || 'Not provided'}
                </ThemedText>
              </View>
              <View style={styles.profileDetail}>
                <ThemedText type="smallBold">Preferred roles</ThemedText>
                <Chips values={proposal.candidate?.preferred_roles ?? []} />
                {!proposal.candidate?.preferred_roles.length && (
                  <ThemedText themeColor="textSecondary">Not provided</ThemedText>
                )}
              </View>
            </View>
            <View style={styles.profileDetail}>
              <ThemedText type="smallBold">Tech stack</ThemedText>
              <Chips values={proposal.candidate?.tech_stack ?? []} />
              {!proposal.candidate?.tech_stack.length && (
                <ThemedText themeColor="textSecondary">Not provided</ThemedText>
              )}
            </View>
            <View style={styles.profileDetail}>
              <ThemedText type="smallBold">Interests</ThemedText>
              <Chips values={proposal.candidate?.interests ?? []} />
              {!proposal.candidate?.interests.length && (
                <ThemedText themeColor="textSecondary">Not provided</ThemedText>
              )}
            </View>
            {proposal.candidate?.github_url && (
              <Button
                label="Open GitHub profile"
                tone="secondary"
                onPress={() => void Linking.openURL(proposal.candidate!.github_url!)}
              />
            )}
          </Card>

          <SectionHeader title="Voting" />
          <Card>
            <ThemedText style={styles.voteCount}>
              {resource.data.member ? yesVotes : 0} / {proposal.required_yes_votes} yes votes
            </ThemedText>
            <View style={teamStyles.spread}>
              <ThemedText type="smallBold">Creator approval</ThemedText>
              <ThemedText type="smallBold">
                {creatorVote?.decision === 'accept'
                  ? 'Approved'
                  : creatorVote?.decision === 'reject'
                    ? 'Rejected'
                    : 'Waiting'}
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary">
              {proposal.required_yes_votes === 1
                ? 'The team creator must approve this application.'
                : 'The creator must approve, and more than half of the team must vote yes.'}
            </ThemedText>
            {resource.data.member && !isCreator && !creatorApproved && proposal.status === 'pending' && (
              <ThemedText type="smallBold">
                Waiting for the team creator before member voting opens.
              </ThemedText>
            )}
            {canCurrentUserVote && proposal.status === 'pending' && (
              <View style={teamStyles.actions}>
                <Button
                  label={currentVote?.decision === 'accept'
                    ? 'Accepted'
                    : isCreator
                      ? 'Approve as creator'
                    : proposal.proposal_type === 'user_swiped_team'
                      ? 'Accept applicant'
                      : 'Vote yes'}
                  onPress={() => void runAction(() => castProposalVote(proposalId, 'accept'))}
                  disabled={saving}
                />
                <Button
                  label={currentVote?.decision === 'reject'
                    ? 'Rejected'
                    : isCreator
                      ? 'Reject as creator'
                    : proposal.proposal_type === 'user_swiped_team'
                      ? 'Reject applicant'
                      : 'Vote no'}
                  tone="danger"
                  onPress={() => void runAction(() => castProposalVote(proposalId, 'reject'))}
                  disabled={saving}
                />
              </View>
            )}
          </Card>

          {isCandidate &&
            proposal.proposal_type !== 'user_swiped_team' &&
            proposal.status === 'pending' &&
            proposal.candidate_response === 'pending' && (
            <>
              <SectionHeader title="Your response" />
              <Card>
                <ThemedText>Accept the team proposal or decline it.</ThemedText>
                <View style={teamStyles.actions}>
                  <Button
                    label="Accept proposal"
                    onPress={() =>
                      void runAction(() => respondToProposal(proposalId, 'accepted'))
                    }
                    disabled={saving}
                  />
                  <Button
                    label="Decline"
                    tone="danger"
                    onPress={() =>
                      void runAction(() => respondToProposal(proposalId, 'rejected'))
                    }
                    disabled={saving}
                  />
                </View>
              </Card>
            </>
          )}

          {actionError && <ErrorState message={actionError} />}
        </>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({
  voteCount: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  profileCard: { gap: Spacing.three },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  profileHeading: { flex: 1, gap: Spacing.one },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C87F7',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  profileDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  profileDetail: { flex: 1, minWidth: 180, gap: Spacing.one },
});
