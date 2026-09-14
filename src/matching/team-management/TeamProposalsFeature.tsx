import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import { listTeamProposals } from '@/matching/data-access/team-service';
import { proposalTypeLabels } from '@/matching/data-access/team-types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatusPill,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

export default function TeamProposalsScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const loader = useCallback(() => listTeamProposals(teamId), [teamId]);
  const resource = useResource(loader);

  return (
    <TeamScreen>
      <SectionHeader
        title="Membership proposals"
        action={
          <Link
            href={{ pathname: '/teams/[teamId]/proposals/new', params: { teamId } }}
            asChild>
            <Button label="New" onPress={() => {}} />
          </Link>
        }
      />
      <ThemedText themeColor="textSecondary">
        Vote requirements are snapshots taken when each proposal is created.
      </ThemedText>
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && (
        <View style={styles.list}>
          {resource.data.length ? (
            resource.data.map((proposal) => {
              const yesVotes = proposal.votes.filter((vote) => vote.decision === 'accept').length;
              return (
                <Link
                  key={proposal.id}
                  href={{
                    pathname: '/teams/[teamId]/proposals/[proposalId]',
                    params: { teamId, proposalId: proposal.id },
                  }}
                  asChild>
                  <Pressable>
                    <Card>
                      <View style={teamStyles.spread}>
                        <ThemedText style={teamStyles.title}>
                          {proposal.candidate?.display_name ?? 'Candidate'}
                        </ThemedText>
                        <StatusPill value={proposal.status} />
                      </View>
                      <ThemedText type="smallBold">
                        {proposalTypeLabels[proposal.proposal_type]}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {yesVotes} / {proposal.required_yes_votes} yes votes · candidate{' '}
                        {proposal.candidate_response}
                      </ThemedText>
                    </Card>
                  </Pressable>
                </Link>
              );
            })
          ) : (
            <EmptyState>No membership proposals yet.</EmptyState>
          )}
        </View>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
