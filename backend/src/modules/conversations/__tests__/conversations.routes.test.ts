import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { createPet } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

const BOB = authAs('user_bob');
const CAROL = authAs('user_carol');
type Headers = Record<string, string>;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('conversations routes', () => {
  let app: App;
  afterEach(() => app?.close());

  /** Mine and Bob's pet match, which opens a conversation. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const mine = await createPet(app, AUTH, 'Mine');
    const bobs = await createPet(app, BOB, 'Bobs');
    await app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers: AUTH,
      payload: { fromPetId: mine, toPetId: bobs, type: 'like' },
    });
    const liked = await app.inject({
      method: 'POST',
      url: '/v1/likes',
      headers: BOB,
      payload: { fromPetId: bobs, toPetId: mine, type: 'like' },
    });
    const conversationId = liked.json().match.conversationId as string;
    const userId = (clerkId: string) => fakes.users.byClerk(clerkId)?.id ?? '';
    return { ...fakes, mine, bobs, conversationId, userId };
  };

  const send = (
    conversationId: string,
    payload: Record<string, unknown>,
    headers: Headers = AUTH,
  ) =>
    app.inject({
      method: 'POST',
      url: `/v1/conversations/${conversationId}/messages`,
      headers,
      payload,
    });

  const get = (url: string, headers: Headers = AUTH) =>
    app.inject({ method: 'GET', url: `/v1/conversations${url}`, headers });

  const invite = {
    type: 'playdate_invite',
    playdate: {
      placeName: 'Parque Lage',
      latitude: -22.960123456,
      longitude: -43.211987654,
      scheduledAt: inDays(3),
    },
  };

  it('lists the conversation opened by the match', async () => {
    const { conversationId, bobs, mine } = await setup();
    const { data } = (await get('')).json();
    expect(data).toEqual([
      expect.objectContaining({
        id: conversationId,
        myPetId: mine,
        pet: expect.objectContaining({ id: bobs }),
        lastMessage: null,
        unreadCount: 0,
      }),
    ]);
  });

  it('sends a text message and updates unread counts', async () => {
    const { conversationId, social } = await setup();
    const response = await send(conversationId, { type: 'text', text: '  Oi!  ' });

    expect(response.statusCode).toBe(201);
    expect(response.json().message).toMatchObject({ type: 'text', text: 'Oi!', readAt: null });
    expect(social.outbox.at(-1)).toMatchObject({ type: 'MessageCreated' });

    const bobView = (await get('', BOB)).json().data[0];
    expect(bobView).toMatchObject({ unreadCount: 1, lastMessage: { text: 'Oi!' } });
    expect((await get('')).json().data[0].unreadCount).toBe(0);
  });

  it('marks as read and exposes readAt to the sender', async () => {
    const { conversationId } = await setup();
    await send(conversationId, { type: 'text', text: 'Oi!' });
    const read = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${conversationId}/read`,
      headers: BOB,
    });
    expect(read.statusCode).toBe(204);
    expect((await get('', BOB)).json().data[0].unreadCount).toBe(0);
    const [message] = (await get(`/${conversationId}/messages`)).json().data;
    expect(message.readAt).toEqual(expect.any(String));
  });

  it('sends images from the sender upload only, with a signed URL', async () => {
    const { conversationId, storage } = await setup();
    const upload = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-url',
      headers: AUTH,
      payload: { purpose: 'chat_media', contentType: 'image/png' },
    });
    const { bucket, path } = upload.json();
    storage.upload(bucket, path);

    const response = await send(conversationId, { type: 'image', imagePath: path });
    expect(response.statusCode).toBe(201);
    expect(response.json().message.imageUrl).toContain('/signed/chat-media/');

    const stolen = await send(conversationId, { type: 'image', imagePath: path }, BOB);
    expect(stolen.statusCode).toBe(403);
  });

  it('handles playdate invites end to end', async () => {
    const { conversationId } = await setup();
    const sent = (await send(conversationId, invite)).json().message;
    expect(sent.playdate).toMatchObject({
      placeName: 'Parque Lage',
      latitude: -22.9601,
      longitude: -43.212,
      status: 'pending',
    });

    const answer = (headers: Headers, status: string) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/conversations/${conversationId}/messages/${sent.id}/playdate`,
        headers,
        payload: { status },
      });

    expect((await answer(AUTH, 'accepted')).json().error.code).toBe('PLAYDATE_FORBIDDEN');
    const accepted = await answer(BOB, 'accepted');
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().message.playdate.status).toBe('accepted');
    expect((await answer(BOB, 'declined')).json().error.code).toBe('PLAYDATE_ALREADY_ANSWERED');
  });

  it.each([
    [{ type: 'text', text: '   ' }],
    [{ type: 'text', text: 'x'.repeat(2001) }],
    [{ type: 'image' }],
    [{ ...invite, playdate: { ...invite.playdate, scheduledAt: inDays(-1) } }],
    [{ ...invite, playdate: { ...invite.playdate, scheduledAt: inDays(120) } }],
    [{ type: 'direct_message', text: 'oi' }],
  ])('rejects invalid message %#', async (payload) => {
    const { conversationId } = await setup();
    expect((await send(conversationId, payload)).statusCode).toBe(422);
  });

  it('paginates messages newest first', async () => {
    const { conversationId } = await setup();
    for (const text of ['1', '2', '3']) await send(conversationId, { type: 'text', text });
    const first = (await get(`/${conversationId}/messages?limit=2`)).json();
    expect(first.data.map((m: { text: string }) => m.text)).toEqual(['3', '2']);
    const second = (
      await get(`/${conversationId}/messages?limit=2&cursor=${first.nextCursor}`)
    ).json();
    expect(second.data.map((m: { text: string }) => m.text)).toEqual(['1']);
    expect(second.nextCursor).toBeNull();
  });

  it('returns the conversation detail with both pets', async () => {
    const { conversationId, mine, bobs } = await setup();
    const { conversation } = (await get(`/${conversationId}`)).json();
    expect(conversation).toMatchObject({ myPet: { id: mine }, pet: { id: bobs } });
  });

  it('hides the conversation from outsiders and after a block', async () => {
    const { conversationId, social, userId } = await setup();
    expect((await get(`/${conversationId}`, CAROL)).statusCode).toBe(404);
    expect((await send(conversationId, { type: 'text', text: 'x' }, CAROL)).statusCode).toBe(404);

    social.block(userId('user_bob'), userId('user_clerk_1'));
    const blocked = await send(conversationId, { type: 'text', text: 'oi' });
    expect(blocked.statusCode).toBe(404);
    expect(blocked.json().error.code).toBe('CONVERSATION_NOT_FOUND');
    expect((await get('')).json().data).toHaveLength(0);
  });

  it('does not let a suspended pet send messages', async () => {
    const { conversationId, mine, pets } = await setup();
    const row = pets.pets.get(mine);
    if (row) pets.pets.set(mine, { ...row, status: 'suspended' });
    expect((await send(conversationId, { type: 'text', text: 'oi' })).statusCode).toBe(403);
  });
});
