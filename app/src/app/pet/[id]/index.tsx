import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PetProfileBody } from '@/components/pet/profile/PetProfileBody';
import { ProfileHeader } from '@/components/pet/profile/ProfileHeader';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useDiscoverActions } from '@/features/discover/useDiscoverActions';
import { SafetySheet } from '@/features/safety/SafetySheet';
import { useMatches } from '@/hooks/useMatches';
import { useActivePet } from '@/hooks/useMe';
import { usePet } from '@/hooks/usePets';
import { colors, spacing } from '@/theme';

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pet = usePet(id);
  const { activePet } = useActivePet();
  const matches = useMatches();
  const actions = useDiscoverActions(activePet);
  const [safetyOpen, setSafetyOpen] = useState(false);

  if (pet.isLoading)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (pet.isError || !pet.data) {
    return (
      <Screen>
        <ErrorState error={pet.error} onRetry={() => pet.refetch()} />
      </Screen>
    );
  }

  const data = pet.data;
  const isMine = data.ownerId === activePet?.ownerId;
  const match = matches.data?.find((m) => m.pet.id === data.id);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
        <ProfileHeader
          pet={data}
          coverActions={
            <>
              <IconButton
                icon="chevron-left"
                accessibilityLabel="Voltar"
                onPress={() => router.back()}
                background={colors.glass}
                color={colors.textInverse}
                elevated={false}
              />
              {!isMine && (
                <IconButton
                  icon="dots-horizontal"
                  accessibilityLabel="Denunciar ou bloquear"
                  onPress={() => setSafetyOpen(true)}
                  background={colors.glass}
                  color={colors.textInverse}
                  elevated={false}
                />
              )}
            </>
          }
        />
        <PetProfileBody pet={data} />
      </ScrollView>

      {!isMine && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {match ? (
            <PrimaryButton
              label="Conversar"
              icon="chat-processing"
              tone="teal"
              onPress={() =>
                router.push({
                  pathname: '/conversation/[id]',
                  params: { id: match.conversationId },
                })
              }
            />
          ) : (
            <PrimaryButton
              label="Mensagem direta"
              icon="crown"
              onPress={() => actions.directMessage(data)}
              loading={actions.isSending}
            />
          )}
        </View>
      )}

      <SafetySheet
        petId={data.id}
        petName={data.name}
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onBlocked={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
});
