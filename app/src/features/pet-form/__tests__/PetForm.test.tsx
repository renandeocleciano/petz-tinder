import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SAFE_AREA } from '@/test/renderWithProviders';

import type { Pet } from '@/types/domain';

import { toFormValues, toPetInput, toPetUpdateInput } from '../mappers';
import { PetForm } from '../PetForm';
import { emptyPetForm, petFormSchema, type PetFormValues } from '../petFormSchema';

const PHOTO = 'file:///tmp/thor.jpg';

const renderForm = (defaults: Partial<PetFormValues> = {}, mode?: 'create' | 'edit') => {
  const onSubmit = jest.fn();
  const defaultValues = { ...emptyPetForm('rio'), ...defaults };
  return {
    onSubmit,
    view: render(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <PetForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          submitLabel="Continuar"
          mode={mode}
        />
      </SafeAreaProvider>,
    ),
  };
};

describe('pet creation form', () => {
  it('submits a valid pet', async () => {
    const user = userEvent.setup();
    const { onSubmit, view } = renderForm({ photos: [PHOTO], breed: 'Golden Retriever' });
    await view;

    await user.type(screen.getByTestId('pet-name-input'), 'Thor');
    await user.press(screen.getByTestId('trait-playful'));
    await user.press(screen.getByTestId('trait-sociable'));
    await user.press(screen.getByTestId('pet-form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Thor',
      breed: 'Golden Retriever',
      photos: [PHOTO],
      personalityTraits: ['playful', 'sociable'],
      cityId: 'rio',
    });
  });

  it('blocks submission and shows errors when required fields are missing', async () => {
    const user = userEvent.setup();
    const { onSubmit, view } = renderForm();
    await view;

    await user.press(screen.getByTestId('pet-form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('Informe o nome do pet')).toBeTruthy();
    expect(screen.getByText('Adicione pelo menos uma foto')).toBeTruthy();
    expect(screen.getByText('Escolha pelo menos uma característica')).toBeTruthy();
  });
});

describe('pet form schema and mapping', () => {
  const valid: PetFormValues = {
    ...emptyPetForm('sao-paulo'),
    name: '  Luna ',
    breed: 'Border Collie',
    photos: [PHOTO],
    personalityTraits: ['energetic'],
  };

  it('trims the name and limits traits', () => {
    expect(petFormSchema.parse(valid).name).toBe('Luna');
    const tooMany = {
      ...valid,
      personalityTraits: ['playful', 'calm', 'sociable', 'loves_park', 'shy'],
    };
    expect(petFormSchema.safeParse(tooMany).success).toBe(false);
  });

  it('uses the approximate location when available, otherwise the city center', () => {
    const withCity = toPetInput(valid, null);
    expect(withCity.city).toBe('São Paulo');
    expect(withCity.latitude).toBeCloseTo(-23.56, 1);

    const withDevice = toPetInput(valid, { latitude: -23.5, longitude: -46.6 });
    expect(withDevice).toMatchObject({ latitude: -23.5, longitude: -46.6 });
  });
});

describe('pet form — profile extras (edit only)', () => {
  const filled: Partial<PetFormValues> = {
    photos: [PHOTO],
    name: 'Thor',
    breed: 'Golden Retriever',
    personalityTraits: ['playful'],
  };

  it('keeps onboarding short: no interests, availability or preferences', async () => {
    const { view } = renderForm();
    await view;
    expect(screen.queryByTestId('interest-play')).toBeNull();
    expect(screen.queryByTestId('availability-Manhãs')).toBeNull();
    expect(screen.queryByTestId('preference-input')).toBeNull();
  });

  it('edits interests, availability and preferences', async () => {
    const user = userEvent.setup();
    const { onSubmit, view } = renderForm(filled, 'edit');
    await view;

    await user.press(screen.getByTestId('interest-walks'));
    await user.press(screen.getByTestId('interest-beach'));
    await user.press(screen.getByTestId('availability-Fins de semana'));
    await user.type(screen.getByTestId('availability-detail-input'), 'Sábados no Aterro');
    await user.press(screen.getByTestId('preference-Pets calmos'));
    await user.type(screen.getByTestId('preference-input'), 'Cães idosos');
    await user.press(screen.getByTestId('preference-add'));
    await user.press(screen.getByTestId('pet-form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      interests: ['walks', 'beach'],
      availabilityTitle: 'Fins de semana',
      availabilityDetail: 'Sábados no Aterro',
      preferences: ['Pets calmos', 'Cães idosos'],
    });
  });

  it('deselects availability by tapping it again', async () => {
    const user = userEvent.setup();
    const { onSubmit, view } = renderForm({ ...filled, availabilityTitle: 'Manhãs' }, 'edit');
    await view;
    await user.press(screen.getByTestId('availability-Manhãs'));
    expect(screen.queryByTestId('availability-detail-input')).toBeNull();
    await user.press(screen.getByTestId('pet-form-submit'));
    expect(onSubmit.mock.calls[0][0].availabilityTitle).toBeNull();
  });

  it('limits preferences to 10', () => {
    const values = { ...emptyPetForm('rio'), ...filled } as PetFormValues;
    const eleven = Array.from({ length: 11 }, (_, i) => `Preferência ${i}`);
    expect(petFormSchema.safeParse({ ...values, preferences: eleven }).success).toBe(false);
  });

  describe('mapping', () => {
    const values: PetFormValues = { ...emptyPetForm('rio'), ...filled } as PetFormValues;

    it('fills a blank availability detail with the preset description', () => {
      const input = toPetUpdateInput({ ...values, availabilityTitle: 'Noites' }, null);
      expect(input.availability).toEqual({ title: 'Noites', detail: 'Depois das 18h' });
      expect(toPetUpdateInput(values, null).availability).toBeNull();
      expect(
        toPetUpdateInput(
          { ...values, availabilityTitle: 'Noites', availabilityDetail: ' Depois do jantar ' },
          null,
        ).availability,
      ).toEqual({ title: 'Noites', detail: 'Depois do jantar' });
    });

    it('round-trips a pet, hiding a detail equal to the preset default', () => {
      const pet = {
        id: 'p1',
        ownerId: 'u1',
        name: 'Thor',
        species: 'dog',
        breed: 'SRD',
        birthDate: null,
        age: 3,
        size: 'large',
        gender: 'male',
        neutered: true,
        bio: '',
        latitude: 0,
        longitude: 0,
        approximateDistance: null,
        city: 'Rio de Janeiro',
        photos: [PHOTO],
        coverUrl: PHOTO,
        personalityTraits: ['calm'],
        interests: ['walks'],
        preferences: ['Pets calmos'],
        availability: { title: 'Fins de semana', detail: 'Sábados e domingos' },
        verified: false,
      } satisfies Pet;
      expect(toFormValues(pet)).toMatchObject({
        interests: ['walks'],
        availabilityTitle: 'Fins de semana',
        availabilityDetail: '',
        preferences: ['Pets calmos'],
      });
      const custom = toFormValues({
        ...pet,
        availability: { title: 'Depois do trabalho', detail: 'Por volta das 19h' },
      });
      expect(custom).toMatchObject({
        availabilityTitle: 'Depois do trabalho',
        availabilityDetail: 'Por volta das 19h',
      });
    });

    it('does not send extras when creating', () => {
      const input = toPetInput(values, null);
      expect(input).not.toHaveProperty('preferences');
      expect(input).not.toHaveProperty('interests');
    });
  });
});
