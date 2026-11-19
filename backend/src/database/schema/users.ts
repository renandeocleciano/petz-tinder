import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';

/**
 * Internal user. `id` is the domain key; `clerkUserId` only links to the identity provider.
 * RLS is enabled with no policies: the Data API (anon/authenticated) cannot read it, the
 * API connects as the table owner.
 */
export const users = pgTable('users', {
  id: id(),
  clerkUserId: varchar({ length: 64 }).notNull().unique(),
  name: text(),
  email: text(),
  avatarUrl: text(),
  lastActiveAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}).enableRLS();

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    ...timestamps,
  },
  (table) => [index().on(table.userId)],
).enableRLS();

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
