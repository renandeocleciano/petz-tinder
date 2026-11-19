import { Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { NearbyPin } from '@/lib/api/types';
import { colors, shadows, spacing } from '@/theme';

export function PetPinMarker({ pin, onPress }: { pin: NearbyPin; onPress: () => void }) {
  if (pin.locked || !pin.pet) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel="Pet por perto (premium)"
        style={[styles.locked, shadows.md]}
      >
        <Icon name={pin.species === 'cat' ? 'cat' : 'dog'} size={20} color={colors.textSecondary} />
        <View style={styles.lockBadge}>
          <Icon name="lock" size={10} color={colors.textInverse} />
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityLabel={pin.pet.name} style={shadows.md}>
      <PetAvatar
        uri={pin.pet.photos[0]}
        size={60}
        ringColor={pin.isMatch ? colors.teal : colors.coral}
        online
      />
    </Pressable>
  );
}

export function ClusterMarker({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${count} pets nesta área`}
      style={styles.halo}
    >
      <View style={[styles.cluster, shadows.md]}>
        <Icon name="paw" size={18} color={colors.coral} />
        <AppText variant="bodyStrong">{count}</AppText>
      </View>
    </Pressable>
  );
}

/** Approximate area of the user — a soft halo, never a precise dot. */
export function ApproximateAreaMarker() {
  return (
    <View style={styles.area} accessibilityLabel="Sua região aproximada">
      <View style={styles.areaDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  locked: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    padding: spacing.sm,
    borderRadius: 40,
    backgroundColor: colors.coralHalo,
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    minWidth: 60,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  area: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.skyHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.sky,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});
