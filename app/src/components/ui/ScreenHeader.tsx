import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useUnreadCount } from '@/hooks/useMatches';
import { usePremiumGate } from '@/hooks/usePremium';
import { spacing } from '@/theme';

import { IconButton } from './IconButton';
import { LocationSelector } from './LocationSelector';
import { Logo } from './Logo';

/** Brand header shared by the main tabs: logo, city, notifications and filters. */
export function ScreenHeader({ showFilters = true }: { showFilters?: boolean }) {
  const router = useRouter();
  const unread = useUnreadCount();
  const { requirePremium } = usePremiumGate();

  return (
    <View style={styles.row}>
      <Logo size="sm" />
      <View style={styles.center}>
        <LocationSelector />
      </View>
      <IconButton
        icon="bell-outline"
        accessibilityLabel="Notificações"
        badge={unread}
        elevated={false}
        background="transparent"
        onPress={() => router.navigate('/matches')}
      />
      {showFilters && (
        <IconButton
          icon="tune-variant"
          accessibilityLabel="Filtros avançados"
          onPress={() => {
            if (requirePremium('advanced_filters')) router.push('/filters');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center' },
});
