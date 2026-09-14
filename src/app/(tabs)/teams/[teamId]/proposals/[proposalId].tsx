import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  castProposalVote,
  getCurrentUserId,
  getProposal,
  isCurrentUserTeamMember,
  respondToProposal,
} from '@/features/teams/api';
import { proposalTypeLabels } from '@/features/teams/types';
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
} from '@/features/teams/ui';
import { useResource } from '@/features/teams/use-resource';

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
              Candidate response: {proposal.candidate_response}
            </ThemedText>
          </Card>

          <SectionHeader title="Approval" />
          <Card>
            <ThemedText style={styles.voteCount}>
              {resource.data.member ? yesVotes : '—'} / {proposal.required_yes_votes} yes votes
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              The required count was fixed when this proposal was created and is never recomputed.
            </ThemedText>
            {resource.data.member && proposal.status === 'pending' && (
              <View style={teamStyles.actions}>
                <Button
                  label={currentVote?.decision === 'accept' ? 'Voted yes' : 'Vote yes'}
                  onPress={() => void runAction(() => castProposalVote(proposalId, 'accept'))}
                  disabled={saving}
                />
                <Button
                  label={currentVote?.decision === 'reject' ? 'Voted no' : 'Vote no'}
                  tone="danger"
                  onPress={() => void runAction(() => castProposalVote(proposalId, 'reject'))}
                  disabled={saving}
                />
              </View>
            )}
          </Card>

          {isCandidate && proposal.status === 'pending' && proposal.candidate_response === 'pending' && (
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
