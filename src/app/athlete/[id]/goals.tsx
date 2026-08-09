import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AthleteNav } from '@/components/AthleteNav';
import { MetricPicker } from '@/components/MetricPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Card, EmptyState, Screen, SectionHeader, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete } from '@/hooks/useAthletes';
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from '@/hooks/useGoals';
import { useLatestEntries } from '@/hooks/useLatestEntries';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/errors';
import { formatDateInput, formatDateLong, formatValue } from '@/utils/format';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalStatus = Database['public']['Tables']['goals']['Update']['status'];

export default function GoalsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const { data: athlete } = useAthlete(id);
  const { data: goals, isLoading } = useGoals(id);
  const { data: metrics } = useMetrics();
  const { data: latest } = useLatestEntries(id);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [metricId, setMetricId] = useState<string | null>(null);
  const [targetText, setTargetText] = useState('');
  const [deadlineText, setDeadlineText] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!metricId && metrics && metrics.length > 0) setMetricId(metrics[0].id);
  }, [metrics, metricId]);

  const latestByMetric = new Map(latest?.map((e) => [e.metric_id, e.value]));

  const save = async () => {
    const target = parseFloat(targetText);
    if (!metricId) return setFormError('Pick a metric.');
    if (Number.isNaN(target)) return setFormError('Enter a target value.');
    if (deadlineText.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineText.trim()))
      return setFormError('Deadline must be YYYY-MM-DD.');
    setSaving(true);
    setFormError(null);
    try {
      await createGoal.mutateAsync({
        athlete_id: id,
        metric_id: metricId,
        target_value: target,
        deadline: deadlineText.trim() || null,
        note: note.trim() || null,
      });
      setTargetText('');
      setDeadlineText('');
      setNote('');
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (goal: Goal, status: GoalStatus) => {
    updateGoal.mutate(
      { id: goal.id, status },
      { onError: (e) => Alert.alert('Error', errorMessage(e)) },
    );
  };

  const confirmDelete = (goal: Goal) => {
    confirmDestructive(
      'Delete goal',
      `Remove the ${metricName(goal.metric_id)} goal?`,
      () =>
        deleteGoal.mutate(goal.id, {
          onError: (e) => Alert.alert('Error', errorMessage(e)),
        }),
    );
  };

  const metricName = (metricId_: string) => metrics?.find((m) => m.id === metricId_)?.name ?? 'Metric';

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Goals" subtitle={athlete?.name} showBack />
        <AthleteNav id={id} active="goals" />

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
              <SectionHeader title="New goal" />
              {!metrics || metrics.length === 0 ? (
                <EmptyState title="No metrics yet" message="Define a metric before setting a goal." />
              ) : (
                <View style={styles.form}>
                  <MetricPicker metrics={metrics} selectedId={metricId} onSelect={setMetricId} />
                  <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <TextInput
                      value={targetText}
                      onChangeText={setTargetText}
                      keyboardType="decimal-pad"
                      placeholder={`Target value${metrics.find((m) => m.id === metricId)?.unit ? ` (${metrics.find((m) => m.id === metricId)?.unit})` : ''}`}
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.inputText, { color: theme.text }]}
                    />
                  </View>
                  <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <TextInput
                      value={deadlineText}
                      onChangeText={(t) => setDeadlineText(formatDateInput(t))}
                      autoCorrect={false}
                      placeholder="Deadline YYYY-MM-DD (optional)"
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
                  <Button label="Create goal" onPress={save} loading={saving} />
                </View>
              )}
            </Card>

            <SectionHeader title="Active goals" />
            {!goals || goals.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="flag" size={36} color={theme.textSecondary} />}
                title="No goals yet"
                message="Set a target to give your athlete something to chase."
              />
            ) : (
              goals.map((goal) => {
                const metric = metrics?.find((m) => m.id === goal.metric_id);
                const current = latestByMetric.get(goal.metric_id);
                return (
                  <Card key={goal.id}>
                    <View style={styles.goalTop}>
                      <Text style={[styles.goalName, { color: theme.text }]}>
                        {metricName(goal.metric_id)}
                      </Text>
                      <View
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor:
                              goal.status === 'achieved'
                                ? theme.positive
                                : goal.status === 'missed'
                                  ? theme.negative
                                  : theme.backgroundSelected,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                goal.status === 'active'
                                  ? theme.textSecondary
                                  : theme.accentContrast,
                            },
                          ]}
                        >
                          {goal.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.goalTarget, { color: theme.text }]}>
                      Target {formatValue(goal.target_value, metric?.unit)}
                      {goal.deadline ? ` · ${formatDateLong(goal.deadline)}` : ''}
                    </Text>
                    {current != null ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                        Current {formatValue(current, metric?.unit)}
                      </Text>
                    ) : null}
                    {goal.note ? (
                      <Text style={[styles.goalNote, { color: theme.textSecondary }]}>{goal.note}</Text>
                    ) : null}

                    <View style={styles.actions}>
                      {goal.status !== 'achieved' ? (
                        <Button
                          label="Achieved"
                          variant="secondary"
                          style={styles.actionBtn}
                          onPress={() => changeStatus(goal, 'achieved')}
                        />
                      ) : null}
                      {goal.status !== 'missed' ? (
                        <Button
                          label="Missed"
                          variant="secondary"
                          style={styles.actionBtn}
                          onPress={() => changeStatus(goal, 'missed')}
                        />
                      ) : null}
                      {goal.status !== 'archived' ? (
                        <Button
                          label="Archive"
                          variant="ghost"
                          style={styles.actionBtn}
                          onPress={() => changeStatus(goal, 'archived')}
                        />
                      ) : null}
                      <Pressable onPress={() => confirmDelete(goal)} hitSlop={8} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color={theme.negative} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })
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
  input: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    height: 48,
    justifyContent: 'center',
  },
  inputText: { fontSize: 16 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  goalName: { fontSize: 16, fontWeight: '700', flex: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  goalTarget: { fontSize: 16, marginTop: Spacing.two, fontWeight: '600' },
  goalNote: { fontSize: 14, marginTop: Spacing.two, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three, alignItems: 'center' },
  actionBtn: { flex: 1 },
  deleteBtn: { padding: Spacing.two },
});
