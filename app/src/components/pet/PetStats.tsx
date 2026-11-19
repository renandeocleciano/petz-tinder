import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, spacing } from '@/theme';
import type { PetStatsData } from '@/types/domain';
import { formatCompactNumber } from '@/utils/format';

const ITEMS: { key: keyof PetStatsData; label: string; icon: IconName; color: string }[] = [
  { key: 'likes', label: 'Curtidas', icon: 'heart', color: colors.coral },
  { key: 'matches', label: 'Matches', icon: 'chat-processing', color: colors.teal },
  { key: 'views', label: 'Visualizações', icon: 'eye-outline', color: colors.tealDark },
];

export function PetStats({ stats }: { stats: PetStatsData }) {
  return (
    <Card style={styles.card}>
      {ITEMS.map((item, index) => (
        <View key={item.key} style={[styles.item, index > 0 && styles.divider]}>
          <Icon name={item.icon} size={28} color={item.color} />
          <View>
            <AppText variant="heading">{formatCompactNumber(stats[item.key])}</AppText>
            <AppText variant="caption" color="textSecondary">
              {item.label}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', paddingVertical: spacing.md },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.border },
});
