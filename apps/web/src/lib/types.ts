/**
 * API response shapes (backend includes) built on top of @bolpay/shared.
 */
import type {
  ActivityLog,
  CompanyProfile,
  Contract,
  Deliverable,
  Dispute,
  DisputeEvidence,
  Escrow,
  FreelancerProfile,
  Invitation,
  Milestone,
  Notification,
  Payroll,
  PayrollExecution,
  PayrollItem,
  Transaction,
  User,
  UserRole,
} from '@bolpay/shared';

/** Minimal user fields embedded in other API responses. */
export interface UserSummary {
  id: string;
  email: string;
  role?: UserRole;
  stellarAddress?: string | null;
  name?: string | null;
}

/** Contract row for list views, with parties, escrow and milestone summaries. */
export interface ContractListItem extends Omit<Contract, 'milestones'> {
  company: CompanyProfile & { user?: UserSummary };
  freelancer: FreelancerProfile & { user?: UserSummary };
  escrow?: (Escrow & { trustlessWorkId?: string | null }) | null;
  milestones: Pick<Milestone, 'id' | 'status' | 'amount'>[];
}

/** Milestone with its deliverables, transactions and disputes. */
export interface MilestoneDetail extends Milestone {
  deliverables: Deliverable[];
  transactions: Transaction[];
  disputes: Dispute[];
}

/** Full contract for the detail view, with parties, escrow and milestones. */
export interface ContractDetail extends Contract {
  company: CompanyProfile & { user: UserSummary };
  freelancer: FreelancerProfile & { user: UserSummary };
  escrow?: Escrow | null;
  milestones: MilestoneDetail[];
}

/** Dispute row for list views, with its milestone, contract and opener. */
export interface DisputeListItem extends Dispute {
  milestone: {
    id: string;
    title: string;
    amount: string;
    contract: { id: string; title: string };
  };
  openedBy: UserSummary;
}

/** Full dispute for the detail view, with milestone, evidence and actors. */
export interface DisputeDetail extends Dispute {
  milestone: MilestoneDetail & {
    contract: ContractDetail;
  };
  evidence: (DisputeEvidence & { submittedBy: UserSummary })[];
  openedBy: UserSummary;
  proposedBy?: UserSummary | null;
  resolvedBy?: UserSummary | null;
}

/** Full payroll for the detail view, with escrow, items and executions. */
export interface PayrollDetail extends Payroll {
  company: { id: string; name: string; userId: string };
  escrow?: Escrow | null;
  items: (PayrollItem & { recipientUser?: UserSummary | null })[];
  executions: (PayrollExecution & { transactions: Transaction[] })[];
}

/** Freelancer directory entry: profile plus its user summary. */
export interface FreelancerDirectoryItem extends FreelancerProfile {
  user: UserSummary;
}

/** Employee directory entry: user summary with a required Stellar address. */
export interface EmployeeDirectoryItem extends UserSummary {
  stellarAddress: string | null;
}

export type { ActivityLog, Invitation, Notification, User };
