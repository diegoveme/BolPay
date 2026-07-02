import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ActivityLog } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';
import type { ContractListItem } from '@/lib/types';
import { activityLabel, formatDateTime, formatUSDC, roleLabel } from '@/lib/format';
import { Card, EmptyState, PageHeader, Spinner, Stat } from '@/components/ui';

/**
 * Landing dashboard: greets the user, shows contract summary stats (for roles
 * that manage contracts), recent contracts, and a recent activity feed.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const managesContracts = user?.role !== 'fixed_employee';

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => (await api.get<ContractListItem[]>('/contracts')).data,
    enabled: managesContracts,
  });

  const { data: activity } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => (await api.get<ActivityLog[]>('/activity-logs')).data,
  });

  const active = contracts?.filter((c) => c.status === 'active') ?? [];
  const pending = contracts?.filter((c) => c.status === 'pending_acceptance') ?? [];
  const completed = contracts?.filter((c) => c.status === 'completed') ?? [];
  const lockedAmount = active.reduce((sum, c) => sum + Number(c.totalAmount), 0);

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name ?? user?.email}`}
        subtitle={`${roleLabel[user!.role]} dashboard · USDC payments on Stellar`}
      />

      {managesContracts && (
        <div className="stats-grid">
          <Stat label="Active contracts" value={active.length} />
          <Stat label="Pending acceptance" value={pending.length} />
          <Stat label="Completed" value={completed.length} />
          <Stat label="USDC in escrow (active)" value={formatUSDC(lockedAmount)} />
        </div>
      )}

      {managesContracts && (
        <Card title="Recent contracts">
          {isLoading ? (
            <Spinner />
          ) : !contracts || contracts.length === 0 ? (
            <EmptyState
              title="No contracts yet"
              hint={
                user?.role === 'company'
                  ? 'Create your first contract from the Contracts section.'
                  : 'When a company sends you a contract it will show up here.'
              }
            />
          ) : (
            <table className="table">
              <tbody>
                {contracts.slice(0, 5).map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <Link to={`/contracts/${contract.id}`} style={{ fontWeight: 600 }}>
                        {contract.title}
                      </Link>
                    </td>
                    <td className="muted">
                      {user?.role === 'freelancer'
                        ? contract.company.name
                        : contract.freelancer.displayName}
                    </td>
                    <td>{formatUSDC(contract.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card title="Recent activity">
        {!activity || activity.length === 0 ? (
          <EmptyState title="No activity recorded yet" />
        ) : (
          <table className="table">
            <tbody>
              {activity.slice(0, 8).map((log) => (
                <tr key={log.id}>
                  <td>{activityLabel(log.event)}</td>
                  <td className="muted">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
