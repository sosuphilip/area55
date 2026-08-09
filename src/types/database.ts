/**
 * Supabase Database types for the AREA55 performance analyzer.
 *
 * Hand-written to match `supabase/schema.sql` so the app is fully typed
 * before the schema is deployed. Once the project exists you can regenerate
 * with:
 *   npx supabase gen types typescript --db-url "<pooler url>" --schema public --output src/types/database.ts
 *
 * PostgREST conventions reflected here:
 * - `uuid`            -> string
 * - `date`            -> string (YYYY-MM-DD)
 * - `timestamptz`     -> string (ISO 8601)
 * - `double precision`-> number
 * - `smallint`        -> number
 * - nullable columns  -> `| null`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      athletes: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          sport: string;
          position: string | null;
          birthdate: string | null;
          notes: string | null;
          photo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** Defaults to auth.uid() — never send it from the client. */
          coach_id?: string;
          name: string;
          sport?: string;
          position?: string | null;
          birthdate?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          name?: string;
          sport?: string;
          position?: string | null;
          birthdate?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metrics: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          unit: string;
          description: string | null;
          higher_is_better: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id?: string;
          name: string;
          unit?: string;
          description?: string | null;
          higher_is_better?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          name?: string;
          unit?: string;
          description?: string | null;
          higher_is_better?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      metric_entries: {
        Row: {
          id: string;
          coach_id: string;
          athlete_id: string;
          metric_id: string;
          value: number;
          entry_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id?: string;
          athlete_id: string;
          metric_id: string;
          value: number;
          entry_date?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          athlete_id?: string;
          metric_id?: string;
          value?: number;
          entry_date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          coach_id: string;
          athlete_id: string;
          session_date: string;
          rating: number | null;
          notes: string | null;
          /** Training load (e.g. RPE × minutes) for acute:chronic workload. */
          load: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id?: string;
          athlete_id: string;
          session_date?: string;
          rating?: number | null;
          notes?: string | null;
          load?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          athlete_id?: string;
          session_date?: string;
          rating?: number | null;
          notes?: string | null;
          load?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          coach_id: string;
          athlete_id: string;
          metric_id: string;
          target_value: number;
          deadline: string | null;
          status: 'active' | 'achieved' | 'missed' | 'archived';
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id?: string;
          athlete_id: string;
          metric_id: string;
          target_value: number;
          deadline?: string | null;
          status?: 'active' | 'achieved' | 'missed' | 'archived';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          athlete_id?: string;
          metric_id?: string;
          target_value?: number;
          deadline?: string | null;
          status?: 'active' | 'achieved' | 'missed' | 'archived';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      latest_metric_entries: {
        Row: {
          id: string;
          coach_id: string;
          athlete_id: string;
          metric_id: string;
          value: number;
          entry_date: string;
          note: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
