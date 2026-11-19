import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp, buildTestApp, testEnv } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');

describe('entitlements routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    return fakes;
  };

  const summary = async (headers = AUTH) =>
    (await app.inject({ method: 'GET', url: '/v1/entitlements', headers })).json().entitlements;

  const setTier = (payload: Record<string, unknown>, headers = AUTH) =>
    app.inject({ method: 'POST', url: '/v1/dev/subscription', headers, payload });

  it('starts on the free plan', async () => {
    await setup();
    expect(await summary()).toEqual({
      tier: 'free',
      expiresAt: null,
      entitlements: {
        MAP_ALL_PETS: false,
        DIRECT_MESSAGE: false,
        ADVANCED_FILTERS: false,
        PROFILE_BOOST: false,
        SUPER_LIKE: false,
        MULTIPLE_PETS: false,
      },
      superLikes: { limitPerDay: 1, remaining: 1 },
      pets: { limit: 1 },
    });
  });

  it('counts the super like quota', async () => {
    await setup();
    const mine = await createPet(app, AUTH, 'Mine');
    const bobs = await createPet(app, BOB, 'Bobs');
    await app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers: AUTH,
      payload: { fromPetId: mine, toPetId: bobs, type: 'super_like' },
    });
    expect((await summary()).superLikes).toEqual({ limitPerDay: 1, remaining: 0 });
  });

  it('switches plans through the dev route', async () => {
    const { subscriptions } = await setup();
    const premium = await setTier({ tier: 'premium', durationDays: 30 });
    expect(premium.statusCode).toBe(200);
    expect(premium.json().entitlements).toMatchObject({
      tier: 'premium',
      expiresAt: expect.any(String),
      entitlements: { DIRECT_MESSAGE: true, SUPER_LIKE: true, MULTIPLE_PETS: true },
      superLikes: { limitPerDay: null, remaining: null },
      pets: { limit: 10 },
    });

    const me = await app.inject({ method: 'GET', url: '/v1/users/me', headers: AUTH });
    expect(me.json().user.subscriptionTier).toBe('premium');
    expect((await summary(BOB)).tier).toBe('free');

    expect((await setTier({ tier: 'free' })).json().entitlements.tier).toBe('free');
    expect(subscriptions.rows.map((row) => row.status)).toEqual(['canceled']);
  });

  it('treats an expired subscription as free', async () => {
    const { subscriptions } = await setup();
    await setTier({ tier: 'premium' });
    const [row] = subscriptions.rows;
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    expect((await summary()).tier).toBe('free');
  });

  it('validates the dev payload', async () => {
    await setup();
    expect((await setTier({ tier: 'gold' })).statusCode).toBe(422);
    expect((await setTier({ tier: 'premium', durationDays: 0 })).statusCode).toBe(422);
  });

  it('does not expose the dev route in production', async () => {
    app = await buildTestApp({ env: testEnv({ NODE_ENV: 'production' }) });
    expect((await setTier({ tier: 'premium' })).statusCode).toBe(404);
  });
});
