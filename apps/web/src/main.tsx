import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { PollarProvider } from '@pollar/react';
import '@pollar/react/styles.css';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/auth/AuthContext';
import { NotificationsProvider } from '@/notifications/NotificationsContext';
import { router } from '@/router';
import './index.css';

const pollarKey = import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY as string | undefined;

if (!pollarKey) {
  // Fail loudly: without the publishable key there is no wallet onboarding.
  console.error('VITE_POLLAR_PUBLISHABLE_KEY is not set — login will not work');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PollarProvider client={{ apiKey: pollarKey ?? '', stellarNetwork: 'testnet' }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationsProvider>
            <RouterProvider router={router} />
          </NotificationsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PollarProvider>
  </StrictMode>,
);
