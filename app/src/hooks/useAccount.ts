import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api';
import { useAuthSession } from '@/services/auth';
import { useAppStore } from '@/store/appStore';

/**
 * Ends the local session: signs out, then drops every cached response and the app store,
 * so the next account on this device never sees the previous one's pets or chats.
 */
export const useSignOut = () => {
  const { signOut } = useAuthSession();
  const queryClient = useQueryClient();
  const resetStore = useAppStore((s) => s.reset);
  return useCallback(async () => {
    // Sign out first: the guarded screens unmount and stop refetching.
    await signOut().catch(() => undefined);
    resetStore();
    queryClient.clear();
  }, [queryClient, resetStore, signOut]);
};

/**
 * Deletes the account on the backend (Clerk user, data and files), then ends the session.
 * The Clerk session no longer exists afterwards, so a failing sign-out is ignored.
 */
export const useDeleteAccount = () => {
  const endSession = useSignOut();
  return useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: endSession,
  });
};
