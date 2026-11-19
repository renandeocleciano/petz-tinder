import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form/FormField';
import { PhotoPicker } from '@/components/form/PhotoPicker';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CITIES } from '@/constants/cities';
import {
  AGE_OPTIONS,
  BREED_SUGGESTIONS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
} from '@/constants/pet';
import { colors, radius, shadows, spacing, tones } from '@/theme';
import { formatAge } from '@/utils/format';

import { MAX_PHOTOS, MAX_TRAITS, petFormSchema, type PetFormValues } from './petFormSchema';
import { ProfileExtrasFields } from './ProfileExtrasFields';

const AGE_SELECT = AGE_OPTIONS.map((years) => ({ value: years, label: formatAge(years) }));
const CITY_SELECT = CITIES.map((city) => ({
  value: city.id,
  label: city.name,
  icon: 'map-marker' as const,
}));

interface PetFormProps {
  defaultValues: PetFormValues;
  onSubmit: (values: PetFormValues) => void;
  submitLabel: string;
  submitting?: boolean;
  /** `edit` adds interests, availability and preferences (kept out of onboarding). */
  mode?: 'create' | 'edit';
}

function NeuteredToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      {[true, false].map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={String(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option)}
            style={[styles.toggle, selected && styles.toggleSelected]}
          >
            <Icon name="paw" size={20} color={selected ? colors.teal : colors.textSecondary} />
            <AppText variant="bodyStrong" color={selected ? 'tealDark' : 'text'}>
              {option ? 'Sim' : 'Não'}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PetForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting,
  mode = 'create',
}: PetFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PetFormValues>({ resolver: zodResolver(petFormSchema), defaultValues });

  const species = useWatch({ control, name: 'species' });
  const breedOptions = BREED_SUGGESTIONS[species].map((breed) => ({ value: breed, label: breed }));

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="photos"
        render={({ field }) => (
          <FormField label="" error={errors.photos?.message}>
            <PhotoPicker
              photos={field.value}
              onChange={field.onChange}
              max={MAX_PHOTOS}
              invalid={Boolean(errors.photos)}
            />
          </FormField>
        )}
      />

      <AppText variant="heading">Informações básicas</AppText>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <FormField label="Nome do pet" error={errors.name?.message}>
            <TextField
              icon="paw"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Ex.: Thor"
              invalid={Boolean(errors.name)}
              testID="pet-name-input"
              autoCapitalize="words"
            />
          </FormField>
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="species"
          render={({ field }) => (
            <FormField label="Espécie" style={styles.flex}>
              <SelectField
                title="Espécie"
                value={field.value}
                options={SPECIES_OPTIONS}
                onChange={(value) => {
                  field.onChange(value);
                  setValue('breed', '');
                }}
              />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="breed"
          render={({ field }) => (
            <FormField label="Raça" error={errors.breed?.message} style={styles.flex}>
              <SelectField
                title="Raça"
                icon="paw"
                value={field.value || undefined}
                options={breedOptions}
                onChange={field.onChange}
                invalid={Boolean(errors.breed)}
                testID="pet-breed-select"
              />
            </FormField>
          )}
        />
      </View>

      <View style={styles.row}>
        <Controller
          control={control}
          name="age"
          render={({ field }) => (
            <FormField label="Idade" style={styles.flex}>
              <SelectField
                title="Idade"
                icon="cake-variant-outline"
                value={field.value}
                options={AGE_SELECT}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <FormField label="Porte" style={styles.flex}>
              <SelectField
                title="Porte"
                value={field.value}
                options={SIZE_OPTIONS}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <FormField label="Sexo" style={styles.flex}>
              <SelectField
                title="Sexo"
                value={field.value}
                options={GENDER_OPTIONS}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
      </View>

      <Controller
        control={control}
        name="neutered"
        render={({ field }) => (
          <FormField label="Castrado">
            <NeuteredToggle value={field.value} onChange={field.onChange} />
          </FormField>
        )}
      />

      <View style={styles.section}>
        <AppText variant="heading">Personalidade</AppText>
        <AppText color="textSecondary">
          Selecione até {MAX_TRAITS} características que mais combinam com seu pet.
        </AppText>
      </View>
      <Controller
        control={control}
        name="personalityTraits"
        render={({ field }) => (
          <FormField label="" error={errors.personalityTraits?.message}>
            <View style={styles.chips}>
              {TRAIT_OPTIONS.map((trait) => {
                const selected = field.value.includes(trait.value);
                return (
                  <Chip
                    key={trait.value}
                    label={trait.label}
                    icon={trait.icon}
                    tone={trait.tone}
                    selected={selected}
                    testID={`trait-${trait.value}`}
                    onPress={() =>
                      field.onChange(
                        selected
                          ? field.value.filter((t) => t !== trait.value)
                          : [...field.value, trait.value].slice(-MAX_TRAITS),
                      )
                    }
                  />
                );
              })}
            </View>
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({ field }) => (
          <FormField label="Sobre o pet (opcional)" error={errors.bio?.message}>
            <TextField
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Conte o que ele ama fazer, como se dá com outros pets..."
              multiline
              maxLength={300}
            />
          </FormField>
        )}
      />

      {mode === 'edit' && <ProfileExtrasFields control={control} errors={errors} />}

      <AppText variant="heading">Localização</AppText>
      <Controller
        control={control}
        name="cityId"
        render={({ field }) => (
          <FormField label="" error={errors.cityId?.message}>
            <SelectField
              title="Cidade"
              icon="map-marker"
              value={field.value}
              options={CITY_SELECT}
              onChange={field.onChange}
            />
            <AppText variant="caption" color="textSecondary">
              Mostramos apenas a distância aproximada. Seu endereço nunca é exibido.
            </AppText>
          </FormField>
        )}
      />

      <PrimaryButton
        label={submitLabel}
        trailingIcon="arrow-right"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        testID="pet-form-submit"
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  section: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toggleRow: { flexDirection: 'row', gap: spacing.md },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  toggleSelected: { backgroundColor: tones.teal.background, borderColor: colors.teal },
  submit: { marginTop: spacing.sm },
});
