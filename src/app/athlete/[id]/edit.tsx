import { useLocalSearchParams, useRouter } from 'expo-router';

import { AthleteForm } from '@/components/AthleteForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen, Spinner } from '@/components/ui';
import { useAthlete, useUpdateAthlete } from '@/hooks/useAthletes';

export default function EditAthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: athlete, isLoading } = useAthlete(id);
  const updateAthlete = useUpdateAthlete();

  return (
    <Screen>
      <ScreenHeader title="Edit athlete" showBack />
      {isLoading ? (
        <Spinner label="Loading…" />
      ) : (
        <AthleteForm
          initial={athlete ?? undefined}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await updateAthlete.mutateAsync({ id, ...values });
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
