import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
          <Card>
            <View style={teamStyles.spread}>
              <ThemedText type="subtitle">
                {proposal.candidate?.display_name ?? 'Candidate'}
              </ThemedText>
              <StatusPill value={proposal.status} />
            </View>
            <ThemedText type="smallBold">
              {proposalTypeLabels[proposal.proposal_type]}
            </ThemedText>
            <Chips values={proposal.candidate?.tech_stack ?? []} />
            <ThemedText themeColor="textSecondary">
              {proposal.proposal_type === 'user_swiped_team'
                ? 'Applicant consent: given when they applied'
                : `Candidate response: ${proposal.candidate_response}`}
            </ThemedText>
          </Card>

          <SectionHeader title="Approval" />
          <Card>
            <ThemedText style={styles.voteCount}>
              {resource.data.member ? yesVotes : '—'} / {proposal.required_yes_votes} yes votes
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
              {' '}The {proposal.required_yes_votes}-vote requirement was fixed when this proposal was
              created and is never recomputed.
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
});
