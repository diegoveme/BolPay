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

/**
 * Account standing. Administrators can suspend an account (it can no longer
 * sign in) and rehabilitate it back to active.
 */
export const UserStatus = {
  Active: 'active',
  Suspended: 'suspended',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * Identity provider the user authenticated with. Pollar handles the actual
 * OAuth / OTP flow client-side; the backend only records which one was used.
 */
export const AuthProvider = {
  Google: 'google',
  Github: 'github',
  Discord: 'discord',
  Email: 'email',
  Wallet: 'wallet',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const ContractStatus = {
  /** Editable by the company; not visible to the freelancer yet. */
  Draft: 'draft',
  /** Sent to the freelancer, awaiting their decision. */
  PendingAcceptance: 'pending_acceptance',
  /** Freelancer asked for modifications; company may edit and re-send. */
  ChangesRequested: 'changes_requested',
  /** Freelancer accepted; escrow is being created/funded. */
  Accepted: 'accepted',
  /** Escrow funded; work in progress. */
  Active: 'active',
  /** Every milestone released. */
  Completed: 'completed',
  /** Freelancer declined the contract. */
  Rejected: 'rejected',
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

export const DeliverableStatus = {
  Submitted: 'submitted',
  ChangesRequested: 'changes_requested',
  Approved: 'approved',
} as const;
export type DeliverableStatus = (typeof DeliverableStatus)[keyof typeof DeliverableStatus];

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
  Disputed: 'disputed',
  Closed: 'closed',
} as const;
export type EscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus];

export const DisputeStatus = {
  Open: 'open',
  UnderReview: 'under_review',
  Escalated: 'escalated',
  Resolved: 'resolved',
  Closed: 'closed',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

/** How a resolved dispute splits the milestone funds. */
export const DisputeOutcome = {
  ReleaseToFreelancer: 'release_to_freelancer',
  RefundToCompany: 'refund_to_company',
  Split: 'split',
} as const;
export type DisputeOutcome = (typeof DisputeOutcome)[keyof typeof DisputeOutcome];

export const InvitationStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Revoked: 'revoked',
  Expired: 'expired',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

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

/**
 * Notification types emitted by the backend (docs/proyecto_overview.md §7).
 * The client maps these to icons / deep links.
 */
export const NotificationType = {
  ContractReceived: 'contract_received',
  ContractAccepted: 'contract_accepted',
  ContractRejected: 'contract_rejected',
  ContractChangesRequested: 'contract_changes_requested',
  DeliverableSubmitted: 'deliverable_submitted',
  DeliverableApproved: 'deliverable_approved',
  DeliverableChangesRequested: 'deliverable_changes_requested',
  PaymentReleased: 'payment_released',
  DisputeOpened: 'dispute_opened',
  DisputeResolved: 'dispute_resolved',
  DisputeEscalated: 'dispute_escalated',
  PayrollExecuted: 'payroll_executed',
  PayrollPaymentReceived: 'payroll_payment_received',
  InvitationReceived: 'invitation_received',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
