import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/shared/ui/animated-icon';
import { AuthProvider, useAuth } from '@/users/data-access/auth-context';
import { AuthGate } from '@/users/ui/AuthGate';
import { Provider } from "react-redux";

import { store } from "@/app/store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();
    return (
        <Provider store={store}>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                <AnimatedSplashOverlay />
                <AuthProvider>
                    <RootNavigator />
                </AuthProvider>
            </ThemeProvider>
        </Provider>
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
