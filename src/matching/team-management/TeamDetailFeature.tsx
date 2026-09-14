import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import { getTeam, getTeamRoster, isCurrentUserTeamMember } from '@/matching/data-access/team-service';
import {
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
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
    return { team, roster, isMember };
  }, [teamId]);
  const resource = useResource(loader);

  return (
    <TeamScreen>
      {resource.data && <Stack.Screen options={{ title: resource.data.team.name }} />}
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && (
        <>
          <Card>
            <ThemedText type="subtitle">{resource.data.team.name}</ThemedText>
            <ThemedText>
              {resource.data.team.description || 'This team has not added a description yet.'}
            </ThemedText>
            {resource.data.team.project_idea && (
              <ThemedText themeColor="textSecondary">
                Project: {resource.data.team.project_idea}
              </ThemedText>
            )}
            <Chips values={resource.data.team.tech_stack} />
            <ThemedText type="small" themeColor="textSecondary">
              {resource.data.roster.length} / {resource.data.team.max_members} members
            </ThemedText>
          </Card>

          {resource.data.isMember && (
            <View style={teamStyles.actions}>
              <Link href={{ pathname: '/teams/[teamId]/edit', params: { teamId } }} asChild>
                <Button label="Edit team" tone="secondary" onPress={() => {}} />
              </Link>
              <Link
                href={{ pathname: '/teams/[teamId]/proposals', params: { teamId } }}
                asChild>
                <Button label="Proposals & votes" onPress={() => {}} />
              </Link>
            </View>
          )}

          <SectionHeader title="Roster" />
          <View style={styles.list}>
            {resource.data.roster.length ? (
              resource.data.roster.map((member) => (
                <Card key={member.user_id}>
                  <View style={teamStyles.spread}>
                    <ThemedText style={teamStyles.title}>
                      {member.profile?.display_name ?? 'Developer'}
                    </ThemedText>
                    <ThemedText type="smallBold">{member.role || 'Member'}</ThemedText>
                  </View>
                  <Chips values={member.profile?.tech_stack ?? []} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </ThemedText>
                </Card>
              ))
            ) : (
              <EmptyState>No members are visible.</EmptyState>
            )}
          </View>
        </>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
