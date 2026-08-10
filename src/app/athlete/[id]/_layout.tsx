import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AthleteLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Match the app background so transitions don't flash white behind screens.
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="log" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="load" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="goals" />
    </Stack>
  );
}
