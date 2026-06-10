/**
 * Off-chain domain model interfaces shared between backend and clients.
 * These are the API contract shapes (serialized form: decimals as strings,
 * dates as ISO strings). Mirrors docs/data-model.md.
 */
import type {
  AuthProvider,
  ContractStatus,
  DeliverableStatus,
  DisputeOutcome,
  DisputeStatus,
  EscrowStatus,
  EscrowType,
  InvitationStatus,
  MilestoneStatus,
  NotificationType,
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
  name?: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  /** Stellar G-address of the Pollar-managed wallet (required to operate). */
  stellarAddress?: string | null;
  /** Pollar wallet id (wal_...) when known; used for server-side operations. */
  pollarWalletId?: string | null;
  createdAt: ISODateString;
  companyProfile?: CompanyProfile | null;
  freelancerProfile?: FreelancerProfile | null;
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

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedById: string;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}

export interface Contract {
  id: string;
  companyId: string;
  freelancerId: string;
  title: string;
  description?: string | null;
  totalAmount: DecimalString;
  status: ContractStatus;
  /** Freelancer feedback when requesting changes or rejecting. */
  reviewNote?: string | null;
  deadline?: ISODateString | null;
  acceptedAt?: ISODateString | null;
  completedAt?: ISODateString | null;
  createdAt: ISODateString;
  escrow?: Escrow | null;
  milestones?: Milestone[];
  company?: CompanyProfile;
  freelancer?: FreelancerProfile;
}

export interface Milestone {
  id: string;
  contractId: string;
  /** 0-based position; matches the Trustless Work milestone index. */
  position: number;
  title: string;
  description?: string | null;
  amount: DecimalString;
  deadline?: ISODateString | null;
  status: MilestoneStatus;
  deliverables?: Deliverable[];
}

export interface Deliverable {
  id: string;
  milestoneId: string;
  submittedById: string;
  fileUrl?: string | null;
  linkUrl?: string | null;
  note?: string | null;
  version: number;
  status: DeliverableStatus;
  reviewNote?: string | null;
  submittedAt: ISODateString;
}

export interface Escrow {
  id: string;
  /** Trustless Work engagement/contract id on Stellar (Soroban contract id). */
  trustlessWorkId?: string | null;
  type: EscrowType;
  status: EscrowStatus;
  asset: string;
  fundedAmount?: DecimalString | null;
  releasedAmount?: DecimalString | null;
}

export interface Dispute {
  id: string;
  milestoneId: string;
  openedById: string;
  reason: string;
  status: DisputeStatus;
  outcome?: DisputeOutcome | null;
  /** Amount released to the freelancer when resolved (split supported). */
  freelancerAmount?: DecimalString | null;
  /** Amount refunded to the company when resolved. */
  companyAmount?: DecimalString | null;
  resolution?: string | null;
  resolvedById?: string | null;
  openedAt: ISODateString;
  resolvedAt?: ISODateString | null;
  evidence?: DisputeEvidence[];
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedById: string;
  fileUrl?: string | null;
  comment?: string | null;
  createdAt: ISODateString;
}

export interface Payroll {
  id: string;
  companyId: string;
  name: string;
  frequency: PayrollFrequency;
  status: PayrollStatus;
  nextRun?: ISODateString | null;
  items?: PayrollItem[];
  escrow?: Escrow | null;
}

export interface PayrollItem {
  id: string;
  payrollId: string;
  /** Linked platform user (fixed employee) or null for an external wallet. */
  recipientUserId?: string | null;
  recipientAddress: string;
  recipientLabel?: string | null;
  amount: DecimalString;
}

export interface PayrollExecution {
  id: string;
  payrollId: string;
  executedAt: ISODateString;
  status: PayrollExecutionStatus;
  totalAmount: DecimalString;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  stellarHash?: string | null;
  operation: TransactionOperation;
  amount: DecimalString;
  confirmedAt?: ISODateString | null;
  milestoneId?: string | null;
  payrollItemId?: string | null;
  payrollExecutionId?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  /** Deep-link payload (contractId, milestoneId, disputeId, ...). */
  data?: Record<string, unknown> | null;
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
