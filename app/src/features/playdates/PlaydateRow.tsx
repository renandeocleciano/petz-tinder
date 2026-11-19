import { Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { PlaydateSummary } from '@/lib/api';
import { colors, radius, spacing, tones, type Tone } from '@/theme';
import { formatClock, formatPlaydateDate } from '@/utils/format';

import { playdateStatusLabel } from './groupPlaydates';

const STATUS_TONE: Record<string, Tone> = {
  Confirmado: 'teal',
  Realizado: 'neutral',
  Responder: 'coral',
  Aguardando: 'orange',
  Recusado: 'neutral',
  'Sem resposta': 'neutral',
};

export function PlaydateRow({
  playdate,
  onPress,
}: {
  playdate: PlaydateSummary;
  onPress: () => void;
}) {
  const status = playdateStatusLabel(playdate);
  const tone = tones[STATUS_TONE[status] ?? 'neutral'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Passeio com ${playdate.pet.name} em ${playdate.placeName}, ${status}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`playdate-${playdate.id}`}
    >
      <PetAvatar uri={playdate.pet.photos[0]} size={52} />
      <View style={styles.body}>
        <AppText variant="subheading" numberOfLines={1}>
          {playdate.pet.name} · {playdate.placeName}
        </AppText>
        <View style={styles.when}>
          <Icon name="calendar-clock" size={16} color={colors.textSecondary} />
          <AppText variant="caption" color="textSecondary">
            {formatPlaydateDate(playdate.scheduledAt)} · {formatClock(playdate.scheduledAt)}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          {playdate.direction === 'sent' ? 'Você convidou' : 'Convite recebido'}
        </AppText>
      </View>
      <View style={[styles.status, { backgroundColor: tone.background }]}>
        <AppText variant="caption" style={{ color: tone.foreground }}>
          {status}
        </AppText>
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
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  when: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  status: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
});
