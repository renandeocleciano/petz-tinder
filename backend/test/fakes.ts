import { randomUUID } from 'node:crypto';

import type { GeoPoint } from '../src/database/schema/geography.js';
import type {
  LikeRow,
  MessageRow,
  PetPhotoRow,
  PetRow,
  ReportRow,
  SubscriptionRow,
} from '../src/database/schema/index.js';
import type { BlocksRepository } from '../src/modules/blocks/blocks.repository.js';
import type { ConversationsRepository } from '../src/modules/conversations/conversations.repository.js';
import type { DiscoveryRepository } from '../src/modules/discovery/discovery.repository.js';
import { orderedPair, type LikesRepository } from '../src/modules/likes/likes.repository.js';
import type { SubscriptionsRepository } from '../src/modules/entitlements/subscriptions.repository.js';
import type { MatchesRepository } from '../src/modules/matches/matches.repository.js';
import type { NotificationsRepository } from '../src/modules/notifications/notifications.repository.js';
import type {
  PushMessage,
  PushReceipt,
  PushSender,
  PushTicket,
} from '../src/modules/notifications/push.sender.js';
import type { OutboxEvent, OutboxRepository } from '../src/modules/outbox/outbox.repository.js';
import type { StorageService } from '../src/modules/media/media.types.js';
import type { PetsRepository } from '../src/modules/pets/pets.repository.js';
import type { Interest, PersonalityTrait, PetRecord } from '../src/modules/pets/pets.types.js';
import type { ReportsRepository } from '../src/modules/reports/reports.repository.js';
import type { UsersRepository } from '../src/modules/users/users.repository.js';
import type { User } from '../src/modules/users/users.types.js';
import { obfuscate } from '../src/shared/utils/geo.js';

