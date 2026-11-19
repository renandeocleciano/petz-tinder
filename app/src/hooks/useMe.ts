import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api, queryKeys } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export const useMe = (enabled = true) =>
  useQuery({ queryKey: queryKeys.me, queryFn: () => api.getMe(), enabled });

/**
 * The pet the user is currently acting as (likes, matches, chat). Users may own several
 * pets; the selection lives in the app store and falls back to the first pet.
 */
export const useActivePet = () => {
  const { data } = useMe();
  const activePetId = useAppStore((s) => s.activePetId);
  const setActivePetId = useAppStore((s) => s.setActivePetId);
  const pets = data?.pets ?? [];
  const activePet = pets.find((p) => p.id === activePetId) ?? pets[0] ?? null;

  useEffect(() => {
    if (activePet && activePet.id !== activePetId) setActivePetId(activePet.id);
  }, [activePet, activePetId, setActivePetId]);

  return { activePet, pets, setActivePetId };
};
