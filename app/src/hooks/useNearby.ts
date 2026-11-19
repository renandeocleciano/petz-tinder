import { useQuery } from '@tanstack/react-query';

import { api, queryKeys } from '@/lib/api';
import { selectSearchOrigin, useAppStore } from '@/store/appStore';

import { useActivePet } from './useMe';
import { usePremiumGate } from './usePremium';

export const useNearby = () => {
  const { activePet } = useActivePet();
  const { isPremium } = usePremiumGate();
  const origin = useAppStore(selectSearchOrigin);
  const petId = activePet?.id ?? '';
  return useQuery({
    // Tier is part of the key: upgrading reveals locked pins immediately.
    queryKey: [...queryKeys.nearby(petId, origin.latitude, origin.longitude), isPremium],
    queryFn: () =>
      api.getNearby({
        petId,
        latitude: origin.latitude,
        longitude: origin.longitude,
        radiusKm: 10,
      }),
    enabled: Boolean(activePet),
  });
};
