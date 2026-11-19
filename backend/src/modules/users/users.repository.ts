import { and, eq, lt, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../database/index.js';
import { pushTokens, users } from '../../database/schema/index.js';
import type { ClerkProfile, User } from './users.types.js';

export const createUsersRepository = (db: DbExecutor) => ({
  async findById(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  },

  async findByClerkId(clerkUserId: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
    return row;
  },

  /** Inserts a bare user; returns undefined when a concurrent request created it first. */
  async insertIfAbsent(clerkUserId: string): Promise<User | undefined> {
    const [row] = await db
      .insert(users)
      .values({ clerkUserId })
      .onConflictDoNothing({ target: users.clerkUserId })
      .returning();
    return row;
  },

  /**
   * Webhook sync. Email always follows Clerk; name and avatar are only filled when empty,
   * so edits made in the app are not overwritten.
   */
  async upsertFromClerk(profile: ClerkProfile): Promise<void> {
    await db
      .insert(users)
      .values(profile)
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: {
          email: profile.email,
          name: sql`coalesce(${users.name}, excluded.name)`,
          avatarUrl: sql`coalesce(${users.avatarUrl}, excluded.avatar_url)`,
        },
      });
  },

  async update(id: string, values: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
    const [row] = await db.update(users).set(values).where(eq(users.id, id)).returning();
    if (!row) throw new Error(`User ${id} vanished during update`);
    return row;
  },

  /** Throttled activity bump used for discovery ordering. */
  async touchLastActive(id: string, olderThan: Date): Promise<void> {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(and(eq(users.id, id), lt(users.lastActiveAt, olderThan)));
  },

  /** A push token belongs to one device; signing in with another account moves it. */
  async savePushToken(userId: string, token: string): Promise<void> {
    await db
      .insert(pushTokens)
      .values({ userId, token })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId, updatedAt: new Date() } });
  },

  /** Cascades to every row owned by the user (pets, likes, messages, tokens…). */
  async deleteById(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },

  async deleteByClerkId(clerkUserId: string): Promise<void> {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  },
});

export type UsersRepository = ReturnType<typeof createUsersRepository>;
