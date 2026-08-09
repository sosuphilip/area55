-- =====================================================================
-- Abstracted Sports Performance Analyzer — schema v1
-- Run in the Supabase SQL Editor (Postgres 15+). Safe to re-run
-- (tables/indexes/views use IF NOT EXISTS; policies & triggers are
-- dropped then recreated).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. updated_at helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. profiles — coach display name; row auto-created on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. athletes
-- ---------------------------------------------------------------------
create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sport text not null default '',
  position text,
  birthdate date,
  notes text,
  photo_path text, -- storage object path under athlete-photos
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athletes_coach_idx on public.athletes (coach_id);

alter table public.athletes enable row level security;

-- ---------------------------------------------------------------------
-- 3. metrics — per-coach definitions (sport-agnostic)
-- ---------------------------------------------------------------------
create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unit text not null default '',
  description text,
  higher_is_better boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coach_id, name) -- one "40m Sprint" per coach
);

create index if not exists metrics_coach_idx on public.metrics (coach_id);

alter table public.metrics enable row level security;

-- ---------------------------------------------------------------------
-- 4. metric_entries — one value per athlete + metric + day
--    double precision (not numeric) so PostgREST returns real numbers.
-- ---------------------------------------------------------------------
create table if not exists public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  metric_id uuid not null references public.metrics (id) on delete cascade,
  value double precision not null,
  entry_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  unique (athlete_id, metric_id, entry_date)
);

create index if not exists entries_athlete_metric_date_idx
  on public.metric_entries (athlete_id, metric_id, entry_date desc);
create index if not exists entries_coach_idx on public.metric_entries (coach_id);

alter table public.metric_entries enable row level security;

-- ---------------------------------------------------------------------
-- 5. sessions — per-session coach notes / ratings
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  session_date date not null default current_date,
  rating smallint check (rating between 1 and 5),
  notes text,
  load double precision, -- training load (e.g. RPE x minutes) for ACWR
  created_at timestamptz not null default now()
);

-- Migration for existing projects: adds the load column without dropping data.
alter table public.sessions add column if not exists load double precision;

create index if not exists sessions_athlete_date_idx on public.sessions (athlete_id, session_date desc);

alter table public.sessions enable row level security;

-- ---------------------------------------------------------------------
-- 6. goals
-- ---------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  metric_id uuid not null references public.metrics (id) on delete cascade,
  target_value double precision not null,
  deadline date,
  status text not null default 'active' check (status in ('active', 'achieved', 'missed', 'archived')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_athlete_idx on public.goals (athlete_id);
create index if not exists goals_metric_idx on public.goals (metric_id);

alter table public.goals enable row level security;

-- ---------------------------------------------------------------------
-- 7. RLS policies — coach owns everything
--    NOTE: CREATE POLICY has no IF NOT EXISTS, so drop-then-create.
-- ---------------------------------------------------------------------
drop policy if exists "profiles own profile" on public.profiles;
create policy "profiles own profile" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "coach owns athletes" on public.athletes;
create policy "coach owns athletes" on public.athletes
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach owns metrics" on public.metrics;
create policy "coach owns metrics" on public.metrics
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach owns metric_entries" on public.metric_entries;
create policy "coach owns metric_entries" on public.metric_entries
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach owns sessions" on public.sessions;
create policy "coach owns sessions" on public.sessions
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach owns goals" on public.goals;
create policy "coach owns goals" on public.goals
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. updated_at triggers
--    NOTE: CREATE TRIGGER has no IF NOT EXISTS, so drop-then-create.
-- ---------------------------------------------------------------------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles for each row execute function set_updated_at();
drop trigger if exists set_athletes_updated_at on public.athletes;
create trigger set_athletes_updated_at
  before update on public.athletes for each row execute function set_updated_at();
drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 9. View: latest entry per athlete + metric (RLS-safe via security_invoker)
-- ---------------------------------------------------------------------
create or replace view public.latest_metric_entries
with (security_invoker = true) as
select distinct on (athlete_id, metric_id)
  id, coach_id, athlete_id, metric_id, value, entry_date, note, created_at
from public.metric_entries
order by athlete_id, metric_id, entry_date desc;

-- ---------------------------------------------------------------------
-- 10. Storage bucket for athlete photos (public for MVP simplicity)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('athlete-photos', 'athlete-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read athlete photos" on storage.objects;
create policy "public read athlete photos" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'athlete-photos');

drop policy if exists "coach upload athlete photos" on storage.objects;
create policy "coach upload athlete photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'athlete-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "coach update own athlete photos" on storage.objects;
create policy "coach update own athlete photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'athlete-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "coach delete own athlete photos" on storage.objects;
create policy "coach delete own athlete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'athlete-photos' and (storage.foldername(name))[1] = auth.uid()::text);
