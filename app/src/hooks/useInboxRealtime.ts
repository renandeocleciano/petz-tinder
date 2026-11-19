import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/lib/api';
import { getRealtimeClient } from '@/lib/realtime/client';
import { useRealtimeStore } from '@/lib/realtime/store';

interface MessageRow {
  conversation_id: string;
  type: string;
}
interface ParticipantRow {
  conversation_id: string;
  user_id: string;
}

/**
 * One channel per signed-in user. RLS only delivers rows of the user's conversations, so
 * no filter is needed. Events only invalidate queries: data is always re-read through the
 * API (mapped DTOs, signed image URLs); inactive queries are just marked stale.
 *
 * - messages INSERT/UPDATE: new message or answered playdate (also refreshes Passeios).
 * - conversation_participants INSERT: a new match opened a conversation.
 * - conversation_participants UPDATE by the *other* user: read receipt. The user's own
 *   updates are ignored — they come from this device marking the chat as read.
 */
export const useInboxRealtime = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const setLive = useRealtimeStore((s) => s.setLive);

  useEffect(() => {
    const client = getRealtimeClient();
    if (!client || !userId) return;

    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversationsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchesRoot });
    };
    /** Invites and their answers are messages too (Chat tab → Passeios). */
    const refreshPlaydates = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.playdatesRoot });
    const refreshThread = (conversationId: string | undefined) => {
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      }
    };

    const channel = client
      .channel(`inbox:${userId}`)
      .on<MessageRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<MessageRow>;
          refreshThread(row.conversation_id);
          refreshLists();
          if (row.type === 'playdate_invite') refreshPlaydates();
        },
      )
      .on<ParticipantRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants' },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<ParticipantRow>;
          if (payload.eventType === 'UPDATE' && row.user_id === userId) return;
          refreshThread(row.conversation_id);
          refreshLists();
        },
      )
      .subscribe((status, error) => {
        if (__DEV__ && (error || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          console.warn(`[realtime] ${status}${error ? `: ${error.message}` : ''}`);
        }
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      setLive(false);
      void client.removeChannel(channel);
    };
  }, [queryClient, setLive, userId]);
};
