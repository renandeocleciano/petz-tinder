import { env, isMockApi } from '@/config/env';

import { createHttpApi } from './httpApi';
import { createMockApi } from './mock/mockApi';
import type { PetzApi } from './types';

/**
 * Single API instance used by hooks. Set EXPO_PUBLIC_API_URL to switch from the
 * in-memory mocks to the REST backend — no UI changes required.
 */
export const api: PetzApi = isMockApi
  ? createMockApi({ newUser: env.mockNewUser, latency: process.env.NODE_ENV === 'test' ? 0 : 300 })
  : createHttpApi(env.apiUrl);

export * from './errors';
export { setAuthTokenProvider } from './authToken';
export { queryKeys } from './queryKeys';
export type * from './types';
