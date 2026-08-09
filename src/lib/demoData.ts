/**
 * Demo data loader — seeds a full AREA55 dataset for the SIGNED-IN coach.
 *
 * Unlike `supabase/seed.sql` (which runs in the SQL editor and targets the
 * oldest profile), this runs inside the app with the user's live session, so
 * every row is created with `coach_id = auth.uid()` and passes RLS. Safe to
 * re-run: metrics upsert on (coach_id, name), athletes are only inserted when
 * the name is new for this coach, entries upsert on the natural key, and
 * goals/sessions are skipped when they already exist.
 */

import { supabase } from '@/lib/supabase';
import { shiftISO, todayISO } from '@/utils/format';
import type { Database } from '@/types/database';

type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalStatus = GoalInsert['status'];

type MetricSeed = { name: string; unit: string; description: string; higher_is_better: boolean };
type AthleteSeed = { name: string; sport: string; position: string; birthdate: string; notes: string };
type EntrySeed = { athlete: string; metric: string; base: number; deltaPerWeek: number };
type GoalSeed = { athlete: string; metric: string; target: number; daysFromNow: number; status: GoalStatus; note: string };
type LoadSeed = { athlete: string; base: number; spike: number };
type LoadPattern = { d: number; weight: number };

const DEMO_METRICS: MetricSeed[] = [
  { name: '40m Sprint', unit: 's', description: 'Sprint time over 40 metres.', higher_is_better: false },
  { name: 'Vertical Jump', unit: 'cm', description: 'Counter-movement jump height.', higher_is_better: true },
  { name: 'Bench Press 1RM', unit: 'kg', description: 'One-rep max bench press.', higher_is_better: true },
  { name: 'YoYo Test', unit: 'm', description: 'Yo-Yo intermittent recovery distance.', higher_is_better: true },
  { name: 'Resting HR', unit: 'bpm', description: 'Resting heart rate, taken in the morning.', higher_is_better: false },
];

const DEMO_ATHLETES: AthleteSeed[] = [
  { name: 'Alex Johnson', sport: 'Football', position: 'Winger', birthdate: '2004-06-14', notes: 'Explosive; building aerobic base.' },
  { name: 'Marcus Reid', sport: 'Football', position: 'Striker', birthdate: '2002-03-02', notes: 'Natural finisher; form dipped recently.' },
  { name: 'Sam Osei', sport: 'Football', position: 'Midfielder', birthdate: '2003-11-21', notes: 'Consistent engine; steady worker.' },
  { name: 'Kwame Boateng', sport: 'Football', position: 'Defender', birthdate: '2005-01-30', notes: 'Young; strong upward trend.' },
  { name: 'Ama Mensah', sport: 'Basketball', position: 'Guard', birthdate: '2001-09-09', notes: 'Quick guard; smaller workload.' },
  { name: 'Kofi Danso', sport: 'Basketball', position: 'Center', birthdate: '2000-07-19', notes: 'Big body; heavy gym work.' },
];

/** 6 weekly points ending today per (athlete, metric): base at week 0, +delta/week. */
const DEMO_ENTRIES: EntrySeed[] = [
  // Alex: improving across the board
  { athlete: 'Alex Johnson', metric: '40m Sprint', base: 5.05, deltaPerWeek: -0.05 },
  { athlete: 'Alex Johnson', metric: 'Vertical Jump', base: 48, deltaPerWeek: 1.5 },
  { athlete: 'Alex Johnson', metric: 'Bench Press 1RM', base: 62, deltaPerWeek: 2.5 },
  { athlete: 'Alex Johnson', metric: 'YoYo Test', base: 1150, deltaPerWeek: 70 },
  { athlete: 'Alex Johnson', metric: 'Resting HR', base: 62, deltaPerWeek: -1.2 },
  // Marcus: declining
  { athlete: 'Marcus Reid', metric: '40m Sprint', base: 4.85, deltaPerWeek: 0.04 },
  { athlete: 'Marcus Reid', metric: 'Vertical Jump', base: 58, deltaPerWeek: -1.0 },
  { athlete: 'Marcus Reid', metric: 'Bench Press 1RM', base: 85, deltaPerWeek: 0.5 },
  { athlete: 'Marcus Reid', metric: 'YoYo Test', base: 1450, deltaPerWeek: -50 },
  { athlete: 'Marcus Reid', metric: 'Resting HR', base: 54, deltaPerWeek: 1.0 },
  // Sam: steady
  { athlete: 'Sam Osei', metric: '40m Sprint', base: 4.95, deltaPerWeek: 0.01 },
  { athlete: 'Sam Osei', metric: 'Vertical Jump', base: 52, deltaPerWeek: 0.2 },
  { athlete: 'Sam Osei', metric: 'Bench Press 1RM', base: 70, deltaPerWeek: 0.5 },
  { athlete: 'Sam Osei', metric: 'YoYo Test', base: 1300, deltaPerWeek: 10 },
  { athlete: 'Sam Osei', metric: 'Resting HR', base: 58, deltaPerWeek: -0.1 },
  // Kwame: improving
  { athlete: 'Kwame Boateng', metric: '40m Sprint', base: 5.12, deltaPerWeek: -0.06 },
  { athlete: 'Kwame Boateng', metric: 'Vertical Jump', base: 45, deltaPerWeek: 1.0 },
  { athlete: 'Kwame Boateng', metric: 'Bench Press 1RM', base: 58, deltaPerWeek: 3.0 },
  { athlete: 'Kwame Boateng', metric: 'YoYo Test', base: 1050, deltaPerWeek: 90 },
  { athlete: 'Kwame Boateng', metric: 'Resting HR', base: 66, deltaPerWeek: -1.5 },
  // Ama: partial (guard — sprint + jump only)
  { athlete: 'Ama Mensah', metric: '40m Sprint', base: 5.4, deltaPerWeek: -0.02 },
  { athlete: 'Ama Mensah', metric: 'Vertical Jump', base: 50, deltaPerWeek: 0.5 },
  // Kofi: partial (center — jump, bench, HR)
  { athlete: 'Kofi Danso', metric: 'Vertical Jump', base: 42, deltaPerWeek: 0.8 },
  { athlete: 'Kofi Danso', metric: 'Bench Press 1RM', base: 95, deltaPerWeek: 2.0 },
  { athlete: 'Kofi Danso', metric: 'Resting HR', base: 60, deltaPerWeek: -0.3 },
];

