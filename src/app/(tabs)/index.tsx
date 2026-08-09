import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AthleteCard } from '@/components/AthleteCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAllEntries } from '@/hooks/useAllEntries';
import { useAllGoals } from '@/hooks/useAllGoals';
import { useAthletes } from '@/hooks/useAthletes';
import { useDemoData } from '@/hooks/useDemoData';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/use-theme';
import { buildRosterRows, type RosterRow } from '@/utils/roster';

export default function AthletesScreen() {
  const { data: athletes, isLoading, isError, refetch, isRefetching } = useAthletes();
  const { data: allEntries } = useAllEntries();
  const { data: allGoals } = useAllGoals();
  const { data: metrics } = useMetrics();
  const { seeding, load } = useDemoData();
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const router = useRouter();

  const onLoadDemo = async () => {
    const { ok, message } = await load();
    if (Platform.OS === 'web') {
      window.alert(message);
    } else if (ok) {
      Alert.alert('Demo data loaded', message);
    } else {
      Alert.alert('Error', message);
    }
  };

  const roster = useMemo(
    () =>
      athletes && metrics
        ? buildRosterRows(athletes, metrics, allEntries ?? [], allGoals ?? [])
        : new Map<string, RosterRow>(),
    [athletes, metrics, allEntries, allGoals],
  );

  const trimmed = query.trim().toLowerCase();
  const filtered = athletes?.filter((a) => a.name.toLowerCase().includes(trimmed));

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Athletes" />

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search athletes"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AthleteCard athlete={item} roster={roster.get(item.id)} />}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isError ? (
              <EmptyState
                icon={<Ionicons name="cloud-offline" size={40} color={theme.textSecondary} />}
                title="Couldn't load athletes"
                message="Check your connection and try again."
                action={
                  <Button label="Retry" onPress={refetch} variant="secondary" />
                }
              />
            ) : query.trim() ? (
              <EmptyState
                icon={<Ionicons name="search" size={40} color={theme.textSecondary} />}
                title="No matches"
                message={`No athletes match “${query}”.`}
              />
            ) : (
              <EmptyState
                icon={<Ionicons name="people" size={40} color={theme.textSecondary} />}
                title={isLoading ? 'Loading…' : 'No athletes yet'}
                message="Add your first athlete to start logging performance — or load sample data to explore the app."
                action={
                  <View style={styles.emptyActions}>
                    <Button label="Add athlete" onPress={() => router.push('/athlete/new')} />
                    <Button
                      label="Load demo data"
                      onPress={onLoadDemo}
                      loading={seeding}
                      variant="secondary"
                    />
                  </View>
                }
              />
            )
          }
        />

        <Pressable
          onPress={() => router.push('/athlete/new')}
          accessibilityRole="button"
          style={[styles.fab, { backgroundColor: theme.accent }]}
        >
          <Ionicons name="add" size={28} color={theme.accentContrast} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { padding: Spacing.three, paddingBottom: 96 },
  emptyActions: { width: '100%', gap: Spacing.two },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
