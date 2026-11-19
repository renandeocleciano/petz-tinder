import { afterEach, describe, expect, it } from 'vitest';

import type { App } from '../../../app.js';
import { AUTH, authAs, buildFakeApp } from '../../../../test/helpers.js';
import { upgradeToPremium } from '../../../../test/factories.js';
import { encodeCursor } from '../../../shared/utils/cursor.js';

const OTHER = authAs('user_other');
const origin = { latitude: -22.97, longitude: -43.18 };

const petBody = (name: string, latitude: number, longitude: number, species = 'dog') => ({
  name,
  species,
  breed: 'SRD',
  approximateAgeYears: 2,
  gender: 'female',
  size: 'small',
  neutered: false,
  city: 'Rio de Janeiro',
  latitude,
  longitude,
  personalityTraits: ['calm'],
});

describe('discovery routes', () => {
  let app: App;
  afterEach(() => app?.close());

  const createPet = async (headers: Record<string, string>, body: ReturnType<typeof petBody>) => {
    const response = await app.inject({ method: 'POST', url: '/v1/pets', headers, payload: body });
    return response.json().pet.id as string;
  };

  /** One pet for the caller and three for someone else, at growing distances. */
  const setup = async () => {
    const fakes = await buildFakeApp();
    app = fakes.app;
    const myPet = await createPet(AUTH, petBody('Mine', origin.latitude, origin.longitude));
    await upgradeToPremium(app, OTHER);
    await createPet(OTHER, petBody('Close', -22.98, -43.19));
    await createPet(OTHER, petBody('Middle', -23.0, -43.22, 'cat'));
    await createPet(OTHER, petBody('Far', -23.05, -43.3));
    return { ...fakes, myPet };
  };

  const discover = (query: Record<string, string | number | string[]>, headers = AUTH) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of [value].flat()) params.append(key, String(item));
    }
    return app.inject({ method: 'GET', url: `/v1/discovery?${params}`, headers });
  };

  it('returns nearby pets of other users, closest first, without coordinates', async () => {
    const { myPet } = await setup();
    const response = await discover({ petId: myPet, ...origin });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.map((pet: { name: string }) => pet.name)).toEqual(['Close', 'Middle', 'Far']);
    expect(body.nextCursor).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/latitude|longitude|location/);
  });

  it('rounds distances to 500 m steps', async () => {
    const { myPet } = await setup();
    const { data } = (await discover({ petId: myPet, ...origin })).json();
    for (const pet of data) {
      expect(pet.distanceMeters % 500).toBe(0);
      expect(pet.distanceMeters).toBeGreaterThanOrEqual(500);
    }
  });

  it('paginates with an opaque cursor', async () => {
    const { myPet } = await setup();
    const first = (await discover({ petId: myPet, ...origin, limit: 2 })).json();
    expect(first.data).toHaveLength(2);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = (
      await discover({ petId: myPet, ...origin, limit: 2, cursor: first.nextCursor })
    ).json();
    expect(second.data.map((pet: { name: string }) => pet.name)).toEqual(['Far']);
    expect(second.nextCursor).toBeNull();
  });

  it('accepts repeated filter params', async () => {
    const { myPet } = await setup();
    const one = (await discover({ petId: myPet, ...origin, species: 'cat' })).json();
    expect(one.data.map((pet: { name: string }) => pet.name)).toEqual(['Middle']);
    const many = (await discover({ petId: myPet, ...origin, species: ['cat', 'dog'] })).json();
    expect(many.data).toHaveLength(3);
  });

  it('respects the radius', async () => {
    const { myPet } = await setup();
    const { data } = (await discover({ petId: myPet, ...origin, radiusKm: 2 })).json();
    expect(data.map((pet: { name: string }) => pet.name)).toEqual(['Close']);
  });

  it('only lets the owner browse with a pet', async () => {
    const { myPet } = await setup();
    const response = await discover({ petId: myPet, ...origin }, OTHER);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PET_FORBIDDEN');
  });

  it('blocks suspended pets from browsing', async () => {
    const { myPet, pets } = await setup();
    const row = pets.pets.get(myPet);
    if (row) pets.pets.set(myPet, { ...row, status: 'suspended' });
    const response = await discover({ petId: myPet, ...origin });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PET_SUSPENDED');
  });

  it('hides hidden and suspended pets from others', async () => {
    const { myPet, pets } = await setup();
    for (const [id, row] of pets.pets) {
      if (row.name === 'Close') pets.pets.set(id, { ...row, status: 'hidden' });
      if (row.name === 'Far') pets.pets.set(id, { ...row, status: 'suspended' });
    }
    const { data } = (await discover({ petId: myPet, ...origin })).json();
    expect(data.map((pet: { name: string }) => pet.name)).toEqual(['Middle']);
  });

  it.each<Record<string, string | number>>([
    { latitude: 100 },
    { radiusKm: 500 },
    { species: 'dragon' },
    { ageMin: 5, ageMax: 2 },
    { cursor: 'not-a-cursor' },
  ])('rejects invalid query %o', async (override) => {
    const { myPet } = await setup();
    const response = await discover({ petId: myPet, ...origin, ...override });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a well-formed cursor with a bad payload', async () => {
    const { myPet } = await setup();
    const cursor = Buffer.from(JSON.stringify(['x', 'y'])).toString('base64url');
    expect((await discover({ petId: myPet, ...origin, cursor })).statusCode).toBe(422);
    const valid = encodeCursor([1, myPet]);
    expect((await discover({ petId: myPet, ...origin, cursor: valid })).statusCode).toBe(200);
  });

  it('requires authentication', async () => {
    const { myPet } = await setup();
    const response = await discover({ petId: myPet, ...origin }, {} as typeof AUTH);
    expect(response.statusCode).toBe(401);
  });

  describe('nearby', () => {
    const nearby = (query: Record<string, string | number>, headers = AUTH) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) params.append(key, String(value));
      return app.inject({ method: 'GET', url: `/v1/discovery/nearby?${params}`, headers });
    };

    it('returns pins with obfuscated coordinates', async () => {
      const { myPet, pets } = await setup();
      const response = await nearby({ petId: myPet, ...origin });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Default map radius is 10 km: "Far" (~15 km) is left out.
      expect(body.total).toBe(2);
      for (const pin of body.data) {
        const real = pets.pets.get(pin.id)?.location;
        expect(real).toBeDefined();
        expect(pin.latitude).not.toBe(real?.latitude);
        expect(Math.abs(pin.latitude - (real?.latitude ?? 0))).toBeLessThan(0.01);
        expect(pin).toMatchObject({ locked: false, isMatch: false, pet: { id: pin.id } });
        expect(pin.distanceMeters % 500).toBe(0);
      }
    });

    it('returns the same pin position on every request', async () => {
      const { myPet } = await setup();
      const first = (await nearby({ petId: myPet, ...origin })).json();
      const second = (await nearby({ petId: myPet, ...origin })).json();
      expect(second.data).toEqual(first.data);
    });

    it('caps the radius', async () => {
      const { myPet } = await setup();
      expect((await nearby({ petId: myPet, ...origin, radiusKm: 51 })).statusCode).toBe(422);
    });
  });
});
