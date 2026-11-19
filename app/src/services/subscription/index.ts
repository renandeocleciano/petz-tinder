import { api } from '@/lib/api';

import { createMockSubscriptionService } from './mockSubscriptionService';
import type { SubscriptionService } from './types';

// TODO(billing): swap for a RevenueCat-backed implementation of SubscriptionService.
export const subscriptionService: SubscriptionService = createMockSubscriptionService(api);

export { canUseFeature } from './gating';
export { PREMIUM_FEATURES, SUBSCRIPTION_PLANS } from './plans';
export type * from './types';
