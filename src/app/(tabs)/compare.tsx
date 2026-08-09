import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { MetricPicker } from '@/components/MetricPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthletes } from '@/hooks/useAthletes';
import { useLatestEntries } from '@/hooks/useLatestEntries';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';
import { formatValue } from '@/utils/format';

type Athlete = Database['public']['Tables']['athletes']['Row'];

export default function CompareScreen() {
  const { data: metrics } = useMetrics();
  const { data: athletes } = useAthletes();
  const [metricId, setMetricId] = useState<string | null>(null);
  const theme = useTheme();

  const selected = metrics?.find((m) => m.id === metricId) ?? null;
  const { data: latest } = useLatestEntries(undefined, selected?.id);

  useEffect(() => {
    if (!metricId && metrics && metrics.length > 0) {
      setMetricId(metrics[0].id);
    }
  }, [metrics, metricId]);

  const ranked = useMemo(() => {
    if (!latest || !athletes || !selected || latest.length === 0) return [];
    const athleteMap = new Map(athletes.map((a) => [a.id, a]));
    const rows = latest
      .map((e) => ({ athlete: athleteMap.get(e.athlete_id), value: e.value }))
      .filter((r): r is { athlete: Athlete; value: number } => Boolean(r.athlete));

    rows.sort((a, b) =>
      selected.higher_is_better ? b.value - a.value : a.value - b.value,
    );

    const min = Math.min(...rows.map((r) => r.value));
    const max = Math.max(...rows.map((r) => r.value));
    const span = max - min;

    return rows.map((row, i) => ({
      rank: i + 1,
      ...row,
      // Progress bar = "closeness to the best value" so #1 always fills the bar.
      progress: span === 0 ? 1 : selected.higher_is_better ? (row.value - min) / span : (max - row.value) / span,
    }));
  }, [latest, athletes, selected]);

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Compare" />

        {!metrics || metrics.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="bar-chart" size={40} color={theme.textSecondary} />}
            title="No metrics to compare on"
            message="Define metrics first, then log values to rank your athletes."
          />
        ) : (
          <>
            <View style={styles.pickerWrap}>
              <MetricPicker
                metrics={metrics}
                selectedId={metricId}
                onSelect={setMetricId}
              />
            </View>

            <FlatList
              data={ranked}
              keyExtractor={(r) => r.athlete.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <EmptyState
                  icon={<Ionicons name="flag" size={40} color={theme.textSecondary} />}
                  title="No values yet"
                  message={`Log ${selected?.name} values for at least one athlete to see rankings.`}
                />
              }
              renderItem={({ item }) => (
                <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <View
                    style={[
                      styles.rank,
                      {
                        backgroundColor:
                          item.rank === 1 ? theme.accent : theme.backgroundSelected,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankText,
                        { color: item.rank === 1 ? theme.accentContrast : theme.textSecondary },
                      ]}
                    >
                      {item.rank}
                    </Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                        {item.athlete.name}
                      </Text>
                      <Text style={[styles.value, { color: theme.text }]}>
                        {formatValue(item.value, selected?.unit)}
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.max(4, Math.round(item.progress * 100))}%`,
                            backgroundColor:
                              item.rank === 1 ? theme.accent : theme.textSecondary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pickerWrap: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  listContent: { padding: Spacing.three, paddingBottom: 48, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 15, fontWeight: '800' },
  rowInfo: { flex: 1, gap: Spacing.two },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  value: { fontSize: 16, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
