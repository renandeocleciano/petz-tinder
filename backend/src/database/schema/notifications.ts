import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Expo push tickets waiting for their receipt. Expo reports undeliverable tokens
 * (DeviceNotRegistered) in receipts, ~15 min after sending; those tokens are deleted.
 */
export const pushReceipts = pgTable(
  'push_receipts',
  {
    ticketId: text().primaryKey(),
    token: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdAt)],
).enableRLS();
