import { useState } from 'react';
import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form/FormField';
import { TextField } from '@/components/form/TextField';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { AVAILABILITY_OPTIONS, INTEREST_OPTIONS, PREFERENCE_SUGGESTIONS } from '@/constants/pet';
import { colors, spacing } from '@/theme';

import {
  MAX_AVAILABILITY_DETAIL,
  MAX_PREFERENCE_LENGTH,
  MAX_PREFERENCES,
  type PetFormValues,
} from './petFormSchema';

interface ProfileExtrasFieldsProps {
  control: Control<PetFormValues>;
  errors: FieldErrors<PetFormValues>;
}

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item];

/** Free text plus suggestions; custom entries show up as selected chips. */
function PreferencesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const full = value.length >= MAX_PREFERENCES;
  const custom = value.filter((item) => !PREFERENCE_SUGGESTIONS.includes(item));

  const add = () => {
    const text = draft.trim();
    if (!text || full || value.some((item) => item.toLowerCase() === text.toLowerCase())) return;
    onChange([...value, text]);
    setDraft('');
  };

  return (
    <View style={styles.group}>
      <View style={styles.chips}>
        {[...PREFERENCE_SUGGESTIONS, ...custom].map((item) => {
          const selected = value.includes(item);
          return (
            <Chip
              key={item}
              label={item}
              icon={selected ? 'check' : 'paw'}
              selected={selected}
              testID={`preference-${item}`}
              onPress={() => (selected || !full ? onChange(toggle(value, item)) : undefined)}
            />
          );
        })}
      </View>
      <View style={styles.addRow}>
        <View style={styles.flex}>
          <TextField
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder={
              full ? `Limite de ${MAX_PREFERENCES} atingido` : 'Escreva outra preferência'
            }
            editable={!full}
            maxLength={MAX_PREFERENCE_LENGTH}
            returnKeyType="done"
            testID="preference-input"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar preferência"
          disabled={!draft.trim() || full}
          onPress={add}
          style={[styles.addButton, (!draft.trim() || full) && styles.disabled]}
          testID="preference-add"
        >
          <Icon name="plus" size={22} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

/** Interests, availability and preferences: optional profile details, edited after onboarding. */
export function ProfileExtrasFields({ control, errors }: ProfileExtrasFieldsProps) {
  const availabilityTitle = useWatch({ control, name: 'availabilityTitle' });
  const preset = AVAILABILITY_OPTIONS.find((option) => option.title === availabilityTitle);

  return (
    <>
      <View style={styles.section}>
        <AppText variant="heading">Interesses</AppText>
        <AppText color="textSecondary">O que seu pet mais curte fazer?</AppText>
      </View>
      <Controller
        control={control}
        name="interests"
        render={({ field }) => (
          <View style={styles.chips}>
            {INTEREST_OPTIONS.map((interest) => (
              <Chip
                key={interest.value}
                label={interest.label}
                icon={interest.icon}
                tone={interest.tone}
                selected={field.value.includes(interest.value)}
                testID={`interest-${interest.value}`}
                onPress={() => field.onChange(toggle(field.value, interest.value))}
              />
            ))}
          </View>
        )}
      />

      <View style={styles.section}>
        <AppText variant="heading">Disponibilidade</AppText>
        <AppText color="textSecondary">Quando ele costuma estar livre para passear?</AppText>
      </View>
      <Controller
        control={control}
        name="availabilityTitle"
        render={({ field }) => {
          const known = AVAILABILITY_OPTIONS.some((option) => option.title === field.value);
          const options =
            field.value && !known
              ? [
                  ...AVAILABILITY_OPTIONS,
                  { title: field.value, detail: '', icon: 'calendar' as const },
                ]
              : AVAILABILITY_OPTIONS;
          return (
            <View style={styles.chips}>
              {options.map((option) => {
                const selected = field.value === option.title;
                return (
                  <Chip
                    key={option.title}
                    label={option.title}
                    icon={option.icon}
                    selected={selected}
                    testID={`availability-${option.title}`}
                    onPress={() => field.onChange(selected ? null : option.title)}
                  />
                );
              })}
            </View>
          );
        }}
      />
      {availabilityTitle ? (
        <Controller
          control={control}
          name="availabilityDetail"
          render={({ field }) => (
            <FormField label="Detalhe (opcional)" error={errors.availabilityDetail?.message}>
              <TextField
                icon="calendar-clock"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={preset ? `Ex.: ${preset.detail}` : 'Ex.: Sábados no Aterro'}
                maxLength={MAX_AVAILABILITY_DETAIL}
                testID="availability-detail-input"
              />
            </FormField>
          )}
        />
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">Preferências</AppText>
        <AppText color="textSecondary">
          Com quem ele se dá melhor? Escolha ou escreva até {MAX_PREFERENCES}.
        </AppText>
      </View>
      <Controller
        control={control}
        name="preferences"
        render={({ field }) => (
          <FormField label="" error={errors.preferences?.message}>
            <PreferencesInput value={field.value} onChange={field.onChange} />
          </FormField>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  group: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
  disabled: { opacity: 0.4 },
});
