import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { AuthButtons } from '@/features/auth/AuthButtons';
import { colors, fontFamily, spacing } from '@/theme';

const hero = require('../../../assets/images/welcome-hero.png');

export default function WelcomeScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Logo size="lg" />
          <View>
            <AppText variant="display" align="center" style={styles.headline}>
              Encontre pets
            </AppText>
            <AppText variant="display" align="center" style={[styles.headline, styles.accent]}>
              perto de você
            </AppText>
          </View>
          <AppText align="center" color="textSecondary" style={styles.sub}>
            Faça matches, organize passeios e crie novas amizades para o seu pet.
          </AppText>
        </View>

        <Image
          source={hero}
          style={styles.hero}
          contentFit="contain"
          accessibilityLabel="Cachorro e gato juntos na praia"
        />

        <AuthButtons mode="sign-up" />

        <View style={styles.divider}>
          <View style={styles.line} />
          <AppText color="textSecondary">Ou</AppText>
          <View style={styles.line} />
        </View>

        <Link href="/login" style={styles.link} accessibilityRole="link">
          <AppText variant="bodyStrong" color="teal" style={styles.underline}>
            Já tenho conta
          </AppText>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', gap: spacing.md },
  headline: { fontSize: 36, lineHeight: 42 },
  accent: { color: colors.coral, fontFamily: fontFamily.black },
  sub: { maxWidth: 320, fontSize: 16, lineHeight: 22 },
  hero: { width: '100%', aspectRatio: 700 / 530 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  link: { alignSelf: 'center', padding: spacing.xs },
  underline: { textDecorationLine: 'underline' },
});
