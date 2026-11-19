import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, radius, spacing } from '@/theme';

const PERKS = ['Ver pets sem match', 'Mensagem direta', 'Filtros avançados'];

/** Compact premium CTA shown in the map bottom sheet. */
export function PremiumUpsell({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.crown}>
          <Icon name="crown" size={22} color={colors.textInverse} />
        </View>
        <View style={styles.flex}>
          <AppText variant="subheading">Petz Premium</AppText>
          <AppText variant="caption" color="textSecondary">
            Desbloqueie mais possibilidades no mapa
          </AppText>
        </View>
      </View>
      {PERKS.map((perk) => (
        <View key={perk} style={styles.perk}>
          <Icon name="lock" size={18} color={colors.orange} />
          <AppText>{perk}</AppText>
        </View>
      ))}
      <PrimaryButton label="Desbloquear agora" icon="crown" compact onPress={onUpgrade} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.orangeTint,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  crown: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
