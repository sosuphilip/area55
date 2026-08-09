import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AthleteSection = 'overview' | 'log' | 'analytics' | 'notes' | 'goals' | 'load';

const SECTIONS: { key: AthleteSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'log', label: 'Log' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'load', label: 'Load' },
  { key: 'notes', label: 'Notes' },
  { key: 'goals', label: 'Goals' },
];

export function AthleteNav({ id, active }: { id: string; active: AthleteSection }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {SECTIONS.map((section) => {
        const href = (
          section.key === 'overview'
            ? `/athlete/${id}`
            : `/athlete/${id}/${section.key}`
        ) as Href;
        const selected = section.key === active;
        return (
          <Link
            key={section.key}
            href={href}
            style={[
              styles.seg,
              { backgroundColor: selected ? theme.accent : theme.backgroundElement },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? theme.accentContrast : theme.textSecondary },
              ]}
            >
              {section.label}
            </Text>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  seg: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
});