const DEMO_GOALS: GoalSeed[] = [
  { athlete: 'Alex Johnson', metric: 'Vertical Jump', target: 60, daysFromNow: 45, status: 'active', note: 'Hit 60cm by end of block' },
  { athlete: 'Marcus Reid', metric: 'Resting HR', target: 52, daysFromNow: 60, status: 'active', note: 'Lower resting HR toward 52' },
  { athlete: 'Kwame Boateng', metric: 'Bench Press 1RM', target: 80, daysFromNow: 30, status: 'active', note: 'Reach 80kg bench' },
  { athlete: 'Sam Osei', metric: 'Vertical Jump', target: 54, daysFromNow: 40, status: 'active', note: 'Improve vertical to 54cm' },
  { athlete: 'Ama Mensah', metric: '40m Sprint', target: 5.2, daysFromNow: 35, status: 'active', note: 'Shave the 40m to 5.2s' },
  { athlete: 'Kofi Danso', metric: 'Bench Press 1RM', target: 110, daysFromNow: 45, status: 'active', note: 'Push bench to 110kg' },
  { athlete: 'Sam Osei', metric: 'YoYo Test', target: 1500, daysFromNow: -15, status: 'missed', note: 'Missed the 1500m target' },
  { athlete: 'Alex Johnson', metric: '40m Sprint', target: 4.75, daysFromNow: -7, status: 'achieved', note: 'Went sub-4.75s' },
];

/** Base daily load + a spike applied to the last 7 days so athletes land in different ACWR zones. */
const DEMO_LOADS: LoadSeed[] = [
  { athlete: 'Alex Johnson', base: 300, spike: 1.9 },
  { athlete: 'Marcus Reid', base: 320, spike: 1.0 },
  { athlete: 'Sam Osei', base: 260, spike: 0.75 },
  { athlete: 'Kwame Boateng', base: 300, spike: 1.45 },
  { athlete: 'Ama Mensah', base: 280, spike: 1.0 },
  { athlete: 'Kofi Danso', base: 340, spike: 1.15 },
];

/** 28 days of load, weight 0 = rest day. d=0 is today. */
const LOAD_PATTERN: LoadPattern[] = [
  { d: 0, weight: 1.0 }, { d: 1, weight: 0.9 }, { d: 2, weight: 0.0 }, { d: 3, weight: 0.85 },
  { d: 4, weight: 0.0 }, { d: 5, weight: 1.1 }, { d: 6, weight: 1.2 }, { d: 7, weight: 0.0 },
  { d: 8, weight: 0.9 }, { d: 9, weight: 0.8 }, { d: 10, weight: 1.0 }, { d: 11, weight: 1.1 },
  { d: 12, weight: 0.0 }, { d: 13, weight: 0.95 }, { d: 14, weight: 0.9 }, { d: 15, weight: 1.05 },
  { d: 16, weight: 1.1 }, { d: 17, weight: 0.0 }, { d: 18, weight: 1.0 }, { d: 19, weight: 1.2 },
  { d: 20, weight: 0.0 }, { d: 21, weight: 1.0 }, { d: 22, weight: 1.05 }, { d: 23, weight: 1.15 },
  { d: 24, weight: 0.0 }, { d: 25, weight: 1.0 }, { d: 26, weight: 1.1 }, { d: 27, weight: 1.05 },
];

const CHUNK_SIZE = 100;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round0(v: number): number {
  return Math.round(v);
}

/** Insert/upsert in chunks so a single request stays well under PostgREST limits. */
async function upsertChunked(
  table: 'metric_entries',
  rows: Database['public']['Tables']['metric_entries']['Insert'][],
  onConflict: string,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    total += chunk.length;
  }
  return total;
}

export type DemoDataResult = {
  athletesAdded: number;
  metrics: number;
  entries: number;
  goalsAdded: number;
  sessionsAdded: number;
  message: string;
};

