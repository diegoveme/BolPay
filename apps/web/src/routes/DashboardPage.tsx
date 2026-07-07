import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type {
  ActivityLog,
  CompanyMetrics,
  ContractStatus,
  FixedEmployeeMetrics,
  FreelancerMetrics,
  MilestoneStatus,
  SummaryMetrics,
} from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';
import type { ContractListItem } from '@/lib/types';
import {
  activityLabel,
  contractStatusLabel,
  formatCompact,
  formatDate,
  formatDateTime,
  formatUSDC,
  milestoneStatusLabel,
  roleLabel,
} from '@/lib/format';
import { Card, EmptyState, PageHeader, Spinner, Stat } from '@/components/ui';
import { AreaChart, BarChart, DonutChart, humanize } from '@/components/charts';

/**
 * Landing dashboard: greets the user, shows contract summary stats (for roles
 * that manage contracts), role-specific metric charts, recent contracts, and a
 * recent activity feed.
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

  const { data: metrics } = useQuery({
    queryKey: ['metrics', 'summary'],
    queryFn: async () => (await api.get<SummaryMetrics>('/metrics/summary')).data,
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

      {metrics?.role === 'company' && <CompanyCharts metrics={metrics} />}
      {metrics?.role === 'freelancer' && <FreelancerCharts metrics={metrics} />}
      {metrics?.role === 'fixed_employee' && (
        <FixedEmployeeView metrics={metrics} />
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

/** Company charts: contract mix and payroll spend per cycle. */
function CompanyCharts({ metrics }: { metrics: CompanyMetrics }) {
  return (
    <div className="charts-grid">
      <Card title="Contracts by status">
        <DonutChart
          data={metrics.contractsByStatus}
          caption="contracts"
          label={(key) =>
            contractStatusLabel[key as ContractStatus] ?? humanize(key)
          }
        />
      </Card>
      <Card title="Payroll distributed per cycle">
        <BarChart
          data={metrics.payrollPerCycle}
          color="var(--chart-2)"
          format={formatCompact}
        />
      </Card>
    </div>
  );
}

/** Freelancer charts: earnings over time and milestone mix. */
function FreelancerCharts({ metrics }: { metrics: FreelancerMetrics }) {
  return (
    <div className="charts-grid">
      <Card title="Earnings (last 6 months)">
        <AreaChart data={metrics.earningsPerMonth} format={formatCompact} />
      </Card>
      <Card title="Milestones by status">
        <DonutChart
          data={metrics.milestonesByStatus}
          caption="milestones"
          label={(key) =>
            milestoneStatusLabel[key as MilestoneStatus] ?? humanize(key)
          }
        />
      </Card>
    </div>
  );
}

/** Fixed-employee view: payout tiles and payments received over time. */
function FixedEmployeeView({ metrics }: { metrics: FixedEmployeeMetrics }) {
  return (
    <>
      <div className="stats-grid">
        <Stat
          label="Total received"
          value={formatUSDC(metrics.totals.totalReceived)}
        />
        <Stat label="Payments received" value={metrics.totals.paymentsCount} />
        <Stat
          label="Next payroll"
          value={metrics.totals.nextRun ? formatDate(metrics.totals.nextRun) : '·'}
        />
      </div>
      <Card title="Payments received (last 6 months)">
        <BarChart
          data={metrics.paymentsPerMonth}
          color="var(--chart-3)"
          format={formatCompact}
        />
      </Card>
    </>
  );
}
