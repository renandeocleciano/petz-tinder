import type { SubscriptionTier } from '@/types/domain';

import type { PremiumFeature } from './types';

const PREMIUM_ONLY: ReadonlySet<PremiumFeature> = new Set<PremiumFeature>([
  'see_unmatched_on_map',
  'direct_message',
  'advanced_filters',
  'profile_boost',
  'multiple_pets',
]);

/**
 * Client-side gate used only for UX (showing the paywall early). The backend enforces
 * the same rules and answers 402 when a free user calls a premium endpoint.
 */
export const canUseFeature = (tier: SubscriptionTier | undefined, feature: PremiumFeature) =>
  !PREMIUM_ONLY.has(feature) || tier === 'premium';
