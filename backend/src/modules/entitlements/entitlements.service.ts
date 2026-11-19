import type { SubscriptionTier } from '../../database/schema/index.js';
import type { SubscriptionsRepository } from './subscriptions.repository.js';

export const ENTITLEMENTS = [
  'MAP_ALL_PETS',
  'DIRECT_MESSAGE',
  'ADVANCED_FILTERS',
  'PROFILE_BOOST',
  'SUPER_LIKE',
  'MULTIPLE_PETS',
] as const;
export type Entitlement = (typeof ENTITLEMENTS)[number];

/** What each plan includes. Pricing changes happen here, not in the domain. */
const PLAN: Record<SubscriptionTier, ReadonlySet<Entitlement>> = {
  free: new Set(),
  premium: new Set(ENTITLEMENTS),
};

/** Free plan allowance. Premium has no limit. */
export const FREE_SUPER_LIKES_PER_DAY = 1;
/** Pets per account: free keeps one; more pets is a premium feature. */
export const MAX_PETS: Record<SubscriptionTier, number> = { free: 1, premium: 10 };
const DAY_MS = 24 * 60 * 60 * 1000;

interface Deps {
  subscriptions: SubscriptionsRepository;
  /** Super likes sent by any of the user's pets since a date. */
  countSuperLikesSince: (userId: string, since: Date) => Promise<number>;
  now?: () => Date;
}

/**
 * Single place that knows what each plan can do. Enforced today: the super like quota and
 * the number of pets. The other entitlements are reported to the app (`summary`) and
 * available through `can`, but no route checks them yet.
 */
export const createEntitlementsService = ({
  subscriptions,
  countSuperLikesSince,
  now = () => new Date(),
}: Deps) => {
  const current = (userId: string) => subscriptions.findCurrent(userId, now());

  const tier = async (userId: string): Promise<SubscriptionTier> =>
    (await current(userId))?.tier ?? 'free';

  const superLikesPerDay = async (userId: string): Promise<number | null> =>
    (await tier(userId)) === 'premium' ? null : FREE_SUPER_LIKES_PER_DAY;

  return {
    tier,

    async can(userId: string, entitlement: Entitlement): Promise<boolean> {
      return PLAN[await tier(userId)].has(entitlement);
    },

    superLikesPerDay,

    maxPets: async (userId: string): Promise<number> => MAX_PETS[await tier(userId)],

    /** Plan, what it includes and today's super like allowance, for the app's paywall/UI. */
    async summary(userId: string) {
      const subscription = await current(userId);
      const plan = subscription?.tier ?? 'free';
      const limitPerDay = plan === 'premium' ? null : FREE_SUPER_LIKES_PER_DAY;
      const used =
        limitPerDay === null
          ? 0
          : await countSuperLikesSince(userId, new Date(now().getTime() - DAY_MS));
      return {
        tier: plan,
        expiresAt: subscription?.expiresAt?.toISOString() ?? null,
        entitlements: Object.fromEntries(
          ENTITLEMENTS.map((entitlement) => [entitlement, PLAN[plan].has(entitlement)]),
        ) as Record<Entitlement, boolean>,
        superLikes: {
          limitPerDay,
          remaining: limitPerDay === null ? null : Math.max(0, limitPerDay - used),
        },
        pets: { limit: MAX_PETS[plan] },
      };
    },
  };
};

export type EntitlementsService = ReturnType<typeof createEntitlementsService>;
