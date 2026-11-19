import { useQuery } from '@tanstack/react-query';

import { api, queryKeys } from '@/lib/api';
import { useRealtimeStore } from '@/lib/realtime/store';

import { useActivePet } from './useMe';

/** Without Realtime, lists refresh on this interval so tab badges do not freeze. */
export const LIST_FALLBACK_POLL_MS = 30_000;

export const useMatches = () => {
  const { activePet } = useActivePet();
  const petId = activePet?.id ?? '';
  const live = useRealtimeStore((s) => s.live);
  return useQuery({
    queryKey: queryKeys.matches(petId),
    queryFn: () => api.getMatches(petId),
    enabled: Boolean(activePet),
    refetchInterval: live ? false : LIST_FALLBACK_POLL_MS,
  });
};

/** Total unread messages across matches, used for the tab badge. */
export const useUnreadCount = () => {
  const { data } = useMatches();
  return data?.reduce((total, match) => total + match.unreadCount, 0) ?? 0;
};
