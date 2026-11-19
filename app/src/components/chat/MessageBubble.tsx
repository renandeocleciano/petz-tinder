import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing } from '@/theme';
import type { Message } from '@/types/domain';
import { formatClock } from '@/utils/format';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  avatarUri: string | null | undefined;
}

export function MessageBubble({ message, isMine, avatarUri }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isMine && styles.rowMine]} testID={`message-${message.id}`}>
      {!isMine && <PetAvatar uri={avatarUri} size={40} />}
      <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
        {message.type === 'image' && message.imageUrl ? (
          <Image
            source={{ uri: message.imageUrl }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel="Imagem enviada"
          />
        ) : null}
        {message.text ? <AppText>{message.text}</AppText> : null}
        <View style={styles.meta}>
          <AppText variant="small" color="textSecondary">
            {formatClock(message.createdAt)}
          </AppText>
          {isMine && (
            <Icon
              name="check-all"
              size={16}
              color={message.readAt ? colors.teal : colors.textSecondary}
            />
          )}
        </View>
      </View>
      {isMine && <PetAvatar uri={avatarUri} size={40} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginVertical: spacing.xs + 2,
  },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '74%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl,
    gap: spacing.xs,
  },
  theirs: { backgroundColor: colors.muted, borderTopLeftRadius: radius.sm },
  mine: { backgroundColor: colors.mint, borderTopRightRadius: radius.sm },
  image: { width: 220, height: 220, borderRadius: radius.lg },
  meta: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: spacing.xs },
});
