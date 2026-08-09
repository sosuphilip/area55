import { parseISO } from 'date-fns';

export type TrendDirection = 'up' | 'down' | 'flat';

export type Trend = {
  direction: TrendDirection;
  /** least-squares slope per day (unit/day) */
  slope: number;
  /** % change between earliest and latest value, null when earliest is 0 */
  changePct: number | null;
  best: number;
  latest: number;
  points: number;
};

export type TrendInput = { entry_date: string; value: number };

/**
 * Trend math over logged values. `higherIsBetter` decides whether "best" is
 * the max or the min. Unit-agnostic — everything is relative to the values.
 */
export function computeTrend(
  entries: TrendInput[],
  higherIsBetter: boolean,
): Trend | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const values = sorted.map((e) => e.value);
  const latest = values[values.length - 1];
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);

  let direction: TrendDirection = 'flat';
  let slope = 0;
  let changePct: number | null = null;

  if (sorted.length >= 2) {
    const t0 = parseISO(sorted[0].entry_date).getTime();
    const days = sorted.map((e) => (parseISO(e.entry_date).getTime() - t0) / 86_400_000);
    const n = days.length;
    const meanX = days.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (days[i] - meanX) * (values[i] - meanY);
      denominator += (days[i] - meanX) ** 2;
    }
    slope = denominator === 0 ? 0 : numerator / denominator;
    direction = Math.abs(slope) < 1e-9 ? 'flat' : slope > 0 ? 'up' : 'down';

    if (values[0] !== 0) {
      changePct = ((latest - values[0]) / Math.abs(values[0])) * 100;
    }
  }

  return { direction, slope, changePct, best, latest, points: sorted.length };
}
