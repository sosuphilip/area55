# AREA55 — Sports Performance Analyzer

A sport-agnostic coaching app. Coaches model athletes by **key performance metrics**, log values over time, and get **trend analytics**, **side-by-side comparison**, and **notes & goals** — without being tied to a specific sport.

Built with **Expo SDK 54 (React Native + TypeScript)**, **expo-router**, and **Supabase** (Postgres + Auth + Row-Level Security).

> 🖥️ **Live demo:** https://sosuphilip.github.io/area55/ — sign in with `demo@area55.com` / `area55demo`

## Features

- **Coach accounts** — email/password sign-up; every coach's data is isolated via RLS
- **Athletes** — profiles with photo, sport, position, birthdate, notes
- **Athlete photos** — pick from the photo library (expo-image-picker → Supabase Storage)
- **Metrics** — coach-defined, sport-agnostic (e.g. `40m Sprint (s, lower is better)`, `VO2 Max (ml/kg/min, higher is better)`)
- **Logging** — record values per athlete per metric per day (re-logging a date edits it)
- **Analytics** — trend line charts, 7-day moving average, goal target line, records, consistency, trend direction
- **Roster dashboard** — score ring per athlete showing **progress toward their active goal**, status chips (leader / improving / declining / steady), and 30-day deltas
- **Performance scoring** — 0–100 score per metric vs the athlete's own all-time best, plus a composite
- **Workload / ACWR** — training-load tracking with the acute:chronic workload ratio and zone alerts
- **Compare** — rank athletes on any metric
- **Notes & goals** — session notes with star ratings and load, goals with status (active / achieved / missed)

## Quick start

### 1. Backend (one-time)

Create a Supabase project and run the schema once — follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). It covers creating the project, running `supabase/schema.sql` in the SQL Editor, and grabbing the URL + anon key.

### 2. Environment

Put the project URL and anon (publishable) key in `.env` in this directory (see `.env.example`). For this repo, `.env` is already filled. It's not committed, so a fresh clone will need it re-created from `.env.example`.

### 3. Run the app

```powershell
npm install
npx expo start
```

- **Browser** (recommended for quick checks): press `w`
- **Phone via Expo Go**: scan the QR. If the phone can't connect on your network, use a tunnel:

  ```powershell
  npx expo start --tunnel
  ```

### First run

1. Open the app and tap **Create account** (display name, email, password).
2. Check your inbox — if email confirmation is on, click the confirmation link, then **sign in**.
3. In the **Metrics** tab, add a metric (e.g. "40m Sprint", unit `s`, *lower is better*).
4. In the **Athletes** tab, add an athlete (name required; photo optional).
5. Open the athlete → **Log** tab to record values, then **Analytics** to see the trend.

## Project structure

```
supabase/schema.sql          # DB schema + RLS policies + storage bucket
src/app/                     # expo-router routes
  (auth)/                    # sign-in / sign-up (gated when logged out)
  (tabs)/                    # Athletes · Metrics · Compare · Settings
  athlete/[id]/              # overview · log · analytics · notes · goals
  athlete/new.tsx            # create athlete
  metric-form.tsx            # create/edit metric
src/components/              # UI primitives + domain components
src/context/auth.tsx         # auth provider + session state
src/hooks/                   # typed React Query hooks per resource
src/lib/                     # supabase client + storage helpers
src/utils/                   # trend math, chart data, formatting, confirms
src/types/database.ts        # typed Supabase schema (regenerable via `supabase gen types`)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run web` | Start with the web preview |
| `npx tsc --noEmit` | Type-check |
| `npx expo export --platform web` | Production web build |

## Troubleshooting

- **Expo Go can't connect on the phone** — LAN discovery often fails on home/work Wi-Fi. Use `npx expo start --tunnel`.
- **Metro flakiness on OneDrive** — this repo lives in OneDrive, which can cause Metro bundler hiccups. If the dev server misbehaves, copy the folder to `C:\dev\omniroute-test` and run from there.

## Roadmap

- **Hardening** — enable email confirmation in the Supabase dashboard, password reset, native date pickers
