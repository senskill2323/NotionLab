import { QueryClient } from '@tanstack/react-query';

// Ensure a singleton across HMR
const globalScope = typeof window !== 'undefined' ? window : globalThis;

export const queryClient = globalScope.__nl_query_client || new QueryClient({
  defaultOptions: {
    queries: {
      // Global disable to avoid focus storms; opt-in per query where useful
      refetchOnWindowFocus: false,
      // Global cache freshness: 5 minutes
      staleTime: 5 * 60 * 1000,
    },
  },
});

if (!globalScope.__nl_query_client) {
  globalScope.__nl_query_client = queryClient;
}