/** In-memory UsersRepository mirroring the SQL semantics, for HTTP-level unit tests. */
export const createFakeUsersRepository = () => {
  const users = new Map<string, User>();
  const pushTokens = new Map<string, string>();

  const make = (clerkUserId: string): User => {
    const now = new Date();
    return {
      id: randomUUID(),
      clerkUserId,
      name: null,
      email: null,
      avatarUrl: null,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };
  };
  const byClerk = (clerkUserId: string) =>
    [...users.values()].find((user) => user.clerkUserId === clerkUserId);

  const repository: UsersRepository = {
    findById: async (id) => users.get(id),
    findByClerkId: async (clerkUserId) => byClerk(clerkUserId),
    insertIfAbsent: async (clerkUserId) => {
      if (byClerk(clerkUserId)) return undefined;
      const user = make(clerkUserId);
      users.set(user.id, user);
      return user;
    },
    upsertFromClerk: async (profile) => {
      const user = byClerk(profile.clerkUserId) ?? make(profile.clerkUserId);
      users.set(user.id, {
        ...user,
        email: profile.email,
        name: user.name ?? profile.name,
        avatarUrl: user.avatarUrl ?? profile.avatarUrl,
      });
    },
    update: async (id, values) => {
      const user = users.get(id);
      if (!user) throw new Error('missing');
      const updated = { ...user, ...values, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    },
    touchLastActive: async (id, olderThan) => {
      const user = users.get(id);
      if (user && user.lastActiveAt < olderThan)
        users.set(id, { ...user, lastActiveAt: new Date() });
    },
    savePushToken: async (userId, token) => {
      pushTokens.set(token, userId);
    },
    deleteById: async (id) => {
      users.delete(id);
    },
    deleteByClerkId: async (clerkUserId) => {
      const user = byClerk(clerkUserId);
      if (user) users.delete(user.id);
    },
  };

  return { repository, users, pushTokens, byClerk };
};

/** In-memory object storage: `upload` simulates the app's direct upload. */
export const createFakeStorage = () => {
  const objects = new Set<string>();
  const key = (bucket: string, path: string) => `${bucket}/${path}`;
  const storage: StorageService = {
    createUploadUrl: async (bucket, path) => ({
      uploadUrl: `https://storage.test/upload/${key(bucket, path)}?token=t`,
      token: 't',
    }),
    exists: async (bucket, path) => objects.has(key(bucket, path)),
    publicUrl: (bucket, path) => `https://storage.test/public/${key(bucket, path)}`,
    signedUrls: async (bucket, paths) =>
      new Map(
        paths
          .filter((path) => objects.has(key(bucket, path)))
          .map((path) => [path, `https://storage.test/signed/${key(bucket, path)}?token=s`]),
      ),
    remove: async (bucket, paths) => {
      for (const path of paths) objects.delete(key(bucket, path));
    },
    removeFolder: async (bucket, prefix) => {
      for (const object of [...objects]) {
        if (object.startsWith(key(bucket, `${prefix}/`))) objects.delete(object);
      }
    },
  };
  return {
    storage,
    objects,
    upload: (bucket: string, path: string) => objects.add(key(bucket, path)),
  };
};

/** In-memory PetsRepository. Transactions snapshot and restore state on failure. */
export const createFakePetsRepository = () => {
  const pets = new Map<string, PetRow>();
  const traits = new Map<string, PersonalityTrait[]>();
  const interests = new Map<string, Interest[]>();
  const photos = new Map<string, PetPhotoRow>();

  const strip = ({ location: _location, ...record }: PetRow): PetRecord => record;

  const repository: PetsRepository = {
    async transaction(fn) {
      const snapshot = [
        new Map(pets),
        new Map(traits),
        new Map(interests),
        new Map(photos),
      ] as const;
      try {
        return await fn(repository);
      } catch (error) {
        const restore = <K, V>(target: Map<K, V>, source: Map<K, V>) => {
          target.clear();
          source.forEach((value, k) => target.set(k, value));
        };
        restore(pets, snapshot[0]);
        restore(traits, snapshot[1]);
        restore(interests, snapshot[2]);
        restore(photos, snapshot[3]);
        throw error;
      }
    },
    countByOwner: async (ownerId) => [...pets.values()].filter((p) => p.ownerId === ownerId).length,
    async insert(values) {
      const now = new Date();
      const row: PetRow = {
        id: randomUUID(),
        bio: '',
        birthDateApproximate: false,
        availability: null,
        preferences: [],
        verified: false,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...values,
      } as PetRow;
      pets.set(row.id, row);
      return strip(row);
    },
    async update(id, values) {
      const current = pets.get(id);
      if (!current) throw new Error('missing');
      const row = { ...current, ...values, updatedAt: new Date() } as PetRow;
      pets.set(id, row);
      return strip(row);
    },
    async delete(id) {
      pets.delete(id);
      traits.delete(id);
      interests.delete(id);
      for (const [photoId, photo] of photos) if (photo.petId === id) photos.delete(photoId);
    },
    findById: async (id) => {
      const row = pets.get(id);
      return row && strip(row);
    },
    findByIds: async (ids) =>
      ids.flatMap((id) => {
        const row = pets.get(id);
        return row ? [strip(row)] : [];
      }),
    listByOwner: async (ownerId) =>
      [...pets.values()].filter((p) => p.ownerId === ownerId).map(strip),
    replaceTraits: async (petId, values) => void traits.set(petId, [...values]),
    replaceInterests: async (petId, values) => void interests.set(petId, [...values]),
    hydrate: async (records) =>
      records.map((record) => ({
        ...record,
        personalityTraits: traits.get(record.id) ?? [],
        interests: interests.get(record.id) ?? [],
        photos: [...photos.values()]
          .filter((photo) => photo.petId === record.id)
          .sort((a, b) => a.position - b.position)
          .map(({ id, storagePath, position }) => ({ id, storagePath, position })),
      })),
    countPhotos: async (petId) => [...photos.values()].filter((p) => p.petId === petId).length,
    async insertPhoto(petId, storagePath) {
      if ([...photos.values()].some((p) => p.storagePath === storagePath)) {
        throw new Error('unique violation');
      }
      const positions = [...photos.values()]
        .filter((p) => p.petId === petId)
        .map((p) => p.position);
      const now = new Date();
      const row: PetPhotoRow = {
        id: randomUUID(),
        petId,
        storagePath,
        position: positions.length > 0 ? Math.max(...positions) + 1 : 0,
        createdAt: now,
        updatedAt: now,
      };
      photos.set(row.id, row);
      return row;
    },
    photoPathExists: async (path) => [...photos.values()].some((p) => p.storagePath === path),
    async deletePhoto(petId, photoId) {
      const photo = photos.get(photoId);
      if (!photo || photo.petId !== petId) return undefined;
      photos.delete(photoId);
      return photo;
    },
    listPhotoPaths: async (petId) =>
      [...photos.values()].filter((p) => p.petId === petId).map((p) => p.storagePath),
  };

  return { repository, pets, photos };
};

/**
 * Naive DiscoveryRepository over the fake pets: distance-only ranking, no likes/blocks.
 * Exclusion and ranking SQL is covered by the database integration test.
 */
export const createFakeDiscoveryRepository = (pets: Map<string, PetRow>) => {
  const distance = (a: GeoPoint, b: GeoPoint) => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const h =
      Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
      Math.cos(rad(a.latitude)) *
        Math.cos(rad(b.latitude)) *
        Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
    return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
  };
  const visible = (userId: string, origin: GeoPoint, radiusMeters: number) =>
    [...pets.values()]
      .filter((pet) => pet.ownerId !== userId && pet.status === 'active')
      .map((pet) => ({ pet, meters: distance(origin, pet.location) }))
      .filter(({ meters }) => meters <= radiusMeters);

  const repository: DiscoveryRepository = {
    async findCandidates({ userId, origin, radiusMeters, species, after, limit }) {
      return visible(userId, origin, radiusMeters)
        .filter(({ pet }) => !species?.length || species.includes(pet.species))
        .map(({ pet, meters }) => ({
          id: pet.id,
          distanceMeters: meters,
          score: Math.max(0, 100 - Math.floor((meters / radiusMeters) * 100)),
        }))
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .filter(
          (c) => !after || c.score < after.score || (c.score === after.score && c.id > after.id),
        )
        .slice(0, limit);
    },
    async findNearby({ userId, origin, radiusMeters, limit }) {
      const rows = visible(userId, origin, radiusMeters).sort((a, b) => a.meters - b.meters);
      return {
        total: rows.length,
        pets: rows.slice(0, limit).map(({ pet, meters }) => ({
          id: pet.id,
          name: pet.name,
          breed: pet.breed,
          species: pet.species,
          coverPath: null,
          position: obfuscate(pet.location, pet.id),
          distanceMeters: meters,
          isMatch: false,
        })),
      };
    },
  };
  return { repository };
};

