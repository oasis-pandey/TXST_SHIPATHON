import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import {
  getTeam,
  getTeamRoster,
  isCurrentUserTeamMember,
  listTeamProposals,
} from '@/matching/data-access/team-service';
import {
  Button,
  CapacityBar,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHero,
  SectionHeader,
  StatusPill,
  TeamGrid,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const loader = useCallback(async () => {
    const [team, roster, isMember] = await Promise.all([
      getTeam(teamId),
      getTeamRoster(teamId),
      isCurrentUserTeamMember(teamId),
    ]);
    const proposals = isMember ? await listTeamProposals(teamId) : [];
    return { team, roster, isMember, proposals };
  }, [teamId]);
  const resource = useResource(loader);
  const pendingVotes = resource.data?.proposals.filter(
    (proposal) => proposal.status === 'pending',
  ) ?? [];

  return (
    <TeamScreen>
      {resource.data && <Stack.Screen options={{ title: resource.data.team.name }} />}
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && (
        <>
          <PageHero
            eyebrow={resource.data.isMember ? 'Your team' : 'Team profile'}
            title={resource.data.team.name}
            description={
              resource.data.team.description || 'This team has not added a description yet.'
            }
          />

          <Card style={styles.overviewCard}>
            <View style={styles.overviewColumn}>
              <ThemedText type="smallBold">Project</ThemedText>
              <ThemedText themeColor="textSecondary">
                {resource.data.team.project_idea || 'The project idea is still being shaped.'}
              </ThemedText>
            </View>
            <Chips values={resource.data.team.tech_stack} />
            <CapacityBar
              current={resource.data.roster.length}
              maximum={resource.data.team.max_members}
            />
            <View style={styles.codeBlock}>
              <ThemedText type="smallBold">Team code</ThemedText>
              <ThemedText type="subtitle" style={styles.code}>{resource.data.team.join_code}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Share this four-digit code with people you want to invite.
              </ThemedText>
            </View>
          </Card>

          {resource.data.isMember && (
            <View style={teamStyles.actions}>
              <Link href={{ pathname: '/teams/[teamId]/edit', params: { teamId } }} asChild>
                <Button label="Edit team" tone="secondary" onPress={() => {}} />
              </Link>
              <Link
                href={{ pathname: '/teams/[teamId]/proposals', params: { teamId } }}
                asChild>
                <Button label={`All proposals (${resource.data.proposals.length})`} onPress={() => {}} />
              </Link>
            </View>
          )}

          {!resource.data.isMember && (
            <Card style={styles.joinCard}>
              <View style={styles.overviewColumn}>
                <ThemedText style={styles.joinTitle}>Interested in this team?</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Send an application to express your interest. The team will review it and vote.
                </ThemedText>
              </View>
              <Link
                href={{
                  pathname: '/teams/[teamId]/proposals/new',
                  params: { teamId, path: 'user_swiped_team' },
                }}
                asChild>
                <Button
                  label={resource.data.roster.length >= resource.data.team.max_members
                    ? 'Team is full'
                    : 'Apply to join'}
                  disabled={resource.data.roster.length >= resource.data.team.max_members}
                  onPress={() => {}}
                />
              </Link>
            </Card>
          )}

          {resource.data.isMember && (
            <View style={styles.section}>
              <SectionHeader
                title={`Voting (${pendingVotes.length})`}
                action={
                  <Link
                    href={{ pathname: '/teams/[teamId]/proposals', params: { teamId } }}
                    asChild>
                    <Button label="View all" tone="secondary" onPress={() => {}} />
                  </Link>
                }
              />
              <ThemedText themeColor="textSecondary">
                Review each applicant&apos;s profile before accepting or rejecting them. The creator
                approves first, then the team&apos;s majority vote applies.
              </ThemedText>
              {pendingVotes.length ? (
                <TeamGrid>
                  {pendingVotes.map((proposal) => {
                    const yesVotes = proposal.votes.filter(
                      (vote) => vote.decision === 'accept',
                    ).length;
                    const creatorApproved = proposal.votes.some(
                      (vote) =>
                        vote.voter_user_id === resource.data!.team.created_by &&
                        vote.decision === 'accept',
                    );
                    return (
                      <Card key={proposal.id} style={styles.voteCard}>
                        <View style={teamStyles.spread}>
                          <ThemedText style={styles.memberName} numberOfLines={1}>
                            {proposal.candidate?.display_name ?? 'Applicant'}
                          </ThemedText>
                          <StatusPill value={proposal.status} />
                        </View>
                        <ThemedText themeColor="textSecondary" numberOfLines={3}>
                          {proposal.candidate?.bio || 'No bio provided.'}
                        </ThemedText>
                        <Chips values={proposal.candidate?.tech_stack ?? []} />
                        <ThemedText type="smallBold">
                          {yesVotes}/{proposal.required_yes_votes} yes · creator{' '}
                          {creatorApproved ? 'approved' : 'waiting'}
                        </ThemedText>
                        <Link
                          href={{
                            pathname: '/teams/[teamId]/proposals/[proposalId]',
                            params: { teamId, proposalId: proposal.id },
                          }}
                          asChild>
                          <Button label="Review profile & vote" onPress={() => {}} />
                        </Link>
                      </Card>
                    );
                  })}
                </TeamGrid>
              ) : (
                <EmptyState>No applications are waiting for a vote.</EmptyState>
              )}
            </View>
          )}

          <SectionHeader title="Roster" />
          <TeamGrid>
            {resource.data.roster.length ? (
              resource.data.roster.map((member) => (
                <Card key={member.user_id} style={styles.memberCard}>
                  <View style={teamStyles.spread}>
                    <View style={styles.avatar}>
                      <ThemedText type="smallBold" style={styles.avatarText}>
                        {(member.profile?.display_name ?? 'D').slice(0, 1).toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.memberName} numberOfLines={1}>
                      {member.profile?.display_name ?? 'Developer'}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={styles.role}>{member.role || 'Member'}</ThemedText>
                  <Chips values={member.profile?.tech_stack ?? []} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </ThemedText>
                </Card>
              ))
            ) : (
              <EmptyState>No members are visible.</EmptyState>
            )}
          </TeamGrid>
        </>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({
  overviewCard: { gap: Spacing.three },
  overviewColumn: { gap: Spacing.one },
  section: { gap: Spacing.three },
  codeBlock: { gap: Spacing.one, paddingTop: Spacing.two },
  code: { letterSpacing: 4 },
  codeBlock: { gap: Spacing.one, paddingTop: Spacing.two },
  code: { letterSpacing: 4 },
  joinCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  joinTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  memberCard: { minHeight: 180 },
  voteCard: { minHeight: 230 },
  memberName: { flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C87F7',
  },
  avatarText: { color: '#FFFFFF' },
  role: { color: '#2764B7' },
});
