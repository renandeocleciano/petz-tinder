import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../app.js';
import { buildTestApp, testEnv } from '../../../test/helpers.js';
import { parseEnv } from '../env.js';

describe('app bootstrap', () => {
  let app: App;
  afterEach(() => app?.close());

  it('answers /health without authentication and echoes the request id', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'req-123' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toBe('req-123');
  });

  it('returns the standard error body for unknown routes', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Rota não encontrada',
        requestId: expect.any(String),
      },
    });
  });

  it('reports the readiness failure without leaking the cause', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable' });
  });
});

describe('env', () => {
  it('names invalid variables without printing their values', () => {
    const env = { ...testEnv(), CLERK_SECRET_KEY: 'leaked-value', PORT: '3000' };
    expect(() => parseEnv(env as unknown as NodeJS.ProcessEnv)).toThrow(
      'Invalid environment variables: CLERK_SECRET_KEY',
    );
    try {
      parseEnv(env as unknown as NodeJS.ProcessEnv);
    } catch (error) {
      expect(String(error)).not.toContain('leaked-value');
    }
  });

  it.each([
    ['a publishable key', 'sb_publishable_abc'],
    ['an anon JWT', `x.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.y`],
  ])('refuses %s as the service role key', (_case, key) => {
    expect(() =>
      parseEnv({ ...testEnv(), SUPABASE_SERVICE_ROLE_KEY: key } as unknown as NodeJS.ProcessEnv),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });
});
