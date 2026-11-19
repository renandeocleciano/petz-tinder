import { z } from 'zod';

import {
  INTERESTS,
  PERSONALITY_TRAITS,
  PET_GENDERS,
  PET_SIZES,
  PET_STATUSES,
  SPECIES,
} from '../../database/schema/index.js';
import { storagePathSchema } from '../media/media.schemas.js';

export const MAX_PHOTOS_PER_PET = 6;
export const MAX_AGE_YEARS = 30;

const uniqueArray = <T extends z.ZodType>(item: T, maxItems: number) =>
  z
    .array(item)
    .max(maxItems)
    .refine((items) => new Set(items).size === items.length, 'Itens repetidos');

const isoDate = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  const oldest = new Date();
  oldest.setUTCFullYear(oldest.getUTCFullYear() - MAX_AGE_YEARS);
  return date <= new Date() && date >= oldest;
}, 'Data de nascimento fora do intervalo permitido');

const availabilitySchema = z.object({
  title: z.string().trim().min(1).max(60),
  detail: z.string().trim().min(1).max(120),
});

const petFields = {
  name: z.string().trim().min(2).max(50),
  species: z.enum(SPECIES),
  breed: z.string().trim().min(1).max(80),
  birthDate: isoDate,
  approximateAgeYears: z.number().int().min(0).max(MAX_AGE_YEARS),
  gender: z.enum(PET_GENDERS),
  size: z.enum(PET_SIZES),
  neutered: z.boolean(),
  bio: z.string().trim().max(500),
  city: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  personalityTraits: uniqueArray(z.enum(PERSONALITY_TRAITS), PERSONALITY_TRAITS.length),
  interests: uniqueArray(z.enum(INTERESTS), INTERESTS.length),
  preferences: uniqueArray(z.string().trim().min(1).max(40), 10),
  availability: availabilitySchema.nullable(),
};

const oneAgeField = (value: { birthDate?: string; approximateAgeYears?: number }) =>
  !(value.birthDate !== undefined && value.approximateAgeYears !== undefined);

export const createPetBodySchema = z
  .object({
    ...petFields,
    birthDate: petFields.birthDate.optional(),
    approximateAgeYears: petFields.approximateAgeYears.optional(),
    bio: petFields.bio.default(''),
    interests: petFields.interests.default([]),
    preferences: petFields.preferences.default([]),
    availability: petFields.availability.default(null),
    /** Paths returned by POST /v1/media/upload-url (purpose `pet_photo`). */
    photoPaths: uniqueArray(storagePathSchema, MAX_PHOTOS_PER_PET).default([]),
  })
  .strict()
  .refine((value) => value.birthDate !== undefined || value.approximateAgeYears !== undefined, {
    message: 'Informe birthDate ou approximateAgeYears',
    path: ['birthDate'],
  })
  .refine(oneAgeField, { message: 'Informe apenas um: birthDate ou approximateAgeYears' });

export const updatePetBodySchema = z
  .object(petFields)
  .partial()
  .strict()
  .refine(oneAgeField, { message: 'Informe apenas um: birthDate ou approximateAgeYears' })
  .refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
    message: 'latitude e longitude devem ser enviadas juntas',
    path: ['latitude'],
  });

export const petIdParamsSchema = z.object({ id: z.uuid() });
export const petPhotoParamsSchema = z.object({ id: z.uuid(), photoId: z.uuid() });
export const addPhotoBodySchema = z.object({ path: storagePathSchema }).strict();

export const petPhotoSchema = z.object({ id: z.uuid(), url: z.url() });

export const petSchema = z
  .object({
    id: z.uuid(),
    ownerId: z.uuid(),
    name: z.string(),
    species: z.enum(SPECIES),
    breed: z.string(),
    /** null when the tutor only informed an approximate age. */
    birthDate: z.iso.date().nullable(),
    age: z.number().int(),
    ageIsApproximate: z.boolean(),
    gender: z.enum(PET_GENDERS),
    size: z.enum(PET_SIZES),
    neutered: z.boolean(),
    bio: z.string(),
    city: z.string(),
    personalityTraits: z.array(z.enum(PERSONALITY_TRAITS)),
    interests: z.array(z.enum(INTERESTS)),
    preferences: z.array(z.string()),
    availability: availabilitySchema.nullable(),
    verified: z.boolean(),
    status: z.enum(PET_STATUSES),
    photos: z.array(petPhotoSchema),
    coverUrl: z.url().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Pet' });

export const petResponseSchema = z.object({ pet: petSchema });
export const petListResponseSchema = z.object({ data: z.array(petSchema) });

export type CreatePetBody = z.output<typeof createPetBodySchema>;
export type UpdatePetBody = z.output<typeof updatePetBodySchema>;
export type PetDto = z.output<typeof petSchema>;
