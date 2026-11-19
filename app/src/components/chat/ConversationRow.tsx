import { Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import type { ConversationSummary } from '@/lib/api';
import { formatRelativeTime } from '@/utils/format';

import { messagePreview } from './messagePreview';

export function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const { pet, lastMessage, unreadCount } = conversation;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${pet.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <PetAvatar uri={pet.photos[0]} size={60} />
      <View style={styles.body}>
        <View style={styles.top}>
          <AppText variant="subheading" numberOfLines={1} style={styles.flex}>
            {pet.name}
          </AppText>
          {lastMessage && (
            <AppText variant="caption" color="textSecondary">
              {formatRelativeTime(lastMessage.createdAt)}
            </AppText>
          )}
        </View>
        <View style={styles.top}>
          <AppText
            numberOfLines={1}
            color={unreadCount ? 'text' : 'textSecondary'}
            variant={unreadCount ? 'bodyStrong' : 'body'}
            style={styles.flex}
          >
            {lastMessage ? messagePreview(lastMessage) : 'Diga oi! 👋'}
          </AppText>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <AppText variant="small" color="textInverse">
                {unreadCount}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
