import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Teams' }} />
      <Stack.Screen name="new" options={{ title: 'Create team' }} />
      <Stack.Screen name="notifications" options={{ title: 'Team notifications' }} />
      <Stack.Screen name="[teamId]/index" options={{ title: 'Team' }} />
      <Stack.Screen name="[teamId]/edit" options={{ title: 'Edit team' }} />
      <Stack.Screen name="[teamId]/proposals/index" options={{ title: 'Proposals' }} />
      <Stack.Screen name="[teamId]/proposals/new" options={{ title: 'New proposal' }} />
      <Stack.Screen
        name="[teamId]/proposals/[proposalId]"
        options={{ title: 'Proposal review' }}
      />
    </Stack>
  );
}
