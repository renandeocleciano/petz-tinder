import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const CAROL = authAs('user_carol');

describe('reports routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    await createPet(app, AUTH, 'Mine');
    const bobs = await createPet(app, BOB, 'Bobs');
    const carols = await createPet(app, CAROL, 'Carols');
    const bobId = fakes.pets.pets.get(bobs)?.ownerId ?? '';
    const meId = fakes.users.byClerk('user_clerk_1')?.id ?? '';
    return { ...fakes, bobs, carols, bobId, meId };
  };

  const report = (payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/v1/reports', headers: AUTH, payload });

  it('stores a report for moderation', async () => {
    const { bobId, bobs, meId, social } = await setup();
    const response = await report({
      targetUserId: bobId,
      targetPetId: bobs,
      reason: 'fake_profile',
      description: '  Fotos de outro pet  ',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().report).toMatchObject({
      targetUserId: bobId,
      targetPetId: bobs,
      reason: 'fake_profile',
      status: 'open',
    });
    expect(social.reports[0]).toMatchObject({
      reporterId: meId,
      description: 'Fotos de outro pet',
    });
  });

  it('requires the pet to belong to the reported user', async () => {
    const { bobId, carols } = await setup();
    const response = await report({ targetUserId: bobId, targetPetId: carols, reason: 'spam' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PET_NOT_FOUND');
  });

  it('rejects reporting yourself, unknown users and invalid reasons', async () => {
    const { meId, bobId } = await setup();
    expect((await report({ targetUserId: meId, reason: 'spam' })).statusCode).toBe(422);
    expect(
      (await report({ targetUserId: '00000000-0000-4000-8000-000000000000', reason: 'spam' }))
        .statusCode,
    ).toBe(404);
    expect((await report({ targetUserId: bobId, reason: 'rude' })).statusCode).toBe(422);
  });

  it('is limited to 5 reports per hour', async () => {
    const { bobId } = await setup();
    for (let i = 0; i < 5; i++) {
      expect((await report({ targetUserId: bobId, reason: 'spam' })).statusCode).toBe(201);
    }
    const limited = await report({ targetUserId: bobId, reason: 'spam' });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMITED');
  });
});
