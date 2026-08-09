import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Database } from '@/types/database';

type Metric = Database['public']['Tables']['metrics']['Row'];

type MetricPickerProps = {
  metrics: Metric[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function MetricPicker({ metrics, selectedId, onSelect }: MetricPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {metrics.map((metric) => (
        <Chip
          key={metric.id}
          label={metric.name}
          selected={metric.id === selectedId}
          onPress={() => onSelect(metric.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.two, paddingVertical: Spacing.one },
});
