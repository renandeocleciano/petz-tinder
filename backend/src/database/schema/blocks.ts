import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/** Blocks are per user: blocking a tutor hides all of their pets, in both directions. */
export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index().on(table.blockedId),
    check('blocks_not_self', sql`${table.blockerId} <> ${table.blockedId}`),
  ],
).enableRLS();
