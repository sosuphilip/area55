import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AthleteNav } from '@/components/AthleteNav';
import { MetricPicker } from '@/components/MetricPicker';
import { ScoreRing } from '@/components/ScoreRing';
import { TrendBadge } from '@/components/TrendBadge';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete } from '@/hooks/useAthletes';
import { useEntries } from '@/hooks/useEntries';
import { useGoals } from '@/hooks/useGoals';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import { toChartData } from '@/utils/chartData';
import { formatDateLong, formatPct, formatValue } from '@/utils/format';
import { compositeScore, perMetricScore, scoreDelta30d } from '@/utils/score';
import { filterByRange, movingAverage, RANGE_KEYS, summarizeEntries, type RangeKey } from '@/utils/stats';
import { computeTrend } from '@/utils/trend';

const RANGE_LABEL: Record<RangeKey, string> = {
  all: 'All',
  '90': '90d',
  '30': '30d',
  '7': '7d',
};

export default function AnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const { data: athlete } = useAthlete(id);
  const { data: metrics } = useMetrics();
  const { data: goals } = useGoals(id);
  const [metricId, setMetricId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('all');
  const [showMA, setShowMA] = useState(false);

  useEffect(() => {
    if (!metricId && metrics && metrics.length > 0) setMetricId(metrics[0].id);
  }, [metrics, metricId]);

  const metric = metrics?.find((m) => m.id === metricId) ?? null;
  const { data: allEntries, isLoading } = useEntries(id);
  const metricEntries = useMemo(
    () => (metric ? (allEntries ?? []).filter((e) => e.metric_id === metric.id) : []),
    [allEntries, metric],
  );

  // Composite + per-metric 0-100 scores across every metric this athlete has.
  const performance = useMemo(() => {
    if (!allEntries || !metrics || metrics.length === 0) return null;
    const byMetric = new Map<string, { entry_date: string; value: number }[]>();
    for (const e of allEntries) {
      const list = byMetric.get(e.metric_id) ?? [];
      list.push(e);
      byMetric.set(e.metric_id, list);
    }
    const rows = metrics.map((m) => {
      const metricEntries = byMetric.get(m.id) ?? [];
      return {
        metric: m,
        score: perMetricScore(metricEntries, m.higher_is_better),
        delta: scoreDelta30d(metricEntries, m.higher_is_better),
      };
    });
    const composite = compositeScore(rows.map((r) => r.score));
    const deltas = rows.map((r) => r.delta).filter((d): d is number => d != null);
    const compositeDelta =
      deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
    return { rows, composite, compositeDelta };
  }, [allEntries, metrics]);

  const filteredEntries = useMemo(
    () => filterByRange(metricEntries, range),
    [metricEntries, range],
  );
  const chartData = useMemo(() => toChartData(filteredEntries), [filteredEntries]);
  const maData = useMemo(
    () => (showMA ? toChartData(movingAverage(filteredEntries, 7)) : undefined),
    [filteredEntries, showMA],
  );
  const summary = useMemo(
    () =>
      filteredEntries.length > 0 && metric
        ? summarizeEntries(filteredEntries, metric.higher_is_better)
        : null,
    [filteredEntries, metric],
  );
  const trend = useMemo(
    () =>
      filteredEntries.length > 0 && metric
        ? computeTrend(filteredEntries, metric.higher_is_better)
        : null,
    [filteredEntries, metric],
  );
  const goal = useMemo(
    () => goals?.find((g) => g.metric_id === metric?.id && g.status !== 'archived') ?? null,
    [goals, metric],
  );

  const changeBetter =
    summary?.changePct != null &&
    (summary.changePct > 0) === Boolean(metric?.higher_is_better) &&
    summary.changePct !== 0;
  const changeWorse =
    summary?.changePct != null &&
    (summary.changePct > 0) !== Boolean(metric?.higher_is_better) &&
    summary.changePct !== 0;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Analytics" subtitle={athlete?.name} showBack />
        <AthleteNav id={id} active="analytics" />

        {!metrics || metrics.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="analytics" size={40} color={theme.textSecondary} />}
            title="No metrics yet"
            message="Define a metric to see trends."
          />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {performance ? (
              <Card style={styles.goalCard}>
                <View style={styles.perfTop}>
                  <ScoreRing score={performance.composite} size={72} />
                  <View style={styles.perfSummary}>
                    <Text style={[styles.goalTitle, { color: theme.text }]}>Performance</Text>
                    <Text style={[styles.perfComposite, { color: theme.text }]}>
                      {performance.composite != null ? `${performance.composite}/100` : 'No data yet'}
                    </Text>
                    {performance.compositeDelta != null ? (
                      <Text
                        style={[
                          styles.perfDelta,
                          {
                            color:
                              performance.compositeDelta >= 0 ? theme.positive : theme.negative,
                          },
                        ]}
                      >
                        {performance.compositeDelta >= 0 ? '+' : ''}
                        {performance.compositeDelta} pts · 30d
                      </Text>
                    ) : (
                      <Text style={[styles.perfDelta, { color: theme.textSecondary }]}>
                        No 30-day trend yet
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.perfRows}>
                  {performance.rows.map(({ metric: m, score, delta }) => (
                    <View key={m.id} style={styles.perfRow}>
                      <Text
                        style={[styles.perfName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                      <View
                        style={[styles.perfBar, { backgroundColor: theme.backgroundElement }]}
                      >
                        <View
                          style={[
                            styles.perfFill,
                            {
                              width: `${score ?? 0}%`,
                              backgroundColor:
                                score == null
                                  ? theme.backgroundSelected
                                  : score >= 80
                                    ? theme.positive
                                    : score >= 50
                                      ? theme.warning
                                      : theme.negative,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.perfRight}>
                        <Text style={[styles.perfScore, { color: theme.text }]}>
                          {score ?? '—'}
                        </Text>
                        {delta != null ? (
                          <Text
                            style={[
                              styles.perfDelta,
                              { color: delta >= 0 ? theme.positive : theme.negative },
                            ]}
                          >
                            {delta >= 0 ? '+' : ''}
                            {delta}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            <MetricPicker metrics={metrics} selectedId={metricId} onSelect={setMetricId} />

            <View style={styles.controls}>
              <View style={styles.rangeRow}>
                {RANGE_KEYS.map((key) => (
                  <Chip
                    key={key}
                    label={RANGE_LABEL[key]}
                    selected={range === key}
                    onPress={() => setRange(key)}
                  />
                ))}
              </View>
              <Chip label="7d avg" selected={showMA} onPress={() => setShowMA((v) => !v)} />
            </View>

            {isLoading && !allEntries ? (
              <Spinner label="Loading…" />
            ) : !metric ? (
              <EmptyState
                icon={<Ionicons name="analytics" size={40} color={theme.textSecondary} />}
                title="No metric selected"
                message="Pick a metric above to see trends."
              />
            ) : (
              <>
                {metricEntries.length > 0 && filteredEntries.length === 0 ? (
                  <Text style={[styles.rangeNote, { color: theme.textSecondary }]}>
                    No values in this range.
                  </Text>
                ) : null}

                <Card padded={false} style={styles.chartCard}>
                  <TrendLineChart
                    data={chartData}
                    movingAverage={maData}
                    goalValue={goal?.target_value}
                    goalLabel={
                      goal ? `Goal ${formatValue(goal.target_value, metric.unit)}` : undefined
                    }
                  />
                </Card>

                {summary && metric ? (
                  <>
                    <View style={styles.statsGrid}>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Latest</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {formatValue(summary.latest!, metric.unit)}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {formatValue(summary.best!, metric.unit)}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Worst</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {formatValue(summary.worst!, metric.unit)}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Average</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {formatValue(summary.average!, metric.unit)}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                          Last 7d
                        </Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {summary.last7Average != null
                            ? formatValue(summary.last7Average, metric.unit)
                            : '—'}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                          Change
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            {
                              color: changeWorse
                                ? theme.negative
                                : changeBetter
                                  ? theme.positive
                                  : theme.text,
                            },
                          ]}
                        >
                          {summary.changePct != null ? formatPct(summary.changePct) : '—'}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                          Consistency
                        </Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>
                          {summary.cvPct != null ? `${summary.cvPct.toFixed(0)}%` : '—'}
                        </Text>
                      </View>
                      <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Trend</Text>
                        <View style={styles.trendWrap}>
                          {trend ? (
                            <TrendBadge trend={trend} higherIsBetter={metric.higher_is_better} />
                          ) : (
                            <Text style={[styles.statValue, { color: theme.text }]}>—</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <Card style={styles.goalCard}>
                      <Text style={[styles.goalTitle, { color: theme.text }]}>Records</Text>
                      <View style={styles.recordRow}>
                        <Text style={[styles.recordLabel, { color: theme.textSecondary }]}>
                          All-time best
                        </Text>
                        <Text style={[styles.recordValue, { color: theme.text }]}>
                          {formatValue(summary.best!, metric.unit)}
                          {summary.bestDate ? ` · ${formatDateLong(summary.bestDate)}` : ''}
                        </Text>
                      </View>
                      <View style={styles.recordRow}>
                        <Text style={[styles.recordLabel, { color: theme.textSecondary }]}>
                          Last 30d best
                        </Text>
                        <Text style={[styles.recordValue, { color: theme.text }]}>
                          {summary.best30d != null
                            ? `${formatValue(summary.best30d, metric.unit)}${
                                summary.best30dDate ? ` · ${formatDateLong(summary.best30dDate)}` : ''
                              }`
                            : '—'}
                        </Text>
                      </View>
                    </Card>
                  </>
                ) : null}

                {goal ? (
                  <Card style={styles.goalCard}>
                    <View style={styles.goalTop}>
                      <Text style={[styles.goalTitle, { color: theme.text }]}>Goal</Text>
                      <View style={[styles.statusChip, { backgroundColor: theme.backgroundSelected }]}>
                        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                          {goal.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.text, fontSize: 16, marginTop: Spacing.two }}>
                      Target {formatValue(goal.target_value, metric?.unit)}
                      {goal.deadline ? ` by ${formatDateLong(goal.deadline)}` : ''}
                    </Text>
                    {summary ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                        Current {formatValue(summary.latest!, metric?.unit)}
                      </Text>
                    ) : null}
                  </Card>
                ) : null}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.three },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rangeRow: { flexDirection: 'row', gap: Spacing.two },
  rangeNote: { fontSize: 14 },
  chartCard: { overflow: 'hidden' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  trendWrap: { marginTop: Spacing.one },
  goalCard: { gap: Spacing.one },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  statusChip: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  perfTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  perfSummary: { flex: 1, gap: 2 },
  perfComposite: { fontSize: 18, fontWeight: '800' },
  perfDelta: { fontSize: 13, fontWeight: '600' },
  perfRows: { marginTop: Spacing.three, gap: Spacing.two },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  perfName: { flex: 1, fontSize: 13 },
  perfBar: { flex: 1.4, height: 8, borderRadius: 999, overflow: 'hidden' },
  perfFill: { height: '100%', borderRadius: 999 },
  perfRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, width: 74 },
  perfScore: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  recordLabel: { fontSize: 14, flexShrink: 1 },
  recordValue: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
