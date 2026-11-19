import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanOption } from '@/components/premium/PlanOption';
import { PremiumFeatureCard } from '@/components/premium/PremiumFeatureCard';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EmptyState } from '@/components/ui/States';
import { usePremiumGate, usePurchasePlan } from '@/hooks/usePremium';
import { getErrorMessage } from '@/lib/api';
import {
  PREMIUM_FEATURES,
  SUBSCRIPTION_PLANS,
  type PlanId,
  type PremiumFeature,
} from '@/services/subscription';
import { colors, radius, spacing } from '@/theme';

const hero = require('../../assets/images/welcome-hero.png');

const TRUST: { icon: IconName; label: string; color: string }[] = [
  { icon: 'shield-check', label: 'Pagamento 100% seguro', color: colors.teal },
  { icon: 'credit-card-outline', label: 'Cancele quando quiser', color: colors.text },
  { icon: 'heart', label: 'Mais pets felizes na sua cidade', color: colors.coral },
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { feature } = useLocalSearchParams<{ feature?: PremiumFeature }>();
  const { isPremium } = usePremiumGate();
  const purchase = usePurchasePlan();
  const [planId, setPlanId] = useState<PlanId>('annual');

  const subscribe = async () => {
    try {
      await purchase.mutateAsync(planId);
      Alert.alert('Bem-vindo ao Premium! 👑', 'Todos os recursos já estão liberados.');
      router.back();
    } catch (error) {
      Alert.alert('Não foi possível assinar', getErrorMessage(error));
    }
  };

  const rows = [PREMIUM_FEATURES.slice(0, 2), PREMIUM_FEATURES.slice(2, 4)];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <IconButton
              icon="chevron-left"
              accessibilityLabel="Fechar"
              onPress={() => router.back()}
            />
            <View style={styles.brand}>
              <Logo size="sm" />
              <View style={styles.premiumPill}>
                <Icon name="crown" size={14} color={colors.textInverse} />
                <AppText variant="caption" color="textInverse">
                  Premium
                </AppText>
              </View>
            </View>
            <AppText variant="title">Mais conexões para momentos inesquecíveis 💛</AppText>
          </View>
          <Image source={hero} style={styles.hero} contentFit="cover" contentPosition="left" />
        </View>
        <AppText color="textSecondary">
          Descubra mais pets, faça novas amizades e viva experiências ainda mais especiais.
        </AppText>

        {rows.map((row, index) => (
          <View key={index} style={styles.featureRow}>
            {row.map((info) => (
              <PremiumFeatureCard
                key={info.feature}
                info={info}
                highlighted={info.feature === feature}
              />
            ))}
          </View>
        ))}

        {isPremium ? (
          <EmptyState
            icon="crown"
            tone="orange"
            title="Você já é Premium!"
            description="Aproveite todos os recursos do Petz."
          />
        ) : (
          <>
            <View style={styles.plans}>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <PlanOption
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === planId}
                  onSelect={() => setPlanId(plan.id)}
                />
              ))}
            </View>
            <PrimaryButton
              label="Assinar agora"
              icon="crown"
              trailingIcon="arrow-right"
              onPress={() => void subscribe()}
              loading={purchase.isPending}
              testID="premium-subscribe"
            />
          </>
        )}

        <View style={styles.trust}>
          {TRUST.map((item) => (
            <View key={item.label} style={styles.trustItem}>
              <Icon name={item.icon} size={24} color={item.color} />
              <AppText variant="caption" color="textSecondary" style={styles.flex}>
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  heroRow: { flexDirection: 'row', gap: spacing.md },
  heroText: { flex: 1.3, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  hero: { flex: 1, borderRadius: radius.xxl, minHeight: 200 },
  featureRow: { flexDirection: 'row', gap: spacing.md },
  plans: { gap: spacing.xl, marginTop: spacing.md },
  trust: { flexDirection: 'row', gap: spacing.md },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
});
