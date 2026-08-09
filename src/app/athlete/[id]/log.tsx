import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AthleteNav } from '@/components/AthleteNav';
import { MetricPicker } from '@/components/MetricPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Card, EmptyState, Screen, SectionHeader, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete } from '@/hooks/useAthletes';
import { useDeleteEntry, useEntries, useUpsertEntry } from '@/hooks/useEntries';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/errors';
import { formatDateInput, formatDateLong, formatValue, todayISO } from '@/utils/format';

type Entry = Database['public']['Tables']['metric_entries']['Row'];

export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const { data: athlete } = useAthlete(id);
  const { data: metrics } = useMetrics();
  const { data: entries, isLoading } = useEntries(id);
  const upsertEntry = useUpsertEntry();
  const deleteEntry = useDeleteEntry();

  const [metricId, setMetricId] = useState<string | null>(null);
  const [valueText, setValueText] = useState('');
  const [dateText, setDateText] = useState(todayISO());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!metricId && metrics && metrics.length > 0) setMetricId(metrics[0].id);
  }, [metrics, metricId]);

  const grouped = useMemo(() => {
    if (!entries) return [];
    const order = metrics ?? [];
    const byMetric = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const list = byMetric.get(e.metric_id) ?? [];
      list.push(e);
      byMetric.set(e.metric_id, list);
    });
    return [...byMetric.entries()]
      .map(([metricId_, list]) => ({
        metric: order.find((m) => m.id === metricId_),
        entries: list,
      }))
      .sort((a, b) => (a.metric?.name ?? '').localeCompare(b.metric?.name ?? ''));
  }, [entries, metrics]);

  const save = async () => {
    const value = parseFloat(valueText);
    if (!metricId) return setFormError('Pick a metric.');
    if (Number.isNaN(value)) return setFormError('Enter a numeric value.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText.trim()))
      return setFormError('Date must be YYYY-MM-DD.');
    setSaving(true);
    setFormError(null);
    try {
      await upsertEntry.mutateAsync({
        athlete_id: id,
        metric_id: metricId,
        value,
        entry_date: dateText.trim(),
        note: note.trim() || null,
      });
      setValueText('');
      setNote('');
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry: Entry) => {
    confirmDestructive(
      'Delete value',
      'Remove this logged value?',
      () =>
        deleteEntry.mutate(entry.id, {
          onError: (e) => Alert.alert('Error', errorMessage(e)),
        }),
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Log values" subtitle={athlete?.name} showBack />
        <AthleteNav id={id} active="log" />

        {isLoading ? (
          <Spinner label="Loading…" />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Card>
              <SectionHeader title="Add value" />
              {!metrics || metrics.length === 0 ? (
                <EmptyState
                  title="No metrics yet"
                  message="Define a metric before logging values."
                />
              ) : (
                <View style={styles.form}>
                  <MetricPicker metrics={metrics} selectedId={metricId} onSelect={setMetricId} />
                  <View style={styles.inputRow}>
                    <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <TextInput
                        value={valueText}
                        onChangeText={setValueText}
                        keyboardType="decimal-pad"
                        placeholder={`Value${metrics.find((m) => m.id === metricId)?.unit ? ` (${metrics.find((m) => m.id === metricId)?.unit})` : ''}`}
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.inputText, { color: theme.text }]}
                      />
                    </View>
                  </View>
                  <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <TextInput
                      value={dateText}
                      onChangeText={(t) => setDateText(formatDateInput(t))}
                      autoCorrect={false}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.inputText, { color: theme.text }]}
                    />
                  </View>
                  <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Note (optional)"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.inputText, { color: theme.text }]}
                    />
                  </View>
                  {formError ? (
                    <Text style={{ color: theme.negative, fontSize: 13 }}>{formError}</Text>
                  ) : null}
                  <Button label="Save value" onPress={save} loading={saving} />
                </View>
              )}
            </Card>

            <SectionHeader title="History" />
            {grouped.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="create" size={36} color={theme.textSecondary} />}
                title="Nothing logged yet"
                message="Add values above to start the history."
              />
            ) : (
              grouped.map(({ metric, entries: list }) => (
                <Card key={metric?.id ?? 'unknown'} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.text }]}>
                    {metric?.name ?? 'Unknown metric'}
                  </Text>
                  {list.map((entry) => (
                    <View
                      key={entry.id}
                      style={[styles.entryRow, { borderTopColor: theme.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.entryValue, { color: theme.text }]}>
                          {formatValue(entry.value, metric?.unit)}
                        </Text>
                        {entry.note ? (
                          <Text style={[styles.entryNote, { color: theme.textSecondary }]}>
                            {entry.note}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.entryDate, { color: theme.textSecondary }]}>
                        {formatDateLong(entry.entry_date)}
                      </Text>
                      <Pressable onPress={() => confirmDelete(entry)} hitSlop={8}>
                        <Ionicons name="close" size={18} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              ))
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
  form: { gap: Spacing.two },
  inputRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    height: 48,
    justifyContent: 'center',
  },
  inputText: { fontSize: 16 },
  group: { gap: Spacing.one },
  groupTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.one },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryValue: { fontSize: 15, fontWeight: '600' },
  entryNote: { fontSize: 13, marginTop: 1 },
  entryDate: { fontSize: 13 },
});
