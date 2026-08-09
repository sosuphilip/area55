import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { AthleteNav } from '@/components/AthleteNav';
import { LoadChart } from '@/components/charts/LoadChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Screen, SectionHeader, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete } from '@/hooks/useAthletes';
import { useSessions } from '@/hooks/useSessions';
import { useTheme } from '@/hooks/use-theme';
import {
  acwrAt,
  acwrSeries,
  acwrZone,
  ACWR_ZONE_LABEL,
  dailyLoads,
  type AcwrZone,
} from '@/utils/acwr';
import { formatDate, formatValue, todayISO, shiftISO } from '@/utils/format';

function zoneColor(zone: AcwrZone, theme: ReturnType<typeof useTheme>): string {
  switch (zone) {
    case 'optimal':
      return theme.positive;
    case 'undertrained':
    case 'caution':
      return theme.warning;
    case 'elevated':
      return theme.negative;
    case 'nodata':
      return theme.textSecondary;
  }
}

export default function LoadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const { data: athlete } = useAthlete(id);
  const { data: sessions, isLoading } = useSessions(id);

  const end = todayISO();
  const loadDays = useMemo(() => dailyLoads(sessions ?? []), [sessions]);

  const bars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const date = shiftISO(end, -(27 - i));
        const load = loadDays.find((d) => d.date === date)?.load ?? 0;
        return { value: load, label: i % 7 === 6 ? formatDate(date) : '' };
      }),
    [loadDays, end],
  );

  const current = useMemo(() => acwrAt(loadDays, end), [loadDays, end]);
  const zone: AcwrZone = acwrZone(current.acwr);

  const acwrPoints = useMemo(
    () => acwrSeries(loadDays, end, 28).filter((p): p is { date: string; acwr: number } => p.acwr != null),
    [loadDays, end],
  );

  return (
    <Screen scroll padded>
      <ScreenHeader title="Load" subtitle={athlete?.name} showBack />
      <AthleteNav id={id} active="load" />

      {isLoading ? (
        <Spinner label="Loading…" />
      ) : (
        <View style={styles.body}>
          <Card style={styles.acwrCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Current ACWR</Text>
            <Text style={[styles.acwrValue, { color: zoneColor(zone, theme) }]}>
              {current.acwr != null ? current.acwr.toFixed(2) : '—'}
            </Text>
            <Text style={[styles.zone, { color: zoneColor(zone, theme) }]}>
              {ACWR_ZONE_LABEL[zone]}
            </Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              7d acute {formatValue(current.acute)} · 28d chronic {formatValue(current.chronic)}
            </Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              Above 1.5 = elevated injury risk · below 0.8 = undertraining
            </Text>
          </Card>

          <Card padded={false} style={styles.chartCard}>
            <SectionHeader title="Daily load · last 28 days" />
            <LoadChart data={bars} />
          </Card>

          <Card padded={false} style={styles.chartCard}>
            <SectionHeader title="ACWR trend" />
            {acwrPoints.length >= 2 ? (
              <LineChart
                data={acwrPoints.map((p, i) => ({
                  value: Number(p.acwr.toFixed(2)),
                  label: i % 6 === 0 || i === acwrPoints.length - 1 ? formatDate(p.date) : '',
                }))}
                height={160}
                noOfSections={3}
                thickness={2}
                color={zoneColor(zone, theme)}
                dataPointsColor={zoneColor(zone, theme)}
                hideDataPoints
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
                rulesColor={theme.border}
                showReferenceLine1
                referenceLine1Position={1.5}
                referenceLine1Config={{
                  type: 'dashed',
                  color: theme.negative,
                  thickness: 1,
                  dashWidth: 5,
                  dashGap: 4,
                  labelText: 'risk 1.5',
                }}
                adjustToWidth
                initialSpacing={8}
                endSpacing={8}
              />
            ) : (
              <Text style={[styles.noData, { color: theme.textSecondary }]}>
                Not enough load history yet — log sessions with a load value for ~2 weeks.
              </Text>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  acwrCard: { alignItems: 'center', gap: 2, paddingVertical: Spacing.four },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  acwrValue: { fontSize: 44, fontWeight: '900' },
  zone: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  chartCard: { overflow: 'hidden' },
  noData: { fontSize: 14, padding: Spacing.three },
});
