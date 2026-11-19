import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys, type CreateLikeInput } from '@/lib/api';
import { selectSearchOrigin, useAppStore } from '@/store/appStore';
import type { Pet } from '@/types/domain';

import { useActivePet } from './useMe';

export const useDiscoverQueue = () => {
  const { activePet } = useActivePet();
  const origin = useAppStore(selectSearchOrigin);
  const cityId = useAppStore((s) => s.city.id);
  const filters = useAppStore((s) => s.discoverFilters);
  const petId = activePet?.id ?? '';

  return useQuery({
    queryKey: queryKeys.discover(petId, cityId, filters),
    queryFn: () =>
      api.getDiscover({ petId, latitude: origin.latitude, longitude: origin.longitude, filters }),
    enabled: Boolean(activePet),
  });
};

/** Sends like/dislike/super like/direct message and removes the pet from the queue. */
export const useLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLikeInput) => api.createLike(input),
    onMutate: ({ toPetId, type }) => {
      if (type === 'direct_message') return;
      queryClient.setQueriesData<Pet[]>({ queryKey: queryKeys.discoverRoot }, (pets) =>
        pets?.filter((pet) => pet.id !== toPetId),
      );
    },
    onSuccess: async (result) => {
      if (result.match || result.conversationId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.matchesRoot }),
          queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot }),
          queryClient.invalidateQueries({ queryKey: queryKeys.nearbyRoot }),
        ]);
      }
    },
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.discoverRoot }),
  });
};
