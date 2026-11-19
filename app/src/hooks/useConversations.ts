import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys, type RespondPlaydateInput, type SendMessageInput } from '@/lib/api';
import { useRealtimeStore } from '@/lib/realtime/store';
import { selectSearchOrigin, useAppStore } from '@/store/appStore';
import type { Message } from '@/types/domain';

import { LIST_FALLBACK_POLL_MS } from './useMatches';
import { useActivePet } from './useMe';

export const useConversations = () => {
  const { activePet } = useActivePet();
  const petId = activePet?.id ?? '';
  const live = useRealtimeStore((s) => s.live);
  return useQuery({
    queryKey: queryKeys.conversations(petId),
    queryFn: () => api.getConversations(petId),
    enabled: Boolean(activePet),
    refetchInterval: live ? false : LIST_FALLBACK_POLL_MS,
  });
};

/** Playdates across conversations (Chat tab → Passeios). */
export const usePlaydates = () => {
  const { activePet } = useActivePet();
  const petId = activePet?.id ?? '';
  const live = useRealtimeStore((s) => s.live);
  return useQuery({
    queryKey: queryKeys.playdates(petId),
    queryFn: () => api.getPlaydates(petId),
    enabled: Boolean(activePet),
    refetchInterval: live ? false : LIST_FALLBACK_POLL_MS,
  });
};

export const useConversation = (id: string) =>
  useQuery({ queryKey: queryKeys.conversation(id), queryFn: () => api.getConversation(id) });

export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  // Realtime pushes new messages; polling is only the fallback when it is not connected.
  const live = useRealtimeStore((s) => s.live);
  return useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: async () => {
      const messages = await api.getMessages(conversationId);
      // Opening the thread marks messages as read — refresh badges.
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchesRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot });
      return messages;
    },
    refetchInterval: live ? false : 15_000,
  });
};

const useUpsertMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return (message: Message) =>
    queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (messages = []) => {
      const exists = messages.some((m) => m.id === message.id);
      return exists
        ? messages.map((m) => (m.id === message.id ? message : m))
        : [...messages, message];
    });
};

export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  const upsert = useUpsertMessage(conversationId);
  return useMutation({
    mutationFn: (input: SendMessageInput) => api.sendMessage(conversationId, input),
    onSuccess: (message) => {
      upsert(message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchesRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot });
      if (message.type === 'playdate_invite') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.playdatesRoot });
      }
    },
  });
};

export const useRespondPlaydate = (conversationId: string) => {
  const queryClient = useQueryClient();
  const upsert = useUpsertMessage(conversationId);
  return useMutation({
    mutationFn: (input: RespondPlaydateInput) => api.respondPlaydate(conversationId, input),
    onSuccess: (message) => {
      upsert(message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.playdatesRoot });
    },
  });
};

export const usePlaceSuggestions = (enabled: boolean) => {
  const origin = useAppStore(selectSearchOrigin);
  return useQuery({
    queryKey: queryKeys.places(origin.latitude, origin.longitude),
    queryFn: () =>
      api.getPlaceSuggestions({ latitude: origin.latitude, longitude: origin.longitude }),
    enabled,
    staleTime: 5 * 60_000,
  });
};
