import { Link } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listCandidateProposals, listMyTeams, listTeams } from '@/features/teams/api';
import type { Team, TeamWithMembership } from '@/features/teams/types';
import {
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatusPill,
  TeamScreen,
  teamStyles,
} from '@/features/teams/ui';
import { useResource } from '@/features/teams/use-resource';
import { isSupabaseConfigured } from '@/lib/supabase';

type TeamsHomeData = {
  mine: TeamWithMembership[];
  discoverable: Team[];
  candidateProposals: Awaited<ReturnType<typeof listCandidateProposals>>;
};

export default function TeamsHomeScreen() {
  const loader = useCallback(async (): Promise<TeamsHomeData> => {
    const [mine, discoverable, candidateProposals] = await Promise.all([
      listMyTeams(),
      listTeams(),
      listCandidateProposals(),
    ]);
    return { mine, discoverable, candidateProposals };
  }, []);
  const resource = useResource(loader);

  if (!isSupabaseConfigured) {
    return (
      <TeamScreen>
        <SectionHeader title="Team HQ" />
        <ErrorState message="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable teams." />
      </TeamScreen>
    );
  }

  return (
    <TeamScreen>
      <View style={teamStyles.spread}>
        <View>
          <ThemedText type="subtitle">Team HQ</ThemedText>
          <ThemedText themeColor="textSecondary">Create, recruit, vote, and ship together.</ThemedText>
        </View>
        <Link href="/teams/new" asChild>
          <Button label="Create" onPress={() => {}} />
        </Link>
      </View>

      <View style={teamStyles.actions}>
        <Link href="/teams/notifications" asChild>
          <Button label="Notifications" tone="secondary" onPress={() => {}} />
        </Link>
      </View>

      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}

      {resource.data && (
        <>
          <Button
            label={resource.loading ? 'Refreshing…' : 'Refresh'}
            tone="secondary"
            disabled={resource.loading}
            onPress={() => void resource.refresh()}
          />
          <SectionHeader title="Your teams" />
          <View style={styles.list}>
            {resource.data.mine.length ? (
              resource.data.mine.map((team) => (
                <Link
                  key={team.id}
                  href={{ pathname: '/teams/[teamId]/index', params: { teamId: team.id } }}
                  asChild>
                  <Pressable>
                    <Card>
                      <ThemedText style={teamStyles.title}>{team.name}</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {team.membershipRole || 'Member'} · capacity {team.max_members}
                      </ThemedText>
                      <Chips values={team.tech_stack} />
                    </Card>
                  </Pressable>
                </Link>
              ))
            ) : (
              <EmptyState>You are not on a team yet.</EmptyState>
            )}
          </View>

          <SectionHeader title="Your invitations" />
          <View style={styles.list}>
            {resource.data.candidateProposals.length ? (
              resource.data.candidateProposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={{
                    pathname: '/teams/[teamId]/proposals/[proposalId]',
                    params: { teamId: proposal.team_id, proposalId: proposal.id },
                  }}
                  asChild>
                  <Pressable>
                    <Card>
                      <View style={teamStyles.spread}>
                        <ThemedText style={teamStyles.title}>
                          {proposal.team?.name ?? 'Team proposal'}
                        </ThemedText>
                        <StatusPill value={proposal.status} />
                      </View>
                      <ThemedText themeColor="textSecondary">
                        Candidate response: {proposal.candidate_response}
                      </ThemedText>
                    </Card>
                  </Pressable>
                </Link>
              ))
            ) : (
              <EmptyState>No invitations or applications to review.</EmptyState>
            )}
          </View>

          <SectionHeader title="Discover teams" />
          <View style={styles.list}>
            {resource.data.discoverable
              .filter((team) => !resource.data!.mine.some((mine) => mine.id === team.id))
              .map((team) => (
                <Card key={team.id}>
                  <ThemedText style={teamStyles.title}>{team.name}</ThemedText>
                  <ThemedText>
                    {team.description || team.project_idea || 'No description yet.'}
                  </ThemedText>
                  <Chips values={team.tech_stack} />
                  <Link
                    href={{
                      pathname: '/teams/[teamId]/proposals/new',
                      params: { teamId: team.id, path: 'user_swiped_team' },
                    }}
                    asChild>
                    <Button
                      label="Apply from my existing like"
                      tone="secondary"
                      onPress={() => {}}
                    />
                  </Link>
                </Card>
              ))}
          </View>
        </>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
