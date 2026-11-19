import { and, desc, eq } from 'drizzle-orm';

import type { DbExecutor } from '../../database/index.js';
import { blocks, users } from '../../database/schema/index.js';

export interface BlockedUser {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface BlocksRepository {
  /** Idempotent: blocking twice keeps the original date. */
  block(blockerId: string, blockedId: string): Promise<void>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
  /** Users blocked by `blockerId`, newest first. */
  list(blockerId: string, limit: number): Promise<BlockedUser[]>;
}

export const createBlocksRepository = (db: DbExecutor): BlocksRepository => ({
  async block(blockerId, blockedId) {
    await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
  },

  async unblock(blockerId, blockedId) {
    await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
  },

  list: (blockerId, limit) =>
    db
      .select({
        userId: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        createdAt: blocks.createdAt,
      })
      .from(blocks)
      .innerJoin(users, eq(users.id, blocks.blockedId))
      .where(eq(blocks.blockerId, blockerId))
      .orderBy(desc(blocks.createdAt))
      .limit(limit),
});
