import { afterEach, describe, expect, it, vi } from 'vitest';

import type { App } from '../../../app.js';
import { buildTestApp } from '../../../../test/helpers.js';
import { createFakeUsersRepository } from '../../../../test/fakes.js';

const auth = { authorization: 'Bearer valid-token' };

describe('users routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const setup = async () => {
    const fake = createFakeUsersRepository();
    const deleteUser = vi.fn(async () => undefined);
    app = await buildTestApp({ usersRepository: fake.repository, identity: { deleteUser } });
    return { fake, deleteUser };
  };

  it('rejects requests without a token', async () => {
    await setup();
    const response = await app.inject({ method: 'GET', url: '/v1/users/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'MISSING_TOKEN', requestId: expect.any(String) },
    });
  });

  it('rejects invalid tokens', async () => {
    await setup();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/users/me',
      headers: { authorization: 'Bearer forged' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_TOKEN');
  });

  it('creates the internal user on the first authenticated request', async () => {
    const { fake } = await setup();
    const response = await app.inject({ method: 'GET', url: '/v1/users/me', headers: auth });

    expect(response.statusCode).toBe(200);
    const { user } = response.json();
    expect(user).toMatchObject({ name: null, subscriptionTier: 'free' });
    expect(user).not.toHaveProperty('clerkUserId');
    expect(fake.byClerk('user_clerk_1')?.id).toBe(user.id);

    const again = await app.inject({ method: 'GET', url: '/v1/users/me', headers: auth });
    expect(again.json().user.id).toBe(user.id);
    expect(fake.users.size).toBe(1);
  });

  it('updates the profile and stores the push token', async () => {
    const { fake } = await setup();
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me',
      headers: auth,
      payload: { name: 'Renan', pushToken: 'ExponentPushToken[abc123]' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.name).toBe('Renan');
    expect(fake.pushTokens.get('ExponentPushToken[abc123]')).toBe(response.json().user.id);
  });

  it('validates the body with the standard error format', async () => {
    await setup();
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me',
      headers: auth,
      payload: { pushToken: 'not-a-token', role: 'admin' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('deletes the account in Clerk and locally', async () => {
    const { fake, deleteUser } = await setup();
    await app.inject({ method: 'GET', url: '/v1/users/me', headers: auth });

    const response = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers: auth });
    expect(response.statusCode).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith('user_clerk_1');
    expect(fake.users.size).toBe(0);
  });

  it('keeps local data when Clerk deletion fails', async () => {
    const { fake, deleteUser } = await setup();
    deleteUser.mockRejectedValueOnce(new Error('clerk down'));
    await app.inject({ method: 'GET', url: '/v1/users/me', headers: auth });

    const response = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers: auth });
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Erro interno',
    });
    expect(fake.users.size).toBe(1);
  });
});
