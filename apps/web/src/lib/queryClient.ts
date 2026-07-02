import { QueryClient } from '@tanstack/react-query';

/** Shared React Query client with the app-wide default fetch/cache policy. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
