import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type SessionRow = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];

export function useSessions(athleteId: string) {
  return useQuery({
    queryKey: ['sessions', athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return data as SessionRow[];
    },
    enabled: !!athleteId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SessionInsert) => {
      const { data, error } = await supabase.from('sessions').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (session) => qc.invalidateQueries({ queryKey: ['sessions', session.athlete_id] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
