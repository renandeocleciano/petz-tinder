import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors, spacing } from '@/theme';

const MESSAGES = {
  'expo-go':
    'O mapa usa código nativo do Mapbox, que não existe no Expo Go. Use um development build para vê-lo.',
  'missing-token':
    'Configure EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN e rode um development build para ver o mapa.',
} as const;

export type MapUnavailableReason = keyof typeof MESSAGES;

/** Placeholder when the map can't render, so the rest of the screen keeps working. */
export function MapUnavailable({ reason = 'missing-token' }: { reason?: MapUnavailableReason }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <Icon name="map-search-outline" size={56} color={colors.teal} />
      <AppText variant="subheading" align="center">
        Mapa indisponível
      </AppText>
      <AppText color="textSecondary" align="center">
        {MESSAGES[reason]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxxl,
    paddingBottom: 260,
    backgroundColor: colors.mint,
  },
});
