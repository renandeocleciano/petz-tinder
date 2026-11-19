import { Alert, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useAuthSession, type AuthMethod } from '@/services/auth';
import { spacing } from '@/theme';

/** Social + e-mail entry points. Mode only changes which e-mail screen opens first. */
export function AuthButtons({ mode }: { mode: 'sign-up' | 'sign-in' }) {
  const { signIn, pendingMethod } = useAuthSession();
  const busy = pendingMethod !== null;

  const run = async (method: AuthMethod) => {
    try {
      await signIn(method);
    } catch {
      Alert.alert('Não foi possível entrar', 'Tente novamente em instantes.');
    }
  };

  return (
    <View style={styles.stack}>
      <PrimaryButton
        tone="dark"
        icon="apple"
        label="Continuar com Apple"
        onPress={() => run('apple')}
        loading={pendingMethod === 'apple'}
        disabled={busy}
        testID="auth-apple"
      />
      <SecondaryButton
        icon="google"
        label="Continuar com Google"
        onPress={() => run('google')}
        loading={pendingMethod === 'google'}
        disabled={busy}
        testID="auth-google"
      />
      <PrimaryButton
        tone="teal"
        icon="email-outline"
        label={mode === 'sign-up' ? 'Entrar com e-mail' : 'Entrar com e-mail e senha'}
        onPress={() => run(mode === 'sign-up' ? 'email' : 'existing_account')}
        loading={pendingMethod === 'email' || pendingMethod === 'existing_account'}
        disabled={busy}
        testID="auth-email"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
