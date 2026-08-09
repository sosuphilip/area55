import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type ScoreRingProps = {
  score: number | null;
  size?: number;
};

/**
 * 0–100 score as a partial-fill progress ring. The filled arc = score/100 of
 * the circumference, color-banded: ≥80 green, ≥50 amber, else red. The faint
 * track shows the "100" baseline so a score reads as a fraction, not a badge.
 */
export function ScoreRing({ score, size = 64 }: ScoreRingProps) {
  const theme = useTheme();
  const color =
    score == null
      ? theme.textSecondary
      : score >= 80
        ? theme.positive
        : score >= 50
          ? theme.warning
          : theme.negative;

  const stroke = Math.max(3, size * 0.07);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = score == null ? 0 : Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Baseline track — always full, so the arc reads as a fraction of 100. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.border}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc — rotated so it starts at 12 o'clock. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={[styles.value, { color, fontSize: size * 0.3 }]}>
        {score ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  value: { position: 'absolute', fontWeight: '800' },
});
