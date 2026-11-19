import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { geographyPoint } from './geography.js';
import { users } from './users.js';

export const SPECIES = ['dog', 'cat', 'other'] as const;
export const PET_GENDERS = ['male', 'female'] as const;
export const PET_SIZES = ['small', 'medium', 'large'] as const;
export const PET_STATUSES = ['active', 'hidden', 'suspended'] as const;
export const PERSONALITY_TRAITS = [
  'playful',
  'calm',
  'sociable',
  'loves_park',
  'energetic',
  'shy',
] as const;
export const INTERESTS = ['play', 'walks', 'beach', 'treats', 'other_pets', 'adventures'] as const;

export const species = pgEnum('species', SPECIES);
export const petGender = pgEnum('pet_gender', PET_GENDERS);
export const petSize = pgEnum('pet_size', PET_SIZES);
export const petStatus = pgEnum('pet_status', PET_STATUSES);
export const personalityTrait = pgEnum('personality_trait', PERSONALITY_TRAITS);
export const interest = pgEnum('interest', INTERESTS);

export interface Availability {
  title: string;
  detail: string;
}

export const pets = pgTable(
  'pets',
  {
    id: id(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar({ length: 50 }).notNull(),
    species: species().notNull(),
    breed: varchar({ length: 80 }).notNull(),
    /** Exact date, or an estimate derived from "idade aproximada" (see birthDateApproximate). */
    birthDate: date({ mode: 'string' }).notNull(),
    birthDateApproximate: boolean().notNull().default(false),
    gender: petGender().notNull(),
    size: petSize().notNull(),
    neutered: boolean().notNull(),
    bio: varchar({ length: 500 }).notNull().default(''),
    city: varchar({ length: 80 }).notNull(),
    /** Already rounded to ~1 km. Never returned by the API. */
    location: geographyPoint().notNull(),
    availability: jsonb().$type<Availability>(),
    preferences: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    verified: boolean().notNull().default(false),
    status: petStatus().notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    index().on(table.ownerId),
    index('pets_location_gist').using('gist', table.location),
    check('pets_preferences_max', sql`cardinality(${table.preferences}) <= 10`),
  ],
).enableRLS();

export const petPhotos = pgTable(
  'pet_photos',
  {
    id: id(),
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    /** Object path inside the `pet-photos` bucket. */
    storagePath: text().notNull().unique(),
    position: smallint().notNull(),
    ...timestamps,
  },
  (table) => [index().on(table.petId, table.position)],
).enableRLS();

export const petTraits = pgTable(
  'pet_traits',
  {
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    trait: personalityTrait().notNull(),
  },
  (table) => [primaryKey({ columns: [table.petId, table.trait] })],
).enableRLS();

export const petInterests = pgTable(
  'pet_interests',
  {
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    interest: interest().notNull(),
  },
  (table) => [primaryKey({ columns: [table.petId, table.interest] })],
).enableRLS();

export type PetRow = typeof pets.$inferSelect;
export type NewPetRow = typeof pets.$inferInsert;
export type PetPhotoRow = typeof petPhotos.$inferSelect;
