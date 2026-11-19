import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { PetProfileBody } from '@/components/pet/profile/PetProfileBody';
import { ProfileHeader } from '@/components/pet/profile/ProfileHeader';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingState } from '@/components/ui/States';
import { AccountSection } from '@/features/profile/AccountSection';
import { useActivePet } from '@/hooks/useMe';
import { useBoostPet } from '@/hooks/usePets';
import { usePremiumGate } from '@/hooks/usePremium';
import { getErrorMessage } from '@/lib/api';
import { colors, layout, spacing } from '@/theme';
import { formatClock } from '@/utils/format';

export default function ProfileScreen() {
  const router = useRouter();
  const { activePet } = useActivePet();
  const boost = useBoostPet();
  const { requirePremium } = usePremiumGate();

  if (!activePet) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const startBoost = async () => {
    if (!requirePremium('profile_boost')) return;
    try {
      const { expiresAt } = await boost.mutateAsync(activePet.id);
      Alert.alert(
        'Boost ativado! ⚡',
        `${activePet.name} aparece em destaque até ${formatClock(expiresAt)}.`,
      );
    } catch (error) {
      Alert.alert('Ops!', getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <ScreenHeader showFilters={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          pet={activePet}
          coverActions={
            <>
              <View />
              <IconButton
                icon="lightning-bolt"
                accessibilityLabel="Dar boost no perfil"
                onPress={() => void startBoost()}
                color={colors.lavender}
              />
            </>
          }
          action={
            <PrimaryButton
              label="Editar perfil"
              icon="pencil"
              compact
              onPress={() =>
                router.push({ pathname: '/pet/[id]/edit', params: { id: activePet.id } })
              }
            />
          }
        />
        <PetProfileBody pet={activePet} />
        <AccountSection />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarHeight + spacing.xl,
    gap: spacing.xs,
  },
});
