import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, shadows, spacing } from '@/theme';
import type { Pet } from '@/types/domain';

import { PetMeta } from './PetMeta';
import { PetTagList } from './PetTag';
import { VerifiedBadge } from './VerifiedBadge';

interface PetCardProps {
  pet: Pet;
  /** Shows the "Compatível com seu estilo" badge. */
  compatible?: boolean;
  onOpenProfile?: () => void;
}

/** Large discover card: photo carousel (tap left/right), identity, tags and bio. */
export function PetCard({ pet, compatible, onOpenProfile }: PetCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = pet.photos.length ? pet.photos : [null];
  const total = photos.length;
  const current = photos[Math.min(photoIndex, total - 1)];

  const step = (delta: number) => setPhotoIndex((index) => (index + delta + total) % total);

  return (
    <View style={styles.card} testID={`pet-card-${pet.id}`}>
      {current ? (
        <Image
          source={{ uri: current }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Icon name="paw" size={96} color={colors.coral} />
        </View>
      )}

      <View style={styles.tapZones}>
        <Pressable
          style={styles.flex}
          onPress={() => step(-1)}
          accessibilityLabel="Foto anterior"
        />
        <Pressable style={styles.flex} onPress={() => step(1)} accessibilityLabel="Próxima foto" />
      </View>

      <View style={styles.topRow} pointerEvents="none">
        {compatible ? (
          <View style={styles.compatible}>
            <Icon name="paw" size={20} color={colors.textInverse} />
            <AppText variant="caption" color="textInverse">
              Compatível com{'\n'}seu estilo
            </AppText>
          </View>
        ) : (
          <View />
        )}
        {total > 1 && (
          <View style={styles.counter}>
            <AppText variant="caption" color="textInverse">
              {photoIndex + 1}/{total}
            </AppText>
          </View>
        )}
      </View>

      <LinearGradient
        colors={[colors.scrimTop, colors.scrimBottom]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <Pressable
        style={styles.info}
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${pet.name}`}
      >
        <View style={styles.nameRow}>
          <AppText variant="display" color="textInverse" style={styles.name} numberOfLines={1}>
            {pet.name}
          </AppText>
          {pet.verified && <VerifiedBadge size={28} />}
        </View>
        <PetMeta pet={pet} inverse />
        <PetTagList traits={pet.personalityTraits} />
        {pet.bio ? (
          <AppText color="textInverse" numberOfLines={3}>
            {pet.bio}
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.muted,
    ...shadows.lg,
  },
  flex: { flex: 1 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
  },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', bottom: '45%' },
  topRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  compatible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.tealDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  counter: {
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
  },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
    gap: spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 40, lineHeight: 46, flexShrink: 1 },
});
