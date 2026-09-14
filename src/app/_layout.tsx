import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/shared/ui/animated-icon';
import { AuthProvider, useAuth } from '@/users/data-access/auth-context';
import { AuthGate } from '@/users/ui/AuthGate';
import { Provider } from "react-redux";

import { store } from "@/shared/data-access/store";

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
    const { profile, status } = useAuth();
    const isResolving = status === 'loading' || status === 'error';

    return (
        <View style={styles.navigator}>
            <Stack>
                <Stack.Protected guard={status === 'unauthenticated' || (isResolving && !profile)}>
                    <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
                    <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
                </Stack.Protected>
                <Stack.Protected guard={status === 'onboarding'}>
                    <Stack.Screen name="create-profile" options={{ title: 'Create profile' }} />
                </Stack.Protected>
                <Stack.Protected guard={status === 'authenticated' || (isResolving && Boolean(profile))}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack.Protected>
            </Stack>
            {isResolving && (
                <View style={StyleSheet.absoluteFill}>
                    <AuthGate />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    navigator: { flex: 1 },
});
