import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, spacing, type ColorName } from '@/theme';
import type { Pet } from '@/types/domain';
import { formatAge, formatDistance } from '@/utils/format';

interface PetMetaProps {
  pet: Pick<Pet, 'breed' | 'age' | 'approximateDistance'>;
  inverse?: boolean;
  showBreed?: boolean;
}

function MetaItem({ icon, label, inverse }: { icon: IconName; label: string; inverse?: boolean }) {
  const color: ColorName = inverse ? 'textInverse' : 'text';
  return (
    <View style={styles.item}>
      <Icon name={icon} size={18} color={inverse ? colors.textInverse : colors.text} />
      <AppText variant="body" color={color}>
        {label}
      </AppText>
    </View>
  );
}

/** "🐾 Golden Retriever · 🎂 3 anos · 📍 1,2 km" — distance is always approximate. */
export function PetMeta({ pet, inverse, showBreed = true }: PetMetaProps) {
  return (
    <View style={styles.row}>
      {showBreed && <MetaItem icon="paw" label={pet.breed} inverse={inverse} />}
      <MetaItem icon="cake-variant-outline" label={formatAge(pet.age)} inverse={inverse} />
      {pet.approximateDistance !== null && (
        <MetaItem
          icon="map-marker-outline"
          label={formatDistance(pet.approximateDistance)}
          inverse={inverse}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
