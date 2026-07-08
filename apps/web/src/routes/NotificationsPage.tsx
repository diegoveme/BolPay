import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Bell,
  Check,
  FileCheck,
  FileText,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { Notification } from '@bolpay/shared';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  Button,
  ConfirmModal,
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

/** Icon and colour tone for a notification, grouped by its event family. */
function notifStyle(type: string): { Icon: LucideIcon; tone: string } {
  if (type.startsWith('dispute')) return { Icon: AlertTriangle, tone: 'danger' };
  if (type.startsWith('deliverable')) return { Icon: FileCheck, tone: 'warning' };
  if (type.startsWith('contract')) return { Icon: FileText, tone: 'info' };
  if (
    type.startsWith('payroll') ||
    type.startsWith('payment') ||
    type.startsWith('escrow')
  ) {
    return { Icon: Banknote, tone: 'success' };
  }
  return { Icon: Bell, tone: 'neutral' };
}

/**
 * Notifications inbox: a card list that marks items read on click, deep-links
 * to the related dispute, contract or payroll, and lets you mark or delete each.
 */
export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<Notification | null>(null);

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

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
    },
  });

  const hasUnread = data?.some((n) => !n.read) ?? false;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Deliverables, payments, disputes, and payroll in real time"
        actions={
          hasUnread ? (
            <Button
              variant="secondary"
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No notifications"
          hint="Disputes, released payments, funded escrows and payroll runs will show up here."
        />
      ) : (
        <div className="notif-list">
          {data.map((notification) => {
            const { Icon, tone } = notifStyle(notification.type);
            const target = targetOf(notification);
            return (
              <div
                key={notification.id}
                className={`notif${notification.read ? '' : ' notif--unread'}${
                  target ? ' notif--link' : ''
                }`}
                onClick={() => {
                  if (!notification.read) markRead.mutate(notification.id);
                  if (target) navigate(target);
                }}
              >
                <span className={`notif__icon notif__icon--${tone}`}>
                  <Icon size={18} aria-hidden />
                </span>
                <div className="notif__body">
                  <p
                    className="notif__msg"
                    style={{ fontWeight: notification.read ? 400 : 600 }}
                  >
                    {notification.message}
                  </p>
                  <p className="notif__time">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                <div className="notif__actions">
                  {!notification.read && (
                    <button
                      type="button"
                      className="notif__btn"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(notification.id);
                      }}
                    >
                      <Check size={16} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    className="notif__btn notif__btn--danger"
                    title="Delete"
                    aria-label="Delete notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(notification);
                    }}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete notification"
          confirmLabel="Delete"
          danger
          loading={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.id)}
        >
          <p>This notification will be permanently removed. This cannot be undone.</p>
        </ConfirmModal>
      )}
    </>
  );
}
