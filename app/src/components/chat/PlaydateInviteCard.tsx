import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, radius, shadows, spacing } from '@/theme';
import type { PlaydateInvite } from '@/types/domain';
import { formatClock, formatPlaydateDate } from '@/utils/format';

interface PlaydateInviteCardProps {
  invite: PlaydateInvite;
  /** Invites sent by the current user can't be answered by them. */
  isMine: boolean;
  onAccept?: () => void;
  onSuggestOther?: () => void;
  responding?: boolean;
}

const STATUS_LABEL: Record<PlaydateInvite['status'], string> = {
  pending: 'Aguardando resposta',
  accepted: 'Passeio confirmado! 🎉',
  declined: 'Outro horário sugerido',
};

function DetailRow({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.detail}>
      <Icon name={icon} size={20} color={colors.text} />
      <AppText>{label}</AppText>
    </View>
  );
}

export function PlaydateInviteCard({
  invite,
  isMine,
  onAccept,
  onSuggestOther,
  responding,
}: PlaydateInviteCardProps) {
  const canRespond = !isMine && invite.status === 'pending';
  return (
    <View style={styles.card} testID="playdate-invite-card">
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="calendar-heart" size={28} color={colors.textInverse} />
        </View>
        <View style={styles.flex}>
          <AppText variant="subheading">
            {isMine ? 'Convite enviado' : 'Convite para passeio'}
          </AppText>
          <AppText color="textSecondary">Vamos fazer um passeio juntos?</AppText>
        </View>
        <Icon name="paw" size={28} color={colors.teal} />
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          {invite.placeImageUrl ? (
            <Image source={{ uri: invite.placeImageUrl }} style={styles.place} contentFit="cover" />
          ) : (
            <View style={[styles.place, styles.placePlaceholder]}>
              <Icon name="pine-tree" size={40} color={colors.teal} />
            </View>
          )}
          <View style={styles.details}>
            <DetailRow icon="map-marker-outline" label={invite.placeName} />
            <DetailRow
              icon="calendar-blank-outline"
              label={formatPlaydateDate(invite.scheduledAt)}
            />
            <DetailRow icon="clock-outline" label={formatClock(invite.scheduledAt)} />
          </View>
        </View>

        {canRespond ? (
          <View style={styles.actions}>
            <SecondaryButton
              label="Sugerir outro"
              variant="outline"
              compact
              onPress={() => onSuggestOther?.()}
              disabled={responding}
              style={styles.flex}
            />
            <PrimaryButton
              label="Aceitar"
              tone="teal"
              icon="paw"
              compact
              onPress={() => onAccept?.()}
              loading={responding}
              style={styles.flex}
              testID="playdate-accept"
            />
          </View>
        ) : (
          <View style={styles.status}>
            <AppText
              variant="bodyStrong"
              color={invite.status === 'accepted' ? 'tealDark' : 'textSecondary'}
            >
              {STATUS_LABEL[invite.status]}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.mint,
    borderRadius: radius.xxl,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  place: { width: 120, height: 92, borderRadius: radius.md },
  placePlaceholder: {
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, justifyContent: 'space-around' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  status: { alignItems: 'center', paddingVertical: spacing.xs },
});