/**
 * In-memory likes/matches/blocks sharing the fake pets. Transactions snapshot and restore
 * state on failure; locks are no-ops (concurrency is covered against Postgres).
 */
export const createFakeSocialStore = (
  pets: Map<string, PetRow>,
  users: Map<string, User> = new Map(),
) => {
  const likes = new Map<string, LikeRow>();
  const matches = new Map<
    string,
    { id: string; petAId: string; petBId: string; createdAt: Date }
  >();
  const conversations = new Map<
    string,
    { id: string; matchId: string; lastMessageAt: Date | null }
  >();
  const blocks = new Set<string>();
  const blockedAt = new Map<string, Date>();
  const reports: ReportRow[] = [];
  const outbox: { type: string; payload: Record<string, unknown> }[] = [];
  const likeKey = (from: string, to: string) => `${from}>${to}`;
  let last = 0;
  /** Real time, but strictly increasing, so list ordering stays deterministic. */
  const tick = () => new Date((last = Math.max(Date.now(), last + 1)));

  const matchId = (petA: string, petB: string) => {
    const [a, b] = orderedPair(petA, petB);
    return [...matches.values()].find((m) => m.petAId === a && m.petBId === b)?.id;
  };

  const likesRepository: LikesRepository = {
    async transaction(fn) {
      const snapshot = [
        new Map(likes),
        new Map(matches),
        new Map(conversations),
        outbox.length,
      ] as const;
      try {
        return await fn(likesRepository);
      } catch (error) {
        likes.clear();
        snapshot[0].forEach((v, k) => likes.set(k, v));
        matches.clear();
        snapshot[1].forEach((v, k) => matches.set(k, v));
        conversations.clear();
        snapshot[2].forEach((v, k) => conversations.set(k, v));
        outbox.length = snapshot[3];
        throw error;
      }
    },
    lock: async () => undefined,
    areBlocked: async (a, b) => blocks.has(`${a}|${b}`) || blocks.has(`${b}|${a}`),
    findLike: async (from, to) => likes.get(likeKey(from, to)),
    async upsertLike(fromPetId, toPetId, type) {
      const current = likes.get(likeKey(fromPetId, toPetId));
      const now = tick();
      const row: LikeRow = current
        ? { ...current, type, updatedAt: now }
        : { id: randomUUID(), fromPetId, toPetId, type, createdAt: now, updatedAt: now };
      likes.set(likeKey(fromPetId, toPetId), row);
      return row;
    },
    countSuperLikesSince: async (userId, since) =>
      [...likes.values()].filter(
        (l) =>
          l.type === 'super_like' &&
          l.updatedAt > since &&
          pets.get(l.fromPetId)?.ownerId === userId,
      ).length,
    findMatchId: async (a, b) => matchId(a, b),
    async createMatch([first, second]) {
      const [petAId, petBId] = orderedPair(first.petId, second.petId);
      const id = matchId(petAId, petBId) ?? randomUUID();
      matches.set(id, { id, petAId, petBId, createdAt: tick() });
      const conversation = [...conversations.values()].find((c) => c.matchId === id) ?? {
        id: randomUUID(),
        matchId: id,
        lastMessageAt: null,
      };
      conversations.set(conversation.id, conversation);
      return { matchId: id, conversationId: conversation.id };
    },
    enqueueEvent: async (type, payload) => void outbox.push({ type, payload }),
  };

  const view = (
    userId: string,
    match: { id: string; petAId: string; petBId: string; createdAt: Date },
  ) => {
    const a = pets.get(match.petAId);
    const b = pets.get(match.petBId);
    if (!a || !b) return undefined;
    const mine = a.ownerId === userId ? a : b.ownerId === userId ? b : undefined;
    const other = mine === a ? b : a;
    if (!mine || other.status === 'suspended') return undefined;
    if (blocks.has(`${a.ownerId}|${b.ownerId}`) || blocks.has(`${b.ownerId}|${a.ownerId}`))
      return undefined;
    const conversation = [...conversations.values()].find((c) => c.matchId === match.id);
    if (!conversation) return undefined;
    return {
      id: match.id,
      createdAtExact: match.createdAt.toISOString(),
      createdAt: match.createdAt,
      conversationId: conversation.id,
      myPetId: mine.id,
      otherPetId: other.id,
      lastMessageAt: conversation.lastMessageAt,
    };
  };

  const matchesRepository: MatchesRepository = {
    async listForUser({ userId, petId, after, limit }) {
      return [...matches.values()]
        .flatMap((m) => {
          const v = view(userId, m);
          return v ? [v] : [];
        })
        .filter((v) => !petId || v.myPetId === petId)
        .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime() || y.id.localeCompare(x.id))
        .filter(
          (v) =>
            !after ||
            v.createdAtExact < after.createdAt ||
            (v.createdAtExact === after.createdAt && v.id < after.id),
        )
        .slice(0, limit);
    },
    findForUser: async (userId, id) => {
      const match = matches.get(id);
      return match && view(userId, match);
    },
    async unmatch({ id, myPetId, otherPetId }) {
      matches.delete(id);
      for (const [key, c] of conversations) if (c.matchId === id) conversations.delete(key);
      for (const [from, to] of [
        [myPetId, otherPetId],
        [otherPetId, myPetId],
      ] as const) {
        const like = likes.get(likeKey(from, to));
        if (like) likes.set(likeKey(from, to), { ...like, type: 'dislike', updatedAt: tick() });
      }
    },
  };

  const messages = new Map<string, MessageRow>();
  const lastRead = new Map<string, Date>();
  const readKey = (conversationId: string, petId: string) => `${conversationId}:${petId}`;

  const conversationView = (userId: string, conversationId: string) => {
    const conversation = conversations.get(conversationId);
    const match = conversation && matches.get(conversation.matchId);
    if (!conversation || !match) return undefined;
    const base = view(userId, match);
    if (!base) return undefined;
    const thread = [...messages.values()]
      .filter((m) => m.conversationId === conversationId)
      .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
    const myLastReadAt = lastRead.get(readKey(conversationId, base.myPetId)) ?? null;
    const activityAt = conversation.lastMessageAt ?? match.createdAt;
    return {
      id: conversationId,
      matchId: match.id,
      activityAtExact: activityAt.toISOString(),
      activityAt,
      myPetId: base.myPetId,
      myPetStatus: pets.get(base.myPetId)?.status ?? 'active',
      otherPetId: base.otherPetId,
      otherUserId: pets.get(base.otherPetId)?.ownerId ?? '',
      myLastReadAt,
      otherLastReadAt: lastRead.get(readKey(conversationId, base.otherPetId)) ?? null,
      lastMessageId: thread[0]?.id ?? null,
      unreadCount: thread.filter(
        (m) => m.senderPetId !== base.myPetId && (!myLastReadAt || m.createdAt > myLastReadAt),
      ).length,
    };
  };

  const conversationsRepository: ConversationsRepository = {
    transaction: (fn) => fn(conversationsRepository),
    async listForUser({ userId, petId, after, limit }) {
      return [...conversations.keys()]
        .flatMap((id) => {
          const v = conversationView(userId, id);
          return v ? [v] : [];
        })
        .filter((v) => !petId || v.myPetId === petId)
        .sort(
          (x, y) => y.activityAtExact.localeCompare(x.activityAtExact) || y.id.localeCompare(x.id),
        )
        .filter(
          (v) =>
            !after ||
            v.activityAtExact < after.at ||
            (v.activityAtExact === after.at && v.id < after.id),
        )
        .slice(0, limit);
    },
    findForUser: async (userId, id) => conversationView(userId, id),
    async listMessages(conversationId, { after, limit }) {
      return [...messages.values()]
        .filter((m) => m.conversationId === conversationId)
        .map((m) => ({ ...m, createdAtExact: m.createdAt.toISOString() }))
        .sort(
          (x, y) => y.createdAtExact.localeCompare(x.createdAtExact) || y.id.localeCompare(x.id),
        )
        .filter(
          (m) =>
            !after ||
            m.createdAtExact < after.at ||
            (m.createdAtExact === after.at && m.id < after.id),
        )
        .slice(0, limit);
    },
    findMessagesByIds: async (ids) => ids.flatMap((id) => messages.get(id) ?? []),
    findMessage: async (conversationId, id) => {
      const message = messages.get(id);
      return message?.conversationId === conversationId ? message : undefined;
    },
    async insertMessage(values) {
      const now = tick();
      const row = {
        id: randomUUID(),
        text: null,
        imagePath: null,
        playdate: null,
        playdateStatus: null,
        createdAt: now,
        updatedAt: now,
        ...values,
      } as MessageRow;
      messages.set(row.id, row);
      return row;
    },
    async touch(conversationId, senderPetId, messageId) {
      const conversation = conversations.get(conversationId);
      const message = messages.get(messageId);
      if (!conversation || !message) return;
      conversations.set(conversationId, { ...conversation, lastMessageAt: message.createdAt });
      lastRead.set(readKey(conversationId, senderPetId), message.createdAt);
    },
    async markRead(conversationId, petId) {
      // Same rule as SQL: only moves when something from the other pet is unread.
      const readAt = lastRead.get(readKey(conversationId, petId));
      const unread = [...messages.values()].some(
        (m) =>
          m.conversationId === conversationId &&
          m.senderPetId !== petId &&
          (!readAt || m.createdAt > readAt),
      );
      if (unread) lastRead.set(readKey(conversationId, petId), tick());
    },
    async answerPlaydate(conversationId, messageId, status) {
      const message = messages.get(messageId);
      if (
        !message ||
        message.conversationId !== conversationId ||
        message.playdateStatus !== 'pending'
      )
        return undefined;
      const updated = { ...message, playdateStatus: status };
      messages.set(messageId, updated);
      return updated;
    },
    enqueueEvent: async (type, payload) => void outbox.push({ type, payload }),
    async listPlaydates(userId, { petId, since, limit }) {
      const scheduled = (m: MessageRow) => new Date(m.playdate?.scheduledAt ?? 0).getTime();
      return [...messages.values()]
        .filter((m) => m.type === 'playdate_invite' && scheduled(m) >= since.getTime())
        .flatMap((message) => {
          const view = conversationView(userId, message.conversationId);
          if (!view || (petId && view.myPetId !== petId)) return [];
          return [{ message, myPetId: view.myPetId, otherPetId: view.otherPetId }];
        })
        .sort((x, y) => scheduled(x.message) - scheduled(y.message))
        .slice(0, limit);
    },
  };

  const blocksRepository: BlocksRepository = {
    async block(blockerId, blockedId) {
      const key = `${blockerId}|${blockedId}`;
      if (!blocks.has(key)) blockedAt.set(key, tick());
      blocks.add(key);
    },
    unblock: async (blockerId, blockedId) => void blocks.delete(`${blockerId}|${blockedId}`),
    list: async (blockerId, limit) =>
      [...blocks]
        .map((key) => key.split('|') as [string, string])
        .filter(([blocker]) => blocker === blockerId)
        .map(([, blockedId]) => ({
          userId: blockedId,
          name: users.get(blockedId)?.name ?? null,
          avatarUrl: users.get(blockedId)?.avatarUrl ?? null,
          createdAt: blockedAt.get(`${blockerId}|${blockedId}`) ?? new Date(0),
        }))
        .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
        .slice(0, limit),
  };

  const reportsRepository: ReportsRepository = {
    async insert(report) {
      const now = tick();
      const row: ReportRow = {
        id: randomUUID(),
        ...report,
        status: 'open',
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      reports.push(row);
      return row;
    },
  };

  return {
    likesRepository,
    blocksRepository,
    reportsRepository,
    reports,
    conversationsRepository,
    messages,
    matchesRepository,
    likes,
    matches,
    outbox,
    block: (blockerId: string, blockedId: string) => blocks.add(`${blockerId}|${blockedId}`),
  };
};

