import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Goal = Database['public']['Tables']['goals']['Row'];

/** Every goal across the coach's athletes (RLS scopes it server-side). */
export function useAllGoals() {
  return useQuery({
    queryKey: ['goals', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*');
      if (error) throw error;
      return data as Goal[];
    },
  });
}
