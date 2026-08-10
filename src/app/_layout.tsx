import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AuthProvider, useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/queryClient';

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    // Wait for the session check before mounting the stack so there's no
    // flash of the wrong navigator.
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Match the app background so transitions don't flash white behind screens.
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="athlete/new" />
        <Stack.Screen name="athlete/[id]" />
        <Stack.Screen name="metric-form" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
