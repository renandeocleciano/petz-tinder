import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const MY_TOKEN = 'ExponentPushToken[me]';
const BOB_TOKEN = 'ExponentPushToken[bob]';
type Headers = Record<string, string>;

describe('push notifications', () => {
  let app: App;
  afterEach(() => app?.close());

  const registerToken = (pushToken: string, headers: Headers) =>
    app.inject({ method: 'PATCH', url: '/v1/users/me', headers, payload: { pushToken } });

  const like = (fromPetId: string, toPetId: string, headers: Headers) =>
    app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers,
      payload: { fromPetId, toPetId, type: 'like' },
    });

  /** Thor (mine) and Luna (Bob's) match; both users have a device registered. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    await registerToken(MY_TOKEN, AUTH);
    await registerToken(BOB_TOKEN, BOB);
    const thor = await createPet(app, AUTH, 'Thor');
    const luna = await createPet(app, BOB, 'Luna');
    await like(thor, luna, AUTH);
    const conversationId = (await like(luna, thor, BOB)).json().match.conversationId as string;
    const deliver = () => app.workers.outbox.runOnce();
    return { ...fakes, thor, luna, conversationId, deliver };
  };

  const send = (conversationId: string, payload: Record<string, unknown>, headers = AUTH) =>
    app.inject({
      method: 'POST',
      url: `/v1/conversations/${conversationId}/messages`,
      headers,
      payload,
    });

  it('notifies both tutors of a match, from each side', async () => {
    const { deliver, push } = await setup();
    await deliver();
    expect(push.sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: MY_TOKEN,
          title: 'Deu match! 🐾',
          body: 'Luna e Thor deram match. Que tal combinar um passeio?',
          data: expect.objectContaining({ type: 'match' }),
        }),
        expect.objectContaining({
          to: BOB_TOKEN,
          body: 'Thor e Luna deram match. Que tal combinar um passeio?',
        }),
      ]),
    );
  });

  it('notifies only the recipient of a message, with a preview', async () => {
    const { deliver, push, conversationId } = await setup();
    await deliver();
    push.sent.length = 0;

    await send(conversationId, { type: 'text', text: 'Vamos ao parque sábado?' });
    await deliver();
    expect(push.sent).toEqual([
      expect.objectContaining({
        to: BOB_TOKEN,
        title: 'Thor',
        body: 'Vamos ao parque sábado?',
        data: expect.objectContaining({ type: 'message', conversationId }),
      }),
    ]);
  });

  it('describes playdate invites and their answers', async () => {
    const { deliver, push, conversationId } = await setup();
    await deliver();
    push.sent.length = 0;

    const invite = await send(conversationId, {
      type: 'playdate_invite',
      playdate: {
        placeName: 'Parque Lage',
        latitude: -22.96,
        longitude: -43.21,
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    await app.inject({
      method: 'PATCH',
      url: `/v1/conversations/${conversationId}/messages/${invite.json().message.id}/playdate`,
      headers: BOB,
      payload: { status: 'accepted' },
    });
    await deliver();
    expect(push.sent.map(({ to, body }) => ({ to, body }))).toEqual([
      { to: BOB_TOKEN, body: '📅 Convite para passear no Parque Lage' },
      { to: MY_TOKEN, body: 'Seu convite no Parque Lage foi aceito! 🎉' },
    ]);
  });

  it('skips messages between users who blocked each other in the meantime', async () => {
    const { deliver, push, conversationId, social, users } = await setup();
    await deliver();
    push.sent.length = 0;
    await send(conversationId, { type: 'text', text: 'oi' });
    social.block(users.byClerk('user_bob')?.id ?? '', users.byClerk('user_clerk_1')?.id ?? '');
    await deliver();
    expect(push.sent).toEqual([]);
  });

  it('removes tokens Expo reports as unregistered, at send time and via receipts', async () => {
    const { deliver, users, notifications, push } = await setup();
    await registerToken('ExponentPushToken[unregistered]', BOB);
    await deliver();
    expect(users.pushTokens.has('ExponentPushToken[unregistered]')).toBe(false);

    // A receipt reporting DeviceNotRegistered, checked 15 min later.
    const [receipt] = [...notifications.receipts.values()].filter((r) => r.token === MY_TOKEN);
    if (!receipt) throw new Error('missing receipt');
    receipt.createdAt = new Date(Date.now() - 20 * 60 * 1000);
    push.receipts.set(receipt.ticketId, {
      status: 'error',
      message: 'gone',
      details: { error: 'DeviceNotRegistered' },
    });
    expect(await app.workers.notifications.checkReceipts()).toBe(1);
    expect(users.pushTokens.has(MY_TOKEN)).toBe(false);
    expect(notifications.receipts.has(receipt.ticketId)).toBe(false);
    expect(users.pushTokens.has(BOB_TOKEN)).toBe(true);
  });

  it('closes events with malformed payloads instead of retrying', async () => {
    const { deliver, social, outbox } = await setup();
    social.outbox.push({ type: 'MatchCreated', payload: { matchId: 'nope' } });
    await deliver();
    expect(outbox.events.at(-1)).toMatchObject({
      processed: true,
      lastError: 'Invalid event payload',
    });
  });
});
