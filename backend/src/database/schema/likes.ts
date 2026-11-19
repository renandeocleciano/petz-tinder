import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { pets } from './pets.js';

export const LIKE_TYPES = ['like', 'dislike', 'super_like'] as const;
export const likeType = pgEnum('like_type', LIKE_TYPES);

/**
 * One swipe per (from, to) pair. Swiping again on the same pet (e.g. after a dislike
 * expires) overwrites the row instead of piling up history.
 */
export const likes = pgTable(
  'likes',
  {
    id: id(),
    fromPetId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    toPetId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    type: likeType().notNull(),
    ...timestamps,
  },
  (table) => [
    unique().on(table.fromPetId, table.toPetId),
    index().on(table.toPetId),
    check('likes_not_self', sql`${table.fromPetId} <> ${table.toPetId}`),
  ],
).enableRLS();

export const profileBoosts = pgTable(
  'profile_boosts',
  {
    id: id(),
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index().on(table.petId, table.endsAt),
    check('profile_boosts_period', sql`${table.endsAt} > ${table.startsAt}`),
  ],
).enableRLS();

export type LikeRow = typeof likes.$inferSelect;
