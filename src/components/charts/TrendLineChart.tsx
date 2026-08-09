import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { ChartPoint } from '@/utils/chartData';

type TrendLineChartProps = {
  data: ChartPoint[];
  /** Optional 7-day trailing-average line rendered under the values. */
  movingAverage?: ChartPoint[];
  /** Optional dashed horizontal line at a target value (active goal). */
  goalValue?: number;
  goalLabel?: string;
};

export function TrendLineChart({
  data,
  movingAverage,
  goalValue,
  goalLabel,
}: TrendLineChartProps) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
          No values logged yet.
        </Text>
      </View>
    );
  }

  return (
    <LineChart
      data={data}
      secondaryData={movingAverage && movingAverage.length > 1 ? movingAverage : undefined}
      secondaryLineConfig={
        movingAverage && movingAverage.length > 1
          ? {
              color: theme.warning,
              thickness: 2,
              hideDataPoints: true,
              strokeDashArray: [5, 4],
              curved: true,
            }
          : undefined
      }
      showReferenceLine1={goalValue != null}
      referenceLine1Position={goalValue ?? undefined}
      referenceLine1Config={
        goalValue != null
          ? {
              type: 'dashed',
              color: theme.positive,
              thickness: 1.5,
              dashWidth: 6,
              dashGap: 4,
              labelText: goalLabel,
            }
          : undefined
      }
      curved
      areaChart
      thickness={2}
      color={theme.accent}
      dataPointsColor={theme.accent}
      startFillColor={theme.accent}
      endFillColor="transparent"
      startOpacity={0.25}
      endOpacity={0}
      height={220}
      noOfSections={4}
      rulesColor={theme.border}
      yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
      xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
      focusEnabled
      showStripOnFocus
      stripColor={theme.textSecondary}
      stripOpacity={0.5}
      showValuesAsDataPointsText={data.length <= 10}
      dataPointsRadius={data.length <= 10 ? 4 : 2}
      adjustToWidth
      initialSpacing={16}
      endSpacing={16}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
