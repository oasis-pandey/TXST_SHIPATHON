import { Link } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import {
  getTeamMemberCounts,
  listCandidateProposals,
  listMyTeams,
  listTeamNotifications,
} from '@/matching/data-access/team-service';
import type { Team, TeamWithMembership } from '@/matching/data-access/team-types';
import {
  Button,
  CapacityBar,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  PageHero,
  SectionHeader,
  StatusPill,
  TeamGrid,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';
import { isSupabaseConfigured } from '@/shared/lib/supabase';

type TeamsHomeData = {
  mine: TeamWithMembership[];
  candidateProposals: Awaited<ReturnType<typeof listCandidateProposals>>;
  memberCounts: Record<string, number>;
  unreadNotifications: number;
};

function TeamCard({
  team,
  memberCount,
  relationship,
}: {
  team: Team;
  memberCount: number;
  relationship?: string | null;
}) {
  return (
    <Link
      href={{ pathname: '/teams/[teamId]', params: { teamId: team.id } }}
      asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${team.name}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.teamCard}>
          <View style={teamStyles.spread}>
            <View style={styles.teamHeading}>
              <ThemedText style={teamStyles.title} numberOfLines={1}>{team.name}</ThemedText>
              {relationship && (
                <ThemedText type="smallBold" style={styles.relationship}>{relationship}</ThemedText>
              )}
            </View>
            <ThemedText type="smallBold" style={styles.openLabel}>OPEN</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" numberOfLines={2} style={styles.summary}>
            {team.description || team.project_idea || 'This team is still shaping its project idea.'}
          </ThemedText>
          <Chips values={team.tech_stack.slice(0, 4)} />
          <View style={styles.cardFooter}>
            <CapacityBar current={memberCount} maximum={team.max_members} />
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function TeamsHomeScreen() {
  const loader = useCallback(async (): Promise<TeamsHomeData> => {
    const [mine, candidateProposals, notifications] = await Promise.all([
      listMyTeams(),
      listCandidateProposals(),
      listTeamNotifications(),
    ]);
    const memberCounts = await getTeamMemberCounts(mine.map((team) => team.id));

    return {
      mine,
      candidateProposals,
      memberCounts,
      unreadNotifications: notifications.filter((notification) => !notification.read).length,
    };
  }, []);
  const resource = useResource(loader);

  if (!isSupabaseConfigured) {
    return (
      <TeamScreen>
        <PageHero
          eyebrow="PairUp Teams"
          title="Build your crew"
          description="Create a team, find one to join, and keep every decision in one place."
        />
        <ErrorState message="Add the Supabase URL and publishable key to enable Teams." />
      </TeamScreen>
    );
  }

  const pendingProposals = resource.data?.candidateProposals.filter(
    (proposal) =>
      proposal.status === 'pending' &&
      proposal.proposal_type !== 'user_swiped_team' &&
      proposal.candidate_response === 'pending',
  ) ?? [];

  return (
    <TeamScreen>
      <PageHero
        eyebrow="PairUp Teams"
        title="Build your crew"
        description="Keep your current teams organized, handle invitations, and find the right project to join."
        action={
          <View style={styles.heroActions}>
            <Link href="/teams/find" asChild>
              <Button label="Find a team" onPress={() => {}} />
            </Link>
            <Link href="/teams/new" asChild>
              <Button label="Create a team" tone="secondary" onPress={() => {}} />
            </Link>
          </View>
        }
      />

      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && (
        <View style={styles.section}>
          <ErrorState message={resource.error} />
          <Button label="Try again" disabled={resource.loading}
            onPress={() => void resource.refresh()} />
        </View>
      )}

      {resource.data && (
        <>
          <View style={styles.summaryRow}>
            <Metric label="current teams" value={resource.data.mine.length} />
            <Metric label="needs your response" value={pendingProposals.length} />
            <Metric label="unread updates" value={resource.data.unreadNotifications} />
          </View>

          <View style={styles.toolbar}>
            <Link href="/teams/notifications" asChild>
              <Button
                label={resource.data.unreadNotifications
                  ? `Notifications (${resource.data.unreadNotifications})`
                  : 'Notifications'}
                tone="secondary"
                onPress={() => {}}
              />
            </Link>
            <Button
              label={resource.loading ? 'Refreshing…' : 'Refresh'}
              tone="secondary"
              disabled={resource.loading}
              onPress={() => void resource.refresh()}
            />
          </View>

          {pendingProposals.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Needs your attention" />
              <TeamGrid>
                {pendingProposals.map((proposal) => (
                  <Link
                    key={proposal.id}
                    href={{
                      pathname: '/teams/[teamId]/proposals/[proposalId]',
                      params: { teamId: proposal.team_id, proposalId: proposal.id },
                    }}
                    asChild>
                    <Pressable style={({ pressed }) => pressed && styles.pressed}>
                      <Card style={styles.attentionCard}>
                        <View style={teamStyles.spread}>
                          <ThemedText style={styles.cardTitle} numberOfLines={1}>
                            {proposal.team?.name ?? 'Team invitation'}
                          </ThemedText>
                          <StatusPill value={proposal.candidate_response} />
                        </View>
                        <ThemedText themeColor="textSecondary">
                          Review this membership request and choose whether you want to join.
                        </ThemedText>
                      </Card>
                    </Pressable>
                  </Link>
                ))}
              </TeamGrid>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader
              title="Your teams"
              action={
                <Link href="/teams/new" asChild>
                  <Button label="New team" tone="secondary" onPress={() => {}} />
                </Link>
              }
            />
            {resource.data.mine.length ? (
              <TeamGrid>
                {resource.data.mine.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    memberCount={resource.data!.memberCounts[team.id] ?? 0}
                    relationship={team.membershipRole || 'Member'}
                  />
                ))}
              </TeamGrid>
            ) : (
              <EmptyState>You are not on a team yet. Find one to join or create your own.</EmptyState>
            )}
          </View>
        </>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  section: { gap: Spacing.three },
  teamCard: { minHeight: 250 },
  teamHeading: { flex: 1, gap: Spacing.one },
  cardTitle: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  relationship: { color: '#2764B7' },
  openLabel: { color: '#2764B7', letterSpacing: 1 },
  summary: { lineHeight: 21 },
  cardFooter: { marginTop: 'auto' },
  attentionCard: { minHeight: 130, borderColor: 'rgba(224, 155, 61, 0.35)' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