/** In-memory subscriptions: one active row per user, canceled rows kept as history. */
export const createFakeSubscriptionsRepository = () => {
  const rows: SubscriptionRow[] = [];
  const repository: SubscriptionsRepository = {
    findCurrent: async (userId, now) =>
      rows.find(
        (row) =>
          row.userId === userId &&
          row.status === 'active' &&
          (!row.expiresAt || row.expiresAt > now),
      ),
    async replace(userId, next) {
      for (const row of rows) {
        if (row.userId === userId && row.status === 'active') {
          row.status = 'canceled';
          row.canceledAt = new Date();
        }
      }
      if (!next) return undefined;
      const now = new Date();
      const row: SubscriptionRow = {
        id: randomUUID(),
        userId,
        status: 'active',
        providerSubscriptionId: null,
        startsAt: now,
        canceledAt: null,
        createdAt: now,
        updatedAt: now,
        ...next,
      };
      rows.push(row);
      return row;
    },
  };
  return { repository, rows };
};

/** Records sent pushes; tokens containing "unregistered" get a DeviceNotRegistered ticket. */
export const createFakePushSender = () => {
  const sent: PushMessage[] = [];
  const receipts = new Map<string, PushReceipt>();
  const sender: PushSender = {
    isValidToken: (token) => /^Expo(nent)?PushToken\[.+\]$/.test(token),
    async send(messages) {
      sent.push(...messages);
      return messages.map((message): PushTicket =>
        message.to.includes('unregistered')
          ? {
              status: 'error',
              message: 'not registered',
              details: { error: 'DeviceNotRegistered' },
            }
          : { status: 'ok', id: `ticket-${randomUUID()}` },
      );
    },
    async receipts(ids) {
      const result: Record<string, PushReceipt> = {};
      for (const id of ids) {
        const receipt = receipts.get(id);
        if (receipt) result[id] = receipt;
      }
      return result;
    },
  };
  return { sender, sent, receipts };
};

