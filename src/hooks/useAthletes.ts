import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAthletePhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Athlete = Database['public']['Tables']['athletes']['Row'];
type AthleteInsert = Database['public']['Tables']['athletes']['Insert'];
type AthleteUpdate = Database['public']['Tables']['athletes']['Update'];

const LIST_SELECT = 'id, coach_id, name, sport, position, birthdate, notes, photo_path, created_at, updated_at';

async function fetchAthletes(): Promise<Athlete[]> {
  const { data, error } = await supabase.from('athletes').select(LIST_SELECT).order('name');
  if (error) throw error;
  return data;
}

export function useAthletes() {
  return useQuery({ queryKey: ['athletes'], queryFn: fetchAthletes });
}

async function fetchAthlete(id: string): Promise<Athlete | null> {
  const { data, error } = await supabase.from('athletes').select(LIST_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export function useAthlete(id?: string) {
  return useQuery({
    queryKey: ['athlete', id],
    queryFn: () => fetchAthlete(id!),
    enabled: !!id,
  });
}

export function useCreateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AthleteInsert) => {
      const { data, error } = await supabase.from('athletes').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['athletes'] }),
  });
}

export function useUpdateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & AthleteUpdate) => {
      const { data, error } = await supabase
        .from('athletes')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (athlete) => {
      qc.invalidateQueries({ queryKey: ['athletes'] });
      qc.invalidateQueries({ queryKey: ['athlete', athlete.id] });
    },
  });
}

export function useDeleteAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Remove the stored photo (best-effort) so deleting an athlete doesn't
      // leave an orphaned object in the bucket.
      const athlete = await fetchAthlete(id).catch(() => null);
      if (athlete?.photo_path) await deleteAthletePhoto(athlete.photo_path);

      const { error } = await supabase.from('athletes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['athletes'] }),
  });
}
