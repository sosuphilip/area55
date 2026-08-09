-- =====================================================================
-- AREA55 — demo seed data (re-runnable)
-- Run in the Supabase SQL Editor. Statements run in order, so later
-- inserts can reference athletes/metrics created by earlier ones.
-- The coach id is resolved from profiles (oldest account); adjust the
-- query if this project has more than one user.
-- =====================================================================

drop table if exists _seed_coach;
create temp table _seed_coach as
  select p.id as coach_id
  from public.profiles p
  order by p.created_at
  limit 1;

-- ---------------------------------------------------------------
-- 1. Athletes (skip any whose name already exists for this coach)
-- ---------------------------------------------------------------
with coach as (select coach_id from _seed_coach)
insert into public.athletes (coach_id, name, sport, position, birthdate, notes)
select c.coach_id, a.name, a.sport, a.position, a.birthdate, a.notes
from coach c
cross join (values
  ('Alex Johnson', 'Football', 'Winger',    '2004-06-14'::date, 'Explosive; building aerobic base.'),
  ('Marcus Reid',  'Football', 'Striker',   '2002-03-02'::date, 'Natural finisher; form dipped recently.'),
  ('Sam Osei',     'Football', 'Midfielder','2003-11-21'::date, 'Consistent engine; steady worker.'),
  ('Kwame Boateng','Football', 'Defender', '2005-01-30'::date, 'Young; strong upward trend.'),
  ('Ama Mensah',   'Basketball','Guard',   '2001-09-09'::date, 'Quick guard; smaller workload.'),
  ('Kofi Danso',   'Basketball','Center',  '2000-07-19'::date, 'Big body; heavy gym work.')
) as a(name, sport, position, birthdate, notes)
where not exists (
  select 1 from public.athletes x where x.coach_id = c.coach_id and x.name = a.name
);

-- ---------------------------------------------------------------
-- 2. Metrics (skip any whose name already exists for this coach)
-- ---------------------------------------------------------------
with coach as (select coach_id from _seed_coach)
insert into public.metrics (coach_id, name, unit, description, higher_is_better)
select c.coach_id, m.name, m.unit, m.description, m.higher_is_better
from coach c
cross join (values
  ('40m Sprint',    's',    'Sprint time over 40 metres.',           false),
  ('Vertical Jump', 'cm',   'Counter-movement jump height.',         true),
  ('Bench Press 1RM','kg',  'One-rep max bench press.',              true),
  ('YoYo Test',     'm',    'Yo-Yo intermittent recovery distance.', true),
  ('Resting HR',    'bpm',  'Resting heart rate, taken in the morning.', false)
) as m(name, unit, description, higher_is_better)
on conflict (coach_id, name) do nothing;

-- ---------------------------------------------------------------
-- 3. Metric entries — 6 weekly points ending today, per (athlete, metric)
-- ---------------------------------------------------------------
with coach as (select coach_id from _seed_coach),
entry_seed(athlete_name, metric_name, base, delta_per_week) as (
  values
    -- Alex: improving across the board
    ('Alex Johnson', '40m Sprint',     5.05,  -0.05),
    ('Alex Johnson', 'Vertical Jump',  48,    1.5),
    ('Alex Johnson', 'Bench Press 1RM',62,    2.5),
    ('Alex Johnson', 'YoYo Test',      1150,  70),
    ('Alex Johnson', 'Resting HR',     62,    -1.2),
    -- Marcus: declining
    ('Marcus Reid',  '40m Sprint',     4.85,  0.04),
    ('Marcus Reid',  'Vertical Jump',  58,    -1.0),
    ('Marcus Reid',  'Bench Press 1RM',85,    0.5),
    ('Marcus Reid',  'YoYo Test',      1450,  -50),
    ('Marcus Reid',  'Resting HR',     54,    1.0),
    -- Sam: steady
    ('Sam Osei',     '40m Sprint',     4.95,  0.01),
    ('Sam Osei',     'Vertical Jump',  52,    0.2),
    ('Sam Osei',     'Bench Press 1RM',70,    0.5),
    ('Sam Osei',     'YoYo Test',      1300,  10),
    ('Sam Osei',     'Resting HR',     58,    -0.1),
    -- Kwame: improving
    ('Kwame Boateng','40m Sprint',     5.12,  -0.06),
    ('Kwame Boateng','Vertical Jump',  45,    1.0),
    ('Kwame Boateng','Bench Press 1RM',58,    3.0),
    ('Kwame Boateng','YoYo Test',      1050,  90),
    ('Kwame Boateng','Resting HR',     66,    -1.5),
    -- Ama: partial (guard — sprint + jump only)
    ('Ama Mensah',   '40m Sprint',     5.4,   -0.02),
    ('Ama Mensah',   'Vertical Jump',  50,    0.5),
    -- Kofi: partial (center — jump, bench, HR)
    ('Kofi Danso',   'Vertical Jump',     42,  0.8),
    ('Kofi Danso',   'Bench Press 1RM',   95,  2.0),
    ('Kofi Danso',   'Resting HR',        60,  -0.3)
),
weeks(i) as (values (0),(1),(2),(3),(4),(5))
insert into public.metric_entries (coach_id, athlete_id, metric_id, value, entry_date)
select c.coach_id, a.id, m.id,
       round((es.base + es.delta_per_week * w.i)::numeric, 2)::float8,
       current_date - (35 - w.i * 7)
