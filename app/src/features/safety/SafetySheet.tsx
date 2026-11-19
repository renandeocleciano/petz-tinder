import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useBlockPet, useReportPet } from '@/hooks/useSafety';
import { getErrorMessage } from '@/lib/api';
import { colors, spacing } from '@/theme';
import type { ReportReason } from '@/types/domain';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fake_profile', label: 'Perfil falso' },
  { value: 'inappropriate', label: 'Conteúdo impróprio' },
  { value: 'spam', label: 'Spam ou golpe' },
  { value: 'unsafe', label: 'Comportamento inseguro' },
  { value: 'other', label: 'Outro motivo' },
];

function Option({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.option}>
      <Icon name={icon} size={22} color={danger ? colors.danger : colors.text} />
      <AppText variant="bodyStrong" style={danger && { color: colors.danger }}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface SafetySheetProps {
  petId: string;
  petName: string;
  visible: boolean;
  onClose: () => void;
  onBlocked: () => void;
}

/** Report & block entry points. Moderation itself happens on the backend. */
export function SafetySheet({ petId, petName, visible, onClose, onBlocked }: SafetySheetProps) {
  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const report = useReportPet();
  const block = useBlockPet();

  const close = () => {
    setStep('menu');
    onClose();
  };

  const sendReport = async (reason: ReportReason) => {
    try {
      await report.mutateAsync({ targetPetId: petId, reason });
      close();
      Alert.alert('Denúncia enviada', 'Obrigado! Nossa equipe vai analisar com cuidado.');
    } catch (error) {
      Alert.alert('Ops!', getErrorMessage(error));
    }
  };

  const confirmBlock = () =>
    Alert.alert(
      `Bloquear ${petName}?`,
      'Vocês não verão mais os perfis nem as conversas um do outro.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await block.mutateAsync(petId);
              close();
              onBlocked();
            } catch (error) {
              Alert.alert('Ops!', getErrorMessage(error));
            }
          },
        },
      ],
    );

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={step === 'menu' ? petName : 'Por que você está denunciando?'}
    >
      <View style={styles.list}>
        {step === 'menu' ? (
          <>
            <Option
              icon="flag-outline"
              label="Denunciar perfil"
              onPress={() => setStep('report')}
            />
            <Option icon="block-helper" label="Bloquear" onPress={confirmBlock} danger />
          </>
        ) : (
          REASONS.map((reason) => (
            <Option
              key={reason.value}
              icon="chevron-right"
              label={reason.label}
              onPress={() => void sendReport(reason.value)}
            />
          ))
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
