import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Field, Screen, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCreateMetric, useMetrics, useUpdateMetric } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';
import { errorMessage } from '@/utils/errors';

type Metric = Database['public']['Tables']['metrics']['Row'];

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80, 'Keep the name under 80 characters.'),
  unit: z.string().trim().max(30),
  description: z.string().max(300),
  higher_is_better: z.boolean(),
});

export default function MetricFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: metrics, isLoading } = useMetrics();
  const editing = metrics?.find((m) => m.id === id);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Metric" showBack />
        <Spinner label="Loading…" />
      </Screen>
    );
  }

  return <MetricForm key={editing?.id ?? 'new'} initial={editing} />;
}

function MetricForm({ initial }: { initial?: Metric }) {
  const router = useRouter();
  const theme = useTheme();
  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();

  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [higherIsBetter, setHigherIsBetter] = useState(initial?.higher_is_better ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const result = schema.safeParse({ name, unit, description, higher_is_better: higherIsBetter });
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') next[key] = issue.message;
      });
      setErrors(next);
      return;
    }
    const values = {
      name: result.data.name,
      unit: result.data.unit,
      description: result.data.description || null,
      higher_is_better: result.data.higher_is_better,
    };
    setSubmitting(true);
    setGeneralError(null);
    try {
      if (initial) {
        await updateMetric.mutateAsync({ id: initial.id, ...values });
      } else {
        await createMetric.mutateAsync(values);
      }
      router.back();
    } catch (e) {
      setGeneralError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={initial ? 'Edit metric' : 'New metric'} showBack />
      <View style={styles.form}>
        <Field
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="40m Sprint"
          error={errors.name}
        />
        <Field
          label="Unit"
          value={unit}
          onChangeText={setUnit}
          placeholder="s, ml/kg/min, kg…"
          error={errors.unit}
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What does this measure?"
          multiline
          numberOfLines={3}
          error={errors.description}
        />

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Higher is better</Text>
            <Text style={[styles.toggleHint, { color: theme.textSecondary }]}>
              Off = lower values are better (e.g. sprint time)
            </Text>
          </View>
          <Switch
            value={higherIsBetter}
            onValueChange={setHigherIsBetter}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          />
        </View>

        {generalError ? (
          <Text style={{ color: theme.negative, fontSize: 14 }}>{generalError}</Text>
        ) : null}

        <Button label={initial ? 'Save changes' : 'Create metric'} onPress={submit} loading={submitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  toggleTitle: { fontSize: 16, fontWeight: '600' },
  toggleHint: { fontSize: 13, marginTop: 2 },
});
