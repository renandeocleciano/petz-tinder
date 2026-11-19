import { MY_PET_ID } from '@/mocks/pets';
import { distanceKm } from '@/utils/geo';

import { createMockApi } from '../mockApi';

const RIO = { latitude: -22.9711, longitude: -43.1951 };

const setup = () => createMockApi({ latency: 0 });

describe('mock API — discover', () => {
  it('never returns own pets, matched pets or pets already swiped', async () => {
    const api = setup();
    const first = await api.getDiscover({ petId: MY_PET_ID, ...RIO });
    const ids = first.map((p) => p.id);

    expect(ids).not.toContain(MY_PET_ID);
    expect(ids).not.toContain('pet-luna'); // already a match
    expect(first.length).toBeGreaterThan(0);

    const target = first[0]!;
    await api.createLike({ fromPetId: MY_PET_ID, toPetId: target.id, type: 'dislike' });
    const second = await api.getDiscover({ petId: MY_PET_ID, ...RIO });
    expect(second.map((p) => p.id)).not.toContain(target.id);
  });

  it('returns approximate distance sorted from nearest to farthest, without private stats', async () => {
    const api = setup();
    const pets = await api.getDiscover({ petId: MY_PET_ID, ...RIO });
    const distances = pets.map((p) => p.approximateDistance ?? -1);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(pets.every((p) => p.stats === undefined)).toBe(true);
  });
});

describe('mock API — likes and matches', () => {
  it('records a like without creating a match when interest is not mutual', async () => {
    const api = setup();
    const result = await api.createLike({
      fromPetId: MY_PET_ID,
      toPetId: 'pet-frida',
      type: 'like',
    });

    expect(result.like).toMatchObject({ fromPetId: MY_PET_ID, toPetId: 'pet-frida', type: 'like' });
    expect(result.match).toBeNull();
    expect(api.db.likes.some((l) => l.id === result.like.id)).toBe(true);
  });

  it('creates a match and a conversation when the other pet already liked back', async () => {
    const api = setup();
    const before = await api.getMatches(MY_PET_ID);

    const result = await api.createLike({
      fromPetId: MY_PET_ID,
      toPetId: 'pet-pipoca', // seeded incoming like
      type: 'like',
    });

    expect(result.match?.pet.id).toBe('pet-pipoca');
    expect(result.conversationId).toBeTruthy();

    const after = await api.getMatches(MY_PET_ID);
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((m) => m.pet.id === 'pet-pipoca')?.isNew).toBe(true);
  });

  it('super like also matches, and a dislike never does', async () => {
    const api = setup();
    const disliked = await api.createLike({
      fromPetId: MY_PET_ID,
      toPetId: 'pet-amora',
      type: 'dislike',
    });
    expect(disliked.match).toBeNull();

    const superLiked = await api.createLike({
      fromPetId: MY_PET_ID,
      toPetId: 'pet-fred',
      type: 'super_like',
    });
    expect(superLiked.match?.pet.id).toBe('pet-fred');
  });
});

describe('mock API — premium gating', () => {
  it('rejects direct messages and advanced filters for free users', async () => {
    const api = setup();
    await expect(
      api.createLike({ fromPetId: MY_PET_ID, toPetId: 'pet-frida', type: 'direct_message' }),
    ).rejects.toMatchObject({ code: 'premium_required' });
    await expect(
      api.getDiscover({ petId: MY_PET_ID, ...RIO, filters: { species: ['cat'] } }),
    ).rejects.toMatchObject({ code: 'premium_required' });
    await expect(api.boostPet(MY_PET_ID)).rejects.toMatchObject({ code: 'premium_required' });
  });

  it('allows them after upgrading', async () => {
    const api = setup();
    await api.setSubscriptionTier?.('premium');

    const result = await api.createLike({
      fromPetId: MY_PET_ID,
      toPetId: 'pet-frida',
      type: 'direct_message',
    });
    expect(result.conversationId).toBeTruthy();

    const cats = await api.getDiscover({ petId: MY_PET_ID, ...RIO, filters: { species: ['cat'] } });
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((p) => p.species === 'cat')).toBe(true);
  });

  it('hides identity of unmatched pets on the map for free users only', async () => {
    const api = setup();
    const free = await api.getNearby({ petId: MY_PET_ID, ...RIO });
    const unmatched = free.pins.filter((p) => !p.isMatch);
    expect(unmatched.length).toBeGreaterThan(0);
    expect(unmatched.every((p) => p.locked && p.pet === null)).toBe(true);
    expect(free.pins.filter((p) => p.isMatch).every((p) => p.pet !== null)).toBe(true);

    await api.setSubscriptionTier?.('premium');
    const premium = await api.getNearby({ petId: MY_PET_ID, ...RIO });
    expect(premium.pins.every((p) => !p.locked && p.pet !== null)).toBe(true);
  });
});

