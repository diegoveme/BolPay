/**
 * Pure value formatters for money, dates and addresses. Also re-exports the
 * domain label/tone maps (./labels) and URL helpers (./links) so existing
 * `@/lib/format` imports across the app keep working unchanged.
 */
export * from './labels';
export * from './links';

/** Format a USDC amount with two decimals, or a dot placeholder when empty. */
export function formatUSDC(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '·';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return String(amount);
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

/** Format an ISO date as a short, human-readable date (no time). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '·';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an ISO date as a short date plus the time of day. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '·';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Truncate a Stellar address to its first and last six characters. */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return '·';
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}
