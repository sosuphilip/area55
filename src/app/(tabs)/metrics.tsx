import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useDeleteMetric, useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/errors';

type Metric = Database['public']['Tables']['metrics']['Row'];

export default function MetricsScreen() {
  const { data: metrics, isLoading, isError, refetch, isRefetching } = useMetrics();
  const deleteMetric = useDeleteMetric();
  const theme = useTheme();
  const router = useRouter();

  const confirmDelete = (metric: Metric) => {
    confirmDestructive(
      'Delete metric',
      `Delete “${metric.name}”? This also removes every logged value and goal for it.`,
      () =>
        deleteMetric.mutate(metric.id, {
          onError: (e) => Alert.alert('Error', errorMessage(e)),
        }),
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader
          title="Metrics"
          right={
            <Pressable
              onPress={() => router.push('/metric-form')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={26} color={theme.accent} />
            </Pressable>
          }
        />

        <FlatList
          data={metrics}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/metric-form?id=${item.id}`)}>
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={theme.negative} />
                  </Pressable>
                </View>
                <View style={styles.badges}>
                  {item.unit ? (
                    <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                      <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                        {item.unit}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                    <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                      {item.higher_is_better ? '↑ higher is better' : '↓ lower is better'}
                    </Text>
                  </View>
                </View>
                {item.description ? (
                  <Text
                    style={[styles.description, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            isError ? (
              <EmptyState
                icon={<Ionicons name="cloud-offline" size={40} color={theme.textSecondary} />}
                title="Couldn't load metrics"
                action={<Button label="Retry" onPress={refetch} variant="secondary" />}
              />
            ) : (
              <EmptyState
                icon={<Ionicons name="speedometer" size={40} color={theme.textSecondary} />}
                title={isLoading ? 'Loading…' : 'No metrics yet'}
                message="Define what you track — e.g. 40m Sprint (s), VO2 Max (ml/kg/min)."
                action={
                  <Button label="Add metric" onPress={() => router.push('/metric-form')} />
                }
              />
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.three, paddingBottom: 48, gap: Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: { fontSize: 17, fontWeight: '600', flex: 1 },
  badges: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  badge: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 14, marginTop: Spacing.two, lineHeight: 20 },
});
