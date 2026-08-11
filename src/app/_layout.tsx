import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/queryClient';

/**
 * On web, React Navigation paints a single white frame during screen mounts
 * before inline styles are applied. This overlay covers the viewport with the
 * app background colour for two animation frames after each route change,
 * blocking any transient white paint from reaching the user's eyes.
 * In dark mode it's invisible (same colour as the background).
 */
function FlashGuard() {
  const segments = useSegments();
  const theme = useTheme();
  const key = segments.join('/');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    let frames = 0;
    const tick = () => {
      frames++;
      if (frames >= 3) { setHidden(true); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [key]);

  if (hidden) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background }]}
    />
  );
}

function buildNavigationTheme(scheme: 'light' | 'dark') {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      // Use transparent so the Background component (from @react-navigation/elements)
      // never paints a solid color — the already-dark body shows through instead.
      // This prevents the single-frame white flash during screen mounting, because
      // transparent is the browser default for a new div, matching what React renders
      // before inline styles are applied.
      background: 'transparent',
      card: 'transparent',
      text: c.text,
      border: c.border,
      notification: c.negative,
    },
  };
}

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
  const scheme = useColorScheme();
  const navigationTheme = useMemo(() => buildNavigationTheme(scheme), [scheme]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <AuthProvider>
          <FlashGuard />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
