import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { users } from './users.js';

export const SUBSCRIPTION_TIERS = ['free', 'premium'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'expired'] as const;

export const subscriptionTier = pgEnum('subscription_tier', SUBSCRIPTION_TIERS);
export const subscriptionStatus = pgEnum('subscription_status', SUBSCRIPTION_STATUSES);

/**
 * Source of truth for the user's plan. No row (or none active and unexpired) means free.
 * At most one `active` row per user; history is kept as canceled/expired rows.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: subscriptionTier().notNull(),
    status: subscriptionStatus().notNull().default('active'),
    /** `dev` for the non-production route; later the payment provider (e.g. `revenuecat`). */
    provider: varchar({ length: 32 }).notNull(),
    providerSubscriptionId: text(),
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** null = no end date. Past dates count as free even before a job marks them expired. */
    expiresAt: timestamp({ withTimezone: true }),
    canceledAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('subscriptions_one_active_per_user')
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
    index().on(table.userId, table.createdAt),
  ],
).enableRLS();

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];
