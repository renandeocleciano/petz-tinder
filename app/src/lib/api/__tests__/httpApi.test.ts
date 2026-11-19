import { setAuthTokenProvider } from '../authToken';
import { ApiError, getErrorMessage, isPremiumRequired } from '../errors';
import type { PetDto } from '../http/contract';
import { createHttpApi } from '../httpApi';

const BASE = 'https://api.test';

/** Local files the mocked expo-file-system can read. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const mockLocalFiles = new Map<string, Uint8Array>();

jest.mock('expo-file-system', () => ({
  File: class {
    mockUri: string;
    constructor(mockUri: string) {
      this.mockUri = mockUri;
    }
    async arrayBuffer() {
      const bytes = mockLocalFiles.get(this.mockUri);
      if (!bytes) throw new Error('File not found');
      return bytes.slice().buffer;
    }
  },
}));

const petDto = (overrides: Partial<PetDto> = {}): PetDto => ({
  id: 'pet-1',
  ownerId: 'user-2',
  name: 'Luna',
  species: 'dog',
  breed: 'SRD',
  birthDate: null,
  age: 3,
  ageIsApproximate: true,
  gender: 'female',
  size: 'small',
  neutered: true,
  bio: '',
  city: 'Rio de Janeiro',
  personalityTraits: ['calm'],
  interests: [],
  preferences: [],
  availability: null,
  verified: false,
  status: 'active',
  photos: [{ id: 'photo-1', url: 'https://cdn.test/p1.jpg' }],
  coverUrl: 'https://cdn.test/p1.jpg',
  createdAt: '2026-10-14T00:00:00.000Z',
  ...overrides,
});

interface Call {
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
}

/** Routes fetch calls to handlers keyed by "METHOD path" (path without the base URL). */
const mockFetch = (routes: Record<string, (call: Call) => unknown>) => {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : (init?.body ?? undefined);
    const call = { method, url, body, headers: (init?.headers ?? {}) as Record<string, string> };
    calls.push(call);
    const path = url.replace(BASE, '').split('?')[0];
    const handler = routes[`${method} ${path}`] ?? routes[`${method} ${url}`];
    if (!handler) throw new Error(`Unexpected ${method} ${url}`);
    const result = handler(call);
    if (result instanceof Response) return result;
    if (result === undefined) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return calls;
};

const errorResponse = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message, requestId: 'req-1' } }), { status });

beforeEach(() => setAuthTokenProvider(async () => 'clerk-token'));

