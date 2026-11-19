import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useDeleteAccount, useSignOut } from '@/hooks/useAccount';
import { useActivePet } from '@/hooks/useMe';
import { usePremiumGate } from '@/hooks/usePremium';
import { getErrorMessage } from '@/lib/api';
import { colors, spacing } from '@/theme';

function Row({
  icon,
  label,
  onPress,
  color = colors.text,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Icon name={icon} size={22} color={color} />
      <AppText variant="bodyStrong" style={[styles.flex, { color }]}>
        {label}
      </AppText>
      <Icon name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

/** Pet switcher (multiple pets per tutor), subscription and session actions. */
export function AccountSection() {
  const router = useRouter();
  const { pets, activePet, setActivePetId } = useActivePet();
  const { isPremium, requirePremium } = usePremiumGate();
  // Free accounts keep one pet; the backend enforces it too (402 MULTIPLE_PETS).
  const addPet = () => {
    if (pets.length >= 1 && !requirePremium('multiple_pets')) return;
    router.push('/create-pet');
  };
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();

  const confirmSignOut = () =>
    Alert.alert('Sair da conta?', 'Você poderá entrar novamente quando quiser.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ]);

  // Required by the App Store: deleting the account from inside the app.
  const confirmDeleteAccount = () =>
    Alert.alert(
      'Excluir sua conta?',
      'Isso apaga para sempre seu login, seus pets, fotos, matches e conversas. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () =>
            deleteAccount.mutate(undefined, {
              onError: (error) =>
                Alert.alert('Não foi possível excluir a conta', getErrorMessage(error)),
            }),
        },
      ],
    );

  return (
    <Card style={styles.card}>
      <AppText variant="subheading">Meus pets</AppText>
      <View style={styles.pets}>
        {pets.map((pet) => (
          <Pressable
            key={pet.id}
            accessibilityRole="button"
            accessibilityState={{ selected: pet.id === activePet?.id }}
            accessibilityLabel={`Usar perfil de ${pet.name}`}
            onPress={() => setActivePetId(pet.id)}
            style={styles.pet}
          >
            <PetAvatar
              uri={pet.photos[0]}
              size={56}
              ringColor={pet.id === activePet?.id ? colors.coral : undefined}
            />
            <AppText variant="caption">{pet.name}</AppText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar pet"
          onPress={addPet}
          style={styles.pet}
        >
          <View style={styles.add}>
            <Icon name="plus" size={26} color={colors.text} />
            {!isPremium && pets.length >= 1 && (
              <View style={styles.premiumBadge}>
                <Icon name="crown" size={12} color={colors.textInverse} />
              </View>
            )}
          </View>
          <AppText variant="caption">Adicionar</AppText>
        </Pressable>
      </View>
      <View style={styles.divider} />
      <Row
        icon="crown"
        color={colors.orange}
        label={isPremium ? 'Petz Premium ativo' : 'Assinar Petz Premium'}
        onPress={() => router.push('/premium')}
      />
      <Row icon="logout" label="Sair" onPress={confirmSignOut} color={colors.danger} />
      <Row
        icon="account-remove-outline"
        label={deleteAccount.isPending ? 'Excluindo conta…' : 'Excluir conta'}
        onPress={deleteAccount.isPending ? () => undefined : confirmDeleteAccount}
        color={colors.danger}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  pets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  pet: { alignItems: 'center', gap: spacing.xs },
  add: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  flex: { flex: 1 },
});
