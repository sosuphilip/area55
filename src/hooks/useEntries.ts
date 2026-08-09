import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Entry = Database['public']['Tables']['metric_entries']['Row'];
type EntryInsert = Database['public']['Tables']['metric_entries']['Insert'];

export function useEntries(athleteId: string, metricId?: string) {
  return useQuery({
    queryKey: ['entries', athleteId, metricId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('metric_entries').select('*').eq('athlete_id', athleteId);
      if (metricId) query = query.eq('metric_id', metricId);
      const { data, error } = await query.order('entry_date', { ascending: true });
      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!athleteId,
  });
}

export function useUpsertEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EntryInsert) => {
      // Upsert on the natural key so re-logging a date edits the row.
      const { data, error } = await supabase
        .from('metric_entries')
        .upsert(input, { onConflict: 'athlete_id,metric_id,entry_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (entry) => {
      // Bare ['entries'] prefix invalidates both per-athlete queries and the
      // roster-wide ['entries', 'all'] used by the Athletes tab.
      qc.invalidateQueries({ queryKey: ['entries', entry.athlete_id] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['latest'] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metric_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['latest'] });
    },
  });
}
