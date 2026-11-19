import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { id } from './columns.js';

/**
 * Domain events written in the same transaction as the change that caused them
 * (e.g. MatchCreated). A worker delivers them after commit; nothing slow runs in the
 * transaction itself.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: id(),
    type: varchar({ length: 64 }).notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    attempts: integer().notNull().default(0),
    lastError: text(),
    availableAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('outbox_events_pending')
      .on(table.availableAt)
      .where(sql`${table.processedAt} is null`),
  ],
).enableRLS();
