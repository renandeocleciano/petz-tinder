import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { queryKeys } from '@/lib/api';
import {
  canUseFeature,
  subscriptionService,
  type PlanId,
  type PremiumFeature,
} from '@/services/subscription';

import { useMe } from './useMe';

export const usePremiumGate = () => {
  const { data } = useMe();
  const router = useRouter();
  const tier = data?.user.subscriptionTier;

  const can = useCallback((feature: PremiumFeature) => canUseFeature(tier, feature), [tier]);

  /** Returns true when allowed; otherwise opens the paywall and returns false. */
  const requirePremium = useCallback(
    (feature: PremiumFeature) => {
      if (canUseFeature(tier, feature)) return true;
      router.push({ pathname: '/premium', params: { feature } });
      return false;
    },
    [router, tier],
  );

  return { tier, isPremium: tier === 'premium', can, requirePremium };
};

export const usePurchasePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: PlanId) => subscriptionService.purchase(planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
};
