import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { TRAIT_BY_VALUE } from '@/constants/pet';
import { radius, spacing, tones } from '@/theme';
import type { PersonalityTrait } from '@/types/domain';

export function PetTag({ trait, size = 'md' }: { trait: PersonalityTrait; size?: 'sm' | 'md' }) {
  const option = TRAIT_BY_VALUE[trait];
  const palette = tones[option.tone];
  return (
    <View
      style={[styles.tag, size === 'sm' && styles.small, { backgroundColor: palette.background }]}
    >
      <Icon name={option.icon} size={size === 'sm' ? 14 : 17} color={palette.foreground} />
      <AppText
        variant={size === 'sm' ? 'caption' : 'bodyStrong'}
        style={{ color: palette.foreground }}
      >
        {option.label}
      </AppText>
    </View>
  );
}

export function PetTagList({
  traits,
  size,
  max = 3,
}: {
  traits: PersonalityTrait[];
  size?: 'sm' | 'md';
  max?: number;
}) {
  return (
    <View style={styles.list}>
      {traits.slice(0, max).map((trait) => (
        <PetTag key={trait} trait={trait} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  small: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
