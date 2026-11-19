import { asc, inArray, lt } from 'drizzle-orm';

import type { DbExecutor } from '../../database/index.js';
import { pushReceipts, pushTokens } from '../../database/schema/index.js';

export interface NotificationsRepository {
  tokensFor(userIds: string[]): Promise<{ userId: string; token: string }[]>;
  deleteTokens(tokens: string[]): Promise<void>;
  saveReceipts(receipts: { ticketId: string; token: string }[]): Promise<void>;
  /** Oldest first: tickets whose receipt should be available by now. */
  receiptsBefore(date: Date, limit: number): Promise<{ ticketId: string; token: string }[]>;
  deleteReceipts(ticketIds: string[]): Promise<void>;
}

export const createNotificationsRepository = (db: DbExecutor): NotificationsRepository => ({
  tokensFor: async (userIds) =>
    userIds.length === 0
      ? []
      : db
          .select({ userId: pushTokens.userId, token: pushTokens.token })
          .from(pushTokens)
          .where(inArray(pushTokens.userId, userIds)),

  async deleteTokens(tokens) {
    if (tokens.length > 0) await db.delete(pushTokens).where(inArray(pushTokens.token, tokens));
  },

  async saveReceipts(receipts) {
    if (receipts.length > 0) await db.insert(pushReceipts).values(receipts).onConflictDoNothing();
  },

  receiptsBefore: (date, limit) =>
    db
      .select({ ticketId: pushReceipts.ticketId, token: pushReceipts.token })
      .from(pushReceipts)
      .where(lt(pushReceipts.createdAt, date))
      .orderBy(asc(pushReceipts.createdAt))
      .limit(limit),

  async deleteReceipts(ticketIds) {
    if (ticketIds.length > 0) {
      await db.delete(pushReceipts).where(inArray(pushReceipts.ticketId, ticketIds));
    }
  },
});
