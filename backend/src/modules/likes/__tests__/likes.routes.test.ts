import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet, upgradeToPremium } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const CAROL = authAs('user_carol');

describe('likes routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const mine = await createPet(app, AUTH, 'Mine');
    await upgradeToPremium(app, BOB);
    const bobs = await createPet(app, BOB, 'Bobs');
    const bobs2 = await createPet(app, BOB, 'Bobs2');
    const carols = await createPet(app, CAROL, 'Carols');
    const userId = (clerkId: string) => fakes.users.byClerk(clerkId)?.id ?? '';
    return { ...fakes, mine, bobs, bobs2, carols, userId };
  };

  const like = (
    fromPetId: string,
    toPetId: string,
    type = 'like',
    headers: Record<string, string> = AUTH,
  ) =>
    app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers,
      payload: { fromPetId, toPetId, type },
    });

  it('records a like without a match', async () => {
    const { mine, bobs } = await setup();
    const response = await like(mine, bobs);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      like: { fromPetId: mine, toPetId: bobs, type: 'like' },
      match: null,
    });
  });

  it('creates a match, its conversation and an outbox event on a mutual like', async () => {
    const { mine, bobs, social } = await setup();
    await like(mine, bobs);
    const response = await like(bobs, mine, 'super_like', BOB);

    expect(response.statusCode).toBe(201);
    const { match } = response.json();
    expect(match).toMatchObject({
      myPetId: bobs,
      pet: { id: mine, name: 'Mine' },
      isNew: true,
      conversationId: expect.any(String),
    });
    expect(social.matches.size).toBe(1);
    expect(social.outbox).toEqual([
      {
        type: 'MatchCreated',
        payload: expect.objectContaining({ matchId: match.id, petIds: [bobs, mine] }),
      },
    ]);
  });

  it('does not match on a dislike', async () => {
    const { mine, bobs, social } = await setup();
    await like(mine, bobs);
    const response = await like(bobs, mine, 'dislike', BOB);
    expect(response.json().match).toBeNull();
    expect(social.matches.size).toBe(0);
  });

  it('rejects liking an already matched pet', async () => {
    const { mine, bobs } = await setup();
    await like(mine, bobs);
    await like(bobs, mine, 'like', BOB);
    const response = await like(mine, bobs, 'dislike');
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('ALREADY_MATCHED');
  });

  it('limits free users to one super like per day', async () => {
    const { mine, bobs, bobs2 } = await setup();
    expect((await like(mine, bobs, 'super_like')).statusCode).toBe(201);
    // Repeating the same super like is idempotent and does not spend quota.
    expect((await like(mine, bobs, 'super_like')).statusCode).toBe(201);

    const response = await like(mine, bobs2, 'super_like');
    expect(response.statusCode).toBe(402);
    expect(response.json().error).toMatchObject({
      code: 'PREMIUM_REQUIRED',
      details: { feature: 'SUPER_LIKE', limitPerDay: 1 },
    });
    expect((await like(mine, bobs2, 'like')).statusCode).toBe(201);
  });

  it('lets premium users super like without limit', async () => {
    const { mine, bobs, bobs2 } = await setup();
    await upgradeToPremium(app, AUTH);
    expect((await like(mine, bobs, 'super_like')).statusCode).toBe(201);
    expect((await like(mine, bobs2, 'super_like')).statusCode).toBe(201);
  });

  it('only lets owners like with their pets', async () => {
    const { mine, bobs } = await setup();
    const response = await like(mine, bobs, 'like', CAROL);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PET_FORBIDDEN');
  });

  it('rejects liking your own pet', async () => {
    const { mine } = await setup();
    await upgradeToPremium(app, AUTH);
    const mine2 = await createPet(app, AUTH, 'Mine2');
    expect((await like(mine, mine2)).statusCode).toBe(422);
    expect((await like(mine, mine)).statusCode).toBe(422);
  });

  it('hides blocked users as missing pets, in both directions', async () => {
    const { mine, bobs, carols, social, userId } = await setup();
    social.block(userId('user_bob'), userId('user_clerk_1'));
    social.block(userId('user_clerk_1'), userId('user_carol'));
    for (const target of [bobs, carols]) {
      const response = await like(mine, target);
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('PET_NOT_FOUND');
    }
  });

  it('cannot like hidden or suspended pets', async () => {
    const { mine, bobs, pets } = await setup();
    const row = pets.pets.get(bobs);
    if (row) pets.pets.set(bobs, { ...row, status: 'hidden' });
    expect((await like(mine, bobs)).statusCode).toBe(404);
  });

  it('validates the payload', async () => {
    const { mine, bobs } = await setup();
    expect((await like(mine, bobs, 'direct_message')).statusCode).toBe(422);
  });
});
