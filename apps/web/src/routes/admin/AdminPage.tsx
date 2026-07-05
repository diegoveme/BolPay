import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActivityLog, Escrow, User } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import {
  formatDateTime,
  formatUSDC,
  roleLabel,
  shortAddress,
} from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';

type Tab = 'users' | 'escrows' | 'activity';

interface AdminEscrow extends Escrow {
  contract?: { id: string; title: string } | null;
  payroll?: { id: string; name: string } | null;
}

interface AdminActivity extends ActivityLog {
  user?: { id: string; email: string; role: string };
}

/** Platform supervision: users, escrow monitor and global activity (docs §Roles). */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Platform supervision: users, escrows and global activity"
        actions={
          <div className="row">
            {(['users', 'escrows', 'activity'] as Tab[]).map((t) => (
              <Button
                key={t}
                variant={tab === t ? 'primary' : 'secondary'}
                onClick={() => setTab(t)}
              >
                {t === 'users' ? 'Users' : t === 'escrows' ? 'Escrows' : 'Activity'}
              </Button>
            ))}
          </div>
        }
      />
      {tab === 'users' && <UsersTab />}
      {tab === 'escrows' && <EscrowsTab />}
      {tab === 'activity' && <ActivityTab />}
    </>
  );
}

/** Admin tab listing every platform user with role, status, wallet and actions. */
function UsersTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [toToggle, setToToggle] = useState<User | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { id: string; status: 'active' | 'suspended' }) =>
      api.patch(`/users/${vars.id}/status`, { status: vars.status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setToToggle(null);
    },
  });

  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Signed up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((user) => {
              const suspended = user.status === 'suspended';
              return (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.email}</td>
                  <td className="muted">
                    {user.name ??
                      user.companyProfile?.name ??
                      user.freelancerProfile?.displayName ??
                      '·'}
                  </td>
                  <td>
                    <Badge tone="info">{roleLabel[user.role]}</Badge>
                  </td>
                  <td>
                    <Badge tone={suspended ? 'danger' : 'success'}>
                      {suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </td>
                  <td className="mono muted">{shortAddress(user.stellarAddress)}</td>
                  <td className="muted">{formatDateTime(user.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {user.id !== currentUser?.id && (
                      <Button
                        variant={suspended ? 'secondary' : 'danger'}
                        onClick={() => setToToggle(user)}
                      >
                        {suspended ? 'Rehabilitate' : 'Suspend'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {toToggle && (
        <ConfirmModal
          title={
            toToggle.status === 'suspended'
              ? 'Rehabilitate account'
              : 'Suspend account'
          }
          confirmLabel={
            toToggle.status === 'suspended' ? 'Rehabilitate' : 'Suspend'
          }
          danger={toToggle.status !== 'suspended'}
          loading={setStatus.isPending}
          onClose={() => setToToggle(null)}
          onConfirm={() =>
            setStatus.mutate({
              id: toToggle.id,
              status:
                toToggle.status === 'suspended' ? 'active' : 'suspended',
            })
          }
        >
          <p>
            {toToggle.status === 'suspended' ? (
              <>
                <strong>{toToggle.email}</strong> will be able to sign in again.
              </>
            ) : (
              <>
                <strong>{toToggle.email}</strong> will be blocked from signing in
                until an administrator rehabilitates the account.
              </>
            )}
          </p>
        </ConfirmModal>
      )}
    </Card>
  );
}

/** Admin tab monitoring every escrow: source, type, on-chain contract and balances. */
function EscrowsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'escrows'],
    queryFn: async () => (await api.get<AdminEscrow[]>('/escrows')).data,
  });
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No escrows" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Soroban contract</th>
              <th>Funded</th>
              <th>Released</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((escrow) => (
              <tr key={escrow.id}>
                <td style={{ fontWeight: 600 }}>
                  {escrow.contract?.title ?? escrow.payroll?.name ?? '·'}
                </td>
                <td className="muted">{escrow.type}</td>
                <td className="mono muted">{shortAddress(escrow.trustlessWorkId)}</td>
                <td>{formatUSDC(escrow.fundedAmount)}</td>
                <td>{formatUSDC(escrow.releasedAmount ?? '0')}</td>
                <td>
                  <Badge
                    tone={
                      escrow.status === 'released'
                        ? 'success'
                        : escrow.status === 'disputed'
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {escrow.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/** Admin tab showing the global activity log across the platform. */
function ActivityTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: async () => (await api.get<AdminActivity[]>('/activity-logs/all')).data,
  });
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No activity" />
      ) : (
        <table className="table">
          <tbody>
            {data.map((log) => (
              <tr key={log.id}>
                <td className="mono">{log.event}</td>
                <td className="muted">{log.user?.email}</td>
                <td className="muted">{formatDateTime(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
