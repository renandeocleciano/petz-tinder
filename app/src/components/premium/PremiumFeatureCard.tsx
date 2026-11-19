import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { PremiumFeatureInfo } from '@/services/subscription/plans';
import { colors, radius, shadows, spacing, tones } from '@/theme';

export function PremiumFeatureCard({
  info,
  highlighted,
}: {
  info: PremiumFeatureInfo;
  highlighted?: boolean;
}) {
  const palette = tones[info.tone];
  return (
    <View style={[styles.card, highlighted && styles.highlighted]}>
      <View style={[styles.icon, { backgroundColor: palette.background }]}>
        <Icon name={info.icon} size={28} color={palette.foreground} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{info.title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {info.description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  highlighted: { borderColor: colors.orange },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
