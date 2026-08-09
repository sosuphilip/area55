import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Card, Screen, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useDemoData } from '@/hooks/useDemoData';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { seeding, load } = useDemoData();
  const theme = useTheme();

  const displayName =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : '';
  const email = user?.email ?? '';

  const onSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

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

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      <SectionHeader title="Account" />
      <Card>
        <View style={styles.row}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <Ionicons name="person" size={22} color={theme.textSecondary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]}>
              {displayName || 'Coach'}
            </Text>
            <Text style={[styles.email, { color: theme.textSecondary }]}>
              {email}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.spacer} />

      <SectionHeader title="Demo data" />
      <Card>
        <Text style={[styles.demoText, { color: theme.textSecondary }]}>
          Instantly fill this account with sample athletes, metrics, and training
          history so you can explore how AREA55 works. Safe to run again — it
          won't duplicate or overwrite your real data.
        </Text>
        <View style={styles.spacer} />
        <Button label="Load demo data" onPress={onLoadDemo} loading={seeding} variant="secondary" />
      </Card>

      <View style={styles.spacer} />

      <Button label="Sign out" onPress={onSignOut} variant="danger" />

      <View style={styles.about}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
          AREA55 · Sports Performance Analyzer
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
          Model athletes, log metrics, spot trends.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 2 },
  demoText: { fontSize: 14, lineHeight: 20 },
  spacer: { height: Spacing.four },
  about: { marginTop: Spacing.six, gap: Spacing.one, alignItems: 'center' },
});
