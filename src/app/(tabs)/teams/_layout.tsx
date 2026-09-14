import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';

export const unstable_settings = {
  initialRouteName: 'index',
};

function BackToTeamsButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to teams"
      hitSlop={12}
      onPress={() => router.replace('/teams')}>
      <ThemedText type="link">‹ Teams</ThemedText>
    </Pressable>
  );
}

const backToTeams = { headerLeft: () => <BackToTeamsButton /> };

export default function TeamsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Teams' }} />
      <Stack.Screen name="find" options={{ title: 'Find a team', ...backToTeams }} />
      <Stack.Screen name="new" options={{ title: 'Create team', ...backToTeams }} />
      <Stack.Screen name="notifications" options={{ title: 'Team notifications', ...backToTeams }} />
      <Stack.Screen name="[teamId]/index" options={{ title: 'Team', ...backToTeams }} />
      <Stack.Screen name="[teamId]/edit" options={{ title: 'Edit team', ...backToTeams }} />
      <Stack.Screen name="[teamId]/proposals/index" options={{ title: 'Proposals', ...backToTeams }} />
      <Stack.Screen name="[teamId]/proposals/new" options={{ title: 'New proposal', ...backToTeams }} />
      <Stack.Screen
        name="[teamId]/proposals/[proposalId]"
        options={{ title: 'Proposal review', ...backToTeams }}
      />
    </Stack>
  );
}
