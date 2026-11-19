import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/index.js';
import {
  subscriptions,
  type SubscriptionRow,
  type SubscriptionTier,
} from '../../database/schema/index.js';

export interface NewSubscription {
  tier: SubscriptionTier;
  provider: string;
  expiresAt: Date | null;
}

export interface SubscriptionsRepository {
  /** The active, unexpired subscription, if any. */
  findCurrent(userId: string, now: Date): Promise<SubscriptionRow | undefined>;
  /**
   * Cancels the active subscription and, when given, starts a new one, atomically.
   * Passing null only cancels (back to free).
   */
  replace(userId: string, next: NewSubscription | null): Promise<SubscriptionRow | undefined>;
}

export const createSubscriptionsRepository = (db: DbExecutor): SubscriptionsRepository => ({
  async findCurrent(userId, now) {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now)),
        ),
      )
      .orderBy(desc(subscriptions.startsAt))
      .limit(1);
    return row;
  },

  replace: (userId, next) =>
    (db as Database).transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: 'canceled', canceledAt: sql`now()` })
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
      if (!next) return undefined;
      const [row] = await tx
        .insert(subscriptions)
        .values({ userId, ...next })
        .returning();
      return row;
    }),
});
