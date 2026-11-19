import { createMockApi } from '@/lib/api/mock/mockApi';

import { canUseFeature } from '../gating';
import { createMockSubscriptionService } from '../mockSubscriptionService';
import { SUBSCRIPTION_PLANS } from '../plans';
import type { PremiumFeature } from '../types';

const FEATURES: PremiumFeature[] = [
  'see_unmatched_on_map',
  'direct_message',
  'advanced_filters',
  'profile_boost',
  'multiple_pets',
];

describe('premium gating', () => {
  it.each(FEATURES)('blocks %s for free and unknown tiers', (feature) => {
    expect(canUseFeature('free', feature)).toBe(false);
    expect(canUseFeature(undefined, feature)).toBe(false);
  });

  it.each(FEATURES)('allows %s for premium', (feature) => {
    expect(canUseFeature('premium', feature)).toBe(true);
  });

  it('exposes the annual plan as most popular with the agreed prices', () => {
    const annual = SUBSCRIPTION_PLANS.find((p) => p.id === 'annual');
    const monthly = SUBSCRIPTION_PLANS.find((p) => p.id === 'monthly');
    expect(annual).toMatchObject({
      pricePerMonth: 14.9,
      billedAmount: 178.8,
      badge: 'Mais popular',
    });
    expect(monthly).toMatchObject({ pricePerMonth: 24.9 });
  });

  it('mock purchase upgrades the user tier', async () => {
    const api = createMockApi({ latency: 0 });
    const service = createMockSubscriptionService(api);

    expect((await api.getMe()).user.subscriptionTier).toBe('free');
    await expect(service.purchase('annual')).resolves.toEqual({ tier: 'premium' });
    expect((await api.getMe()).user.subscriptionTier).toBe('premium');
  });
});
