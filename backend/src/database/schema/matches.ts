import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { pets } from './pets.js';
import { users } from './users.js';

/** A mutual like. Pets are stored ordered (`petAId < petBId`) so a pair has one row. */
export const matches = pgTable(
  'matches',
  {
    id: id(),
    petAId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    petBId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.petAId, table.petBId),
    index().on(table.petBId),
    check('matches_ordered_pair', sql`${table.petAId} < ${table.petBId}`),
  ],
).enableRLS();

/**
 * Chat between two pets. Created with a match, or (premium, later) as a direct message
 * with `matchId` null. Deleting the match deletes the conversation.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: id(),
    matchId: uuid()
      .unique()
      .references(() => matches.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index().on(table.lastMessageAt)],
).enableRLS();

/** One row per pet in the conversation; `userId` is denormalized for RLS and listing. */
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.petId] }),
    index().on(table.userId),
    index().on(table.petId),
  ],
).enableRLS();

export type MatchRow = typeof matches.$inferSelect;
