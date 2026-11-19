import type { FastifyBaseLogger } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { createFakeOutboxRepository } from '../../../../test/fakes.js';
import { createOutboxWorker, PermanentEventError, retryDelayMs } from '../outbox.worker.js';

const silent = (): FastifyBaseLogger => {
  const logger = {
    child: () => logger,
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    level: 'silent',
    silent: vi.fn(),
  };
  return logger as unknown as FastifyBaseLogger;
};

const setup = (handler: (payload: Record<string, unknown>) => Promise<void>, maxAttempts = 3) => {
  const source: { type: string; payload: Record<string, unknown> }[] = [
    { type: 'Test', payload: { n: 1 } },
  ];
  const outbox = createFakeOutboxRepository(source);
  let clock = Date.now();
  const worker = createOutboxWorker({
    repository: outbox.repository,
    handlers: { Test: handler },
    logger: silent(),
    maxAttempts,
    now: () => new Date(clock),
  });
  /** Makes retried events due again. */
  const advance = () => {
    clock += 2 * 60 * 60 * 1000;
    for (const event of outbox.events) event.availableAt = 0;
  };
  return { outbox, worker, source, advance };
};

describe('outbox worker', () => {
  it('delivers events and marks them processed', async () => {
    const handler = vi.fn(async () => undefined);
    const { worker, outbox } = setup(handler);
    expect(await worker.runOnce()).toBe(1);
    expect(handler).toHaveBeenCalledWith({ n: 1 });
    expect(outbox.events[0]).toMatchObject({ processed: true, attempts: 1 });
    expect(await worker.runOnce()).toBe(0);
  });

  it('retries failures with backoff, then gives up', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Expo down');
    });
    const { worker, outbox, advance } = setup(handler, 3);
    await worker.runOnce();
    const [event] = outbox.events;
    expect(event).toMatchObject({ processed: false, lastError: 'Expo down', attempts: 1 });
    expect(await worker.runOnce()).toBe(0); // not due yet

    advance();
    await worker.runOnce();
    advance();
    await worker.runOnce();
    expect(event).toMatchObject({ processed: true, attempts: 3, lastError: 'Expo down' });
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('does not retry permanent errors', async () => {
    const { worker, outbox } = setup(async () => {
      throw new PermanentEventError('Invalid event payload');
    });
    await worker.runOnce();
    expect(outbox.events[0]).toMatchObject({ processed: true, attempts: 1 });
  });

  it('closes events without a handler', async () => {
    const { worker, outbox, source } = setup(async () => undefined);
    source.push({ type: 'Unknown', payload: {} });
    await worker.runOnce();
    expect(outbox.events.every((event) => event.processed)).toBe(true);
  });

  it('backs off exponentially up to one hour', () => {
    expect([1, 2, 3].map(retryDelayMs)).toEqual([10_000, 20_000, 40_000]);
    expect(retryDelayMs(20)).toBe(60 * 60 * 1000);
  });

  it('stops cleanly', async () => {
    const { worker } = setup(async () => undefined);
    worker.start();
    await worker.stop();
  });
});
