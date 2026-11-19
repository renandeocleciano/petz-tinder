import { Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, radius, spacing } from '@/theme';
import type { Pet } from '@/types/domain';

import { PetAvatar } from './PetAvatar';

interface MatchCelebrationProps {
  myPet: Pet | null;
  matchedPet: Pet | null;
  onMessage: () => void;
  onClose: () => void;
}

export function MatchCelebration({ myPet, matchedPet, onMessage, onClose }: MatchCelebrationProps) {
  return (
    <Modal visible={Boolean(matchedPet)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="match-celebration">
          <Icon name="heart" size={40} color={colors.coral} />
          <AppText variant="title" align="center">
            Deu match!
          </AppText>
          <AppText color="textSecondary" align="center">
            {myPet?.name} e {matchedPet?.name} se curtiram. Que tal combinar um passeio?
          </AppText>
          <View style={styles.avatars}>
            <PetAvatar uri={myPet?.photos[0]} size={96} ringColor={colors.coral} />
            <View style={styles.overlap}>
              <PetAvatar uri={matchedPet?.photos[0]} size={96} ringColor={colors.teal} />
            </View>
          </View>
          <PrimaryButton
            label="Mandar mensagem"
            icon="chat-processing"
            onPress={onMessage}
            style={styles.full}
          />
          <SecondaryButton label="Continuar descobrindo" onPress={onClose} style={styles.full} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  avatars: { flexDirection: 'row', marginVertical: spacing.md },
  overlap: { marginLeft: -spacing.xl },
  full: { alignSelf: 'stretch' },
});
