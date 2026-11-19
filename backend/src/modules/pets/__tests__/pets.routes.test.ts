import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { upgradeToPremium } from '../../../../test/factories.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';

type Fakes = Awaited<ReturnType<typeof buildFakeApp>>;

const validPet = {
  name: 'Thor',
  species: 'dog',
  breed: 'Golden Retriever',
  approximateAgeYears: 3,
  gender: 'male',
  size: 'large',
  neutered: true,
  bio: 'Adora bolinha',
  city: 'Rio de Janeiro',
  latitude: -22.971234,
  longitude: -43.182987,
  personalityTraits: ['playful', 'loves_park'],
  interests: ['walks'],
};

describe('pets routes', () => {
  let app: App;
  let fakes: Fakes;
  afterEach(() => app?.close());

  const setup = async () => {
    fakes = await buildFakeApp();
    app = fakes.app;
  };

  /** Simulates the app flow: ask for a signed URL, then upload straight to Storage. */
  const uploadPhoto = async (headers = AUTH) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/media/upload-url',
      headers,
      payload: { purpose: 'pet_photo', contentType: 'image/jpeg' },
    });
    const { bucket, path } = response.json();
    fakes.storage.upload(bucket, path);
    return path as string;
  };

  const createPet = async (body: Record<string, unknown> = {}, headers = AUTH) =>
    app.inject({ method: 'POST', url: '/v1/pets', headers, payload: { ...validPet, ...body } });

  it('creates a pet with photos and never exposes its location', async () => {
    await setup();
    const path = await uploadPhoto();
    const response = await createPet({ photoPaths: [path] });

    expect(response.statusCode).toBe(201);
    const { pet } = response.json();
    expect(pet).toMatchObject({
      name: 'Thor',
      age: 3,
      ageIsApproximate: true,
      birthDate: null,
      personalityTraits: ['playful', 'loves_park'],
      status: 'active',
    });
    expect(pet.coverUrl).toContain(path);
    expect(JSON.stringify(pet)).not.toMatch(/latitude|longitude|location|-22\.97|-43\.18/);
  });

  it('stores the location rounded to ~1 km', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    expect(fakes.pets.pets.get(pet.id)?.location).toEqual({ latitude: -22.97, longitude: -43.18 });
  });

  it('computes the age from an exact birth date', async () => {
    await setup();
    const birthDate = `${new Date().getUTCFullYear() - 5}-01-01`;
    const response = await createPet({ approximateAgeYears: undefined, birthDate });
    expect(response.json().pet).toMatchObject({ birthDate, age: 5, ageIsApproximate: false });
  });

  it.each([
    ['no age at all', { approximateAgeYears: undefined }],
    ['both age fields', { birthDate: '2020-01-01' }],
    ['a future birth date', { approximateAgeYears: undefined, birthDate: '2999-01-01' }],
    ['an unknown species', { species: 'parrot' }],
    ['repeated traits', { personalityTraits: ['calm', 'calm'] }],
    ['unknown fields', { ownerId: '00000000-0000-0000-0000-000000000000' }],
  ])('rejects %s', async (_case, body) => {
    await setup();
    const response = await createPet(body);
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses photos that were not uploaded or belong to someone else', async () => {
    await setup();
    const notUploaded = await createPet({
      photoPaths: [`${'0'.repeat(8)}-0000-0000-0000-000000000000/x.jpg`],
    });
    expect(notUploaded.statusCode).toBe(403);

    const othersPath = await uploadPhoto(authAs('user_other'));
    const stolen = await createPet({ photoPaths: [othersPath] });
    expect(stolen.statusCode).toBe(403);
    expect(stolen.json().error.code).toBe('MEDIA_FORBIDDEN');
  });

  it('limits free accounts to one pet (premium paywall)', async () => {
    await setup();
    expect((await createPet()).statusCode).toBe(201);
    const second = await createPet({ name: 'Luna' });
    expect(second.statusCode).toBe(402);
    expect(second.json().error).toMatchObject({
      code: 'PREMIUM_REQUIRED',
      details: { feature: 'MULTIPLE_PETS', limit: 1 },
    });
  });

  it('lets premium accounts have up to 10 pets', async () => {
    await setup();
    await upgradeToPremium(app, AUTH);
    for (let i = 0; i < 10; i++) {
      expect((await createPet({ name: `Pet ${i}` })).statusCode).toBe(201);
    }
    const eleventh = await createPet({ name: 'Extra' });
    expect(eleventh.statusCode).toBe(409);
    expect(eleventh.json().error.code).toBe('PET_LIMIT_REACHED');
  });

  it('lists my pets in /users/me and /users/me/pets', async () => {
    await setup();
    await upgradeToPremium(app, AUTH);
    await createPet();
    await createPet({ name: 'Luna', species: 'cat' });

    const me = (await app.inject({ method: 'GET', url: '/v1/users/me', headers: AUTH })).json();
    expect(me.pets.map((pet: { name: string }) => pet.name)).toEqual(['Thor', 'Luna']);

    const mine = await app.inject({ method: 'GET', url: '/v1/users/me/pets', headers: AUTH });
    expect(mine.json().data).toHaveLength(2);
  });

  it('lets other users see active pets only', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    const asOther = () =>
      app.inject({ method: 'GET', url: `/v1/pets/${pet.id}`, headers: authAs('user_other') });

    expect((await asOther()).statusCode).toBe(200);
    fakes.pets.pets.set(pet.id, { ...fakes.pets.pets.get(pet.id)!, status: 'suspended' });
    expect((await asOther()).statusCode).toBe(404);
    const asOwner = await app.inject({ method: 'GET', url: `/v1/pets/${pet.id}`, headers: AUTH });
    expect(asOwner.json().pet.status).toBe('suspended');
  });

  it('updates fields, traits and location', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/pets/${pet.id}`,
      headers: AUTH,
      payload: { bio: 'Novo bio', personalityTraits: ['calm'], latitude: -22.9, longitude: -43.2 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().pet).toMatchObject({ bio: 'Novo bio', personalityTraits: ['calm'] });
    expect(fakes.pets.pets.get(pet.id)?.location).toEqual({ latitude: -22.9, longitude: -43.2 });
  });

  it('requires latitude and longitude together', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/pets/${pet.id}`,
      headers: AUTH,
      payload: { latitude: -22.9 },
    });
    expect(response.statusCode).toBe(422);
  });

  it('only the owner can change or delete a pet', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    const other = authAs('user_other');

    const patch = await app.inject({
      method: 'PATCH',
      url: `/v1/pets/${pet.id}`,
      headers: other,
      payload: { name: 'Hacked' },
    });
    expect(patch.statusCode).toBe(403);
    expect(patch.json().error.code).toBe('PET_FORBIDDEN');

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/pets/${pet.id}`,
      headers: other,
    });
    expect(remove.statusCode).toBe(403);
    expect(fakes.pets.pets.has(pet.id)).toBe(true);
  });

  it('deletes a pet and its stored photos', async () => {
    await setup();
    const path = await uploadPhoto();
    const { pet } = (await createPet({ photoPaths: [path] })).json();

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/pets/${pet.id}`,
      headers: AUTH,
    });
    expect(response.statusCode).toBe(204);
    expect(fakes.pets.pets.has(pet.id)).toBe(false);
    expect(fakes.storage.objects.size).toBe(0);
  });

  it('adds and removes photos, keeping the limit and uniqueness', async () => {
    await setup();
    const { pet } = (await createPet()).json();
    const addPhoto = (path: string) =>
      app.inject({
        method: 'POST',
        url: `/v1/pets/${pet.id}/photos`,
        headers: AUTH,
        payload: { path },
      });

    const first = await uploadPhoto();
    const added = await addPhoto(first);
    expect(added.statusCode).toBe(201);
    expect(added.json().pet.photos).toHaveLength(1);
    expect((await addPhoto(first)).json().error.code).toBe('PHOTO_ALREADY_USED');

    for (let i = 0; i < 5; i += 1) await addPhoto(await uploadPhoto());
    const overLimit = await addPhoto(await uploadPhoto());
    expect(overLimit.statusCode).toBe(409);
    expect(overLimit.json().error.code).toBe('PHOTO_LIMIT_REACHED');

    const photoId = added.json().pet.photos[0].id;
    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/pets/${pet.id}/photos/${photoId}`,
      headers: AUTH,
    });
    expect(removed.statusCode).toBe(204);
    expect([...fakes.storage.objects].some((object) => object.includes(first))).toBe(false);
  });

  it('returns 404 for unknown pets', async () => {
    await setup();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/pets/00000000-0000-4000-8000-000000000000',
      headers: AUTH,
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PET_NOT_FOUND');
  });
});
