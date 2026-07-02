import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@bolpay/shared';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';

/** Map notification payloads to deep links. */
function targetOf(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | null;
  if (!data) return null;
  if (data.disputeId) return `/disputes/${data.disputeId}`;
  if (data.contractId) return `/contracts/${data.contractId}`;
  if (data.payrollId) return `/payrolls/${data.payrollId}`;
  return null;
}

/**
 * Notifications inbox: lists all notifications, marks them read on click and
 * deep-links to the related dispute, contract, or payroll.
 */
export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Deliverables, payments, disputes, and payroll in real time"
        actions={
          <Button
            variant="secondary"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        }
      />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No notifications" />
        ) : (
          <table className="table table--clickable">
            <tbody>
              {data.map((notification) => {
                const target = targetOf(notification);
                return (
                  <tr
                    key={notification.id}
                    style={{ opacity: notification.read ? 0.6 : 1 }}
                    onClick={() => {
                      if (!notification.read) markRead.mutate(notification.id);
                      if (target) navigate(target);
                    }}
                  >
                    <td style={{ width: 18 }}>{notification.read ? '' : '●'}</td>
                    <td style={{ fontWeight: notification.read ? 400 : 600 }}>
                      {notification.message}
                    </td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(notification.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
