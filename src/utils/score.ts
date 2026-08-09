import { shiftISO, todayISO } from '@/utils/format';

/**
 * 0–100 performance scoring, normalized to the athlete's OWN all-time best.
 * - higher_is_better: latest / best × 100  (best = max)
 * - lower_is_better:  best / latest × 100  (best = min)
 * Clamped 0–100 and rounded. Returns null when there's nothing to normalize
 * (no entries, or best is 0).
 */

function scoreOf(value: number, best: number, higherIsBetter: boolean): number {
  const raw = higherIsBetter ? (value / best) * 100 : (best / value) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function perMetricScore(
  entries: { entry_date: string; value: number }[],
  higherIsBetter: boolean,
): number | null {
  if (entries.length === 0) return null;
  const values = entries.map((e) => e.value);
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
  if (best <= 0) return null;
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  return scoreOf(sorted[sorted.length - 1].value, best, higherIsBetter);
}

/** Mean of the non-null scores — the athlete's composite performance score. */
export function compositeScore(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/**
 * Composite-score change over the trailing `days` window: scores the latest
 * value ≥ `days` old against the same all-time best, then returns
 * score(now) − score(then). Null when there's no data that far back or the
 * best is 0 (not normalizable).
 */
export function scoreDelta30d(
  entries: { entry_date: string; value: number }[],
  higherIsBetter: boolean,
  days = 30,
): number | null {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  if (sorted.length === 0) return null;
  const values = sorted.map((e) => e.value);
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
  if (best <= 0) return null;

  const cutoff = shiftISO(todayISO(), -days);
  const older = sorted.filter((e) => e.entry_date <= cutoff);
  if (older.length === 0) return null;

  const now = sorted[sorted.length - 1].value;
  const then = older[older.length - 1].value;
  return scoreOf(now, best, higherIsBetter) - scoreOf(then, best, higherIsBetter);
}

/** Per-metric scores for one athlete, keyed by metric id. */
export type ScoreMap = Map<string, number | null>;

export function athleteScores(
  entries: { athlete_id: string; metric_id: string; entry_date: string; value: number }[],
  metrics: { id: string; higher_is_better: boolean }[],
  athleteId: string,
): ScoreMap {
  const byMetric = new Map<string, { entry_date: string; value: number }[]>();
  for (const e of entries) {
    if (e.athlete_id !== athleteId) continue;
    const list = byMetric.get(e.metric_id) ?? [];
    list.push(e);
    byMetric.set(e.metric_id, list);
  }
  const out: ScoreMap = new Map();
  for (const m of metrics) {
    const list = byMetric.get(m.id);
    out.set(m.id, list ? perMetricScore(list, m.higher_is_better) : null);
  }
  return out;
}
