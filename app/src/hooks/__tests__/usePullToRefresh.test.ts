import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePullToRefresh } from '../usePullToRefresh';

describe('usePullToRefresh', () => {
  it('spins only during a pull and stops when the refetch settles', async () => {
    let finish: () => void = () => undefined;
    const refetch = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { result } = await renderHook(() => usePullToRefresh(refetch));

    expect(result.current.refreshing).toBe(false);
    await act(async () => result.current.onRefresh());
    expect(result.current.refreshing).toBe(true);
    expect(refetch).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it('stops spinning even if the refetch fails', async () => {
    const refetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { result } = await renderHook(() => usePullToRefresh(refetch));
    await act(async () => result.current.onRefresh());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });
});
