import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet, upgradeToPremium } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const CAROL = authAs('user_carol');

describe('matches routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const like = (fromPetId: string, toPetId: string, headers: Record<string, string>) =>
    app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers,
      payload: { fromPetId, toPetId, type: 'like' },
    });

  /** Mine matches with three of Bob's pets, in order. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const mine = await createPet(app, AUTH, 'Mine');
    await upgradeToPremium(app, BOB);
    const bobs: string[] = [];
    for (const name of ['B1', 'B2', 'B3']) {
      const pet = await createPet(app, BOB, name);
      await like(mine, pet, AUTH);
      await like(pet, mine, BOB);
      bobs.push(pet);
    }
    const userId = (clerkId: string) => fakes.users.byClerk(clerkId)?.id ?? '';
    return { ...fakes, mine, bobs, userId };
  };

  const list = (query = '', headers = AUTH) =>
    app.inject({ method: 'GET', url: `/v1/matches${query}`, headers });

  it('lists matches newest first from the caller perspective', async () => {
    const { mine } = await setup();
    const body = (await list()).json();
    expect(body.data.map((m: { pet: { name: string } }) => m.pet.name)).toEqual(['B3', 'B2', 'B1']);
    expect(body.data[0]).toMatchObject({ myPetId: mine, isNew: true });
    expect(body.nextCursor).toBeNull();
  });

  it('shows the same match to the other side', async () => {
    const { mine } = await setup();
    const body = (await list('', BOB)).json();
    expect(body.data).toHaveLength(3);
    expect(body.data.every((m: { pet: { id: string } }) => m.pet.id === mine)).toBe(true);
  });

  it('paginates with a cursor', async () => {
    await setup();
    const first = (await list('?limit=2')).json();
    expect(first.data).toHaveLength(2);
    const second = (await list(`?limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.data.map((m: { pet: { name: string } }) => m.pet.name)).toEqual(['B1']);
    expect(second.nextCursor).toBeNull();
  });

  it('filters by one of my pets and rejects pets of others', async () => {
    const { mine, bobs } = await setup();
    expect((await list(`?petId=${mine}`)).json().data).toHaveLength(3);
    expect((await list(`?petId=${bobs[0]}`)).statusCode).toBe(403);
  });

  it('gets one match and hides it from outsiders', async () => {
    await setup();
    const [match] = (await list()).json().data;
    const mine = await app.inject({ method: 'GET', url: `/v1/matches/${match.id}`, headers: AUTH });
    expect(mine.json().match.id).toBe(match.id);
    const outsider = await app.inject({
      method: 'GET',
      url: `/v1/matches/${match.id}`,
      headers: CAROL,
    });
    expect(outsider.statusCode).toBe(404);
    expect(outsider.json().error.code).toBe('MATCH_NOT_FOUND');
  });

  it('hides matches with blocked users', async () => {
    const { social, userId } = await setup();
    social.block(userId('user_bob'), userId('user_clerk_1'));
    expect((await list()).json().data).toHaveLength(0);
    expect((await list('', BOB)).json().data).toHaveLength(0);
  });

  it('unmatches without allowing an instant rematch', async () => {
    const { mine, bobs, social } = await setup();
    const [match] = (await list()).json().data;
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/matches/${match.id}`,
      headers: AUTH,
    });
    expect(response.statusCode).toBe(204);
    expect((await list()).json().data).toHaveLength(2);

    const relike = await like(mine, bobs[2] ?? '', AUTH);
    expect(relike.json().match).toBeNull();
    expect(social.matches.size).toBe(2);
  });

  it('rejects an invalid cursor', async () => {
    await setup();
    expect((await list('?cursor=nope')).statusCode).toBe(422);
  });
});
