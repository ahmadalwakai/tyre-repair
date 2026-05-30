import React from 'react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { ApiError } from '@/lib/api/client';

/**
 * App-wide TanStack Query setup.
 *
 * - Stale time 30 s (chatty operations dashboard refreshes naturally).
 * - Retries: 1 attempt for transient network errors, none for ApiError
 *   (those carry meaningful HTTP status codes the user should see).
 * - Bridges `AppState` -> `focusManager` so queries refetch when the user
 *   brings the app back to foreground.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error): boolean => {
        if (error instanceof ApiError) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

export function QueryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
