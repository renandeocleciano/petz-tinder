import { and, desc, eq, lt, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Database, DbExecutor } from '../../database/index.js';
import { blocks, conversations, likes, matches, pets } from '../../database/schema/index.js';
import type { ListMatchesQuery, MatchView } from './matches.types.js';

export interface MatchesRepository {
  /** Matches where one of the user's pets participates, newest first. */
  listForUser(query: ListMatchesQuery): Promise<MatchView[]>;
  findForUser(userId: string, matchId: string): Promise<MatchView | undefined>;
  /**
   * Deletes the match (and, by cascade, its conversation) and turns both likes into
   * dislikes, so the pair does not instantly re-match and stays hidden for the cooldown.
   */
  unmatch(match: Pick<MatchView, 'id' | 'myPetId' | 'otherPetId'>): Promise<void>;
}

const petA = alias(pets, 'pet_a');
const petB = alias(pets, 'pet_b');

const build = (db: DbExecutor): MatchesRepository => {
  const select = (userId: string) => {
    const mineIsA = sql`(${petA.ownerId} = ${userId})`;
    return db
      .select({
        id: matches.id,
        createdAtExact: sql<string>`${matches.createdAt}::text`,
        createdAt: matches.createdAt,
        conversationId: conversations.id,
        myPetId: sql<string>`case when ${mineIsA} then ${petA.id} else ${petB.id} end`,
        otherPetId: sql<string>`case when ${mineIsA} then ${petB.id} else ${petA.id} end`,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(matches)
      .innerJoin(petA, eq(petA.id, matches.petAId))
      .innerJoin(petB, eq(petB.id, matches.petBId))
      .innerJoin(conversations, eq(conversations.matchId, matches.id));
  };

  /** Visible to the user: theirs, not blocked either way, other pet not suspended. */
  const visible = (userId: string) =>
    and(
      or(
        and(eq(petA.ownerId, userId), ne(petB.status, 'suspended')),
        and(eq(petB.ownerId, userId), ne(petA.status, 'suspended')),
      ),
      notExists(
        db
          .select({ one: sql`1` })
          .from(blocks)
          .where(
            or(
              and(eq(blocks.blockerId, petA.ownerId), eq(blocks.blockedId, petB.ownerId)),
              and(eq(blocks.blockerId, petB.ownerId), eq(blocks.blockedId, petA.ownerId)),
            ),
          ),
      ),
    );

  return {
    async listForUser({ userId, petId, after, limit }) {
      const rows = await select(userId)
        .where(
          and(
            visible(userId),
            petId ? or(eq(matches.petAId, petId), eq(matches.petBId, petId)) : undefined,
            after
              ? or(
                  lt(matches.createdAt, sql`${after.createdAt}::timestamptz`),
                  and(
                    eq(matches.createdAt, sql`${after.createdAt}::timestamptz`),
                    lt(matches.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(matches.createdAt), desc(matches.id))
        .limit(limit);
      return rows;
    },

    async findForUser(userId, matchId) {
      const [row] = await select(userId).where(and(eq(matches.id, matchId), visible(userId)));
      return row;
    },

    async unmatch({ id, myPetId, otherPetId }) {
      await (db as Database).transaction(async (tx) => {
        await tx.delete(matches).where(eq(matches.id, id));
        await tx
          .update(likes)
          .set({ type: 'dislike', updatedAt: sql`now()` })
          .where(
            or(
              and(eq(likes.fromPetId, myPetId), eq(likes.toPetId, otherPetId)),
              and(eq(likes.fromPetId, otherPetId), eq(likes.toPetId, myPetId)),
            ),
          );
      });
    },
  };
};

export const createMatchesRepository = (db: DbExecutor): MatchesRepository => build(db);