export async function seedDemoData(): Promise<DemoDataResult> {
  // 1. Metrics — upsert on the per-coach unique name so re-runs are harmless.
  const { data: metricRows, error: metricError } = await supabase
    .from('metrics')
    .upsert(DEMO_METRICS, { onConflict: 'coach_id,name' })
    .select('id, name');
  if (metricError) throw new Error(`metrics: ${metricError.message}`);
  const metricIdByName = new Map((metricRows ?? []).map((m) => [m.name, m.id]));

  // 2. Athletes — only insert names this coach doesn't already have.
  const { data: existingAthletes } = await supabase.from('athletes').select('id, name');
  const existingNames = new Set((existingAthletes ?? []).map((a) => a.name));
  const athletesToInsert = DEMO_ATHLETES.filter((a) => !existingNames.has(a.name));

  let athleteRows = existingAthletes ?? [];
  if (athletesToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('athletes')
      .insert(athletesToInsert)
      .select('id, name');
    if (insertError) throw new Error(`athletes: ${insertError.message}`);
    athleteRows = [...athleteRows, ...(inserted ?? [])];
  }
  const athleteIdByName = new Map(athleteRows.map((a) => [a.name, a.id]));

  // 3. Metric entries — 6 weekly points ending today per (athlete, metric).
  const today = todayISO();
  const entries: Database['public']['Tables']['metric_entries']['Insert'][] = [];
  for (const es of DEMO_ENTRIES) {
    const athleteId = athleteIdByName.get(es.athlete);
    const metricId = metricIdByName.get(es.metric);
    if (!athleteId || !metricId) continue;
    for (let w = 0; w < 6; w++) {
      entries.push({
        athlete_id: athleteId,
        metric_id: metricId,
        value: round2(es.base + es.deltaPerWeek * w),
        entry_date: shiftISO(today, -(35 - w * 7)),
      });
    }
  }
  const entriesAdded = await upsertChunked('metric_entries', entries, 'athlete_id,metric_id,entry_date');

  // 4. Goals — skip any (athlete, metric) pair this coach already targets.
  const { data: existingGoals } = await supabase.from('goals').select('athlete_id, metric_id');
  const goalKeys = new Set((existingGoals ?? []).map((g) => `${g.athlete_id}:${g.metric_id}`));
  const goals: GoalInsert[] = [];
  for (const g of DEMO_GOALS) {
    const athleteId = athleteIdByName.get(g.athlete);
    const metricId = metricIdByName.get(g.metric);
    if (!athleteId || !metricId) continue;
    const key = `${athleteId}:${metricId}`;
    if (goalKeys.has(key)) continue;
    goals.push({
      athlete_id: athleteId,
      metric_id: metricId,
      target_value: g.target,
      deadline: shiftISO(today, g.daysFromNow),
      status: g.status,
      note: g.note,
    });
  }
  let goalsAdded = 0;
  if (goals.length > 0) {
    const { data, error: goalsError } = await supabase.from('goals').insert(goals).select('id');
    if (goalsError) throw new Error(`goals: ${goalsError.message}`);
    goalsAdded = data?.length ?? 0;
  }

  // 5. Sessions with load — only for athletes who have none yet, so we never
  //    overwrite real coaching data with demo history.
  const { data: sessionRows } = await supabase.from('sessions').select('athlete_id');
  const sessionCounts = new Map<string, number>();
  for (const s of sessionRows ?? []) {
    sessionCounts.set(s.athlete_id, (sessionCounts.get(s.athlete_id) ?? 0) + 1);
  }

  const sessions: Database['public']['Tables']['sessions']['Insert'][] = [];
  for (const al of DEMO_LOADS) {
    const athleteId = athleteIdByName.get(al.athlete);
    if (!athleteId || (sessionCounts.get(athleteId) ?? 0) > 0) continue;
    for (const p of LOAD_PATTERN) {
      if (p.weight <= 0) continue;
      sessions.push({
        athlete_id: athleteId,
        session_date: shiftISO(today, -p.d),
        load: p.d <= 6 ? round0(al.base * p.weight * al.spike) : round0(al.base * p.weight),
        rating: (p.d % 5) + 1,
        notes: [10, 19, 23, 27].includes(p.d) ? 'Hard session' : null,
      });
    }
  }
  let sessionsAdded = 0;
  for (let i = 0; i < sessions.length; i += CHUNK_SIZE) {
    const chunk = sessions.slice(i, i + CHUNK_SIZE);
    const { error: sessionsError } = await supabase.from('sessions').insert(chunk);
    if (sessionsError) throw new Error(`sessions: ${sessionsError.message}`);
    sessionsAdded += chunk.length;
  }

  const athletesAdded = athletesToInsert.length;
  const message =
    `Demo data ready: ${athletesAdded} athlete(s) added, ${DEMO_METRICS.length} metrics, ` +
    `${entriesAdded} metric entries, ${goalsAdded} goals, ${sessionsAdded} sessions.`;

  return { athletesAdded, metrics: DEMO_METRICS.length, entries: entriesAdded, goalsAdded, sessionsAdded, message };
}
