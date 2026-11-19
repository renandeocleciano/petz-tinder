import type { SubscriptionTier } from '@/types/domain';

export type PremiumFeature =
  | 'see_unmatched_on_map'
  | 'direct_message'
  | 'advanced_filters'
  | 'profile_boost'
  | 'multiple_pets';

export type PlanId = 'monthly' | 'annual';

export interface SubscriptionPlan {
  id: PlanId;
  title: string;
  /** Monthly-equivalent price in BRL. */
  pricePerMonth: number;
  /** Amount charged per billing period in BRL. */
  billedAmount: number;
  description: string;
  badge?: string;
  discountLabel?: string;
}

export interface PurchaseResult {
  tier: SubscriptionTier;
}

/**
 * Store-agnostic contract. A RevenueCat (or StoreKit / Play Billing) implementation
 * replaces the mock without touching screens.
 */
export interface SubscriptionService {
  getPlans(): Promise<SubscriptionPlan[]>;
  purchase(planId: PlanId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
}
