import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type {
  ActivityLog,
  AdminMetrics,
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
import {
  AreaChart,
  BarChart,
  CHART_COLORS,
  DonutChart,
  GroupedBarChart,
  TrendChart,
  humanize,
} from '@/components/charts';

/** Activity feed row; the platform-wide feed (admins) also carries the actor. */
type FeedEntry = ActivityLog & { user?: { email: string } | null };

/**
 * Landing dashboard. Administrators get a platform snapshot (KPIs + global
 * activity); operating roles get their contract stats, role-specific metric
 * charts, recent contracts and their own activity feed.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';
  const managesContracts = user?.role === 'company' || user?.role === 'freelancer';

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => (await api.get<ContractListItem[]>('/contracts')).data,
    enabled: managesContracts,
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity', isAdmin],
    queryFn: async () =>
      (
        await api.get<FeedEntry[]>(
          isAdmin ? '/activity-logs/all' : '/activity-logs',
        )
      ).data,
  });

  const { data: summary } = useQuery({
    queryKey: ['metrics', 'summary'],
    queryFn: async () => (await api.get<SummaryMetrics>('/metrics/summary')).data,
    // Role-scoped: administrators use the platform metrics instead.
    enabled: !isAdmin,
  });

  const { data: platform } = useQuery({
    queryKey: ['metrics', 'admin'],
    queryFn: async () => (await api.get<AdminMetrics>('/metrics/admin')).data,
    enabled: isAdmin,
  });

  const active = contracts?.filter((c) => c.status === 'active') ?? [];
  const pending = contracts?.filter((c) => c.status === 'pending_acceptance') ?? [];
  const completed = contracts?.filter((c) => c.status === 'completed') ?? [];
  const lockedAmount = active.reduce((sum, c) => sum + Number(c.totalAmount), 0);

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name ?? user?.email}`}
        subtitle={
          isAdmin
            ? 'Platform supervision · USDC payments on Stellar'
            : `${roleLabel[user!.role]} dashboard · USDC payments on Stellar`
        }
      />

      {isAdmin && platform && (
        <>
          <div className="stats-grid">
            <Stat label="Total users" value={platform.totals.users} />
            <Stat
              label="Active contracts"
              value={platform.totals.activeContracts}
            />
            <Stat
              label="USDC locked in escrow"
              value={formatUSDC(platform.totals.usdcInEscrow)}
            />
            <Stat
              label="Open disputes"
              value={platform.totals.openDisputes}
              tone={platform.totals.openDisputes > 0 ? 'warning' : undefined}
            />
          </div>
          <div className="charts-grid">
            <Card title="Contracts and payrolls per month">
              <GroupedBarChart
                data={platform.contractsPerMonth.map((c, i) => ({
                  label: c.label,
                  contracts: c.value,
                  payrolls: platform.payrollsPerMonth[i]?.value ?? 0,
                }))}
                series={[
                  { key: 'contracts', label: 'Contracts', color: CHART_COLORS[0] },
                  { key: 'payrolls', label: 'Payrolls', color: CHART_COLORS[1] },
                ]}
              />
            </Card>
            <Card title="Funded vs released (USDC)">
              <TrendChart
                data={platform.fundingTrend}
                series={[
                  { key: 'funded', label: 'Funded', color: CHART_COLORS[0] },
                  { key: 'released', label: 'Released', color: CHART_COLORS[2] },
                ]}
                format={formatCompact}
              />
            </Card>
          </div>
        </>
      )}

      {managesContracts && (
        <div className="stats-grid">
          <Stat label="Active contracts" value={active.length} />
          <Stat label="Pending acceptance" value={pending.length} />
          <Stat label="Completed" value={completed.length} />
          <Stat label="USDC in escrow (active)" value={formatUSDC(lockedAmount)} />
        </div>
      )}

      {summary?.role === 'company' && <CompanyCharts metrics={summary} />}
      {summary?.role === 'freelancer' && <FreelancerCharts metrics={summary} />}
      {summary?.role === 'fixed_employee' && (
        <FixedEmployeeView metrics={summary} />
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

      <Card title={isAdmin ? 'Recent platform activity' : 'Recent activity'}>
        {!activity || activity.length === 0 ? (
          <EmptyState title="No activity recorded yet" />
        ) : (
          <table className="table">
            <tbody>
              {activity.slice(0, 8).map((log) => (
                <tr key={log.id}>
                  <td title={log.event}>{activityLabel(log.event)}</td>
                  {isAdmin && <td className="muted">{log.user?.email}</td>}
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
