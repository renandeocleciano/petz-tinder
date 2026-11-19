import type { MediaService } from '../media/media.service.js';
import { BUCKETS } from '../media/media.types.js';
import type { UsersRepository } from './users.repository.js';
import { UserNotFoundError } from './users.errors.js';
import type { ClerkProfile, IdentityProvider, UpdateMeInput, User } from './users.types.js';

const ACTIVITY_THROTTLE_MS = 5 * 60_000;

interface Deps {
  repository: UsersRepository;
  identity: IdentityProvider;
  media: MediaService;
  now?: () => Date;
  onCleanupError?: (error: unknown) => void;
}

export const createUsersService = ({
  repository,
  identity,
  media,
  now = () => new Date(),
  onCleanupError = () => undefined,
}: Deps) => ({
  /**
   * Resolves the internal user for a verified Clerk id, creating a bare one when the
   * `user.created` webhook has not arrived yet. Also bumps `lastActiveAt` (throttled).
   */
  async ensureUser(clerkUserId: string): Promise<User> {
    const existing = await repository.findByClerkId(clerkUserId);
    if (existing) {
      const staleBefore = new Date(now().getTime() - ACTIVITY_THROTTLE_MS);
      if (existing.lastActiveAt < staleBefore)
        await repository.touchLastActive(existing.id, staleBefore);
      return existing;
    }
    const created = await repository.insertIfAbsent(clerkUserId);
    if (created) return created;
    const raced = await repository.findByClerkId(clerkUserId);
    if (!raced) throw new UserNotFoundError();
    return raced;
  },

  async getMe(userId: string): Promise<User> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  },

  async updateMe(userId: string, input: UpdateMeInput): Promise<User> {
    const { pushToken, avatarPath, name } = input;
    const profile: { name?: string; avatarUrl?: string | null } = {};
    if (name !== undefined) profile.name = name;
    if (avatarPath === null) profile.avatarUrl = null;
    if (avatarPath) {
      await media.assertUploaded(userId, BUCKETS.user_avatar, avatarPath);
      profile.avatarUrl = media.publicUrl(BUCKETS.user_avatar, avatarPath);
    }

    if (pushToken) await repository.savePushToken(userId, pushToken);
    if (Object.keys(profile).length === 0) return this.getMe(userId);
    return repository.update(userId, profile);
  },

  /**
   * Deletes the identity first: if Clerk fails nothing is lost and the user can retry.
   * The `user.deleted` webhook that follows is a no-op.
   */
  async deleteAccount(userId: string, clerkUserId: string): Promise<void> {
    await identity.deleteUser(clerkUserId);
    await repository.deleteById(userId);
    await media.removeAllForUser(userId).catch(onCleanupError);
  },

  syncFromIdentity(profile: ClerkProfile): Promise<void> {
    return repository.upsertFromClerk(profile);
  },

  async removeByIdentity(clerkUserId: string): Promise<void> {
    const user = await repository.findByClerkId(clerkUserId);
    if (!user) return;
    await repository.deleteById(user.id);
    await media.removeAllForUser(user.id).catch(onCleanupError);
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
