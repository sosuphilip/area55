import { shiftISO } from '@/utils/format';

/**
 * Acute:Chronic Workload Ratio — the standard injury-risk indicator.
 *   acute   = sum of load over the last 7 days
 *   chronic = mean daily load over the last 28 days
 *   ACWR    = acute / chronic (≈1 at steady state; >1.5 is a warning sign)
 * Loads come from sessions.load; each session date's loads are summed first.
 */

export type LoadDay = { date: string; load: number };

/** Sum each date's session loads into a daily series, ascending by date. */
export function dailyLoads(sessions: { session_date: string; load: number | null }[]): LoadDay[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.load == null || !Number.isFinite(s.load) || s.load <= 0) continue;
    map.set(s.session_date, (map.get(s.session_date) ?? 0) + s.load);
  }
  return [...map.entries()]
    .map(([date, load]) => ({ date, load }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function acuteLoad(days: LoadDay[], date: string, window = 7): number {
  const cutoff = shiftISO(date, -(window - 1));
  return days
    .filter((d) => d.date >= cutoff && d.date <= date)
    .reduce((a, d) => a + d.load, 0);
}

export function chronicLoad(days: LoadDay[], date: string, window = 28): number {
  const cutoff = shiftISO(date, -(window - 1));
  // Standard Gabbett chronic load = 28-day total ÷ 4 (a 7-day-equivalent),
  // so a steady training week yields ACWR ≈ 1.
  return (
    days
      .filter((d) => d.date >= cutoff && d.date <= date)
      .reduce((a, d) => a + d.load, 0) /
    (window / 7)
  );
}

export type AcwrResult = { acute: number; chronic: number; acwr: number | null };

/**
 * ACWR at a single date. Returns null until there are at least
 * `minChronicDays` distinct loaded days in the 28-day window (so one session
 * doesn't produce a misleading ratio).
 */
export function acwrAt(days: LoadDay[], date: string, minChronicDays = 7): AcwrResult {
  const acute = acuteLoad(days, date);
  const cutoff = shiftISO(date, -(28 - 1));
  const chronicWindow = days.filter((d) => d.date >= cutoff && d.date <= date);
  const chronic = chronicWindow.reduce((a, d) => a + d.load, 0) / (28 / 7);
  const enough = chronicWindow.length >= minChronicDays;
  return { acute, chronic, acwr: enough && chronic > 0 ? acute / chronic : null };
}

/** Daily ACWR series over the last `points` days ending at `endDate` (for charts). */
export function acwrSeries(
  days: LoadDay[],
  endDate: string,
  points = 28,
): { date: string; acwr: number | null }[] {
  const out: { date: string; acwr: number | null }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const date = shiftISO(endDate, -i);
    out.push({ date, acwr: acwrAt(days, date).acwr });
  }
  return out;
}

export type AcwrZone = 'undertrained' | 'optimal' | 'caution' | 'elevated' | 'nodata';

export function acwrZone(acwr: number | null): AcwrZone {
  if (acwr == null) return 'nodata';
  if (acwr < 0.8) return 'undertrained';
  if (acwr <= 1.3) return 'optimal';
  if (acwr <= 1.5) return 'caution';
  return 'elevated';
}

export const ACWR_ZONE_LABEL: Record<AcwrZone, string> = {
  undertrained: 'Undertraining',
  optimal: 'Optimal',
  caution: 'Caution',
  elevated: 'Elevated risk',
  nodata: 'Not enough data',
};
