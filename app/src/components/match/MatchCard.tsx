import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { messagePreview } from '@/components/chat/messagePreview';
import { VerifiedBadge } from '@/components/pet/VerifiedBadge';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { MatchSummary } from '@/lib/api';
import { colors, radius, shadows, spacing } from '@/theme';
import { formatDistance, formatRelativeTime } from '@/utils/format';

export function MatchCard({ match, onPress }: { match: MatchSummary; onPress: () => void }) {
  const { pet, lastMessage, unreadCount, isNew } = match;
  const highlight = isNew || unreadCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Match com ${pet.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.highlight,
        pressed && styles.pressed,
      ]}
      testID={`match-card-${pet.id}`}
    >
      <View>
        <Image source={{ uri: pet.photos[0] }} style={styles.photo} contentFit="cover" />
        {isNew && (
          <View style={styles.newBadge}>
            <AppText variant="caption" color="textInverse">
              Novo
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="heading" numberOfLines={1} style={styles.shrink}>
            {pet.name}
          </AppText>
          {pet.verified && <VerifiedBadge size={20} />}
          <View style={styles.flex} />
          <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
          <AppText variant="caption" color="textSecondary">
            {formatDistance(pet.approximateDistance)}
          </AppText>
        </View>

        <View style={styles.titleRow}>
          <Icon name="heart" size={18} color={isNew ? colors.coral : colors.teal} />
          <AppText variant="bodyStrong" color={isNew ? 'coral' : 'teal'} style={styles.flex}>
            Deu match!
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {formatRelativeTime(lastMessage?.createdAt ?? match.createdAt)}
          </AppText>
        </View>

        <View style={styles.titleRow}>
          <AppText
            numberOfLines={2}
            color={unreadCount ? 'text' : 'textSecondary'}
            style={styles.flex}
          >
            {lastMessage ? messagePreview(lastMessage) : 'Mande um oi e combine um passeio! 🐾'}
          </AppText>
          {unreadCount > 0 ? (
            <View style={styles.unread}>
              <AppText variant="small" color="textInverse">
                {unreadCount}
              </AppText>
            </View>
          ) : (
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  highlight: { backgroundColor: colors.coralSoft },
  pressed: { opacity: 0.88 },
  photo: { width: 104, height: 104, borderRadius: radius.lg },
  newBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  body: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
