import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const CAROL = authAs('user_carol');
type Headers = Record<string, string>;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('playdates routes', () => {
  let app: App;
  afterEach(() => app?.close());

  /** Thor (mine) and Luna (Bob's) match; Thor invites Luna to two playdates. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const thor = await createPet(app, AUTH, 'Thor');
    const luna = await createPet(app, BOB, 'Luna');
    const like = (from: string, to: string, headers: Headers) =>
      app.inject({
        method: 'POST',
        url: '/v1/likes',
        headers,
        payload: { fromPetId: from, toPetId: to, type: 'like' },
      });
    await like(thor, luna, AUTH);
    const conversationId = (await like(luna, thor, BOB)).json().match.conversationId as string;
    const invite = async (placeName: string, days: number) =>
      (
        await app.inject({
          method: 'POST',
          url: `/v1/conversations/${conversationId}/messages`,
          headers: AUTH,
          payload: {
            type: 'playdate_invite',
            playdate: { placeName, latitude: -22.96, longitude: -43.21, scheduledAt: inDays(days) },
          },
        })
      ).json().message.id as string;
    const later = await invite('Aterro do Flamengo', 5);
    const sooner = await invite('Parque Lage', 2);
    const userId = (clerkId: string) => fakes.users.byClerk(clerkId)?.id ?? '';
    return { ...fakes, thor, luna, conversationId, later, sooner, userId };
  };

  const list = (headers: Headers = AUTH, query = '') =>
    app.inject({ method: 'GET', url: `/v1/playdates${query}`, headers });

  it('lists invites soonest first, from the caller perspective', async () => {
    const { luna, conversationId, sooner, thor } = await setup();
    const { data } = (await list()).json();
    expect(data.map((p: { placeName: string }) => p.placeName)).toEqual([
      'Parque Lage',
      'Aterro do Flamengo',
    ]);
    expect(data[0]).toMatchObject({
      id: sooner,
      conversationId,
      myPetId: thor,
      pet: { id: luna, name: 'Luna' },
      direction: 'sent',
      status: 'pending',
    });
  });

  it('shows the same invites as received to the other tutor, with answers', async () => {
    const { conversationId, sooner } = await setup();
    await app.inject({
      method: 'PATCH',
      url: `/v1/conversations/${conversationId}/messages/${sooner}/playdate`,
      headers: BOB,
      payload: { status: 'accepted' },
    });
    const { data } = (await list(BOB)).json();
    expect(data.map((p: { direction: string; status: string }) => [p.direction, p.status])).toEqual(
      [
        ['received', 'accepted'],
        ['received', 'pending'],
      ],
    );
  });

  it('keeps 30 days of history and drops older invites', async () => {
    const { social, sooner, later } = await setup();
    const shift = (id: string, days: number) => {
      const message = social.messages.get(id);
      if (message?.playdate) {
        social.messages.set(id, {
          ...message,
          playdate: { ...message.playdate, scheduledAt: inDays(days) },
        });
      }
    };
    shift(sooner, -10);
    shift(later, -40);
    const { data } = (await list()).json();
    expect(data.map((p: { id: string }) => p.id)).toEqual([sooner]);
  });

  it('hides invites from outsiders and after a block', async () => {
    const { social, userId } = await setup();
    expect((await list(CAROL)).json().data).toEqual([]);
    social.block(userId('user_bob'), userId('user_clerk_1'));
    expect((await list()).json().data).toEqual([]);
  });

  it("filters by one of the caller's pets and rejects others' pets", async () => {
    const { thor, luna } = await setup();
    expect((await list(AUTH, `?petId=${thor}`)).json().data).toHaveLength(2);
    expect((await list(AUTH, `?petId=${luna}`)).statusCode).toBe(403);
  });
});
