import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet, upgradeToPremium } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');

describe('blocks routes', () => {
  let app: App;
  afterEach(() => app?.close());

  /** Mine and Bob's pet matched; Bob's user id comes from the pet's ownerId. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const mine = await createPet(app, AUTH, 'Mine');
    const bobs = await createPet(app, BOB, 'Bobs');
    for (const [from, to, headers] of [
      [mine, bobs, AUTH],
      [bobs, mine, BOB],
    ] as const) {
      await app.inject({
        method: 'POST',
        url: '/v1/likes',
        headers,
        payload: { fromPetId: from, toPetId: to, type: 'like' },
      });
    }
    const bobId = fakes.pets.pets.get(bobs)?.ownerId ?? '';
    const meId = fakes.users.byClerk('user_clerk_1')?.id ?? '';
    return { ...fakes, mine, bobs, bobId, meId };
  };

  const block = (targetUserId: string, headers = AUTH) =>
    app.inject({ method: 'POST', url: '/v1/blocks', headers, payload: { targetUserId } });
  const unblock = (userId: string, headers = AUTH) =>
    app.inject({ method: 'DELETE', url: `/v1/blocks/${userId}`, headers });
  const get = (url: string, headers = AUTH) => app.inject({ method: 'GET', url, headers });

  it('blocks, lists and unblocks a user', async () => {
    const { bobId, users } = await setup();
    const bob = users.users.get(bobId);
    if (bob) users.users.set(bobId, { ...bob, name: 'Bob' });

    const created = await block(bobId);
    expect(created.statusCode).toBe(201);
    expect(created.json().block).toMatchObject({ userId: bobId, name: 'Bob' });
    expect((await block(bobId)).statusCode).toBe(201);
    expect((await get('/v1/blocks')).json().data).toHaveLength(1);

    expect((await unblock(bobId)).statusCode).toBe(204);
    expect((await unblock(bobId)).statusCode).toBe(204);
    expect((await get('/v1/blocks')).json().data).toEqual([]);
  });

  it('hides matches and conversations in both directions, reversibly', async () => {
    const { bobId } = await setup();
    await block(bobId);
    for (const headers of [AUTH, BOB]) {
      expect((await get('/v1/matches', headers)).json().data).toHaveLength(0);
      expect((await get('/v1/conversations', headers)).json().data).toHaveLength(0);
    }
    await unblock(bobId);
    expect((await get('/v1/matches')).json().data).toHaveLength(1);
    expect((await get('/v1/conversations', BOB)).json().data).toHaveLength(1);
  });

  it('prevents likes in both directions', async () => {
    const { meId, bobId } = await setup();
    await block(meId, BOB);
    await upgradeToPremium(app, AUTH);
    await upgradeToPremium(app, BOB);
    const myOther = await createPet(app, AUTH, 'Other');
    const bobsOther = await createPet(app, BOB, 'BobsOther');
    const like = (from: string, to: string, headers: Record<string, string>) =>
      app.inject({
        method: 'POST',
        url: '/v1/likes',
        headers,
        payload: { fromPetId: from, toPetId: to, type: 'like' },
      });
    expect((await like(myOther, bobsOther, AUTH)).statusCode).toBe(404);
    expect((await like(bobsOther, myOther, BOB)).statusCode).toBe(404);
    expect(bobId).not.toBe(meId);
  });

  it('only lists blocks made by the caller', async () => {
    const { bobId, meId } = await setup();
    await block(bobId);
    expect((await get('/v1/blocks', BOB)).json().data).toEqual([]);
    expect((await get('/v1/blocks')).json().data[0].userId).toBe(bobId);
    expect(meId).toBeTruthy();
  });

  it('rejects blocking yourself or an unknown user', async () => {
    const { meId } = await setup();
    expect((await block(meId)).statusCode).toBe(422);
    const unknown = await block('00000000-0000-4000-8000-000000000000');
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.code).toBe('USER_NOT_FOUND');
  });
});
