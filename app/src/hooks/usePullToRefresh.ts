import { useCallback, useState } from 'react';

/**
 * Spinner state for <RefreshControl>, driven only by the user's pull gesture.
 *
 * Do not bind `refreshing` to React Query's `isRefetching`: background refetches (e.g.
 * invalidations from another screen) would toggle it while the list is off-screen, and on
 * iOS the native spinner then stays stuck until the screen remounts.
 */
export const usePullToRefresh = (refetch: () => Promise<unknown>) => {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Errors surface through the query's own state; here they only stop the spinner.
    const stop = () => setRefreshing(false);
    refetch().then(stop, stop);
  }, [refetch]);
  return { refreshing, onRefresh };
};
