/**
 * URL helpers: a guard that only lets http(s) links through (defends against
 * user-controlled `javascript:` / `data:` URIs) and a builder for stellar.expert
 * explorer links to escrow transactions.
 */
import { IS_MAINNET } from '@/lib/network';

/**
 * Returns the URL only if it is an http(s) link, else undefined. Guards against
 * user-controlled `javascript:` / `data:` URIs in href/src (stored XSS).
 */
export function safeHttpUrl(url?: string | null): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

/** Build a stellar.expert explorer link for a tx hash (null for simulated txs). */
export function stellarTxUrl(hash: string): string | null {
  if (hash.startsWith('SIM')) return null;
  // stellar.expert indexes Soroban contract invocations (the escrow txs) and
  // follows the network. Switches to mainnet automatically with the env.
  const network = IS_MAINNET ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}
