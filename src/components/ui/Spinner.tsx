import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SpinnerProps = {
  label?: string;
};

export function Spinner({ label }: SpinnerProps) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator size="large" color={theme.accent} />
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: Spacing.two, fontSize: 14 },
});
