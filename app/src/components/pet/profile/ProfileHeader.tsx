import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing } from '@/theme';
import type { Pet } from '@/types/domain';

import { PetAvatar } from '../PetAvatar';
import { PetMeta } from '../PetMeta';
import { PetTagList } from '../PetTag';
import { VerifiedBadge } from '../VerifiedBadge';

interface ProfileHeaderProps {
  pet: Pet;
  /** Floating controls over the cover (back, menu). */
  coverActions?: ReactNode;
  /** Main CTA next to the name (e.g. "Editar perfil"). */
  action?: ReactNode;
}

export function ProfileHeader({ pet, coverActions, action }: ProfileHeaderProps) {
  const cover = pet.coverUrl ?? pet.photos[1] ?? pet.photos[0];
  return (
    <View>
      <View style={styles.cover}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.coverPlaceholder]}>
            <Icon name="paw" size={64} color={colors.coral} />
          </View>
        )}
        <View style={styles.coverActions}>{coverActions}</View>
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <PetAvatar uri={pet.photos[0]} size={128} ringColor={colors.surface} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <AppText variant="title" numberOfLines={1} style={styles.name}>
              {pet.name}
            </AppText>
            {pet.verified && <VerifiedBadge size={24} />}
          </View>
          {action}
        </View>
      </View>

      <View style={styles.details}>
        <PetMeta pet={pet} />
        <PetTagList traits={pet.personalityTraits} size="sm" max={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 220,
    marginHorizontal: spacing.md,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
  },
  coverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  identity: { flexDirection: 'row', paddingHorizontal: spacing.xl, marginTop: -56 },
  avatar: { borderRadius: 64, backgroundColor: colors.surface },
  info: { flex: 1, paddingTop: 64, paddingLeft: spacing.md, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1 },
  details: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
});
