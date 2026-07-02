/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { getToken } from '@/lib/session';

interface Toast {
  id: string;
  message: string;
}

interface NotificationsContextValue {
  pushToast: (message: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Subscribes to the backend SSE stream while a session is active, shows a
 * toast for every live notification and invalidates the affected queries so
 * lists refresh in real time (docs §7).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    if (!session) return;
    const token = getToken();
    if (!token) return;

    const base = import.meta.env.VITE_API_URL ?? '/api';
    // EventSource cannot set headers → token travels as query param.
    const source = new EventSource(
      `${base}/notifications/stream?access_token=${encodeURIComponent(token)}`,
    );
    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data as string) as Notification;
        pushToast(notification.message);
        // Do NOT bump a local counter here: invalidating the query refetches the
        // unread list, which already includes this notification. Counting both
        // would double it (1 real → showed 2).
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['contracts'] });
        void queryClient.invalidateQueries({ queryKey: ['disputes'] });
        void queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      } catch {
        /* malformed event · ignore */
      }
    };
    return () => source.close();
  }, [session, pushToast, queryClient]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotificationsUi(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsUi must be used inside <NotificationsProvider>');
  }
  return ctx;
}
