import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { seedDemoData } from '@/lib/demoData';

/** Run the demo-data loader under the signed-in coach and refresh every query. */
export function useDemoData() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const load = async (): Promise<{ ok: boolean; message: string }> => {
    setSeeding(true);
    try {
      const result = await seedDemoData();
      await queryClient.invalidateQueries();
      return { ok: true, message: result.message };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Couldn't load demo data: ${message}` };
    } finally {
      setSeeding(false);
    }
  };

  return { seeding, load };
}
