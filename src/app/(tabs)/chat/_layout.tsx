import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';

export const unstable_settings = {
  initialRouteName: 'index',
};

function BackToChatButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to chat"
      hitSlop={12}
      onPress={() => router.replace('/chat')}>
      <ThemedText type="link">‹ Chat</ThemedText>
    </Pressable>
  );
}

const backToChat = { headerLeft: () => <BackToChatButton /> };

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="new" options={{ title: 'New conversation', ...backToChat }} />
      <Stack.Screen name="[conversationId]" options={{ title: 'Conversation', ...backToChat }} />
    </Stack>
  );
}
