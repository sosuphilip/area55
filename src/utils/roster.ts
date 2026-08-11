import { compositeScore, perMetricScore, scoreDelta30d } from '@/utils/score';
import { goalProgress } from '@/utils/goalProgress';

/**
 * Team-wide roll-up for the Athletes tab. For each athlete:
 *   composite      — mean of their per-metric 0–100 scores
 *   goalProgress   — % of the way to their primary ACTIVE goal (0–100)
 *   goalMetric     — the metric that primary goal targets
 *   delta          — mean composite-score change over the trailing 30 days
 *   status         — leader / improving / declining / steady / nodata
 *   headlineMetric — the name of their best-scoring metric
 * Status thresholds: leader = top composite in the squad; improving ≥ +3;
 * declining ≤ −3; otherwise steady. No entries ⇒ nodata.
 */

export type RosterStatus = 'leader' | 'improving' | 'declining' | 'steady' | 'nodata';

export type RosterRow = {
  athleteId: string;
  composite: number | null;
  goalProgress: number | null;
  goalMetric: string | null;
  delta: number | null;
  status: RosterStatus;
  headlineMetric: string | null;
};

type AthleteLike = { id: string };
type MetricLike = { id: string; name: string; higher_is_better: boolean };
type EntryLike = { athlete_id: string; metric_id: string; entry_date: string; value: number };
type GoalLike = {
  athlete_id: string;
  metric_id: string;
  target_value: number;
  deadline: string | null;
  status: string;
};

export function buildRosterRows(
  athletes: AthleteLike[],
  metrics: MetricLike[],
  entries: EntryLike[],
  goals: GoalLike[] = [],
): Map<string, RosterRow> {
  const byAthlete = new Map<string, EntryLike[]>();
  for (const e of entries) {
    const list = byAthlete.get(e.athlete_id) ?? [];
    list.push(e);
    byAthlete.set(e.athlete_id, list);
  }
  const metricName = new Map(metrics.map((m) => [m.id, m.name]));
  const metricHigher = new Map(metrics.map((m) => [m.id, m.higher_is_better]));

  // Active goals, grouped by athlete (primary = the one with the earliest deadline).
  const goalsByAthlete = new Map<string, GoalLike[]>();
  for (const g of goals) {
    if (g.status !== 'active') continue;
    const list = goalsByAthlete.get(g.athlete_id) ?? [];
    list.push(g);
    goalsByAthlete.set(g.athlete_id, list);
  }

  const rows = new Map<string, RosterRow>();
  for (const a of athletes) {
    rows.set(a.id, {
      athleteId: a.id,
      composite: null,
      goalProgress: null,
      goalMetric: null,
      delta: null,
      status: 'nodata',
      headlineMetric: null,
    });
  }

  // First pass — composites, and track the squad's best.
  // Only ONE athlete can be 'leader' — the first one whose composite equals
  // the max. Ties are broken by roster order so the chip is deterministic.
  let bestComposite: number | null = null;
  let leaderId: string | null = null;
  for (const a of athletes) {
    const athleteEntries = byAthlete.get(a.id) ?? [];
    const metricIds = new Set(athleteEntries.map((e) => e.metric_id));
    const scores: number[] = [];
    for (const mid of metricIds) {
      const s = perMetricScore(
        athleteEntries.filter((e) => e.metric_id === mid),
        metricHigher.get(mid) ?? true,
      );
      if (s != null) scores.push(s);
    }
    const composite = compositeScore(scores);
    rows.get(a.id)!.composite = composite;
    if (composite != null && (bestComposite == null || composite > bestComposite)) {
      bestComposite = composite;
      leaderId = a.id;
    }
  }

  // Second pass — deltas, headline metric, status.
  for (const a of athletes) {
    const row = rows.get(a.id)!;
    if (row.composite == null) continue;
    const athleteEntries = byAthlete.get(a.id) ?? [];
    const metricIds = new Set(athleteEntries.map((e) => e.metric_id));

    const deltas: number[] = [];
    let headlineId: string | null = null;
    let headlineScore = -1;
    for (const mid of metricIds) {
      const higher = metricHigher.get(mid) ?? true;
      const metricEntries = athleteEntries.filter((e) => e.metric_id === mid);
      const d = scoreDelta30d(metricEntries, higher);
      if (d != null) deltas.push(d);
      const s = perMetricScore(metricEntries, higher);
      if (s != null && s > headlineScore) {
        headlineScore = s;
        headlineId = mid;
      }
    }

    row.delta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
    row.headlineMetric = headlineId ? (metricName.get(headlineId) ?? null) : null;

    // Goal progress — pick the active goal with the earliest deadline that has data.
    let primary: { progress: number; metric: string; deadline: string } | null = null;
    for (const g of goalsByAthlete.get(a.id) ?? []) {
      const higher = metricHigher.get(g.metric_id) ?? true;
      const progress = goalProgress(
        athleteEntries.filter((e) => e.metric_id === g.metric_id),
        g.target_value,
        higher,
      );
      if (progress == null) continue;
      const deadline = g.deadline ?? '9999-12-31';
      if (primary == null || deadline < primary.deadline) {
        primary = { progress, metric: metricName.get(g.metric_id) ?? 'Goal', deadline };
      }
    }
    if (primary) {
      row.goalProgress = primary.progress;
      row.goalMetric = primary.metric;
    }

    if (a.id === leaderId) {
      row.status = 'leader';
    } else if (row.delta == null) {
      row.status = 'steady';
    } else if (row.delta >= 3) {
      row.status = 'improving';
    } else if (row.delta <= -3) {
      row.status = 'declining';
    } else {
      row.status = 'steady';
    }
  }

  return rows;
}
