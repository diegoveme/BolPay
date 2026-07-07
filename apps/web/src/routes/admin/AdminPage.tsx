import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityLog,
  AdminMetrics,
  ContractStatus,
  Escrow,
  User,
  UserRole,
} from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import {
  contractStatusLabel,
  formatCompact,
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
  Field,
  PageHeader,
  SelectField,
  Spinner,
  Stat,
} from '@/components/ui';
import { BarChart, DonutChart, humanize } from '@/components/charts';

type Tab = 'metrics' | 'users' | 'escrows' | 'activity';

const TAB_LABELS: Record<Tab, string> = {
  metrics: 'Metrics',
  users: 'Users',
  escrows: 'Escrows',
  activity: 'Activity',
};

interface AdminEscrow extends Escrow {
  contract?: { id: string; title: string } | null;
  payroll?: { id: string; name: string } | null;
}

interface AdminActivity extends ActivityLog {
  user?: { id: string; email: string; role: string };
}

/** Platform supervision: users, escrow monitor and global activity (docs §Roles). */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('metrics');

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Platform supervision: metrics, users, escrows and global activity"
        actions={
          <div className="row">
            {(['metrics', 'users', 'escrows', 'activity'] as Tab[]).map((t) => (
              <Button
                key={t}
                variant={tab === t ? 'primary' : 'secondary'}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </Button>
            ))}
          </div>
        }
      />
      {tab === 'metrics' && <MetricsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'escrows' && <EscrowsTab />}
      {tab === 'activity' && <ActivityTab />}
    </>
  );
}

/** Admin tab with platform-wide KPIs and charts (docs DFR 9.2). */
function MetricsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => (await api.get<AdminMetrics>('/metrics/admin')).data,
  });

  if (isLoading)
    return (
      <Card>
        <Spinner />
      </Card>
    );
  if (error)
    return (
      <Card>
        <ErrorState message={apiErrorMessage(error)} />
      </Card>
    );
  if (!data) return null;

  const roleLabelFn = (key: string) => roleLabel[key as UserRole] ?? humanize(key);
  const contractLabelFn = (key: string) =>
    contractStatusLabel[key as ContractStatus] ?? humanize(key);

  return (
    <>
      <div className="stats-grid">
        <Stat label="Total users" value={data.totals.users} />
        <Stat label="Active contracts" value={data.totals.activeContracts} />
        <Stat label="USDC in escrow" value={formatUSDC(data.totals.usdcInEscrow)} />
        <Stat
          label="Open disputes"
          value={data.totals.openDisputes}
          tone={data.totals.openDisputes > 0 ? 'warning' : undefined}
        />
      </div>

      <div className="charts-grid">
        <Card title="Contracts created (last 6 months)">
          <BarChart data={data.contractsPerMonth} />
        </Card>
        <Card title="Users by role">
          <DonutChart
            data={data.usersByRole}
            caption="users"
            label={roleLabelFn}
          />
        </Card>
        <Card title="Contracts by status">
          <DonutChart
            data={data.contractsByStatus}
            caption="contracts"
            label={contractLabelFn}
          />
        </Card>
        <Card title="Escrows by status">
          <DonutChart data={data.escrowsByStatus} caption="escrows" />
        </Card>
      </div>

      <Card title="Escrow funding (USDC)">
        <BarChart
          data={[
            { label: 'Funded', value: data.escrowFunding.funded },
            { label: 'Released', value: data.escrowFunding.released },
          ]}
          color="var(--chart-3)"
          format={formatCompact}
        />
      </Card>
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

/** Admin tab showing the global activity log, filterable by user, action and date. */
function ActivityTab() {
  const [userId, setUserId] = useState('');
  const [event, setEvent] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'activity', { userId, event, from, to }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (userId) params.userId = userId;
      if (event.trim()) params.event = event.trim();
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();
      return (
        await api.get<AdminActivity[]>('/activity-logs/all', { params })
      ).data;
    },
  });

  const userOptions = [
    { value: '', label: 'All users' },
    ...(users.data ?? []).map((u) => ({ value: u.id, label: u.email })),
  ];

  const clear = () => {
    setUserId('');
    setEvent('');
    setFrom('');
    setTo('');
  };
  const hasFilters = Boolean(userId || event || from || to);

  return (
    <Card>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <SelectField
          label="User"
          value={userId}
          onChange={setUserId}
          options={userOptions}
        />
        <Field
          label="Action"
          placeholder="e.g. contract, dispute"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        />
        <Field
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Field
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        {hasFilters && (
          <Button variant="secondary" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
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
      </div>
    </Card>
  );
}
