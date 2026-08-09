/**
 * One-off ops script: creates the AREA55 presentation demo account on the live
 * Supabase backend and seeds it with the same dataset the app's "Load demo
 * data" button produces (mirrors src/lib/demoData.ts — keep them in sync).
 *
 * Usage:  node scripts/create-demo-account.mjs   (run from omniroute-app/)
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY from .env.
 * If email confirmation is ON, sign-up returns no session; the confirmation
 * link must be clicked once, then this script is re-run to finish seeding.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@area55.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'area55demo';

// ---- .env ------------------------------------------------------------------
const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
const supabase = createClient(url, anonKey);

// ---- date helpers ----------------------------------------------------------
function localDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const today = localDateISO(new Date());
function shiftISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateISO(new Date(y, m - 1, d + days));
}

// ---- demo dataset (mirror of src/lib/demoData.ts) --------------------------
const METRICS = [
  { name: '40m Sprint', unit: 's', description: 'Sprint time over 40 metres.', higher_is_better: false },
  { name: 'Vertical Jump', unit: 'cm', description: 'Counter-movement jump height.', higher_is_better: true },
  { name: 'Bench Press 1RM', unit: 'kg', description: 'One-rep max bench press.', higher_is_better: true },
  { name: 'YoYo Test', unit: 'm', description: 'Yo-Yo intermittent recovery distance.', higher_is_better: true },
  { name: 'Resting HR', unit: 'bpm', description: 'Resting heart rate, taken in the morning.', higher_is_better: false },
];
const ATHLETES = [
  { name: 'Alex Johnson', sport: 'Football', position: 'Winger', birthdate: '2004-06-14', notes: 'Explosive; building aerobic base.' },
  { name: 'Marcus Reid', sport: 'Football', position: 'Striker', birthdate: '2002-03-02', notes: 'Natural finisher; form dipped recently.' },
  { name: 'Sam Osei', sport: 'Football', position: 'Midfielder', birthdate: '2003-11-21', notes: 'Consistent engine; steady worker.' },
  { name: 'Kwame Boateng', sport: 'Football', position: 'Defender', birthdate: '2005-01-30', notes: 'Young; strong upward trend.' },
  { name: 'Ama Mensah', sport: 'Basketball', position: 'Guard', birthdate: '2001-09-09', notes: 'Quick guard; smaller workload.' },
  { name: 'Kofi Danso', sport: 'Basketball', position: 'Center', birthdate: '2000-07-19', notes: 'Big body; heavy gym work.' },
];
const ENTRIES = [
  { athlete: 'Alex Johnson', metric: '40m Sprint', base: 5.05, deltaPerWeek: -0.05 },
  { athlete: 'Alex Johnson', metric: 'Vertical Jump', base: 48, deltaPerWeek: 1.5 },
  { athlete: 'Alex Johnson', metric: 'Bench Press 1RM', base: 62, deltaPerWeek: 2.5 },
  { athlete: 'Alex Johnson', metric: 'YoYo Test', base: 1150, deltaPerWeek: 70 },
  { athlete: 'Alex Johnson', metric: 'Resting HR', base: 62, deltaPerWeek: -1.2 },
  { athlete: 'Marcus Reid', metric: '40m Sprint', base: 4.85, deltaPerWeek: 0.04 },
  { athlete: 'Marcus Reid', metric: 'Vertical Jump', base: 58, deltaPerWeek: -1.0 },
  { athlete: 'Marcus Reid', metric: 'Bench Press 1RM', base: 85, deltaPerWeek: 0.5 },
  { athlete: 'Marcus Reid', metric: 'YoYo Test', base: 1450, deltaPerWeek: -50 },
  { athlete: 'Marcus Reid', metric: 'Resting HR', base: 54, deltaPerWeek: 1.0 },
  { athlete: 'Sam Osei', metric: '40m Sprint', base: 4.95, deltaPerWeek: 0.01 },
  { athlete: 'Sam Osei', metric: 'Vertical Jump', base: 52, deltaPerWeek: 0.2 },
  { athlete: 'Sam Osei', metric: 'Bench Press 1RM', base: 70, deltaPerWeek: 0.5 },
  { athlete: 'Sam Osei', metric: 'YoYo Test', base: 1300, deltaPerWeek: 10 },
  { athlete: 'Sam Osei', metric: 'Resting HR', base: 58, deltaPerWeek: -0.1 },
  { athlete: 'Kwame Boateng', metric: '40m Sprint', base: 5.12, deltaPerWeek: -0.06 },
  { athlete: 'Kwame Boateng', metric: 'Vertical Jump', base: 45, deltaPerWeek: 1.0 },
  { athlete: 'Kwame Boateng', metric: 'Bench Press 1RM', base: 58, deltaPerWeek: 3.0 },
  { athlete: 'Kwame Boateng', metric: 'YoYo Test', base: 1050, deltaPerWeek: 90 },
  { athlete: 'Kwame Boateng', metric: 'Resting HR', base: 66, deltaPerWeek: -1.5 },
  { athlete: 'Ama Mensah', metric: '40m Sprint', base: 5.4, deltaPerWeek: -0.02 },
  { athlete: 'Ama Mensah', metric: 'Vertical Jump', base: 50, deltaPerWeek: 0.5 },
  { athlete: 'Kofi Danso', metric: 'Vertical Jump', base: 42, deltaPerWeek: 0.8 },
  { athlete: 'Kofi Danso', metric: 'Bench Press 1RM', base: 95, deltaPerWeek: 2.0 },
  { athlete: 'Kofi Danso', metric: 'Resting HR', base: 60, deltaPerWeek: -0.3 },
];
const GOALS = [
  { athlete: 'Alex Johnson', metric: 'Vertical Jump', target: 60, daysFromNow: 45, status: 'active', note: 'Hit 60cm by end of block' },
  { athlete: 'Marcus Reid', metric: 'Resting HR', target: 52, daysFromNow: 60, status: 'active', note: 'Lower resting HR toward 52' },
  { athlete: 'Kwame Boateng', metric: 'Bench Press 1RM', target: 80, daysFromNow: 30, status: 'active', note: 'Reach 80kg bench' },
  { athlete: 'Sam Osei', metric: 'Vertical Jump', target: 54, daysFromNow: 40, status: 'active', note: 'Improve vertical to 54cm' },
  { athlete: 'Ama Mensah', metric: '40m Sprint', target: 5.2, daysFromNow: 35, status: 'active', note: 'Shave the 40m to 5.2s' },
  { athlete: 'Kofi Danso', metric: 'Bench Press 1RM', target: 110, daysFromNow: 45, status: 'active', note: 'Push bench to 110kg' },
  { athlete: 'Sam Osei', metric: 'YoYo Test', target: 1500, daysFromNow: -15, status: 'missed', note: 'Missed the 1500m target' },
  { athlete: 'Alex Johnson', metric: '40m Sprint', target: 4.75, daysFromNow: -7, status: 'achieved', note: 'Went sub-4.75s' },
];
const LOADS = [
  { athlete: 'Alex Johnson', base: 300, spike: 1.9 },
  { athlete: 'Marcus Reid', base: 320, spike: 1.0 },
  { athlete: 'Sam Osei', base: 260, spike: 0.75 },
  { athlete: 'Kwame Boateng', base: 300, spike: 1.45 },
  { athlete: 'Ama Mensah', base: 280, spike: 1.0 },
  { athlete: 'Kofi Danso', base: 340, spike: 1.15 },
];
const LOAD_PATTERN = [
  { d: 0, weight: 1.0 }, { d: 1, weight: 0.9 }, { d: 2, weight: 0.0 }, { d: 3, weight: 0.85 },
  { d: 4, weight: 0.0 }, { d: 5, weight: 1.1 }, { d: 6, weight: 1.2 }, { d: 7, weight: 0.0 },
  { d: 8, weight: 0.9 }, { d: 9, weight: 0.8 }, { d: 10, weight: 1.0 }, { d: 11, weight: 1.1 },
  { d: 12, weight: 0.0 }, { d: 13, weight: 0.95 }, { d: 14, weight: 0.9 }, { d: 15, weight: 1.05 },
  { d: 16, weight: 1.1 }, { d: 17, weight: 0.0 }, { d: 18, weight: 1.0 }, { d: 19, weight: 1.2 },
  { d: 20, weight: 0.0 }, { d: 21, weight: 1.0 }, { d: 22, weight: 1.05 }, { d: 23, weight: 1.15 },
  { d: 24, weight: 0.0 }, { d: 25, weight: 1.0 }, { d: 26, weight: 1.1 }, { d: 27, weight: 1.05 },
];

const round2 = (v) => Math.round(v * 100) / 100;
const round0 = (v) => Math.round(v);

async function upsertChunked(rows, onConflict) {
  let total = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('metric_entries').upsert(chunk, { onConflict });
    if (error) throw new Error(`metric_entries: ${error.message}`);
    total += chunk.length;
  }
  return total;
}

async function seed(supabase) {
  const { data: metricRows, error: me } = await supabase
    .from('metrics').upsert(METRICS, { onConflict: 'coach_id,name' }).select('id, name');
  if (me) throw new Error(`metrics: ${me.message}`);
  const metricId = new Map(metricRows.map((m) => [m.name, m.id]));

  const { data: existingAthletes } = await supabase.from('athletes').select('id, name');
  const existingNames = new Set(existingAthletes.map((a) => a.name));
  const toInsert = ATHLETES.filter((a) => !existingNames.has(a.name));
  let athleteRows = existingAthletes;
  if (toInsert.length) {
    const { data: ins, error: ae } = await supabase.from('athletes').insert(toInsert).select('id, name');
    if (ae) throw new Error(`athletes: ${ae.message}`);
    athleteRows = [...athleteRows, ...ins];
  }
  const athleteId = new Map(athleteRows.map((a) => [a.name, a.id]));

  const entries = [];
  for (const es of ENTRIES) {
    const aid = athleteId.get(es.athlete);
    const mid = metricId.get(es.metric);
    if (!aid || !mid) continue;
    for (let w = 0; w < 6; w++) {
      entries.push({
        athlete_id: aid, metric_id: mid,
        value: round2(es.base + es.deltaPerWeek * w),
        entry_date: shiftISO(today, -(35 - w * 7)),
      });
    }
  }
  const entriesAdded = await upsertChunked(entries, 'athlete_id,metric_id,entry_date');

  const { data: existingGoals } = await supabase.from('goals').select('athlete_id, metric_id');
  const goalKeys = new Set(existingGoals.map((g) => `${g.athlete_id}:${g.metric_id}`));
  const goals = GOALS.filter((g) => {
    const aid = athleteId.get(g.athlete);
    const mid = metricId.get(g.metric);
    return aid && mid && !goalKeys.has(`${aid}:${mid}`);
  }).map((g) => ({
    athlete_id: athleteId.get(g.athlete), metric_id: metricId.get(g.metric),
    target_value: g.target, deadline: shiftISO(today, g.daysFromNow), status: g.status, note: g.note,
  }));
  let goalsAdded = 0;
  if (goals.length) {
    const { data, error: ge } = await supabase.from('goals').insert(goals).select('id');
    if (ge) throw new Error(`goals: ${ge.message}`);
    goalsAdded = data.length;
  }

  const { data: sessionRows } = await supabase.from('sessions').select('athlete_id');
  const counts = new Map();
  for (const s of sessionRows) counts.set(s.athlete_id, (counts.get(s.athlete_id) ?? 0) + 1);
  const sessions = [];
  for (const al of LOADS) {
    const aid = athleteId.get(al.athlete);
    if (!aid || (counts.get(aid) ?? 0) > 0) continue;
    for (const p of LOAD_PATTERN) {
      if (p.weight <= 0) continue;
      sessions.push({
        athlete_id: aid, session_date: shiftISO(today, -p.d),
        load: p.d <= 6 ? round0(al.base * p.weight * al.spike) : round0(al.base * p.weight),
        rating: (p.d % 5) + 1,
        notes: [10, 19, 23, 27].includes(p.d) ? 'Hard session' : null,
      });
    }
  }
  let sessionsAdded = 0;
  for (let i = 0; i < sessions.length; i += 100) {
    const { error: se } = await supabase.from('sessions').insert(sessions.slice(i, i + 100));
    if (se) throw new Error(`sessions: ${se.message}`);
    sessionsAdded += Math.min(100, sessions.length - i);
  }

  return { athletesAdded: toInsert.length, entries: entriesAdded, goalsAdded, sessionsAdded };
}

// ---- main ------------------------------------------------------------------
async function getSession() {
  const { data: existing, error: existingError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (!existingError && existing.session) return existing.session;

  const { data, error } = await supabase.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (error) {
    if (/already registered/i.test(error.message)) {
      console.error(`\n"${DEMO_EMAIL}" already exists but can't sign in (still unconfirmed).`);
      console.error('Re-run with a fresh email, e.g.:');
      console.error('  $env:DEMO_EMAIL="demo@area55.dev"; node scripts/create-demo-account.mjs');
      process.exit(1);
    }
    console.error('Sign-up failed:', error.message);
    process.exit(1);
  }
  if (!data.session) {
    console.log('\n⚠️  Email confirmation is STILL ON — signup only created a pending account.');
    console.log('   Turn it OFF in Supabase → Authentication → Sign In / Providers, then re-run.');
    process.exit(0);
  }
  return data.session;
}
const session = await getSession();
console.log('Signed in as', DEMO_EMAIL, '— seeding demo data…');

const result = await seed(supabase);
console.log(`\n✅ Demo account ready — sign in with:`);
console.log(`   email:    ${DEMO_EMAIL}`);
console.log(`   password: ${DEMO_PASSWORD}`);
console.log(
  `\n   Seeded: ${result.athletesAdded} athletes, ${METRICS.length} metrics, ` +
  `${result.entries} entries, ${result.goalsAdded} goals, ${result.sessionsAdded} sessions.`,
);