from coach c
cross join entry_seed es
cross join weeks w
join public.athletes a on a.coach_id = c.coach_id and a.name = es.athlete_name
join public.metrics  m on m.coach_id = c.coach_id and m.name = es.metric_name
on conflict (athlete_id, metric_id, entry_date) do nothing;

-- ---------------------------------------------------------------
-- 4. Goals
-- ---------------------------------------------------------------
with coach as (select coach_id from _seed_coach),
goal_seed(athlete_name, metric_name, target, days, status, note) as (
  values
    ('Alex Johnson',  'Vertical Jump',     60,   45,  'active',   'Hit 60cm by end of block'),
    ('Marcus Reid',   'Resting HR',        52,   60,  'active',   'Lower resting HR toward 52'),
    ('Kwame Boateng', 'Bench Press 1RM',   80,   30,  'active',   'Reach 80kg bench'),
    ('Sam Osei',      'YoYo Test',         1500, -15, 'missed',   'Missed the 1500m target'),
    ('Alex Johnson',  '40m Sprint',        4.75, -7,  'achieved', 'Went sub-4.75s')
)
insert into public.goals (coach_id, athlete_id, metric_id, target_value, deadline, status, note)
select c.coach_id, a.id, m.id, g.target, current_date + g.days, g.status, g.note
from coach c
cross join goal_seed g
join public.athletes a on a.coach_id = c.coach_id and a.name = g.athlete_name
join public.metrics  m on m.coach_id = c.coach_id and m.name = g.metric_name
where not exists (
  select 1 from public.goals g2
  where g2.coach_id = c.coach_id and g2.athlete_id = a.id and g2.metric_id = m.id
);

-- ---------------------------------------------------------------
-- 5. Sessions with load (for ACWR). One per date over the last 28 days.
--    The last 7 days are scaled by `spike` so different athletes land in
--    different ACWR zones: Alex elevated, Marcus/Ama/Kofi optimal,
--    Sam undertrained, Kwame caution.
-- ---------------------------------------------------------------
with coach as (select coach_id from _seed_coach),
athlete_load(athlete_name, base, spike) as (
  values
    ('Alex Johnson',  300, 1.9),
    ('Marcus Reid',   320, 1.0),
    ('Sam Osei',      260, 0.75),
    ('Kwame Boateng', 300, 1.45),
    ('Ama Mensah',    280, 1.0),
    ('Kofi Danso',    340, 1.15)
),
load_pattern(d, weight) as (
  values
    (0,1.0),(1,0.9),(2,0.0),(3,0.85),(4,0.0),(5,1.1),(6,1.2),
    (7,0.0),(8,0.9),(9,0.8),(10,1.0),(11,1.1),(12,0.0),(13,0.95),
    (14,0.9),(15,1.05),(16,1.1),(17,0.0),(18,1.0),(19,1.2),(20,0.0),
    (21,1.0),(22,1.05),(23,1.15),(24,0.0),(25,1.0),(26,1.1),(27,1.05)
)
insert into public.sessions (coach_id, athlete_id, session_date, load, rating, notes)
select c.coach_id, a.id, current_date - p.d,
       case when p.d <= 6
            then round(al.base * p.weight * al.spike)::float8
            else round(al.base * p.weight)::float8 end,
       (p.d % 5) + 1,
       case when p.d in (10, 19, 23, 27) then 'Hard session' else null end
from coach c
cross join athlete_load al
cross join load_pattern p
join public.athletes a on a.coach_id = c.coach_id and a.name = al.athlete_name
where p.weight > 0
  and not exists (
    select 1 from public.sessions s
    where s.coach_id = c.coach_id and s.athlete_id = a.id
      and s.session_date = current_date - p.d
  );

-- ---------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------
drop table if exists _seed_coach;

select 'athletes' as table_name, count(*) as rows from public.athletes
union all select 'metrics', count(*) from public.metrics
union all select 'entries', count(*) from public.metric_entries
union all select 'sessions', count(*) from public.sessions
union all select 'goals', count(*) from public.goals;
