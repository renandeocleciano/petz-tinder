import type { FastifyBaseLogger } from 'fastify';

import type { OutboxEvent, OutboxRepository } from './outbox.repository.js';

export type OutboxHandler = (payload: Record<string, unknown>) => Promise<void>;

/** Thrown by handlers for events that can never succeed (e.g. malformed payload). */
export class PermanentEventError extends Error {}

export interface OutboxWorkerOptions {
  repository: OutboxRepository;
  handlers: Record<string, OutboxHandler>;
  logger: FastifyBaseLogger;
  intervalMs?: number;
  batchSize?: number;
  leaseSeconds?: number;
  maxAttempts?: number;
  now?: () => Date;
}

/** 10 s, 20 s, 40 s… capped at 1 h. */
export const retryDelayMs = (attempts: number) =>
  Math.min(10_000 * 2 ** (attempts - 1), 60 * 60 * 1000);

/**
 * Delivers outbox events after their transaction committed (at least once). Runs inside
 * the API process; safe to run on several instances at the same time.
 */
export const createOutboxWorker = ({
  repository,
  handlers,
  logger,
  intervalMs = 2000,
  batchSize = 20,
  leaseSeconds = 60,
  maxAttempts = 8,
  now = () => new Date(),
}: OutboxWorkerOptions) => {
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  let stopped = true;

  const handle = async (event: OutboxEvent) => {
    const log = logger.child({ eventId: event.id, eventType: event.type, attempt: event.attempts });
    const handler = handlers[event.type];
    if (!handler) {
      // Events nobody consumes yet (e.g. future types) are closed, not retried forever.
      await repository.complete(event.id);
      return;
    }
    try {
      await handler(event.payload);
      await repository.complete(event.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const giveUp = error instanceof PermanentEventError || event.attempts >= maxAttempts;
      const retryAt = giveUp ? null : new Date(now().getTime() + retryDelayMs(event.attempts));
      await repository.fail(event.id, message.slice(0, 1000), retryAt);
      log[giveUp ? 'error' : 'warn']({ err: error, retryAt }, 'Outbox event failed');
    }
  };

  /** Processes due events until the queue is drained. Returns how many were handled. */
  const runOnce = async (): Promise<number> => {
    let total = 0;
    for (;;) {
      const events = await repository.claim(batchSize, leaseSeconds);
      for (const event of events) await handle(event);
      total += events.length;
      if (events.length < batchSize || stopped) return total;
    }
  };

  const tick = () => {
    running = runOnce()
      .then(() => undefined)
      .catch((error: unknown) => logger.error({ err: error }, 'Outbox poll failed'))
      .finally(() => {
        running = undefined;
        if (!stopped) timer = setTimeout(tick, intervalMs);
      });
  };

  return {
    runOnce,
    start() {
      if (!stopped) return;
      stopped = false;
      tick();
    },
    /** Waits for the batch in progress, so shutdown does not leave half-sent events. */
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running;
    },
  };
};

export type OutboxWorker = ReturnType<typeof createOutboxWorker>;
