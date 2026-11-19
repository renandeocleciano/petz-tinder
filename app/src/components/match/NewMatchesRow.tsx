import { FlatList, Pressable, StyleSheet } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import type { MatchSummary } from '@/lib/api';
import { colors, spacing } from '@/theme';

export function NewMatchesRow({
  matches,
  onPress,
}: {
  matches: MatchSummary[];
  onPress: (match: MatchSummary) => void;
}) {
  return (
    <FlatList
      horizontal
      data={matches}
      keyExtractor={(match) => match.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Novo match: ${item.pet.name}`}
          onPress={() => onPress(item)}
          style={styles.item}
        >
          <PetAvatar uri={item.pet.photos[0]} size={76} ringColor={colors.coral} online />
          <AppText variant="bodyStrong" numberOfLines={1}>
            {item.pet.name}
          </AppText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  item: { alignItems: 'center', gap: spacing.xs, width: 78 },
});
