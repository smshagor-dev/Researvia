'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/lib/stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 5,
      refetchOnMount: 'always',
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {
            // Ignore local cleanup failures.
          });
        });
      });
      caches?.keys?.().then((keys) => {
        keys
          .filter((key) => key.startsWith('profcrm-static-'))
          .forEach((key) => {
            caches.delete(key).catch(() => {
              // Ignore local cleanup failures.
            });
          });
      });
      return;
    }

    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Fail silently in development/local environments.
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const firstNavigation = navigationEntries[0];
      if (firstNavigation?.type === 'reload') {
        return;
      }

      const hasNextDataMiss =
        performance
          .getEntriesByType('resource')
          .some((entry) => entry.name.includes('/_next/static/') && entry.name.includes('404'));
      if (hasNextDataMiss) {
        window.location.reload();
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
