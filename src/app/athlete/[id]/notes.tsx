import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AthleteNav } from '@/components/AthleteNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Card, EmptyState, Screen, SectionHeader, Spinner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAthlete } from '@/hooks/useAthletes';
import { useCreateSession, useDeleteSession, useSessions } from '@/hooks/useSessions';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/errors';
import { formatDateInput, formatDateLong, todayISO } from '@/utils/format';

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const { data: athlete } = useAthlete(id);
  const { data: sessions, isLoading } = useSessions(id);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const [dateText, setDateText] = useState(todayISO());
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loadText, setLoadText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText.trim())) {
      setFormError('Date must be YYYY-MM-DD.');
      return;
    }
    const parsedLoad = loadText.trim() === '' ? null : Number(loadText);
    if (parsedLoad != null && !Number.isFinite(parsedLoad)) {
      setFormError('Load must be a number.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createSession.mutateAsync({
        athlete_id: id,
        session_date: dateText.trim(),
        rating,
        notes: notes.trim() || null,
        load: parsedLoad,
      });
      setRating(null);
      setNotes('');
      setLoadText('');
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (sessionId: string) => {
    confirmDestructive(
      'Delete note',
      'Remove this session note?',
      () =>
        deleteSession.mutate(sessionId, {
          onError: (e) => Alert.alert('Error', errorMessage(e)),
        }),
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.container}>
        <ScreenHeader title="Notes" subtitle={athlete?.name} showBack />
        <AthleteNav id={id} active="notes" />

        {isLoading ? (
          <Spinner label="Loading…" />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Card>
              <SectionHeader title="Add session note" />
              <View style={styles.form}>
                <View style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <TextInput
                    value={dateText}
                    onChangeText={(t) => setDateText(formatDateInput(t))}
                    autoCorrect={false}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.inputText, { color: theme.text }]}
                  />
                </View>

                <View
                  style={[
                    styles.input,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    value={loadText}
                    onChangeText={setLoadText}
                    keyboardType="decimal-pad"
                    placeholder="Load (RPE × minutes, optional)"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.inputText, { color: theme.text }]}
                  />
                </View>

                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const filled = rating != null && value <= rating;
                    return (
                      <Pressable key={value} onPress={() => setRating(value)} hitSlop={6}>
                        <Ionicons
                          name={filled ? 'star' : 'star-outline'}
                          size={30}
                          color={filled ? theme.warning : theme.textSecondary}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Coach notes…"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[styles.inputText, { color: theme.text }]}
                  />
                </View>

                {formError ? (
                  <Text style={{ color: theme.negative, fontSize: 13 }}>{formError}</Text>
                ) : null}
                <Button label="Save note" onPress={save} loading={saving} />
              </View>
            </Card>

            <SectionHeader title="Session history" />
            {!sessions || sessions.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="chatbox" size={36} color={theme.textSecondary} />}
                title="No notes yet"
                message="Add notes after sessions to track how each athlete is doing."
              />
            ) : (
              sessions.map((session) => (
                <Card key={session.id}>
                  <View style={styles.sessionTop}>
                    <Text style={[styles.sessionDate, { color: theme.text }]}>
                      {formatDateLong(session.session_date)}
                    </Text>
                    <Pressable onPress={() => confirmDelete(session.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={theme.negative} />
                    </Pressable>
                  </View>
                  {session.rating != null ? (
                    <View style={styles.sessionRating}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Ionicons
                          key={value}
                          name={value <= session.rating! ? 'star' : 'star-outline'}
                          size={16}
                          color={value <= session.rating! ? theme.warning : theme.border}
                        />
                      ))}
                    </View>
                  ) : null}
                  {session.load != null ? (
                    <Text style={[styles.sessionLoad, { color: theme.textSecondary }]}>
                      Load {session.load}
                    </Text>
                  ) : null}
                  {session.notes ? (
                    <Text style={[styles.sessionNotes, { color: theme.textSecondary }]}>
                      {session.notes}
                    </Text>
                  ) : null}
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.three },
  form: { gap: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    height: 48,
    justifyContent: 'center',
  },
  multiline: { height: 'auto', minHeight: 96, paddingVertical: Spacing.two + 2 },
  inputText: { fontSize: 16 },
  ratingRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', paddingVertical: Spacing.two },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { fontSize: 15, fontWeight: '700' },
  sessionRating: { flexDirection: 'row', gap: 2, marginTop: Spacing.two },
  sessionLoad: { fontSize: 14, fontWeight: '600', marginTop: Spacing.two },
  sessionNotes: { fontSize: 14, marginTop: Spacing.two, lineHeight: 20 },
});
