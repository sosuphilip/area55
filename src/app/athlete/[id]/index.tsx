import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AthleteNav } from '@/components/AthleteNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Card, EmptyState, Screen, SectionHeader, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete, useDeleteAthlete } from '@/hooks/useAthletes';
import { useUpsertEntry } from '@/hooks/useEntries';
import { useGoals } from '@/hooks/useGoals';
import { useLatestEntries } from '@/hooks/useLatestEntries';
import { useMetrics } from '@/hooks/useMetrics';
import { useSessions } from '@/hooks/useSessions';
import { useTheme } from '@/hooks/use-theme';
import { athletePhotoUrl } from '@/lib/storage';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/errors';
import { formatDateLong, formatValue, todayISO } from '@/utils/format';

export default function AthleteOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const { data: athlete, isLoading } = useAthlete(id);
  const { data: metrics } = useMetrics();
  const { data: latest } = useLatestEntries(id);
  const { data: sessions } = useSessions(id);
  const { data: goals } = useGoals(id);
  const upsertEntry = useUpsertEntry();
  const deleteAthlete = useDeleteAthlete();

  const [metricId, setMetricId] = useState<string | null>(null);
  const [valueText, setValueText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!metricId && metrics && metrics.length > 0) setMetricId(metrics[0].id);
  }, [metrics, metricId]);

  const latestByMetric = useMemo(() => {
    const map = new Map<string, number>();
    latest?.forEach((e) => map.set(e.metric_id, e.value));
    return map;
  }, [latest]);

  const quickLog = async () => {
    const value = parseFloat(valueText);
    if (!metricId) {
      setSaveError('Pick a metric first.');
      return;
    }
    if (Number.isNaN(value)) {
      setSaveError('Enter a numeric value.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await upsertEntry.mutateAsync({
        athlete_id: id,
        metric_id: metricId,
        value,
        entry_date: todayISO(),
      });
      setValueText('');
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!athlete) return;
    const run = () =>
      deleteAthlete.mutate(id, {
        onSuccess: () => router.replace('/'),
        onError: (e) => Alert.alert('Error', errorMessage(e)),
      });
    confirmDestructive(
      'Delete athlete',
      `Delete ${athlete.name}? This also removes every logged value, session note, and goal.`,
      run,
    );
  };

  const photo = athlete ? athletePhotoUrl(athlete.photo_path) : null;
  const selectedMetric = metrics?.find((m) => m.id === metricId);
  const recentSessions = sessions?.slice(0, 3) ?? [];
  const activeGoals = goals?.filter((g) => g.status === 'active').slice(0, 3) ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader
          title={athlete?.name ?? 'Athlete'}
          showBack
          right={
            <View style={styles.headerActions}>
              <Link href={`/athlete/${id}/edit`} asChild>
                <Pressable hitSlop={8} accessibilityRole="button">
                  <Ionicons name="pencil" size={20} color={theme.accent} />
                </Pressable>
              </Link>
              <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button">
                <Ionicons name="trash-outline" size={20} color={theme.negative} />
              </Pressable>
            </View>
          }
        />
        <AthleteNav id={id} active="overview" />

        {isLoading || !athlete ? (
          <Spinner label="Loading…" />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Identity */}
            <Card style={styles.identity}>
              <View style={styles.identityRow}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="person" size={22} color={theme.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.text }]}>{athlete.name}</Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    {[athlete.sport, athlete.position].filter(Boolean).join(' · ') || 'No sport set'}
                  </Text>
                  {athlete.birthdate ? (
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                      Born {formatDateLong(athlete.birthdate)}
                    </Text>
                  ) : null}
                </View>
              </View>
              {athlete.notes ? (
                <Text style={[styles.notes, { color: theme.textSecondary }]}>
                  {athlete.notes}
                </Text>
              ) : null}
            </Card>

            {/* Quick log */}
            <Card>
              <SectionHeader title="Quick log" />
              {!metrics || metrics.length === 0 ? (
                <EmptyState
                  title="No metrics yet"
                  message="Define a metric to start logging values."
                  action={
                    <Button
                      label="Add metric"
                      onPress={() => router.push('/metric-form')}
                      variant="secondary"
                    />
                  }
                />
              ) : (
                <View style={styles.quickLog}>
                  <View style={styles.quickRow}>
                    {metrics.map((m) => {
                      const selected = m.id === metricId;
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => setMetricId(m.id)}
                          style={[
                            styles.metricPill,
                            { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
                          ]}
                        >
                          <Text
                            style={{
                              color: selected ? theme.accentContrast : theme.textSecondary,
                              fontWeight: '600',
                              fontSize: 13,
                            }}
                            numberOfLines={1}
                          >
                            {m.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.valueRow}>
                    <View
                      style={[
                        styles.valueInput,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        value={valueText}
                        onChangeText={setValueText}
                        keyboardType="decimal-pad"
                        placeholder={`Value${selectedMetric?.unit ? ` (${selectedMetric.unit})` : ''}`}
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.valueText, { color: theme.text }]}
                      />
                    </View>
                    <Button label="Add" onPress={quickLog} loading={saving} style={styles.addBtn} />
                  </View>
                  {saveError ? (
                    <Text style={{ color: theme.negative, fontSize: 13 }}>{saveError}</Text>
                  ) : null}
                </View>
              )}
            </Card>

            {/* Latest values */}
            <SectionHeader title="Latest values" />
            {latest && latest.length > 0 ? (
              <View style={styles.latestList}>
                {metrics?.map((m) => {
                  const value = latestByMetric.get(m.id);
                  return (
                    <View
                      key={m.id}
                      style={[styles.latestRow, { borderBottomColor: theme.border }]}
                    >
                      <Text style={[styles.latestName, { color: theme.text }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={[styles.latestValue, { color: theme.text }]}>
                        {value == null ? '—' : formatValue(value, m.unit)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Card>
                <EmptyState
                  icon={<Ionicons name="analytics" size={36} color={theme.textSecondary} />}
                  title="No values logged"
                  message="Use the quick log above or the Log tab to track progress."
                />
              </Card>
            )}

            {/* Recent notes */}
            <SectionHeader
              title="Recent notes"
              right={
                <Link href={`/athlete/${id}/notes`} style={{ color: theme.accent, fontSize: 14 }}>
                  View all
                </Link>
              }
            />
            {recentSessions.length > 0 ? (
              <Card>
                {recentSessions.map((s, i) => (
                  <View
                    key={s.id}
                    style={[
                      styles.sessionRow,
                      i < recentSessions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.sessionDate, { color: theme.textSecondary }]}>
                      {formatDateLong(s.session_date)}
                    </Text>
                    {s.rating ? (
                      <Text style={{ color: theme.warning }}>
                        {'★'.repeat(s.rating)}
                        <Text style={{ color: theme.border }}>{'★'.repeat(5 - s.rating)}</Text>
                      </Text>
                    ) : null}
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Goals summary */}
            <SectionHeader
              title="Goals"
              right={
                <Link href={`/athlete/${id}/goals`} style={{ color: theme.accent, fontSize: 14 }}>
                  View all
                </Link>
              }
            />
            {activeGoals.length > 0 ? (
              <Card>
                {activeGoals.map((g) => {
                  const metric = metrics?.find((m) => m.id === g.metric_id);
                  return (
                    <Text key={g.id} style={{ color: theme.text, fontSize: 14, paddingVertical: 2 }}>
                      {formatValue(g.target_value, metric?.unit)} on {metric?.name ?? 'metric'}
                      {g.deadline ? ` · by ${formatDateLong(g.deadline)}` : ''}
                    </Text>
                  );
                })}
              </Card>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  scroll: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.three },
  identity: { gap: Spacing.two },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 1 },
  notes: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
  quickLog: { gap: Spacing.two },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricPill: { borderRadius: 999, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.two, maxWidth: 180 },
  valueRow: { flexDirection: 'row', gap: Spacing.two },
  valueInput: { flex: 1, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, height: 48, justifyContent: 'center', paddingHorizontal: Spacing.three },
  valueText: { fontSize: 16 },
  addBtn: { minWidth: 88 },
  latestList: {},
  latestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  latestName: { fontSize: 15, flex: 1 },
  latestValue: { fontSize: 15, fontWeight: '700' },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, gap: Spacing.two },
  sessionDate: { fontSize: 14 },
});
