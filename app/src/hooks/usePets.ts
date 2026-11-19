import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  api,
  queryKeys,
  type CreatePetInput,
  type MeResponse,
  type UpdatePetInput,
} from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export const usePet = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.pet(id ?? ''),
    queryFn: () => api.getPet(id ?? ''),
    enabled: Boolean(id),
  });

export const useCreatePet = () => {
  const queryClient = useQueryClient();
  const setActivePetId = useAppStore((s) => s.setActivePetId);
  return useMutation({
    mutationFn: (input: CreatePetInput) => api.createPet(input),
    onSuccess: async (pet) => {
      setActivePetId(pet.id);
      queryClient.setQueryData(queryKeys.pet(pet.id), pet);
      // Add the pet right away: the root navigator only unlocks the tabs once `me` has a pet.
      queryClient.setQueryData<MeResponse>(queryKeys.me, (me) =>
        me ? { ...me, pets: [...me.pets.filter((p) => p.id !== pet.id), pet] } : me,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};

export const useUpdatePet = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePetInput) => api.updatePet(id, input),
    onSuccess: async (pet) => {
      queryClient.setQueryData(queryKeys.pet(pet.id), pet);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};

/** Deletes one of the user's pets and switches the active pet if it was the deleted one. */
export const useDeletePet = () => {
  const queryClient = useQueryClient();
  const activePetId = useAppStore((s) => s.activePetId);
  const setActivePetId = useAppStore((s) => s.setActivePetId);
  return useMutation({
    mutationFn: (id: string) => api.deletePet(id),
    onSuccess: async (_result, id) => {
      const me = queryClient.getQueryData<MeResponse>(queryKeys.me);
      const remaining = me?.pets.filter((pet) => pet.id !== id) ?? [];
      if (me) queryClient.setQueryData<MeResponse>(queryKeys.me, { ...me, pets: remaining });
      if (activePetId === id) setActivePetId(remaining[0]?.id ?? null);
      queryClient.removeQueries({ queryKey: queryKeys.pet(id) });
      await Promise.all(
        [
          queryKeys.me,
          queryKeys.matchesRoot,
          queryKeys.conversationsRoot,
          queryKeys.discoverRoot,
          queryKeys.nearbyRoot,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};

export const useBoostPet = () =>
  useMutation({ mutationFn: (petId: string) => api.boostPet(petId) });
