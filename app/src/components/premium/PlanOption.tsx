import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { SubscriptionPlan } from '@/services/subscription';
import { colors, radius, shadows, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/format';

interface PlanOptionProps {
  plan: SubscriptionPlan;
  selected: boolean;
  onSelect: () => void;
}

export function PlanOption({ plan, selected, onSelect }: PlanOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Plano ${plan.title}, ${formatCurrencyBRL(plan.pricePerMonth)} por mês`}
      onPress={onSelect}
      style={[styles.card, selected && styles.selected]}
      testID={`plan-${plan.id}`}
    >
      {plan.badge && (
        <View style={styles.badge}>
          <Icon name="crown" size={16} color={colors.textInverse} />
          <AppText variant="caption" color="textInverse">
            {plan.badge}
          </AppText>
        </View>
      )}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.body}>
        <AppText variant="heading">{plan.title}</AppText>
        <AppText variant="title" color={selected ? 'coral' : 'text'}>
          {formatCurrencyBRL(plan.pricePerMonth)}
          <AppText variant="subheading" color={selected ? 'coral' : 'text'}>
            /mês
          </AppText>
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {plan.description}
        </AppText>
      </View>
      {plan.discountLabel && (
        <View style={styles.discount}>
          <AppText variant="heading" color="coral">
            {plan.discountLabel}
          </AppText>
          <AppText variant="caption" color="coral">
            de desconto
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  selected: { borderColor: colors.orange, backgroundColor: colors.orangeTint },
  badge: {
    position: 'absolute',
    top: -14,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.coral },
  radioDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.coral },
  body: { flex: 1 },
  discount: {
    alignItems: 'center',
    backgroundColor: colors.orangeSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
