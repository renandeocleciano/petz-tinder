import { z } from 'zod';

import {
  PERSONALITY_TRAITS,
  PET_GENDERS,
  PET_SIZES,
  SPECIES,
} from '../../database/schema/index.js';
import { MAX_AGE_YEARS, petSchema } from '../pets/pets.schemas.js';

export const DEFAULT_RADIUS_KM = 25;
export const MAX_RADIUS_KM = 100;
export const DEFAULT_NEARBY_RADIUS_KM = 10;
export const MAX_NEARBY_RADIUS_KM = 50;
export const MAX_NEARBY_PINS = 200;

/** Repeated query params (`species=dog&species=cat`) or a single value. */
const multi = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.array(z.enum(values)).max(values.length)])
    .transform((value) => [...new Set(Array.isArray(value) ? value : [value])])
    .optional();

const coordinates = {
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
};

const age = z.coerce.number().int().min(0).max(MAX_AGE_YEARS).optional();

export const discoveryQuerySchema = z
  .object({
    /** The user's pet that is swiping. */
    petId: z.uuid(),
    ...coordinates,
    radiusKm: z.coerce.number().int().min(1).max(MAX_RADIUS_KM).default(DEFAULT_RADIUS_KM),
    species: multi(SPECIES),
    gender: multi(PET_GENDERS),
    size: multi(PET_SIZES),
    traits: multi(PERSONALITY_TRAITS),
    ageMin: age,
    ageMax: age,
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(
    (value) =>
      value.ageMin === undefined || value.ageMax === undefined || value.ageMin <= value.ageMax,
    { message: 'ageMin deve ser menor ou igual a ageMax', path: ['ageMin'] },
  );

export const nearbyQuerySchema = z.object({
  petId: z.uuid(),
  ...coordinates,
  radiusKm: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_NEARBY_RADIUS_KM)
    .default(DEFAULT_NEARBY_RADIUS_KM),
});

export const discoveryPetSchema = petSchema
  .extend({
    /** Rounded to 500 m steps, never exact. */
    distanceMeters: z.number().int(),
  })
  .meta({ id: 'DiscoveryPet' });

export const discoveryResponseSchema = z.object({
  data: z.array(discoveryPetSchema),
  nextCursor: z.string().nullable(),
});

export const nearbyPinSchema = z
  .object({
    id: z.uuid(),
    /** Obfuscated: ~500 m grid plus a stable per-pet offset. Never the real position. */
    latitude: z.number(),
    longitude: z.number(),
    species: z.enum(SPECIES),
    distanceMeters: z.number().int(),
    isMatch: z.boolean(),
    /** Reserved for the premium map (MAP_ALL_PETS). Always false until premium is designed. */
    locked: z.boolean(),
    pet: z
      .object({ id: z.uuid(), name: z.string(), breed: z.string(), coverUrl: z.url().nullable() })
      .nullable(),
  })
  .meta({ id: 'NearbyPin' });

export const nearbyResponseSchema = z.object({
  total: z.number().int(),
  data: z.array(nearbyPinSchema),
});

export type DiscoveryQuery = z.output<typeof discoveryQuerySchema>;
export type NearbyQueryInput = z.output<typeof nearbyQuerySchema>;
export type DiscoveryPetDto = z.output<typeof discoveryPetSchema>;
export type NearbyPinDto = z.output<typeof nearbyPinSchema>;
