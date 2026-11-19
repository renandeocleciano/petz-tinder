import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { toFormValues, toPetUpdateInput } from '@/features/pet-form/mappers';
import { PetForm } from '@/features/pet-form/PetForm';
import type { PetFormValues } from '@/features/pet-form/petFormSchema';
import { useActivePet } from '@/hooks/useMe';
import { useDeletePet, usePet, useUpdatePet } from '@/hooks/usePets';
import { getErrorMessage } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pet = usePet(id);
  const update = useUpdatePet(id);
  const remove = useDeletePet();
  const { pets } = useActivePet();
  // The last pet cannot be deleted here: the app needs at least one (delete the account instead).
  const canDelete = pets.length > 1;

  const confirmDelete = () => {
    const name = pet.data?.name ?? 'este pet';
    Alert.alert(
      `Excluir ${name}?`,
      'O perfil, as fotos, os matches e as conversas deste pet serão apagados. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            remove.mutate(id, {
              // Back to the profile tab: the screens below may show the deleted pet.
              onSuccess: () => router.dismissTo('/profile'),
              onError: (error) => Alert.alert('Não foi possível excluir', getErrorMessage(error)),
            });
          },
        },
      ],
    );
  };
  const approximateLocation = useAppStore((s) => s.approximateLocation);

  const submit = async (values: PetFormValues) => {
    try {
      await update.mutateAsync(toPetUpdateInput(values, approximateLocation));
      router.back();
    } catch (error) {
      Alert.alert('Não foi possível salvar', getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Voltar" onPress={() => router.back()} />
        <AppText variant="heading">Editar perfil</AppText>
        <View style={styles.side} />
      </View>
      {pet.isLoading ? (
        <LoadingState />
      ) : pet.data ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <PetForm
              defaultValues={toFormValues(pet.data)}
              onSubmit={submit}
              submitLabel="Salvar"
              submitting={update.isPending}
              mode="edit"
            />
            {canDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${pet.data.name}`}
                onPress={confirmDelete}
                disabled={remove.isPending}
                style={styles.delete}
                testID="pet-delete"
              >
                <Icon name="trash-can-outline" size={20} color={colors.danger} />
                <AppText variant="bodyStrong" style={{ color: colors.danger }}>
                  {remove.isPending ? 'Excluindo…' : 'Excluir pet'}
                </AppText>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ErrorState error={pet.error} onRetry={() => pet.refetch()} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  side: { width: 44 },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
});
