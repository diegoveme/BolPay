import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  AdminMetrics,
  CategoryCount,
  CompanyMetrics,
  FixedEmployeeMetrics,
  FreelancerMetrics,
  MetricPoint,
  SummaryMetrics,
} from '@bolpay/shared';
import type { DisputeStatus, EscrowStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth';

/** Escrow states whose funds are still on-chain (counted as "in escrow"). */
const LIVE_ESCROW: EscrowStatus[] = ['funded', 'releasing', 'disputed'];
/** Dispute states that still require attention. */
const OPEN_DISPUTES: DisputeStatus[] = ['open', 'under_review'];

/**
 * Read-only aggregation of platform data into the shapes the dashboard charts
 * consume. Every query is scoped to the caller's role; monetary Decimals are
 * converted to plain numbers and time series are bucketed by month here so the
 * client only renders.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform-wide metrics for administrators. */
  async adminMetrics(): Promise<AdminMetrics> {
    const [
      usersByRole,
      contractsByStatus,
      payrollsByStatus,
      escrowsByStatus,
      escrowFunding,
      openDisputes,
      activeContracts,
      liveEscrow,
      contractDates,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.contract.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.payroll.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.escrow.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.escrow.aggregate({
        _sum: { fundedAmount: true, releasedAmount: true },
      }),
      this.prisma.dispute.count({ where: { status: { in: OPEN_DISPUTES } } }),
      this.prisma.contract.count({ where: { status: 'active' } }),
      this.prisma.escrow.aggregate({
        where: { status: { in: LIVE_ESCROW } },
        _sum: { fundedAmount: true, releasedAmount: true },
      }),
      this.prisma.contract.findMany({ select: { createdAt: true } }),
    ]);

    const funded = num(escrowFunding._sum.fundedAmount);
    const released = num(escrowFunding._sum.releasedAmount);
    const inEscrow =
      num(liveEscrow._sum.fundedAmount) - num(liveEscrow._sum.releasedAmount);

    return {
      totals: {
        users: usersByRole.reduce((sum, r) => sum + r._count._all, 0),
        activeContracts,
        usdcInEscrow: Math.max(0, inEscrow),
        openDisputes,
      },
      usersByRole: toCategories(usersByRole, 'role'),
      contractsByStatus: toCategories(contractsByStatus, 'status'),
      contractsPerMonth: bucketByMonth(
        contractDates.map((c) => ({ date: c.createdAt, value: 1 })),
      ),
      payrollsByStatus: toCategories(payrollsByStatus, 'status'),
      escrowFunding: { funded, released },
      escrowsByStatus: toCategories(escrowsByStatus, 'status'),
    };
  }

  /** Role-scoped summary metrics for the caller's home dashboard. */
  summary(user: AuthUser): Promise<SummaryMetrics> {
    switch (user.role) {
      case 'company':
        return this.companyMetrics(user.id);
      case 'freelancer':
        return this.freelancerMetrics(user.id);
      case 'fixed_employee':
        return this.fixedEmployeeMetrics(user.id);
      default:
        throw new ForbiddenException(
          'No personal metrics for this role; use /metrics/admin',
        );
    }
  }

  // -- Per-role summaries -----------------------------------------------------

  private async companyMetrics(userId: string): Promise<CompanyMetrics> {
    const company = await this.requireProfileId('companyProfile', userId);

    const [contractsByStatus, activeContracts, escrows, executions] =
      await Promise.all([
        this.prisma.contract.groupBy({
          by: ['status'],
          where: { companyId: company },
          _count: { _all: true },
        }),
        this.prisma.contract.count({
          where: { companyId: company, status: 'active' },
        }),
        this.prisma.escrow.findMany({
          where: {
            status: { in: LIVE_ESCROW },
            OR: [
              { contract: { companyId: company } },
              { payroll: { companyId: company } },
            ],
          },
          select: { fundedAmount: true, releasedAmount: true },
        }),
        this.prisma.payrollExecution.findMany({
          where: {
            payroll: { companyId: company },
            status: { in: ['succeeded', 'partial'] },
          },
          select: { executedAt: true, totalAmount: true },
          orderBy: { executedAt: 'asc' },
        }),
      ]);

    const inEscrow = escrows.reduce(
      (sum, e) => sum + num(e.fundedAmount) - num(e.releasedAmount),
      0,
    );

    return {
      role: 'company',
      totals: {
        activeContracts,
        usdcInEscrow: Math.max(0, inEscrow),
        payrollDistributed: executions.reduce(
          (sum, e) => sum + num(e.totalAmount),
          0,
        ),
      },
      contractsByStatus: toCategories(contractsByStatus, 'status'),
      payrollPerCycle: executions.slice(-8).map((e) => ({
        label: shortDate(e.executedAt),
        value: num(e.totalAmount),
      })),
    };
  }

  private async freelancerMetrics(
    userId: string,
  ): Promise<FreelancerMetrics> {
    const freelancer = await this.requireProfileId('freelancerProfile', userId);

    const [activeContracts, milestonesByStatus, pending, releases] =
      await Promise.all([
        this.prisma.contract.count({
          where: { freelancerId: freelancer, status: 'active' },
        }),
        this.prisma.milestone.groupBy({
          by: ['status'],
          where: { contract: { freelancerId: freelancer } },
          _count: { _all: true },
        }),
        this.prisma.milestone.aggregate({
          where: {
            contract: { freelancerId: freelancer },
            status: { not: 'released' },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.findMany({
          where: {
            operation: 'release',
            milestone: { contract: { freelancerId: freelancer } },
          },
          select: { createdAt: true, amount: true },
        }),
      ]);

    return {
      role: 'freelancer',
      totals: {
        activeContracts,
        totalEarned: releases.reduce((sum, t) => sum + num(t.amount), 0),
        pendingValue: num(pending._sum.amount),
      },
      earningsPerMonth: bucketByMonth(
        releases.map((t) => ({ date: t.createdAt, value: num(t.amount) })),
      ),
      milestonesByStatus: toCategories(milestonesByStatus, 'status'),
    };
  }

  private async fixedEmployeeMetrics(
    userId: string,
  ): Promise<FixedEmployeeMetrics> {
    const [payments, nextPayroll] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          operation: 'payroll_distribution',
          payrollItem: { recipientUserId: userId },
        },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.payroll.findFirst({
        where: {
          status: 'active',
          nextRun: { not: null },
          items: { some: { recipientUserId: userId } },
        },
        orderBy: { nextRun: 'asc' },
        select: { nextRun: true },
      }),
    ]);

    return {
      role: 'fixed_employee',
      totals: {
        totalReceived: payments.reduce((sum, t) => sum + num(t.amount), 0),
        paymentsCount: payments.length,
        nextRun: nextPayroll?.nextRun?.toISOString() ?? null,
      },
      paymentsPerMonth: bucketByMonth(
        payments.map((t) => ({ date: t.createdAt, value: num(t.amount) })),
      ),
    };
  }

  /** Resolve the caller's company/freelancer profile id, or fail. */
  private async requireProfileId(
    profile: 'companyProfile' | 'freelancerProfile',
    userId: string,
  ): Promise<string> {
    const row =
      profile === 'companyProfile'
        ? await this.prisma.companyProfile.findUnique({
            where: { userId },
            select: { id: true },
          })
        : await this.prisma.freelancerProfile.findUnique({
            where: { userId },
            select: { id: true },
          });
    if (!row) throw new ForbiddenException('Profile required');
    return row.id;
  }
}

// -- Helpers ------------------------------------------------------------------

/** Convert a nullable Prisma Decimal to a plain number (0 when absent). */
function num(value: Prisma.Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}

/** Map a Prisma groupBy result into the shared CategoryCount shape. */
function toCategories<K extends string>(
  rows: ({ _count: { _all: number } } & Record<K, string>)[],
  key: K,
): CategoryCount[] {
  return rows.map((row) => ({ key: row[key], value: row._count._all }));
}

/** Format a date as a short "Mon D" label for cycle axes. */
function shortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Bucket dated values into the last `months` calendar months, summing values
 * that land in the same month. Empty months are kept so the series is dense.
 */
function bucketByMonth(
  items: { date: Date; value: number }[],
  months = 6,
): MetricPoint[] {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      value: 0,
    };
  });
  const index = new Map(buckets.map((b, i) => [b.key, i]));

  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    const i = index.get(key);
    if (i !== undefined) buckets[i].value += item.value;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}
