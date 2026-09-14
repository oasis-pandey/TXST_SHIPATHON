import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthGate } from '@/components/auth-gate';
import { AuthProvider, useAuth } from '@/users/data/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  if (status === 'loading' || status === 'error') return <AuthGate />;
  return <Stack>
    <Stack.Protected guard={status === 'unauthenticated'}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
    </Stack.Protected>
    <Stack.Protected guard={status === 'onboarding'}>
      <Stack.Screen name="create-profile" options={{ title: 'Create profile' }} />
    </Stack.Protected>
    <Stack.Protected guard={status === 'authenticated'}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack.Protected>
  </Stack>;
}
