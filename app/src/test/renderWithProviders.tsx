import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DevAuthProvider } from '@/services/auth/DevAuthProvider';

export const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

/** Renders with the same providers as the app (query cache, auth, safe area). */
export const renderWithProviders = (ui: ReactElement, queryClient = createTestQueryClient()) =>
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <QueryClientProvider client={queryClient}>
        <DevAuthProvider initiallySignedIn>{ui}</DevAuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
