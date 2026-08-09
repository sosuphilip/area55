import { Stack } from 'expo-router';

export default function AthleteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
