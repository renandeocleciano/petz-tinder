import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { queryKeys } from '@/lib/api';
import { useRealtimeStore } from '@/lib/realtime/store';
import { createTestQueryClient } from '@/test/renderWithProviders';

import { useInboxRealtime } from '../useInboxRealtime';

type Handler = (payload: { eventType: string; new: object; old: object }) => void;

/** Minimal Supabase Realtime double: records listeners and lets tests emit events. */
const mockRealtime = {
  handlers: new Map<string, Handler>(),
  status: (_s: string) => undefined as void,
  removed: 0,
  channelName: '',
};

jest.mock('@/lib/realtime/client', () => ({
  getRealtimeClient: () => ({
    channel: (name: string) => {
      mockRealtime.channelName = name;
      const channel = {
        on: (_type: string, filter: { table: string }, handler: Handler) => {
          mockRealtime.handlers.set(filter.table, handler);
          return channel;
        },
        subscribe: (callback: (status: string) => void) => {
          mockRealtime.status = callback;
          return channel;
        },
      };
      return channel;
    },
    removeChannel: async () => {
      mockRealtime.removed += 1;
    },
  }),
}));

const KEYS = {
  thread: queryKeys.messages('c1'),
  conversations: queryKeys.conversations('pet-1'),
  matches: queryKeys.matches('pet-1'),
  playdates: queryKeys.playdates('pet-1'),
};

/** `null` = signed out (an `undefined` argument would fall back to the default). */
const setup = async (userId: string | null = 'me') => {
  const queryClient = createTestQueryClient();
  for (const key of Object.values(KEYS)) queryClient.setQueryData(key, []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = await renderHook(() => useInboxRealtime(userId ?? undefined), { wrapper });
  /** Which cached queries the event marked as stale. */
  const stale = () =>
    Object.entries(KEYS)
      .filter(([, key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([name]) => name);
  return { view, stale };
};

/** Async act: this Testing Library version's act is async; a sync call leaves it open. */
const run = (fn: () => void) =>
  act(async () => {
    fn();
  });

const emit = async (table: string, eventType: string, row: object) => {
  const handler = mockRealtime.handlers.get(table);
  if (!handler) throw new Error(`no listener for ${table}`);
  await run(() => handler({ eventType, new: row, old: {} }));
};

beforeEach(() => {
  mockRealtime.handlers.clear();
  mockRealtime.removed = 0;
  useRealtimeStore.setState({ live: false });
});

describe('useInboxRealtime', () => {
  it('subscribes one channel per user and reports when it is live', async () => {
    // The CHANNEL_ERROR below is expected; keep the test output clean.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await setup();
    expect(mockRealtime.channelName).toBe('inbox:me');
    await run(() => mockRealtime.status('SUBSCRIBED'));
    expect(useRealtimeStore.getState().live).toBe(true);
    await run(() => mockRealtime.status('CHANNEL_ERROR'));
    expect(useRealtimeStore.getState().live).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('CHANNEL_ERROR'));
    warn.mockRestore();
  });

  it('refreshes the thread and the lists on a new message', async () => {
    const { stale } = await setup();
    await emit('messages', 'INSERT', { conversation_id: 'c1', type: 'text' });
    expect(stale()).toEqual(['thread', 'conversations', 'matches']);
  });

  it('also refreshes Passeios for playdate invites and answers', async () => {
    const { stale } = await setup();
    await emit('messages', 'UPDATE', { conversation_id: 'c1', type: 'playdate_invite' });
    expect(stale()).toEqual(['thread', 'conversations', 'matches', 'playdates']);
  });

  it("ignores the user's own read updates (they would loop refetch → read → event)", async () => {
    const { stale } = await setup();
    await emit('conversation_participants', 'UPDATE', { conversation_id: 'c1', user_id: 'me' });
    expect(stale()).toEqual([]);
  });

  it('refreshes the lists when a new match opens a conversation', async () => {
    const { stale } = await setup();
    await emit('conversation_participants', 'INSERT', { conversation_id: 'c2', user_id: 'me' });
    expect(stale()).toEqual(['conversations', 'matches']);
  });

  it("refreshes the thread on the other tutor's read receipt", async () => {
    const { stale } = await setup();
    await emit('conversation_participants', 'UPDATE', { conversation_id: 'c1', user_id: 'bob' });
    expect(stale()).toContain('thread');
  });

  it('removes the channel when the session ends', async () => {
    const { view } = await setup();
    await run(() => mockRealtime.status('SUBSCRIBED'));
    await view.unmount();
    expect(mockRealtime.removed).toBe(1);
    expect(useRealtimeStore.getState().live).toBe(false);
  });

  it('does nothing without a signed-in user', async () => {
    mockRealtime.channelName = '';
    await setup(null);
    expect(mockRealtime.channelName).toBe('');
  });
});
