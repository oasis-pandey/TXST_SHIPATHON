import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listTeamNotifications, markTeamNotificationRead } from '@/features/teams/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  TeamScreen,
  teamStyles,
} from '@/features/teams/ui';
import { useResource } from '@/features/teams/use-resource';

const notificationLabels: Record<string, string> = {
  team_application_received: 'New team application',
  team_proposal_received: 'New team invitation',
  team_vote_needed: 'Your vote is needed',
  team_candidate_accepted: 'Candidate accepted the proposal',
  team_candidate_rejected: 'Candidate declined the proposal',
  team_member_joined: 'A member joined the team',
  team_proposal_closed_capacity: 'Proposal closed because the team filled up',
};

export default function TeamNotificationsScreen() {
  const loader = useCallback(() => listTeamNotifications(), []);
  const resource = useResource(loader);

  return (
    <TeamScreen>
      <SectionHeader title="Team notifications" />
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && (
        <View style={styles.list}>
          {resource.data.length ? (
            resource.data.map((notification) => (
              <Card key={notification.id}>
                <View style={teamStyles.spread}>
                  <ThemedText type="smallBold">
                    {notificationLabels[notification.type] ?? notification.type}
                  </ThemedText>
                  {!notification.read && <ThemedText type="code">NEW</ThemedText>}
                </View>
                <ThemedText themeColor="textSecondary">
                  {new Date(notification.created_at).toLocaleString()}
                </ThemedText>
                {!notification.read && (
                  <Button
                    label="Mark read"
                    tone="secondary"
                    onPress={() =>
                      void markTeamNotificationRead(notification.id).then(resource.refresh)
                    }
                  />
                )}
              </Card>
            ))
          ) : (
            <EmptyState>No team notifications yet.</EmptyState>
          )}
        </View>
      )}
    </TeamScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });
