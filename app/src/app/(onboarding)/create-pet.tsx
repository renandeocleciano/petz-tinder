import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { toPetInput } from '@/features/pet-form/mappers';
import { PetForm } from '@/features/pet-form/PetForm';
import { emptyPetForm, type PetFormValues } from '@/features/pet-form/petFormSchema';
import { useMe } from '@/hooks/useMe';
import { useCreatePet } from '@/hooks/usePets';
import { useReplaceWhen } from '@/hooks/useReplaceWhen';
import { getErrorMessage, isPremiumRequired } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { spacing } from '@/theme';

export default function CreatePetScreen() {
  const router = useRouter();
  const createPet = useCreatePet();
  const me = useMe();
  // Onboarding: once the new pet is in `me`, the root navigator unlocks the tabs.
  const [createdPetId, setCreatedPetId] = useState<string | null>(null);
  useReplaceWhen(
    Boolean(createdPetId && me.data?.pets.some((pet) => pet.id === createdPetId)),
    '/discover',
  );
  const city = useAppStore((s) => s.city);
  const approximateLocation = useAppStore((s) => s.approximateLocation);

  const submit = async (values: PetFormValues) => {
    // "Add pet" from the profile goes back. The first pet waits for the tabs to be unlocked
    // (see useReplaceWhen): navigating right here would be cancelled by the route guard.
    const isFirstPet = !me.data?.pets.length;
    try {
      const pet = await createPet.mutateAsync(toPetInput(values, approximateLocation));
      if (isFirstPet || !router.canGoBack()) setCreatedPetId(pet.id);
      else router.back();
    } catch (error) {
      if (isPremiumRequired(error)) {
        router.push({ pathname: '/premium', params: { feature: 'multiple_pets' } });
        return;
      }
      Alert.alert('Não foi possível salvar', getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.side}>
              {router.canGoBack() && (
                <IconButton
                  icon="chevron-left"
                  accessibilityLabel="Voltar"
                  onPress={() => router.back()}
                />
              )}
            </View>
            <Logo />
            <View style={styles.side} />
          </View>
          <View style={styles.titles}>
            <AppText variant="title" align="center">
              Criar perfil do pet
            </AppText>
            <AppText color="textSecondary" align="center">
              Conte um pouco sobre seu pet para que ele possa fazer novos amigos! 🐾
            </AppText>
          </View>
          <PetForm
            defaultValues={emptyPetForm(city.id)}
            onSubmit={submit}
            submitLabel="Continuar"
            submitting={createPet.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 44 },
  titles: { gap: spacing.xs, marginBottom: spacing.sm },
});
