import { and, count, eq, gt, or, sql } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/index.js';
import {
  blocks,
  conversationParticipants,
  conversations,
  likes,
  matches,
  outboxEvents,
  pets,
  type LikeRow,
} from '../../database/schema/index.js';
import type { LikeType } from './likes.types.js';

export interface MatchParticipant {
  petId: string;
  userId: string;
}

export interface LikesRepository {
  /** Runs `fn` atomically; nested calls reuse the outer transaction. */
  transaction<T>(fn: (repository: LikesRepository) => Promise<T>): Promise<T>;
  /** Transaction-scoped advisory lock; released on commit/rollback. */
  lock(key: string): Promise<void>;
  areBlocked(userA: string, userB: string): Promise<boolean>;
  findLike(fromPetId: string, toPetId: string): Promise<LikeRow | undefined>;
  upsertLike(fromPetId: string, toPetId: string, type: LikeType): Promise<LikeRow>;
  /** Super likes sent by any of the user's pets since `since`. */
  countSuperLikesSince(userId: string, since: Date): Promise<number>;
  findMatchId(petA: string, petB: string): Promise<string | undefined>;
  /** Creates the match, its conversation and both participants. Idempotent per pair. */
  createMatch(
    participants: [MatchParticipant, MatchParticipant],
  ): Promise<{ matchId: string; conversationId: string }>;
  enqueueEvent(type: string, payload: Record<string, unknown>): Promise<void>;
}

/** Matches store the pair ordered, so (a, b) and (b, a) are the same row. */
export const orderedPair = (petA: string, petB: string): [string, string] =>
  petA < petB ? [petA, petB] : [petB, petA];

const build = (db: DbExecutor): LikesRepository => ({
  transaction: (fn) => (db as Database).transaction((tx) => fn(build(tx))),

  async lock(key) {
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  },

  async areBlocked(userA, userB) {
    const [row] = await db
      .select({ one: sql`1` })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, userA), eq(blocks.blockedId, userB)),
          and(eq(blocks.blockerId, userB), eq(blocks.blockedId, userA)),
        ),
      )
      .limit(1);
    return Boolean(row);
  },

  async findLike(fromPetId, toPetId) {
    const [row] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.fromPetId, fromPetId), eq(likes.toPetId, toPetId)));
    return row;
  },

  async upsertLike(fromPetId, toPetId, type) {
    const [row] = await db
      .insert(likes)
      .values({ fromPetId, toPetId, type })
      .onConflictDoUpdate({
        target: [likes.fromPetId, likes.toPetId],
        set: { type, updatedAt: sql`now()` },
      })
      .returning();
    if (!row) throw new Error('Like upsert returned no row');
    return row;
  },

  async countSuperLikesSince(userId, since) {
    const [row] = await db
      .select({ total: count() })
      .from(likes)
      .innerJoin(pets, eq(pets.id, likes.fromPetId))
      .where(
        and(eq(pets.ownerId, userId), eq(likes.type, 'super_like'), gt(likes.updatedAt, since)),
      );
    return row?.total ?? 0;
  },

  async findMatchId(petA, petB) {
    const [a, b] = orderedPair(petA, petB);
    const [row] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.petAId, a), eq(matches.petBId, b)));
    return row?.id;
  },

  async createMatch(participants) {
    const [a, b] = orderedPair(participants[0].petId, participants[1].petId);
    const [created] = await db
      .insert(matches)
      .values({ petAId: a, petBId: b })
      .onConflictDoNothing()
      .returning({ id: matches.id });
    const matchId = created?.id ?? (await build(db).findMatchId(a, b));
    if (!matchId) throw new Error('Match vanished during creation');

    const [conversation] = await db
      .insert(conversations)
      .values({ matchId })
      .onConflictDoUpdate({ target: conversations.matchId, set: { updatedAt: sql`now()` } })
      .returning({ id: conversations.id });
    if (!conversation) throw new Error('Conversation insert returned no row');

    await db
      .insert(conversationParticipants)
      .values(participants.map((p) => ({ conversationId: conversation.id, ...p })))
      .onConflictDoNothing();
    return { matchId, conversationId: conversation.id };
  },

  async enqueueEvent(type, payload) {
    await db.insert(outboxEvents).values({ type, payload });
  },
});

export const createLikesRepository = (db: DbExecutor): LikesRepository => build(db);
