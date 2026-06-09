/**
 * Off-chain domain model interfaces shared between backend and clients.
 * These are the API contract shapes (serialized form: decimals as strings,
 * dates as ISO strings). Mirrors docs/data-model.md.
 */
import type {
  ContractStatus,
  DisputeStatus,
  EscrowStatus,
  EscrowType,
  MilestoneStatus,
  PayrollExecutionStatus,
  PayrollFrequency,
  PayrollStatus,
  TransactionOperation,
  UserRole,
} from './enums.js';

/** ISO-8601 timestamp string (e.g. "2026-06-09T12:00:00.000Z"). */
export type ISODateString = string;

/** Decimal amount serialized as a string to avoid float precision loss. */
export type DecimalString = string;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: ISODateString;
}

export interface Wallet {
  id: string;
  userId: string;
  stellarAddress: string;
  isPrimary: boolean;
}

export interface CompanyProfile {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
}

export interface FreelancerProfile {
  id: string;
  userId: string;
  displayName: string;
  headline?: string | null;
}

export interface Contract {
  id: string;
  companyId: string;
  freelancerId: string;
  title: string;
  description?: string | null;
  totalAmount: DecimalString;
  status: ContractStatus;
  createdAt: ISODateString;
}

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  amount: DecimalString;
  deadline?: ISODateString | null;
  status: MilestoneStatus;
}

export interface Deliverable {
  id: string;
  milestoneId: string;
  fileUrl?: string | null;
  linkUrl?: string | null;
  version: number;
  submittedAt: ISODateString;
}

export interface Escrow {
  id: string;
  trustlessWorkId?: string | null;
  type: EscrowType;
  status: EscrowStatus;
  fundedAmount?: DecimalString | null;
}

export interface Dispute {
  id: string;
  milestoneId: string;
  openedById: string;
  status: DisputeStatus;
  resolution?: string | null;
  openedAt: ISODateString;
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedById: string;
  fileUrl?: string | null;
  comment?: string | null;
}

export interface Payroll {
  id: string;
  companyId: string;
  frequency: PayrollFrequency;
  status: PayrollStatus;
  nextRun?: ISODateString | null;
}

export interface PayrollItem {
  id: string;
  payrollId: string;
  recipientAddress: string;
  amount: DecimalString;
}

export interface PayrollExecution {
  id: string;
  payrollId: string;
  executedAt: ISODateString;
  status: PayrollExecutionStatus;
}

export interface Transaction {
  id: string;
  stellarHash?: string | null;
  operation: TransactionOperation;
  amount: DecimalString;
  confirmedAt?: ISODateString | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: ISODateString;
}

export interface ActivityLog {
  id: string;
  userId: string;
  event: string;
  metadata?: Record<string, unknown> | null;
  createdAt: ISODateString;
}
