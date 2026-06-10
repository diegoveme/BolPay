import type {
  ContractStatus,
  DisputeStatus,
  MilestoneStatus,
  PayrollStatus,
  UserRole,
} from '@bolpay/shared';

export function formatUSDC(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return String(amount);
  return `${value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export const roleLabel: Record<UserRole, string> = {
  company: 'Empresa',
  freelancer: 'Freelancer',
  fixed_employee: 'Empleado fijo',
  administrator: 'Administrador',
};

export const contractStatusLabel: Record<ContractStatus, string> = {
  draft: 'Borrador',
  pending_acceptance: 'Pendiente de aceptación',
  changes_requested: 'Cambios solicitados',
  accepted: 'Aceptado',
  active: 'Activo',
  completed: 'Completado',
  rejected: 'Rechazado',
};

export const contractStatusTone: Record<ContractStatus, string> = {
  draft: 'neutral',
  pending_acceptance: 'warning',
  changes_requested: 'warning',
  accepted: 'info',
  active: 'info',
  completed: 'success',
  rejected: 'danger',
};

export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  pending: 'Pendiente',
  submitted: 'Entregado',
  in_review: 'En revisión',
  approved: 'Aprobado',
  released: 'Pagado',
  disputed: 'En disputa',
};

export const milestoneStatusTone: Record<MilestoneStatus, string> = {
  pending: 'neutral',
  submitted: 'warning',
  in_review: 'warning',
  approved: 'info',
  released: 'success',
  disputed: 'danger',
};

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  open: 'Abierta',
  under_review: 'En revisión',
  escalated: 'Escalada',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

export const disputeStatusTone: Record<DisputeStatus, string> = {
  open: 'danger',
  under_review: 'warning',
  escalated: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export const payrollStatusLabel: Record<PayrollStatus, string> = {
  draft: 'Borrador',
  funded: 'Fondeada',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Archivada',
};

export const payrollStatusTone: Record<PayrollStatus, string> = {
  draft: 'neutral',
  funded: 'info',
  active: 'success',
  paused: 'warning',
  completed: 'neutral',
};

export function stellarExpertTxUrl(hash: string): string | null {
  if (hash.startsWith('SIM')) return null;
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