describe('httpApi', () => {
  it('calls /v1 routes with the Clerk token, accepting a base URL with or without /v1', async () => {
    const calls = mockFetch({
      'GET /v1/users/me': () => ({
        user: {
          id: 'u1',
          name: null,
          email: null,
          avatarUrl: null,
          subscriptionTier: 'free',
          createdAt: '2026-10-14T00:00:00.000Z',
        },
        pets: [petDto()],
      }),
    });
    for (const base of [BASE, `${BASE}/`, `${BASE}/v1`, `${BASE}/v1/`]) {
      const me = await createHttpApi(base).getMe();
      expect(me.user).toMatchObject({ id: 'u1', name: '', email: '' });
      expect(me.pets[0]).toMatchObject({ id: 'pet-1', photos: ['https://cdn.test/p1.jpg'] });
    }
    expect(calls.every((c) => c.url === `${BASE}/v1/users/me`)).toBe(true);
    expect(calls[0]?.headers.Authorization).toBe('Bearer clerk-token');
  });

  it('deletes the account', async () => {
    const calls = mockFetch({ 'DELETE /v1/users/me': () => undefined });
    await createHttpApi(BASE).deleteAccount();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`DELETE ${BASE}/v1/users/me`]);
  });

  it('turns the backend error envelope into ApiError', async () => {
    mockFetch({
      'GET /v1/pets/x': () => errorResponse(404, 'PET_NOT_FOUND', 'Pet não encontrado'),
    });
    const error = await createHttpApi(BASE)
      .getPet('x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'not_found',
      serverCode: 'PET_NOT_FOUND',
      requestId: 'req-1',
      message: 'Pet não encontrado',
    });
    expect(getErrorMessage(error)).toBe('Pet não encontrado');
  });

  it.each([
    [402, 'PREMIUM_REQUIRED', 'premium_required'],
    [409, 'ALREADY_MATCHED', 'conflict'],
    [429, 'RATE_LIMITED', 'rate_limited'],
    [401, 'INVALID_TOKEN', 'unauthorized'],
    [500, 'INTERNAL_ERROR', 'unknown'],
  ])('maps HTTP %d to %s', async (status, serverCode, code) => {
    mockFetch({ 'GET /v1/pets/x': () => errorResponse(status, serverCode, 'msg') });
    const error = await createHttpApi(BASE)
      .getPet('x')
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code, serverCode });
  });

  it('reports network failures', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    const error = await createHttpApi(BASE)
      .getPet('x')
      .catch((e: unknown) => e);
    expect(getErrorMessage(error)).toMatch(/Sem conexão/);
  });

  it('sends discovery filters as repeated params and converts distances', async () => {
    const calls = mockFetch({
      'GET /v1/discovery': () => ({
        data: [{ ...petDto(), distanceMeters: 1500 }],
        nextCursor: null,
      }),
    });
    const pets = await createHttpApi(BASE).getDiscover({
      petId: 'mine',
      latitude: -22.97,
      longitude: -43.18,
      filters: { species: ['dog', 'cat'], sizes: ['small'], maxDistanceKm: 10 },
    });
    expect(pets[0]?.approximateDistance).toBe(1.5);
    const query = new URL(calls[0]?.url ?? '').searchParams;
    expect(query.getAll('species')).toEqual(['dog', 'cat']);
    expect(query.get('size')).toBe('small');
    expect(query.get('radiusKm')).toBe('10');
    expect(query.get('latitude')).toBe('-22.97');
  });

  it('uploads local photos to Storage before creating a pet', async () => {
    const calls = mockFetch({
      'POST /v1/media/upload-url': () => ({
        bucket: 'pet-photos',
        path: 'u1/abc.jpg',
        uploadUrl: 'https://storage.test/upload/abc',
        token: 't',
        expiresInSeconds: 7200,
      }),
      'PUT https://storage.test/upload/abc': () => new Response(null, { status: 200 }),
      'POST /v1/pets': () => ({ pet: petDto({ id: 'new' }) }),
    });
    mockLocalFiles.set('file:///tmp/photo.jpg', JPEG);
    const pet = await createHttpApi(BASE).createPet({
      name: 'Thor',
      species: 'dog',
      breed: 'SRD',
      age: 2,
      size: 'large',
      gender: 'male',
      neutered: true,
      city: 'Rio de Janeiro',
      latitude: -22.97,
      longitude: -43.18,
      photos: ['file:///tmp/photo.jpg'],
      personalityTraits: ['playful'],
    });
    expect(pet.id).toBe('new');
    expect(calls.find((c) => c.url.endsWith('/upload-url'))?.body).toEqual({
      purpose: 'pet_photo',
      contentType: 'image/jpeg',
    });
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.headers['Content-Type']).toBe('image/jpeg');
    expect(put?.body).toEqual(JPEG);
    expect(
      calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/pets'))?.body,
    ).toMatchObject({ approximateAgeYears: 2, photoPaths: ['u1/abc.jpg'] });
  });

  it('syncs photos when editing a pet: removes dropped ones and uploads new ones', async () => {
    const calls = mockFetch({
      'GET /v1/pets/pet-1': () => ({
        pet: petDto({
          photos: [
            { id: 'keep', url: 'https://cdn.test/keep.jpg' },
            { id: 'drop', url: 'https://cdn.test/drop.jpg' },
          ],
        }),
      }),
      'DELETE /v1/pets/pet-1/photos/drop': () => undefined,
      'POST /v1/media/upload-url': () => ({
        bucket: 'pet-photos',
        path: 'u1/new.png',
        uploadUrl: 'https://storage.test/upload/new',
        token: 't',
        expiresInSeconds: 7200,
      }),
      'PUT https://storage.test/upload/new': () => new Response(null, { status: 200 }),
      'POST /v1/pets/pet-1/photos': () => ({ pet: petDto() }),
      'PATCH /v1/pets/pet-1': () => ({ pet: petDto({ name: 'Nina' }) }),
    });
    mockLocalFiles.set('file:///tmp/new.png', PNG);
    const pet = await createHttpApi(BASE).updatePet('pet-1', {
      name: 'Nina',
      photos: ['https://cdn.test/keep.jpg', 'file:///tmp/new.png'],
    });
    expect(pet.name).toBe('Nina');
    expect(calls.map((c) => `${c.method} ${c.url.replace(BASE, '')}`)).toEqual(
      expect.arrayContaining([
        'DELETE /v1/pets/pet-1/photos/drop',
        'POST /v1/pets/pet-1/photos',
        'PATCH /v1/pets/pet-1',
      ]),
    );
    expect(calls.find((c) => c.url.endsWith('/upload-url'))?.body).toMatchObject({
      contentType: 'image/png',
    });
  });

  it.each([
    ['an unreadable file', 'content://media/missing'],
    ['a file that is not an image (e.g. an error text)', 'file:///tmp/not-an-image.jpg'],
  ])('never uploads %s', async (_label, uri) => {
    mockLocalFiles.set('file:///tmp/not-an-image.jpg', new TextEncoder().encode('File not found'));
    const calls = mockFetch({ 'POST /v1/pets': () => ({ pet: petDto() }) });
    const error = await createHttpApi(BASE)
      .createPet({
        name: 'Thor',
        species: 'dog',
        breed: 'SRD',
        age: 2,
        size: 'large',
        gender: 'male',
        neutered: true,
        city: 'Rio de Janeiro',
        latitude: -22.97,
        longitude: -43.18,
        photos: [uri],
        personalityTraits: ['playful'],
      })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'validation', serverCode: 'INVALID_LOCAL_IMAGE' });
    expect(getErrorMessage(error)).toMatch(/Escolha outra foto/);
    expect(calls).toEqual([]);
  });

  it('maps a like that produced a match', async () => {
    mockFetch({
      'POST /v1/likes': () => ({
        like: {
          id: 'l1',
          fromPetId: 'mine',
          toPetId: 'pet-1',
          type: 'like',
          createdAt: '2026-10-14T00:00:00.000Z',
        },
        match: {
          id: 'm1',
          conversationId: 'c1',
          myPetId: 'mine',
          pet: petDto(),
          isNew: true,
          createdAt: '2026-10-14T00:00:00.000Z',
        },
      }),
    });
    const result = await createHttpApi(BASE).createLike({
      fromPetId: 'mine',
      toPetId: 'pet-1',
      type: 'like',
    });
    expect(result.conversationId).toBe('c1');
    expect(result.match).toMatchObject({ petAId: 'mine', petBId: 'pet-1', isNew: true });
  });

  it('does not send direct messages (premium, not available yet)', async () => {
    mockFetch({});
    const error = await createHttpApi(BASE)
      .createLike({ fromPetId: 'a', toPetId: 'b', type: 'direct_message' })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'unavailable' });
    expect(isPremiumRequired(error)).toBe(false);
  });

  it('returns messages oldest first and marks the thread as read', async () => {
    const message = (id: string, createdAt: string) => ({
      id,
      conversationId: 'c1',
      senderPetId: 'p',
      senderUserId: 'u',
      type: 'playdate_invite',
      text: null,
      imageUrl: null,
      playdate: {
        placeName: 'Parque Lage',
        latitude: -22.96,
        longitude: -43.21,
        scheduledAt: createdAt,
        status: 'pending',
      },
      createdAt,
      readAt: null,
    });
    const calls = mockFetch({
      'GET /v1/conversations/c1/messages': () => ({
        data: [
          message('new', '2026-10-14T02:00:00.000Z'),
          message('old', '2026-10-14T01:00:00.000Z'),
        ],
        nextCursor: null,
      }),
      'POST /v1/conversations/c1/read': () => undefined,
    });
    const messages = await createHttpApi(BASE).getMessages('c1');
    expect(messages.map((m) => m.id)).toEqual(['old', 'new']);
    expect(messages[0]).toMatchObject({ text: '', playdate: { id: 'old', status: 'pending' } });
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/read'))).toBe(true);
  });

  it('blocks and reports the pet owner, mapping report reasons', async () => {
    const calls = mockFetch({
      'GET /v1/pets/pet-1': () => ({ pet: petDto() }),
      'POST /v1/blocks': () => ({
        block: {
          userId: 'user-2',
          name: null,
          avatarUrl: null,
          createdAt: '2026-10-14T00:00:00.000Z',
        },
      }),
      'POST /v1/reports': () => ({
        report: {
          id: 'r1',
          targetUserId: 'user-2',
          targetPetId: 'pet-1',
          reason: 'safety',
          status: 'open',
          createdAt: '2026-10-14T00:00:00.000Z',
        },
      }),
    });
    const api = createHttpApi(BASE);
    expect((await api.blockPet('pet-1')).blockedPetId).toBe('pet-1');
    expect((await api.reportPet({ targetPetId: 'pet-1', reason: 'unsafe' })).reason).toBe('unsafe');
    expect(calls.find((c) => c.url.endsWith('/blocks'))?.body).toEqual({ targetUserId: 'user-2' });
    expect(calls.find((c) => c.url.endsWith('/reports'))?.body).toEqual({
      targetUserId: 'user-2',
      targetPetId: 'pet-1',
      reason: 'safety',
    });
  });

  it('lists playdates across conversations', async () => {
    const calls = mockFetch({
      'GET /v1/playdates': () => ({
        data: [
          {
            id: 'm1',
            conversationId: 'c1',
            myPetId: 'mine',
            pet: petDto(),
            direction: 'received',
            placeName: 'Parque Lage',
            latitude: -22.96,
            longitude: -43.21,
            scheduledAt: '2026-10-17T13:00:00.000Z',
            status: 'accepted',
            createdAt: '2026-10-15T00:00:00.000Z',
          },
        ],
      }),
    });
    const [playdate] = await createHttpApi(BASE).getPlaydates('mine');
    expect(new URL(calls[0]?.url ?? '').searchParams.get('petId')).toBe('mine');
    expect(playdate).toMatchObject({
      id: 'm1',
      conversationId: 'c1',
      direction: 'received',
      status: 'accepted',
      pet: { id: 'pet-1', photos: ['https://cdn.test/p1.jpg'] },
    });
  });

  it('maps nearby pins', async () => {
    mockFetch({
      'GET /v1/discovery/nearby': () => ({
        total: 1,
        data: [
          {
            id: 'pet-1',
            latitude: -22.9701,
            longitude: -43.1802,
            species: 'dog',
            distanceMeters: 500,
            isMatch: true,
            locked: false,
            pet: { id: 'pet-1', name: 'Luna', breed: 'SRD', coverUrl: null },
          },
        ],
      }),
    });
    const nearby = await createHttpApi(BASE).getNearby({
      petId: 'mine',
      latitude: -22.97,
      longitude: -43.18,
    });
    expect(nearby).toEqual({
      total: 1,
      pins: [
        expect.objectContaining({
          isMatch: true,
          pet: { id: 'pet-1', name: 'Luna', breed: 'SRD', photos: [] },
        }),
      ],
    });
  });
});
