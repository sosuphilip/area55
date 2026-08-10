import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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

/**
 * Plain-text section tabs for an athlete's screens. No pills/backgrounds — the
 * active section is just accent-colored text with a thin underline. Rendered
 * inside each screen's scroll content so it scrolls away with the page.
 */
export function AthleteNav({ id, active }: { id: string; active: AthleteSection }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {SECTIONS.map((section) => {
        const href = (
          section.key === 'overview'
            ? `/athlete/${id}`
            : `/athlete/${id}/${section.key}`
        ) as Href;
        const selected = section.key === active;
        return (
          <Link key={section.key} href={href} style={styles.link}>
            <Text
              style={[
                styles.label,
                { color: selected ? theme.accent : theme.textSecondary },
                selected && styles.activeLabel,
              ]}
            >
              {section.label}
            </Text>
            <View
              style={[
                styles.indicator,
                { backgroundColor: selected ? theme.accent : 'transparent' },
              ]}
            />
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.one,
    columnGap: Spacing.three,
  },
  link: { alignItems: 'center', paddingVertical: Spacing.one, paddingHorizontal: 1 },
  label: { fontSize: 13, fontWeight: '600' },
  activeLabel: { fontWeight: '800' },
  // Thin underline that always reserves space so the tabs don't jump height.
  indicator: { height: 2, borderRadius: 2, marginTop: 3, width: '100%' },
});
