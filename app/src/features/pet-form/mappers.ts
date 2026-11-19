import { CITIES, DEFAULT_CITY } from '@/constants/cities';
import { AVAILABILITY_OPTIONS } from '@/constants/pet';
import type { Coordinates, CreatePetInput, UpdatePetInput } from '@/lib/api/types';
import type { Availability, Pet } from '@/types/domain';

import type { PetFormValues } from './petFormSchema';

/**
 * Builds the API payload. Location = approximate device position when available,
 * otherwise the selected city center. The backend obfuscates it again before storing.
 */
export const toPetInput = (
  values: PetFormValues,
  approximateLocation: Coordinates | null,
): CreatePetInput => {
  const city = CITIES.find((c) => c.id === values.cityId) ?? DEFAULT_CITY;
  const position = approximateLocation ?? city;
  return {
    name: values.name,
    species: values.species,
    breed: values.breed,
    age: values.age,
    size: values.size,
    gender: values.gender,
    neutered: values.neutered,
    bio: values.bio,
    city: city.name,
    latitude: position.latitude,
    longitude: position.longitude,
    photos: values.photos,
    personalityTraits: values.personalityTraits,
  };
};

const presetFor = (title: string | null) =>
  AVAILABILITY_OPTIONS.find((option) => option.title === title);

/** The backend requires a detail: the preset's description fills it when left blank. */
export const toAvailability = (values: PetFormValues): Availability | null => {
  if (!values.availabilityTitle) return null;
  const detail = values.availabilityDetail.trim();
  return {
    title: values.availabilityTitle,
    detail: detail || presetFor(values.availabilityTitle)?.detail || values.availabilityTitle,
  };
};

/** Editing also sends the profile extras that onboarding does not ask for. */
export const toPetUpdateInput = (
  values: PetFormValues,
  approximateLocation: Coordinates | null,
): UpdatePetInput => ({
  ...toPetInput(values, approximateLocation),
  interests: values.interests,
  availability: toAvailability(values),
  preferences: values.preferences,
});

export const toFormValues = (pet: Pet): PetFormValues => ({
  photos: pet.photos,
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  age: pet.age,
  size: pet.size,
  gender: pet.gender,
  neutered: pet.neutered,
  personalityTraits: pet.personalityTraits,
  bio: pet.bio,
  cityId: CITIES.find((c) => c.name === pet.city)?.id ?? DEFAULT_CITY.id,
  interests: pet.interests,
  availabilityTitle: pet.availability?.title ?? null,
  // A detail equal to the preset default is shown as empty (the placeholder says it).
  availabilityDetail:
    pet.availability && pet.availability.detail !== presetFor(pet.availability.title)?.detail
      ? pet.availability.detail
      : '',
  preferences: pet.preferences,
});
