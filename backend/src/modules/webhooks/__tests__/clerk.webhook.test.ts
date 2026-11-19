import { randomUUID } from 'node:crypto';

import { Webhook } from 'svix';
import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { buildTestApp, TEST_WEBHOOK_SECRET, testEnv } from '../../../../test/helpers.js';
import { createFakeUsersRepository } from '../../../../test/fakes.js';

const clerkUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user_clerk_9',
  first_name: 'Ana',
  last_name: 'Souza',
  username: null,
  image_url: 'https://img.clerk.com/ana.png',
  primary_email_address_id: 'email_2',
  email_addresses: [
    { id: 'email_1', email_address: 'old@petz.app' },
    { id: 'email_2', email_address: 'ana@petz.app' },
  ],
  ...overrides,
});

const signed = (event: unknown, secret = TEST_WEBHOOK_SECRET) => {
  const payload = JSON.stringify(event);
  const id = `msg_${randomUUID()}`;
  const timestamp = new Date();
  return {
    payload,
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': new Webhook(secret).sign(id, timestamp, payload),
    },
  };
};

describe('POST /webhooks/clerk', () => {
  let app: App;
  afterEach(() => app?.close());

  const setup = async () => {
    const fake = createFakeUsersRepository();
    app = await buildTestApp({ usersRepository: fake.repository });
    return fake;
  };

  const send = (event: unknown, secret?: string) =>
    app.inject({ method: 'POST', url: '/webhooks/clerk', ...signed(event, secret) });

  it('rejects unsigned or forged payloads', async () => {
    await setup();
    const forged = await send(
      { type: 'user.created', data: clerkUser() },
      `whsec_${Buffer.from('other').toString('base64')}`,
    );
    expect(forged.statusCode).toBe(401);
    expect(forged.json().error.code).toBe('INVALID_SIGNATURE');
  });

  it('creates the user with the primary e-mail', async () => {
    const fake = await setup();
    const response = await send({ type: 'user.created', data: clerkUser() });

    expect(response.statusCode).toBe(200);
    expect(fake.byClerk('user_clerk_9')).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@petz.app',
      avatarUrl: 'https://img.clerk.com/ana.png',
    });
  });

  it('does not overwrite a name edited in the app', async () => {
    const fake = await setup();
    await send({ type: 'user.created', data: clerkUser() });
    const user = fake.byClerk('user_clerk_9');
    await fake.repository.update(user!.id, { name: 'Aninha' });

    await send({
      type: 'user.updated',
      data: clerkUser({ first_name: 'Ana Maria', primary_email_address_id: 'email_1' }),
    });
    expect(fake.byClerk('user_clerk_9')).toMatchObject({ name: 'Aninha', email: 'old@petz.app' });
  });

  it('deletes the user and is idempotent', async () => {
    const fake = await setup();
    await send({ type: 'user.created', data: clerkUser() });

    const event = { type: 'user.deleted', data: { id: 'user_clerk_9', deleted: true } };
    expect((await send(event)).statusCode).toBe(200);
    expect((await send(event)).statusCode).toBe(200);
    expect(fake.byClerk('user_clerk_9')).toBeUndefined();
  });

  it('acknowledges events it does not handle', async () => {
    await setup();
    const response = await send({ type: 'session.created', data: { id: 'sess_1' } });
    expect(response.statusCode).toBe(200);
  });

  it('answers 503 when the signing secret is not configured', async () => {
    app = await buildTestApp({ env: testEnv({ CLERK_WEBHOOK_SIGNING_SECRET: '' }) });
    const response = await send({ type: 'user.created', data: clerkUser() });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('WEBHOOK_DISABLED');
  });
});
