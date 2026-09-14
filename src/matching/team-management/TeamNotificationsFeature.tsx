import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import {
  getProposal,
  listTeamNotifications,
  markTeamNotificationRead,
} from '@/matching/data-access/team-service';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  TeamGrid,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

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
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openProposal = async (
    notificationId: string,
    proposalId: string,
  ) => {
    setOpeningId(notificationId);
    setActionError(null);
    try {
      const proposal = await getProposal(proposalId);
      await markTeamNotificationRead(notificationId);
      router.push({
        pathname: '/teams/[teamId]/proposals/[proposalId]',
        params: { teamId: proposal.team_id, proposalId: proposal.id },
      });
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Unable to open this application.',
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <TeamScreen>
      <SectionHeader title="Team notifications" />
      <ThemedText themeColor="textSecondary">
        Open an application to review the applicant&apos;s profile and cast your vote.
      </ThemedText>
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {actionError && <ErrorState message={actionError} />}
      {resource.data && (
        <TeamGrid>
          {resource.data.length ? (
            resource.data.map((notification) => {
              const canReview = Boolean(
                notification.reference_id &&
                ['team_application_received', 'team_vote_needed'].includes(notification.type),
              );
              return (
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
                  <View style={teamStyles.actions}>
                    {canReview && notification.reference_id && (
                      <Button
                        label={openingId === notification.id ? 'Opening…' : 'Review & vote'}
                        disabled={openingId !== null}
                        onPress={() =>
                          void openProposal(notification.id, notification.reference_id!)
                        }
                      />
                    )}
                    {!notification.read && (
                      <Button
                        label="Mark read"
                        tone="secondary"
                        onPress={() =>
                          void markTeamNotificationRead(notification.id).then(resource.refresh)
                        }
                      />
                    )}
                  </View>
                </Card>
              );
            })
          ) : (
            <EmptyState>No team notifications yet.</EmptyState>
          )}
        </TeamGrid>
      )}
    </TeamScreen>
  );
}
