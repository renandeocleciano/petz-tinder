import type { PetzApi } from '@/lib/api/types';

import { SUBSCRIPTION_PLANS } from './plans';
import type { SubscriptionService } from './types';

/**
 * No real billing: "purchasing" flips the tier on the mock backend so the whole
 * premium flow can be exercised end to end.
 */
export const createMockSubscriptionService = (api: PetzApi): SubscriptionService => ({
  getPlans: async () => SUBSCRIPTION_PLANS,
  purchase: async () => {
    if (!api.setSubscriptionTier) throw new Error('Compras ainda não estão disponíveis.');
    const user = await api.setSubscriptionTier('premium');
    return { tier: user.subscriptionTier };
  },
  restore: async () => {
    const { user } = await api.getMe();
    return { tier: user.subscriptionTier };
  },
});
