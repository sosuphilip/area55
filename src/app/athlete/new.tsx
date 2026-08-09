import { useRouter } from 'expo-router';

import { AthleteForm } from '@/components/AthleteForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui';
import { useCreateAthlete } from '@/hooks/useAthletes';

export default function NewAthleteScreen() {
  const router = useRouter();
  const createAthlete = useCreateAthlete();

  return (
    <Screen>
      <ScreenHeader title="New athlete" showBack />
      <AthleteForm
        submitLabel="Create athlete"
        onSubmit={async (values) => {
          const created = await createAthlete.mutateAsync(values);
          router.replace(`/athlete/${created.id}`);
        }}
      />
    </Screen>
  );
}
