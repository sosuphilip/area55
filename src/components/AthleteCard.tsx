import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { ScoreRing } from '@/components/ScoreRing';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { athletePhotoUrl } from '@/lib/storage';
import type { Database } from '@/types/database';
import type { RosterRow, RosterStatus } from '@/utils/roster';

type Athlete = Database['public']['Tables']['athletes']['Row'];

const STATUS_LABEL: Record<RosterStatus, string> = {
  leader: 'Leader',
  improving: 'Improving',
  declining: 'Declining',
  steady: 'Steady',
  nodata: 'No data',
};

function statusColor(status: RosterStatus, theme: ReturnType<typeof useTheme>): string {
  switch (status) {
    case 'leader':
      return theme.accent;
    case 'improving':
      return theme.positive;
    case 'declining':
      return theme.negative;
    case 'steady':
    case 'nodata':
      return theme.textSecondary;
  }
}

export function AthleteCard({ athlete, roster }: { athlete: Athlete; roster?: RosterRow }) {
  const theme = useTheme();
  const photo = athletePhotoUrl(athlete.photo_path);
  const initials = athlete.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const subtitle = [athlete.sport, athlete.position].filter(Boolean).join(' · ');
  const statusColorValue = roster ? statusColor(roster.status, theme) : undefined;
  // The ring shows progress toward the athlete's active goal when there is one,
  // falling back to their composite performance score (vs their own best).
  const ringScore = roster?.goalProgress ?? roster?.composite ?? null;

  return (
    <Pressable
      onPress={() => router.push(`/athlete/${athlete.id}`)}
      accessibilityRole="button"
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.initials, { color: theme.textSecondary }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {athlete.name}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {roster?.goalProgress != null && roster.goalMetric ? (
              <Text style={[styles.headline, { color: theme.textSecondary }]} numberOfLines={1}>
                Goal · {roster.goalProgress}% · {roster.goalMetric}
              </Text>
            ) : roster?.headlineMetric ? (
              <Text style={[styles.headline, { color: theme.textSecondary }]} numberOfLines={1}>
                Top: {roster.headlineMetric}
              </Text>
            ) : null}
          </View>

          {roster ? (
            <View style={styles.right}>
              <View style={styles.rightTop}>
                <ScoreRing score={ringScore} size={38} />
                <View style={[styles.statusChip, { backgroundColor: statusColorValue }]}>
                  <Text style={[styles.statusText, { color: theme.accentContrast }]}>
                    {STATUS_LABEL[roster.status]}
                  </Text>
                </View>
              </View>
              {roster.delta != null ? (
                <Text
                  style={[
                    styles.delta,
                    {
                      color:
                        roster.status === 'declining'
                          ? theme.negative
                          : roster.status === 'improving'
                            ? theme.positive
                            : theme.textSecondary,
                    },
                  ]}
                >
                  {roster.delta >= 0 ? '+' : ''}
                  {Math.round(roster.delta)} pts
                </Text>
              ) : null}
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 14, marginTop: 2 },
  headline: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 3 },
  rightTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusChip: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  delta: { fontSize: 12, fontWeight: '700' },
});
