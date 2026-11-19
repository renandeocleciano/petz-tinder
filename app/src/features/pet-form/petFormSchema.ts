import { z } from 'zod';

export const MAX_PHOTOS = 6;
export const MAX_TRAITS = 4;
/** Backend limits: up to 10 preferences of 40 characters; availability detail up to 120. */
export const MAX_PREFERENCES = 10;
export const MAX_PREFERENCE_LENGTH = 40;
export const MAX_AVAILABILITY_DETAIL = 120;

export const petFormSchema = z.object({
  photos: z
    .array(z.string())
    .min(1, 'Adicione pelo menos uma foto')
    .max(MAX_PHOTOS, `Máximo de ${MAX_PHOTOS} fotos`),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do pet')
    .min(2, 'Use pelo menos 2 caracteres')
    .max(30, 'Use até 30 caracteres'),
  species: z.enum(['dog', 'cat', 'other']),
  breed: z.string().trim().min(1, 'Escolha a raça'),
  age: z.number().int().min(0).max(25),
  size: z.enum(['small', 'medium', 'large']),
  gender: z.enum(['male', 'female']),
  neutered: z.boolean(),
  personalityTraits: z
    .array(z.enum(['playful', 'calm', 'sociable', 'loves_park', 'energetic', 'shy']))
    .min(1, 'Escolha pelo menos uma característica')
    .max(MAX_TRAITS, `Escolha até ${MAX_TRAITS}`),
  bio: z.string().trim().max(300, 'Use até 300 caracteres'),
  cityId: z.string().min(1, 'Escolha a cidade'),
  // Profile extras: only shown when editing (onboarding stays short).
  interests: z.array(z.enum(['play', 'walks', 'beach', 'treats', 'other_pets', 'adventures'])),
  /** Availability title (one of AVAILABILITY_OPTIONS, or a custom one from older data). */
  availabilityTitle: z.string().trim().max(60).nullable(),
  availabilityDetail: z
    .string()
    .trim()
    .max(MAX_AVAILABILITY_DETAIL, `Use até ${MAX_AVAILABILITY_DETAIL} caracteres`),
  preferences: z
    .array(z.string().trim().min(1).max(MAX_PREFERENCE_LENGTH))
    .max(MAX_PREFERENCES, `Escolha até ${MAX_PREFERENCES}`),
});

export type PetFormValues = z.infer<typeof petFormSchema>;

export const emptyPetForm = (cityId: string): PetFormValues => ({
  photos: [],
  name: '',
  species: 'dog',
  breed: '',
  age: 1,
  size: 'medium',
  gender: 'male',
  neutered: false,
  personalityTraits: [],
  bio: '',
  cityId,
  interests: [],
  availabilityTitle: null,
  availabilityDetail: '',
  preferences: [],
});