describe('mock API — privacy and safety', () => {
  it('never exposes a pin at the pet stored position', async () => {
    const api = setup();
    const { pins } = await api.getNearby({ petId: MY_PET_ID, ...RIO });
    pins.forEach((pin) => {
      const stored = api.db.pets.get(pin.id)!;
      const offsetKm = distanceKm(pin, stored);
      expect(offsetKm).toBeGreaterThan(0.05);
      expect(offsetKm).toBeLessThan(1.5);
    });
  });

  it('blocked pets disappear from discover and matches', async () => {
    const api = setup();
    await api.blockPet('pet-luna');
    const matches = await api.getMatches(MY_PET_ID);
    expect(matches.map((m) => m.pet.id)).not.toContain('pet-luna');

    await api.blockPet('pet-frida');
    const discover = await api.getDiscover({ petId: MY_PET_ID, ...RIO });
    expect(discover.map((p) => p.id)).not.toContain('pet-frida');
  });
});

describe('mock API — pets', () => {
  const secondPet = {
    name: 'Nina',
    species: 'cat' as const,
    breed: 'SRD',
    age: 2,
    size: 'small' as const,
    gender: 'female' as const,
    neutered: true,
    city: 'Rio de Janeiro',
    ...RIO,
    photos: ['https://example.com/nina.jpg'],
    personalityTraits: ['calm' as const],
  };

  it('keeps free accounts to one pet, like the backend', async () => {
    const api = setup();
    await expect(api.createPet(secondPet)).rejects.toMatchObject({ code: 'premium_required' });
    await api.setSubscriptionTier?.('premium');
    await expect(api.createPet(secondPet)).resolves.toMatchObject({ name: 'Nina' });
  });

  it('deletes a pet with its matches and conversations', async () => {
    const api = setup();
    expect(api.db.matches.some((m) => m.petAId === MY_PET_ID || m.petBId === MY_PET_ID)).toBe(true);
    await api.deletePet(MY_PET_ID);
    const { pets } = await api.getMe();
    expect(pets.map((p) => p.id)).not.toContain(MY_PET_ID);
    expect(api.db.matches.some((m) => m.petAId === MY_PET_ID || m.petBId === MY_PET_ID)).toBe(
      false,
    );
    expect(
      [...api.db.conversations.values()].some((c) =>
        c.participants.some((p) => p.petId === MY_PET_ID),
      ),
    ).toBe(false);
  });

  it("refuses to delete another tutor's pet", async () => {
    const api = setup();
    await expect(api.deletePet('pet-luna')).rejects.toMatchObject({ status: 403 });
  });
});

describe('mock API — account', () => {
  it('deletes the account with its pets, matches and conversations', async () => {
    const api = setup();
    await api.deleteAccount();
    expect(api.db.users.has(api.db.currentUserId)).toBe(false);
    expect([...api.db.pets.values()].some((p) => p.ownerId === api.db.currentUserId)).toBe(false);
    expect(api.db.matches.some((m) => m.petAId === MY_PET_ID || m.petBId === MY_PET_ID)).toBe(
      false,
    );
  });
});

describe('mock API — playdates', () => {
  it('lists invites sent from a conversation and their answers', async () => {
    const api = setup();
    const [conversation] = await api.getConversations(MY_PET_ID);
    if (!conversation) throw new Error('seed has no conversation');
    const scheduledAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const sent = await api.sendMessage(conversation.id, {
      type: 'playdate_invite',
      playdate: {
        placeName: 'Aterro do Flamengo',
        placeImageUrl: null,
        latitude: -22.93,
        longitude: -43.17,
        scheduledAt,
      },
    });
    const playdates = await api.getPlaydates(MY_PET_ID);
    expect(playdates.find((p) => p.id === sent.id)).toMatchObject({
      direction: 'sent',
      status: 'pending',
      placeName: 'Aterro do Flamengo',
      conversationId: conversation.id,
    });
    const times = playdates.map((p) => p.scheduledAt);
    expect(times).toEqual([...times].sort());
  });
});
