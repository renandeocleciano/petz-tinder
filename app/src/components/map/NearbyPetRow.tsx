import { Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { SPECIES_BY_VALUE } from '@/constants/pet';
import type { NearbyPin } from '@/lib/api';
import { colors, radius, spacing, tones } from '@/theme';

/** A visible (unlocked) pet in the map sheet list. */
export function NearbyPetRow({ pin, onPress }: { pin: NearbyPin; onPress: () => void }) {
  const pet = pin.pet;
  if (!pet) return null;
  const subtitle = [SPECIES_BY_VALUE[pin.species].label, pet.breed].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${pet.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`nearby-pet-${pin.id}`}
    >
      <PetAvatar uri={pet.photos[0]} size={48} />
      <View style={styles.body}>
        <AppText variant="subheading" numberOfLines={1}>
          {pet.name}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {pin.isMatch && (
        <View style={[styles.badge, { backgroundColor: tones.coral.background }]}>
          <AppText variant="caption" style={{ color: tones.coral.foreground }}>
            Match
          </AppText>
        </View>
      )}
      <Icon name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

/** Summary row for pins hidden from free users. */
export function LockedPetsRow({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} pets ocultos. Ver Premium`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID="nearby-locked"
    >
      <View style={styles.lock}>
        <Icon name="lock" size={22} color={colors.orange} />
      </View>
      <View style={styles.body}>
        <AppText variant="subheading">
          {count} {count === 1 ? 'pet oculto' : 'pets ocultos'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Com o Premium você vê todos os pets da região
        </AppText>
      </View>
      <Icon name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  lock: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
