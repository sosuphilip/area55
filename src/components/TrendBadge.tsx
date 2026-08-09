import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Trend } from '@/utils/trend';

type TrendBadgeProps = {
  trend: Trend;
  higherIsBetter: boolean;
};

export function TrendBadge({ trend, higherIsBetter }: TrendBadgeProps) {
  const theme = useTheme();

  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  // "better" means: improving when higher is better, declining when lower is better.
  const isBetter =
    trend.direction !== 'flat' && (trend.direction === 'up') === higherIsBetter;
  const color =
    trend.direction === 'flat'
      ? theme.textSecondary
      : isBetter
        ? theme.positive
        : theme.negative;
  const pct =
    trend.changePct == null ? '' : ` ${Math.abs(trend.changePct).toFixed(0)}%`;

  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.text, { color }]}>
        {arrow}
        {pct}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  text: { fontSize: 13, fontWeight: '700' },
});
