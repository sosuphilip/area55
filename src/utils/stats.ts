import { parseISO } from 'date-fns';

import { shiftISO, todayISO } from '@/utils/format';
import type { TrendDirection } from '@/utils/trend';

export type RangeKey = 'all' | '90' | '30' | '7';

export const RANGE_KEYS: RangeKey[] = ['all', '90', '30', '7'];

/** Keep entries whose entry_date falls within the last N days. 'all' returns everything. */
export function filterByRange<T extends { entry_date: string }>(entries: T[], range: RangeKey): T[] {
  if (range === 'all') return entries;
  const cutoff = shiftISO(todayISO(), -(Number(range) - 1));
  return entries.filter((e) => e.entry_date >= cutoff);
}

export type StatSummary = {
  count: number;
  latest: number | null;
  best: number | null;
  worst: number | null;
  average: number | null;
  last7Average: number | null;
  stdDev: number | null;
  /** Coefficient of variation (std/mean) as a percentage. */
  cvPct: number | null;
  /** % change between the earliest and latest value. */
  changePct: number | null;
  /** Least-squares slope per day. */
  slope: number;
  direction: TrendDirection;
  bestDate: string | null;
  best30d: number | null;
  best30dDate: string | null;
};

const EMPTY: StatSummary = {
  count: 0,
  latest: null,
  best: null,
  worst: null,
  average: null,
  last7Average: null,
  stdDev: null,
  cvPct: null,
  changePct: null,
  slope: 0,
  direction: 'flat',
  bestDate: null,
  best30d: null,
  best30dDate: null,
};

/** One-stop summary of a metric's logged values. `higherIsBetter` picks max/min. */
export function summarizeEntries(
  entries: { entry_date: string; value: number }[],
  higherIsBetter: boolean,
): StatSummary {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  if (sorted.length === 0) return EMPTY;

  const values = sorted.map((e) => e.value);
  const latest = values[values.length - 1];
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
  const worst = higherIsBetter ? Math.min(...values) : Math.max(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const bestDate = sorted[values.indexOf(best)].entry_date;

  const variance = values.reduce((acc, v) => acc + (v - average) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cvPct = average === 0 ? null : (stdDev / Math.abs(average)) * 100;

  const today = todayISO();
  const last7 = sorted.filter((e) => e.entry_date >= shiftISO(today, -6));
  const last7Average = last7.length
    ? last7.reduce((a, e) => a + e.value, 0) / last7.length
    : null;

  let changePct: number | null = null;
  if (values[0] !== 0) changePct = ((latest - values[0]) / Math.abs(values[0])) * 100;

  let slope = 0;
  let direction: TrendDirection = 'flat';
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
  }

  const last30 = sorted.filter((e) => e.entry_date >= shiftISO(today, -29));
  let best30d: number | null = null;
  let best30dDate: string | null = null;
  if (last30.length > 0) {
    const last30Values = last30.map((e) => e.value);
    best30d = higherIsBetter ? Math.max(...last30Values) : Math.min(...last30Values);
    best30dDate = last30[last30Values.indexOf(best30d)].entry_date;
  }

  return {
    count: sorted.length,
    latest,
    best,
    worst,
    average,
    last7Average,
    stdDev,
    cvPct,
    changePct,
    slope,
    direction,
    bestDate,
    best30d,
    best30dDate,
  };
}

/** 7-day trailing mean, computed at each entry point over real calendar dates. */
export function movingAverage(
  entries: { entry_date: string; value: number }[],
  windowDays = 7,
): { entry_date: string; value: number }[] {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  return sorted.map((e, i) => {
    const windowStart = shiftISO(e.entry_date, -(windowDays - 1));
    const window = sorted.slice(0, i + 1).filter((x) => x.entry_date >= windowStart);
    const value = window.reduce((a, x) => a + x.value, 0) / window.length;
    return { entry_date: e.entry_date, value };
  });
}
