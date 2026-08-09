import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type LoadChartProps = {
  /** Daily training load, ascending by date. `label` blanked on non-anchor days. */
  data: { value: number; label: string }[];
};

export function LoadChart({ data }: LoadChartProps) {
  const theme = useTheme();

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
          Log sessions with a load value to see daily load.
        </Text>
      </View>
    );
  }

  return (
    <BarChart
      data={data.map((d) => ({ value: d.value, label: d.label, frontColor: theme.accent }))}
      height={180}
      noOfSections={3}
      spacing={4}
      barWidth={8}
      barBorderRadius={2}
      isAnimated
      rulesColor={theme.border}
      yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
      adjustToWidth
      initialSpacing={8}
      endSpacing={8}
      showFractionalValues={false}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
