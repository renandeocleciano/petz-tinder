import { placeSuggestions } from '@/mocks/social';
import type { Conversation, Message, Pet } from '@/types/domain';
import { distanceKm, obfuscateCoordinate } from '@/utils/geo';

import { ApiError, notFound, premiumRequired } from '../errors';
import type {
  ConversationSummary,
  DiscoverParams,
  MatchSummary,
  NearbyPin,
  PetzApi,
  PlaydateSummary,
} from '../types';
import { createMockDb, nextId, type MockDb, type MockDbOptions } from './mockDb';

const DEFAULT_RADIUS_KM = 50;
const POSITIVE_LIKES = new Set(['like', 'super_like']);

const now = () => new Date().toISOString();

export interface MockApiOptions extends MockDbOptions {
  /** Simulated network latency in ms. */
  latency?: number;
}

export interface MockApi extends PetzApi {
  /** Test helper: direct access to the in-memory state. */
  readonly db: MockDb;
}

export const createMockApi = ({ latency = 300, ...dbOptions }: MockApiOptions = {}): MockApi => {
  const db = createMockDb(dbOptions);

  const respond = async <T>(producer: () => T): Promise<T> => {
    if (latency > 0) await new Promise((resolve) => setTimeout(resolve, latency));
    // Return copies so callers can never mutate the "server" state (void results stay void).
    const result = producer();
    return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
  };

  const me = () => {
    const user = db.users.get(db.currentUserId);
    if (!user) throw new ApiError(401, 'unauthorized', 'Sessão inválida');
    return user;
  };
  const isPremium = () => me().subscriptionTier === 'premium';

  const getPetOrThrow = (id: string) => {
    const pet = db.pets.get(id);
    if (!pet) throw notFound('Pet');
    return pet;
  };

  const assertOwnPet = (petId: string) => {
    const pet = getPetOrThrow(petId);
    if (pet.ownerId !== db.currentUserId)
      throw new ApiError(403, 'unauthorized', 'Pet de outro tutor');
    return pet;
  };

  const blockedPetIds = () =>
    new Set(
      db.blocks.filter((b) => b.blockerUserId === db.currentUserId).map((b) => b.blockedPetId),
    );

  /** Public projection: approximate distance from the viewer, no private stats. */
  const toPublicPet = (pet: Pet): Pet => {
    const isMine = pet.ownerId === db.currentUserId;
    const { stats, ...rest } = pet;
    return {
      ...rest,
      ...(isMine && stats ? { stats } : {}),
      approximateDistance: isMine ? null : Math.round(distanceKm(db.viewerLocation, pet) * 10) / 10,
    };
  };

  const matchBetween = (petA: string, petB: string) =>
    db.matches.find(
      (m) => (m.petAId === petA && m.petBId === petB) || (m.petAId === petB && m.petBId === petA),
    );

  const conversationBetween = (petA: string, petB: string) =>
    [...db.conversations.values()].find((c) => {
      const ids = c.participants.map((p) => p.petId);
      return ids.includes(petA) && ids.includes(petB);
    });

  const ensureConversation = (myPetId: string, otherPetId: string, matchId: string | null) => {
    const existing = conversationBetween(myPetId, otherPetId);
    if (existing) {
      if (matchId && !existing.matchId) existing.matchId = matchId;
      return existing;
    }
    const other = getPetOrThrow(otherPetId);
    const conversation: Conversation = {
      id: nextId(db, 'conv'),
      matchId,
      participants: [
        { userId: db.currentUserId, petId: myPetId },
        { userId: other.ownerId, petId: otherPetId },
      ],
      messages: [],
    };
    db.conversations.set(conversation.id, conversation);
    return conversation;
  };

  const otherPetIn = (conversation: Conversation, myPetId: string) => {
    const participant = conversation.participants.find((p) => p.petId !== myPetId);
    if (!participant) throw notFound('Participante');
    return getPetOrThrow(participant.petId);
  };

  const unreadCount = (conversation: Conversation) =>
    conversation.messages.filter((m) => m.senderUserId !== db.currentUserId && !m.readAt).length;

  const lastMessage = (conversation: Conversation): Message | null =>
    conversation.messages[conversation.messages.length - 1] ?? null;

  const findMessage = (conversationId: string, messageId: string) => {
    const conversation = db.conversations.get(conversationId);
    const message = conversation?.messages.find((m) => m.id === messageId);
    if (!conversation || !message) throw notFound('Mensagem');
    return message;
  };

  const discoverCandidates = ({ petId, filters }: DiscoverParams) => {
    const blocked = blockedPetIds();
    const alreadySeen = new Set(
      db.likes.filter((l) => l.fromPetId === petId).map((l) => l.toPetId),
    );
    const maxDistance = filters?.maxDistanceKm ?? DEFAULT_RADIUS_KM;
    return [...db.pets.values()]
      .filter((pet) => pet.ownerId !== db.currentUserId)
      .filter((pet) => !blocked.has(pet.id) && !alreadySeen.has(pet.id))
      .filter((pet) => !matchBetween(petId, pet.id))
      .filter((pet) => !filters?.species?.length || filters.species.includes(pet.species))
      .filter((pet) => !filters?.sizes?.length || filters.sizes.includes(pet.size))
      .filter(
        (pet) =>
          !filters?.traits?.length ||
          filters.traits.some((trait) => pet.personalityTraits.includes(trait)),
      )
      .map(toPublicPet)
      .filter((pet) => (pet.approximateDistance ?? 0) <= maxDistance)
      .sort((a, b) => (a.approximateDistance ?? 0) - (b.approximateDistance ?? 0));
  };

  const hasAdvancedFilters = (params: DiscoverParams) => {
    const f = params.filters;
    return Boolean(
      f && (f.species?.length || f.sizes?.length || f.traits?.length || f.maxDistanceKm),
    );
  };

  return {
    db,

    getMe: () =>
      respond(() => ({
        user: me(),
        pets: [...db.pets.values()].filter((p) => p.ownerId === db.currentUserId).map(toPublicPet),
      })),

    deleteAccount: () =>
      respond(() => {
        const owned = new Set(
          [...db.pets.values()].filter((p) => p.ownerId === db.currentUserId).map((p) => p.id),
        );
        for (const id of owned) db.pets.delete(id);
        db.likes = db.likes.filter((l) => !owned.has(l.fromPetId) && !owned.has(l.toPetId));
        db.matches = db.matches.filter((m) => !owned.has(m.petAId) && !owned.has(m.petBId));
        for (const [key, conversation] of db.conversations) {
          if (conversation.participants.some((p) => owned.has(p.petId))) {
            db.conversations.delete(key);
          }
        }
        db.users.delete(db.currentUserId);
      }),

    updateMe: (input) =>
      respond(() => {
        const user = me();
        Object.assign(user, input);
        return user;
      }),

    createPet: (input) =>
      respond(() => {
        const owned = [...db.pets.values()].filter((p) => p.ownerId === db.currentUserId);
        if (owned.length >= 1 && !isPremium()) throw premiumRequired('multiple_pets');
        const id = nextId(db, 'pet');
        const position = obfuscateCoordinate(input, id);
        const pet: Pet = {
          id,
          ownerId: db.currentUserId,
          name: input.name.trim(),
          species: input.species,
          breed: input.breed,
          birthDate: input.birthDate ?? null,
          age: input.age,
          size: input.size,
          gender: input.gender,
          neutered: input.neutered,
          bio: input.bio ?? '',
          ...position,
          approximateDistance: null,
          city: input.city,
          photos: input.photos,
          coverUrl: input.photos[0] ?? null,
          personalityTraits: input.personalityTraits,
          interests: input.interests ?? [],
          preferences: [],
          availability: input.availability ?? null,
          verified: false,
          stats: { likes: 0, matches: 0, views: 0 },
        };
        db.pets.set(id, pet);
        return toPublicPet(pet);
      }),

    getPet: (id) => respond(() => toPublicPet(getPetOrThrow(id))),

    updatePet: (id, input) =>
      respond(() => {
        const pet = assertOwnPet(id);
        const { latitude, longitude, ...rest } = input;
        Object.assign(pet, rest);
        if (latitude !== undefined && longitude !== undefined) {
          Object.assign(pet, obfuscateCoordinate({ latitude, longitude }, id));
        }
        return toPublicPet(pet);
      }),

    deletePet: (id) =>
      respond(() => {
        assertOwnPet(id);
        db.pets.delete(id);
        db.likes = db.likes.filter((l) => l.fromPetId !== id && l.toPetId !== id);
        const gone = new Set(
          db.matches.filter((m) => m.petAId === id || m.petBId === id).map((m) => m.id),
        );
        db.matches = db.matches.filter((m) => !gone.has(m.id));
        for (const [key, conversation] of db.conversations) {
          if (conversation.participants.some((p) => p.petId === id)) db.conversations.delete(key);
        }
        db.boosts.delete(id);
      }),

    boostPet: (id) =>
      respond(() => {
        assertOwnPet(id);
        if (!isPremium()) throw premiumRequired('boost');
        const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
        db.boosts.set(id, expiresAt);
        return { expiresAt };
      }),

    getDiscover: (params) =>
      respond(() => {
        assertOwnPet(params.petId);
        if (hasAdvancedFilters(params) && !isPremium()) throw premiumRequired('advanced_filters');
        db.viewerLocation = { latitude: params.latitude, longitude: params.longitude };
        return discoverCandidates(params);
      }),

    createLike: ({ fromPetId, toPetId, type }) =>
      respond(() => {
        assertOwnPet(fromPetId);
        getPetOrThrow(toPetId);
        if (type === 'direct_message' && !isPremium()) throw premiumRequired('direct_message');

        const like = { id: nextId(db, 'like'), fromPetId, toPetId, type, createdAt: now() };
        db.likes.push(like);

        if (type === 'direct_message') {
          const existingMatch = matchBetween(fromPetId, toPetId);
          const conversation = ensureConversation(fromPetId, toPetId, existingMatch?.id ?? null);
          return { like, match: null, conversationId: conversation.id };
        }

        const reciprocal = db.likes.some(
          (l) => l.fromPetId === toPetId && l.toPetId === fromPetId && POSITIVE_LIKES.has(l.type),
        );
        if (!POSITIVE_LIKES.has(type) || !reciprocal || matchBetween(fromPetId, toPetId)) {
          return { like, match: null, conversationId: null };
        }

        const match = {
          id: nextId(db, 'match'),
          petAId: fromPetId,
          petBId: toPetId,
          createdAt: now(),
          lastMessage: null,
          unreadCount: 0,
        };
        db.matches.push(match);
        const conversation = ensureConversation(fromPetId, toPetId, match.id);
        const summary: MatchSummary = {
          ...match,
          pet: toPublicPet(getPetOrThrow(toPetId)),
          conversationId: conversation.id,
          isNew: true,
        };
        return { like, match: summary, conversationId: conversation.id };
      }),

    getMatches: (petId) =>
      respond(() => {
        assertOwnPet(petId);
        const blocked = blockedPetIds();
        return db.matches
          .filter((m) => m.petAId === petId || m.petBId === petId)
          .map((m): MatchSummary => {
            const otherId = m.petAId === petId ? m.petBId : m.petAId;
            const conversation = ensureConversation(petId, otherId, m.id);
            return {
              ...m,
              pet: toPublicPet(getPetOrThrow(otherId)),
              conversationId: conversation.id,
              lastMessage: lastMessage(conversation),
              unreadCount: unreadCount(conversation),
              isNew: conversation.messages.length === 0,
            };
          })
          .filter((m) => !blocked.has(m.pet.id))
          .sort((a, b) =>
            (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(
              a.lastMessage?.createdAt ?? a.createdAt,
            ),
          );
      }),

    getConversations: (petId) =>
      respond(() => {
        assertOwnPet(petId);
        const blocked = blockedPetIds();
        return [...db.conversations.values()]
          .filter((c) => c.participants.some((p) => p.petId === petId))
          .filter((c) => c.messages.length > 0)
          .map((c): ConversationSummary => ({
            id: c.id,
            matchId: c.matchId,
            pet: toPublicPet(otherPetIn(c, petId)),
            lastMessage: lastMessage(c),
            unreadCount: unreadCount(c),
          }))
          .filter((c) => !blocked.has(c.pet.id))
          .sort((a, b) =>
            (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''),
          );
      }),

    getPlaydates: (petId) =>
      respond(() => {
        assertOwnPet(petId);
        const blocked = blockedPetIds();
        const since = Date.now() - 30 * 86_400_000;
        return [...db.conversations.values()]
          .filter((c) => c.participants.some((p) => p.petId === petId))
          .flatMap((c) => {
            const other = otherPetIn(c, petId);
            if (blocked.has(other.id)) return [];
            return c.messages.flatMap((m): PlaydateSummary[] =>
              m.type === 'playdate_invite' && m.playdate
                ? [
                    {
                      id: m.id,
                      conversationId: c.id,
                      pet: toPublicPet(other),
                      direction: m.senderUserId === db.currentUserId ? 'sent' : 'received',
                      placeName: m.playdate.placeName,
                      latitude: m.playdate.latitude,
                      longitude: m.playdate.longitude,
                      scheduledAt: m.playdate.scheduledAt,
                      status: m.playdate.status,
                    },
                  ]
                : [],
            );
          })
          .filter((p) => new Date(p.scheduledAt).getTime() >= since)
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      }),

    getConversation: (id) =>
      respond(() => {
        const conversation = db.conversations.get(id);
        if (!conversation) throw notFound('Conversa');
        const mine = conversation.participants.find((p) => p.userId === db.currentUserId);
        if (!mine) throw new ApiError(403, 'unauthorized', 'Conversa de outro tutor');
        return {
          id,
          matchId: conversation.matchId,
          pet: toPublicPet(otherPetIn(conversation, mine.petId)),
          myPet: toPublicPet(getPetOrThrow(mine.petId)),
        };
      }),

    getMessages: (conversationId) =>
      respond(() => {
        const conversation = db.conversations.get(conversationId);
        if (!conversation) throw notFound('Conversa');
        const readAt = now();
        conversation.messages.forEach((m) => {
          if (m.senderUserId !== db.currentUserId && !m.readAt) m.readAt = readAt;
        });
        return conversation.messages;
      }),

    sendMessage: (conversationId, input) =>
      respond(() => {
        const conversation = db.conversations.get(conversationId);
        if (!conversation) throw notFound('Conversa');
        const text = input.text?.trim() ?? '';
        if (input.type === 'text' && !text) throw new ApiError(422, 'validation', 'Mensagem vazia');
        const message: Message = {
          id: nextId(db, 'msg'),
          conversationId,
          senderUserId: db.currentUserId,
          text,
          type: input.type,
          ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
          ...(input.playdate
            ? {
                playdate: {
                  ...input.playdate,
                  id: nextId(db, 'playdate'),
                  status: 'pending' as const,
                },
              }
            : {}),
          createdAt: now(),
          readAt: null,
        };
        conversation.messages.push(message);
        return message;
      }),

    respondPlaydate: (conversationId, { messageId, status }) =>
      respond(() => {
        const message = findMessage(conversationId, messageId);
        if (!message.playdate) throw new ApiError(422, 'validation', 'Mensagem sem convite');
        if (message.senderUserId === db.currentUserId) {
          throw new ApiError(403, 'unauthorized', 'Você não pode responder ao próprio convite');
        }
        message.playdate.status = status;
        return message;
      }),

    getPlaceSuggestions: (origin) =>
      respond(() =>
        [...placeSuggestions].sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b)),
      ),

    getNearby: ({ petId, latitude, longitude, radiusKm = 10 }) =>
      respond(() => {
        assertOwnPet(petId);
        const premium = isPremium();
        const blocked = blockedPetIds();
        db.viewerLocation = { latitude, longitude };
        const pins = [...db.pets.values()]
          .filter((pet) => pet.ownerId !== db.currentUserId && !blocked.has(pet.id))
          .filter((pet) => distanceKm({ latitude, longitude }, pet) <= radiusKm)
          .map((pet): NearbyPin => {
            const isMatch = Boolean(matchBetween(petId, pet.id));
            const locked = !premium && !isMatch;
            return {
              id: pet.id,
              ...obfuscateCoordinate(pet, pet.id),
              species: pet.species,
              locked,
              isMatch,
              pet: locked
                ? null
                : { id: pet.id, name: pet.name, photos: pet.photos.slice(0, 1), breed: pet.breed },
            };
          });
        return { total: pins.length, pins };
      }),

    reportPet: ({ targetPetId, reason }) =>
      respond(() => {
        getPetOrThrow(targetPetId);
        const report = {
          id: nextId(db, 'report'),
          reporterUserId: db.currentUserId,
          targetPetId,
          reason,
          createdAt: now(),
        };
        db.reports.push(report);
        return report;
      }),

    blockPet: (petId) =>
      respond(() => {
        getPetOrThrow(petId);
        const block = {
          id: nextId(db, 'block'),
          blockerUserId: db.currentUserId,
          blockedPetId: petId,
          createdAt: now(),
        };
        db.blocks.push(block);
        return block;
      }),

    setSubscriptionTier: (tier) =>
      respond(() => {
        const user = me();
        user.subscriptionTier = tier;
        return user;
      }),
  };
};
