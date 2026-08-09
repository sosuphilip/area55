import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Field, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const theme = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!displayName.trim() || !email.trim() || password.length < 6) {
      setError('Enter a name, email, and a password of at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signUp(email.trim(), password, displayName.trim());
    setSubmitting(false);
    if (result.error) setError(result.error);
    if (result.needsConfirmation) setConfirmed(true);
  };

  if (confirmed) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            We sent a confirmation link to {email}. Open it to activate your
            account, then sign back in.
          </Text>
        </View>
        <Link href="/sign-in" style={[styles.back, { color: theme.accent }]}>
          Back to sign in
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Create account</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Start building your roster
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          placeholder="Coach Rivera"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="coach@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 6 characters"
        />

        {error ? (
          <Text style={[styles.error, { color: theme.negative }]}>{error}</Text>
        ) : null}

        <Button label="Create account" onPress={onSubmit} loading={submitting} />

        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary }}>Already have an account?</Text>
          <Link href="/sign-in" style={{ color: theme.accent, fontWeight: '600' }}>
            Sign in
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: Spacing.six,
    marginBottom: Spacing.five,
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
  form: { gap: Spacing.three },
  error: { fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  back: { marginTop: Spacing.four, textAlign: 'center', fontWeight: '600' },
});
