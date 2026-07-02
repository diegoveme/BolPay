/**
 * Domain label and tone maps that turn backend enum values (roles, contract /
 * milestone / dispute / payroll statuses, activity-log events) into the English
 * display strings and badge tones used across the UI.
 */
import type {
  ContractStatus,
  DisputeStatus,
  MilestoneStatus,
  PayrollStatus,
  UserRole,
} from '@bolpay/shared';

/** Display labels for each user role. */
export const roleLabel: Record<UserRole, string> = {
  company: 'Company',
  freelancer: 'Freelancer',
  fixed_employee: 'Fixed employee',
  administrator: 'Administrator',
};

/** Display labels for each contract status. */
export const contractStatusLabel: Record<ContractStatus, string> = {
  draft: 'Draft',
  pending_acceptance: 'Pending acceptance',
  changes_requested: 'Changes requested',
  accepted: 'Accepted',
  active: 'Active',
  completed: 'Completed',
  rejected: 'Rejected',
};

/** Badge tone (color) for each contract status. */
export const contractStatusTone: Record<ContractStatus, string> = {
  draft: 'neutral',
  pending_acceptance: 'warning',
  changes_requested: 'warning',
  accepted: 'info',
  active: 'info',
  completed: 'success',
  rejected: 'danger',
};

/** Display labels for each milestone status. */
export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  in_review: 'In review',
  approved: 'Approved',
  released: 'Paid',
  disputed: 'Disputed',
};

/** Badge tone (color) for each milestone status. */
export const milestoneStatusTone: Record<MilestoneStatus, string> = {
  pending: 'neutral',
  submitted: 'warning',
  in_review: 'warning',
  approved: 'info',
  released: 'success',
  disputed: 'danger',
};

/** Display labels for each dispute status. */
export const disputeStatusLabel: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** Badge tone (color) for each dispute status. */
export const disputeStatusTone: Record<DisputeStatus, string> = {
  open: 'danger',
  under_review: 'warning',
  escalated: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

/** Display labels for each payroll status. */
export const payrollStatusLabel: Record<PayrollStatus, string> = {
  draft: 'Draft',
  funded: 'Funded',
  active: 'Active',
  paused: 'Paused',
  completed: 'Archived',
};

/** Badge tone (color) for each payroll status. */
export const payrollStatusTone: Record<PayrollStatus, string> = {
  draft: 'neutral',
  funded: 'info',
  active: 'success',
  paused: 'warning',
  completed: 'neutral',
};

/** Human-friendly English labels for activity-log events. */
const ACTIVITY_LABELS: Record<string, string> = {
  'user.registered': 'Created their account',
  'wallet.linked': 'Linked a wallet',
  'invitation.sent': 'Sent an invitation',
  'contract.created': 'Created a contract',
  'contract.sent': 'Sent a contract to the freelancer',
  'contract.accepted': 'Accepted a contract',
  'contract.rejected': 'Rejected a contract',
  'contract.changes_requested': 'Requested changes on a contract',
  'escrow.funded': 'Funded the escrow',
  'deliverable.submitted': 'Submitted a deliverable',
  'milestone.approved': 'Approved a milestone',
  'milestone.changes_requested': 'Requested changes on a deliverable',
  'payment.released': 'Released a payment',
  'dispute.opened': 'Opened a dispute',
  'dispute.escalated': 'Escalated a dispute',
  'dispute.resolved': 'Resolved a dispute',
  'payroll.created': 'Created a payroll',
  'payroll.funded': 'Funded a payroll',
  'payroll.executed': 'Ran the payroll',
};

/** Map an activity-log event key to a readable label, falling back to the key. */
export function activityLabel(event: string): string {
  return ACTIVITY_LABELS[event] ?? event.replace(/[._]/g, ' ');
}
