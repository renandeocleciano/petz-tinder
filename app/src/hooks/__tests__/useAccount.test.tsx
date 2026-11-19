import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuthSession } from '@/services/auth';
import { DevAuthProvider } from '@/services/auth/DevAuthProvider';
import { useAppStore } from '@/store/appStore';
import { createTestQueryClient } from '@/test/renderWithProviders';

import { useDeleteAccount, useSignOut } from '../useAccount';

const setup = async () => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['me'], { user: { id: 'u1' }, pets: [{ id: 'p1' }] });
  useAppStore.getState().setActivePetId('p1');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DevAuthProvider initiallySignedIn>{children}</DevAuthProvider>
    </QueryClientProvider>
  );
  const { result } = await renderHook(
    () => ({ session: useAuthSession(), signOut: useSignOut(), remove: useDeleteAccount() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.session.isSignedIn).toBe(true));
  return { queryClient, result };
};

describe('account hooks', () => {
  afterEach(() => jest.restoreAllMocks());

  it('signing out clears cached data and the app store', async () => {
    const { queryClient, result } = await setup();
    await act(async () => result.current.signOut());
    expect(result.current.session.isSignedIn).toBe(false);
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(useAppStore.getState().activePetId).toBeNull();
  });

  it('deleting the account calls the API, then ends the session', async () => {
    const deleteAccount = jest.spyOn(api, 'deleteAccount').mockResolvedValue(undefined);
    const { queryClient, result } = await setup();
    await act(async () => result.current.remove.mutateAsync());
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(result.current.session.isSignedIn).toBe(false);
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });

  it('keeps the session when the deletion fails', async () => {
    jest.spyOn(api, 'deleteAccount').mockRejectedValue(new Error('offline'));
    const { queryClient, result } = await setup();
    await act(async () => {
      await result.current.remove.mutateAsync().catch(() => undefined);
    });
    expect(result.current.session.isSignedIn).toBe(true);
    expect(queryClient.getQueryData(['me'])).toBeDefined();
  });
});
