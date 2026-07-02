import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@bolpay/shared';
import type { Invitation } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate, roleLabel } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { Badge, Button, Card, Field, SelectField } from '@/components/ui';

/**
 * Email invitations manager: create role-scoped invites (token copied to the
 * clipboard) and list/revoke pending ones.
 */
export function InvitationsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FixedEmployee);

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => (await api.get<Invitation[]>('/users/invitations')).data,
  });

  const invite = useMutation({
    mutationFn: async () =>
      (await api.post<Invitation & { token: string }>('/users/invitations', {
        email: email.trim().toLowerCase(),
        role,
      })).data,
    onSuccess: async (invitation) => {
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
      await navigator.clipboard.writeText(invitation.token).catch(() => undefined);
      pushToast('Invitation created · code copied to clipboard');
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/invitations/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['invitations'] }),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const roleOptions = [
    { value: UserRole.FixedEmployee, label: 'Fixed employee' },
    { value: UserRole.Freelancer, label: 'Freelancer' },
    { value: UserRole.Company, label: 'Company' },
    ...(user?.role === 'administrator'
      ? [{ value: UserRole.Administrator, label: 'Administrator' }]
      : []),
  ];

  return (
    <Card title="Email invitations">
      <div className="form-grid">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="new@email.com"
        />
        <SelectField
          label="Role"
          value={role}
          onChange={(value) => setRole(value as UserRole)}
          options={roleOptions}
        />
      </div>
      <Button
        loading={invite.isPending}
        disabled={!email.includes('@')}
        onClick={() => invite.mutate()}
      >
        Invite
      </Button>

      {invitations && invitations.length > 0 && (
        <>
          <hr className="divider" />
          <table className="table">
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td className="muted">{roleLabel[invitation.role]}</td>
                  <td>
                    <Badge
                      tone={
                        invitation.status === 'accepted'
                          ? 'success'
                          : invitation.status === 'pending'
                            ? 'info'
                            : 'neutral'
                      }
                    >
                      {invitation.status}
                    </Badge>
                  </td>
                  <td className="muted">expires {formatDate(invitation.expiresAt)}</td>
                  <td>
                    {invitation.status === 'pending' && (
                      <Button variant="ghost" onClick={() => revoke.mutate(invitation.id)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
