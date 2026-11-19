import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { AuthButtons } from '@/features/auth/AuthButtons';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="chevron-left" accessibilityLabel="Voltar" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size="lg" />
          <AppText variant="title" align="center">
            Que bom te ver de novo!
          </AppText>
          <AppText color="textSecondary" align="center">
            Entre para ver seus matches e conversas.
          </AppText>
        </View>
        <AuthButtons mode="sign-in" />
        <View style={styles.privacy}>
          <Icon name="shield-check-outline" size={18} color={colors.teal} />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            Nunca mostramos seu endereço, telefone ou localização exata.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  content: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xxl },
  header: { alignItems: 'center', gap: spacing.md },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  flex: { flexShrink: 1 },
});
