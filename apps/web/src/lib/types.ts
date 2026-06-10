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

export interface UserSummary {
  id: string;
  email: string;
  role?: UserRole;
  stellarAddress?: string | null;
  name?: string | null;
}

export interface ContractListItem extends Omit<Contract, 'milestones'> {
  company: CompanyProfile & { user?: UserSummary };
  freelancer: FreelancerProfile & { user?: UserSummary };
  escrow?: (Escrow & { trustlessWorkId?: string | null }) | null;
  milestones: Pick<Milestone, 'id' | 'status' | 'amount'>[];
}

export interface MilestoneDetail extends Milestone {
  deliverables: Deliverable[];
  transactions: Transaction[];
  disputes: Dispute[];
}

export interface ContractDetail extends Contract {
  company: CompanyProfile & { user: UserSummary };
  freelancer: FreelancerProfile & { user: UserSummary };
  escrow?: Escrow | null;
  milestones: MilestoneDetail[];
}

export interface DisputeListItem extends Dispute {
  milestone: {
    id: string;
    title: string;
    amount: string;
    contract: { id: string; title: string };
  };
  openedBy: UserSummary;
}

export interface DisputeDetail extends Dispute {
  milestone: MilestoneDetail & {
    contract: ContractDetail;
  };
  evidence: (DisputeEvidence & { submittedBy: UserSummary })[];
  openedBy: UserSummary;
  resolvedBy?: UserSummary | null;
}

export interface PayrollDetail extends Payroll {
  company: { id: string; name: string; userId: string };
  escrow?: Escrow | null;
  items: (PayrollItem & { recipientUser?: UserSummary | null })[];
  executions: (PayrollExecution & { transactions: Transaction[] })[];
}

export interface FreelancerDirectoryItem extends FreelancerProfile {
  user: UserSummary;
}

export interface EmployeeDirectoryItem extends UserSummary {
  stellarAddress: string | null;
}

export type { ActivityLog, Invitation, Notification, User };
