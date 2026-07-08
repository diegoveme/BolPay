/**
 * Aggregated metrics contracts returned by GET /metrics/* and consumed by the
 * dashboard charts. All monetary values are plain USDC numbers (Decimals are
 * converted server-side); time series are bucketed into the last months.
 */

/** A single point in a time series or bar chart (a labelled value). */
export interface MetricPoint {
  /** Human-readable label for the bucket (e.g. a month name or a date). */
  label: string;
  value: number;
}

/** A named slice of a categorical breakdown (pie/donut or ranked bars). */
export interface CategoryCount {
  /** Raw category key (an enum value such as a role or status). */
  key: string;
  value: number;
}

/** A month bucket with the funded and released USDC totals for that month. */
export interface FundingPoint {
  label: string;
  funded: number;
  released: number;
}

/** Platform-wide metrics for the administrator dashboard (GET /metrics/admin). */
export interface AdminMetrics {
  totals: {
    users: number;
    activeContracts: number;
    /** USDC still locked in escrow (funded minus released). */
    usdcInEscrow: number;
    openDisputes: number;
  };
  usersByRole: CategoryCount[];
  contractsByStatus: CategoryCount[];
  /** Contracts created per month over the recent window. */
  contractsPerMonth: MetricPoint[];
  /** Payrolls created per month, aligned to the same months as contracts. */
  payrollsPerMonth: MetricPoint[];
  payrollsByStatus: CategoryCount[];
  escrowFunding: { funded: number; released: number };
  /** Funded vs released USDC per month (escrow funding trend). */
  fundingTrend: FundingPoint[];
  escrowsByStatus: CategoryCount[];
}

/** Company owner metrics (GET /metrics/summary when role = company). */
export interface CompanyMetrics {
  role: 'company';
  totals: {
    activeContracts: number;
    usdcInEscrow: number;
    /** Total distributed across every payroll cycle run so far. */
    payrollDistributed: number;
  };
  contractsByStatus: CategoryCount[];
  /** Amount distributed per payroll execution (most recent cycles). */
  payrollPerCycle: MetricPoint[];
  /** Funded vs released USDC per month across the company's escrows. */
  fundingTrend: FundingPoint[];
}

/** Freelancer metrics (GET /metrics/summary when role = freelancer). */
export interface FreelancerMetrics {
  role: 'freelancer';
  totals: {
    activeContracts: number;
    /** USDC released to the freelancer to date. */
    totalEarned: number;
    /** USDC committed in milestones not yet released. */
    pendingValue: number;
  };
  earningsPerMonth: MetricPoint[];
  milestonesByStatus: CategoryCount[];
}

/** Fixed-employee metrics (GET /metrics/summary when role = fixed_employee). */
export interface FixedEmployeeMetrics {
  role: 'fixed_employee';
  totals: {
    /** USDC received across every payroll distribution. */
    totalReceived: number;
    paymentsCount: number;
    /** ISO date of the next scheduled payroll run, if any. */
    nextRun: string | null;
  };
  paymentsPerMonth: MetricPoint[];
}

/** Role-scoped summary metrics returned by GET /metrics/summary. */
export type SummaryMetrics =
  | CompanyMetrics
  | FreelancerMetrics
  | FixedEmployeeMetrics;
