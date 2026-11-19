import { eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../database/index.js';
import { outboxEvents } from '../../database/schema/index.js';

export interface OutboxEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  /** Including the current one. */
  attempts: number;
}

export interface OutboxRepository {
  /**
   * Leases up to `limit` due events: they become invisible for `leaseSeconds`, so a crash
   * mid-processing only delays them. `SKIP LOCKED` lets several instances share the queue.
   */
  claim(limit: number, leaseSeconds: number): Promise<OutboxEvent[]>;
  complete(id: string): Promise<void>;
  /** `retryAt` null gives up: the event is closed with its last error (dead letter). */
  fail(id: string, error: string, retryAt: Date | null): Promise<void>;
}

export const createOutboxRepository = (db: DbExecutor): OutboxRepository => ({
  async claim(limit, leaseSeconds) {
    const rows = await db.execute<OutboxEvent & Record<string, unknown>>(sql`
      update outbox_events
      set available_at = now() + make_interval(secs => ${leaseSeconds}::int),
          attempts = attempts + 1
      where id in (
        select id from outbox_events
        where processed_at is null and available_at <= now()
        order by available_at
        limit ${limit}::int
        for update skip locked
      )
      returning id, type, payload, attempts
    `);
    return [...rows];
  },

  async complete(id) {
    await db
      .update(outboxEvents)
      .set({ processedAt: sql`now()`, lastError: null })
      .where(eq(outboxEvents.id, id));
  },

  async fail(id, error, retryAt) {
    await db
      .update(outboxEvents)
      .set(
        retryAt
          ? { lastError: error, availableAt: retryAt }
          : { lastError: error, processedAt: sql`now()` },
      )
      .where(eq(outboxEvents.id, id));
  },
});
