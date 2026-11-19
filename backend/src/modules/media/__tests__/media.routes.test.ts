import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { AUTH, buildFakeApp } from '../../../../test/helpers.js';

describe('media routes', () => {
  let app: App;
  afterEach(() => app?.close());

  it('issues a signed upload URL under the user prefix', async () => {
    ({ app } = await buildFakeApp());
    const me = (await app.inject({ method: 'GET', url: '/v1/users/me', headers: AUTH })).json();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-url',
      headers: AUTH,
      payload: { purpose: 'user_avatar', contentType: 'image/png' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.bucket).toBe('user-avatars');
    expect(body.path).toMatch(new RegExp(`^${me.user.id}/[0-9a-f-]{36}\\.png$`));
    expect(body.uploadUrl).toMatch(/^https:\/\//);
  });

  it('rejects unsupported content types', async () => {
    ({ app } = await buildFakeApp());
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-url',
      headers: AUTH,
      payload: { purpose: 'pet_photo', contentType: 'application/pdf' },
    });
    expect(response.statusCode).toBe(422);
  });

  it('sets the avatar from an uploaded path and wipes files on account deletion', async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const { bucket, path } = (
      await app.inject({
        method: 'POST',
        url: '/v1/media/upload-url',
        headers: AUTH,
        payload: { purpose: 'user_avatar', contentType: 'image/jpeg' },
      })
    ).json();
    fakes.storage.upload(bucket, path);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me',
      headers: AUTH,
      payload: { avatarPath: path },
    });
    expect(updated.json().user.avatarUrl).toContain(path);

    await app.inject({ method: 'DELETE', url: '/v1/users/me', headers: AUTH });
    expect(fakes.storage.objects.size).toBe(0);
  });
});
