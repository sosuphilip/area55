import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Entry = Database['public']['Tables']['metric_entries']['Row'];

/** All metric entries across the coach's athletes (RLS scopes it server-side). */
export function useAllEntries() {
  return useQuery({
    queryKey: ['entries', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metric_entries').select('*');
      if (error) throw error;
      return data as Entry[];
    },
  });
}
