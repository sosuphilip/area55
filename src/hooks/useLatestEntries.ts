import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type LatestEntry = Database['public']['Views']['latest_metric_entries']['Row'];

/**
 * Latest value per athlete+metric (from the security_invoker view, so RLS
 * still scopes it to the signed-in coach). Optionally narrow by athlete or
 * metric.
 */
export function useLatestEntries(athleteId?: string, metricId?: string) {
  return useQuery({
    queryKey: ['latest', athleteId ?? 'all', metricId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('latest_metric_entries').select('*');
      if (athleteId) query = query.eq('athlete_id', athleteId);
      if (metricId) query = query.eq('metric_id', metricId);
      const { data, error } = await query;
      if (error) throw error;
      return data as LatestEntry[];
    },
  });
}
