# Supabase setup — one-time, ~10 minutes

The app is built and type-checks; it just needs a backend to talk to. Do this once, then everything works.

## 1. Create the project

1. Go to https://supabase.com and sign up (free tier is fine).
2. **New project** → pick an org, name it `area55`, choose a region near you (e.g. `us-east-1`), set a strong DB password, click **Create**. Wait ~1 minute for provisioning.

## 2. Copy your credentials

- **Settings → API** (or **Project Settings → API**):
  - Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`)
  - Copy the **`anon` `public`** key (NOT the `service_role` key — it bypasses security)

## 3. Enable email sign-in

- **Authentication → Providers → Email** → toggle **on**.
- **For development only:** uncheck **"Confirm email"** so sign-up logs you straight in. (Re-enable it before shipping.)

## 4. Run the database schema

- **SQL Editor → New query** → paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) → **Run**.
- It creates all tables, row-level security policies, the latest-values view, and the photo storage bucket. It's safe to re-run.

## 5. Wire up the app

- Copy the project URL + anon key into [`.env`](./.env):

  ```
  EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
  ```

- Fully restart the dev server (`.env` is read at startup):

  ```powershell
  npx expo start
  ```

  Scan the QR code with **Expo Go** on your phone, or press **`w`** for the web preview.

## 6. Verify

- **Sign up** with any email → you land on the (empty) Athletes tab. Close and reopen the app → still signed in.
- **Add athletes** → define a **metric** (e.g. `40m Sprint`, unit `s`, "higher is better" OFF) → **log values** on a few different dates → open **Analytics** to see the trend line → **Compare** athletes on a metric → add **notes** and **goals**.
- Sign up a **second** account → empty Athletes/Metrics (data isolation works).

## Troubleshooting

- **App crashes on launch with "Missing EXPO_PUBLIC_SUPABASE_URL"** → the `.env` file isn't being read or is empty. Restart `expo start` after saving it.
- **Can't reach the dev server from your phone** → run `npx expo start --tunnel`.
- **Weird Metro behavior on Windows/OneDrive** → move the project out of OneDrive (e.g. to `C:\dev\omniroute-test`) and run from there.