/** Push tokens live in the users fake (token → userId), receipts here. */
export const createFakeNotificationsRepository = (pushTokens: Map<string, string>) => {
  const receipts = new Map<string, { ticketId: string; token: string; createdAt: Date }>();
  const repository: NotificationsRepository = {
    tokensFor: async (userIds) =>
      [...pushTokens]
        .filter(([, userId]) => userIds.includes(userId))
        .map(([token, userId]) => ({ token, userId })),
    deleteTokens: async (tokens) => {
      for (const token of tokens) pushTokens.delete(token);
    },
    saveReceipts: async (rows) => {
      for (const row of rows) receipts.set(row.ticketId, { ...row, createdAt: new Date() });
    },
    receiptsBefore: async (date, limit) =>
      [...receipts.values()]
        .filter((row) => row.createdAt < date)
        .slice(0, limit)
        .map(({ ticketId, token }) => ({ ticketId, token })),
    deleteReceipts: async (ids) => {
      for (const id of ids) receipts.delete(id);
    },
  };
  return { repository, receipts };
};

/** Outbox over the social store's event array, with leases and retries like the SQL. */
export const createFakeOutboxRepository = (
  source: { type: string; payload: Record<string, unknown> }[],
) => {
  const events: (OutboxEvent & {
    availableAt: number;
    processed: boolean;
    lastError: string | null;
  })[] = [];
  const sync = () => {
    for (const event of source.slice(events.length)) {
      events.push({
        id: randomUUID(),
        ...event,
        attempts: 0,
        availableAt: 0,
        processed: false,
        lastError: null,
      });
    }
  };
  const repository: OutboxRepository = {
    async claim(limit, leaseSeconds) {
      sync();
      const due = events
        .filter((event) => !event.processed && event.availableAt <= Date.now())
        .slice(0, limit);
      for (const event of due) {
        event.attempts += 1;
        event.availableAt = Date.now() + leaseSeconds * 1000;
      }
      return due.map(({ id, type, payload, attempts }) => ({ id, type, payload, attempts }));
    },
    async complete(id) {
      const event = events.find((item) => item.id === id);
      if (event) Object.assign(event, { processed: true, lastError: null });
    },
    async fail(id, error, retryAt) {
      const event = events.find((item) => item.id === id);
      if (!event) return;
      event.lastError = error;
      if (retryAt) event.availableAt = retryAt.getTime();
      else event.processed = true;
    },
  };
  return { repository, events };
};
