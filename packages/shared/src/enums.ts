/**
 * Domain enumerations shared across backend and clients.
 * Mirrors docs/data-model.md §4. Keep values in sync with the Prisma schema.
 */

export const UserRole = {
  Company: 'company',
  Freelancer: 'freelancer',
  FixedEmployee: 'fixed_employee',
  Administrator: 'administrator',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ContractStatus = {
  Draft: 'draft',
  Accepted: 'accepted',
  Active: 'active',
  Completed: 'completed',
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const MilestoneStatus = {
  Pending: 'pending',
  Submitted: 'submitted',
  InReview: 'in_review',
  Approved: 'approved',
  Released: 'released',
  Disputed: 'disputed',
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const EscrowType = {
  Contract: 'contract',
  Payroll: 'payroll',
} as const;
export type EscrowType = (typeof EscrowType)[keyof typeof EscrowType];

export const EscrowStatus = {
  Created: 'created',
  Funded: 'funded',
  Releasing: 'releasing',
  Released: 'released',
  Closed: 'closed',
} as const;
export type EscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus];

export const DisputeStatus = {
  Open: 'open',
  UnderReview: 'under_review',
  Resolved: 'resolved',
  Escalated: 'escalated',
  Closed: 'closed',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const PayrollFrequency = {
  Weekly: 'weekly',
  Biweekly: 'biweekly',
  Monthly: 'monthly',
} as const;
export type PayrollFrequency = (typeof PayrollFrequency)[keyof typeof PayrollFrequency];

export const PayrollStatus = {
  Draft: 'draft',
  Funded: 'funded',
  Active: 'active',
  Paused: 'paused',
  Completed: 'completed',
} as const;
export type PayrollStatus = (typeof PayrollStatus)[keyof typeof PayrollStatus];

export const PayrollExecutionStatus = {
  Pending: 'pending',
  Succeeded: 'succeeded',
  Failed: 'failed',
  Partial: 'partial',
} as const;
export type PayrollExecutionStatus =
  (typeof PayrollExecutionStatus)[keyof typeof PayrollExecutionStatus];

export const TransactionOperation = {
  Fund: 'fund',
  Release: 'release',
  Refund: 'refund',
  PayrollDistribution: 'payroll_distribution',
} as const;
export type TransactionOperation =
  (typeof TransactionOperation)[keyof typeof TransactionOperation];
