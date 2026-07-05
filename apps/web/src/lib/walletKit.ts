import { Networks, StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { IS_MAINNET } from '@/lib/network';

/**
 * Stellar Wallets Kit - the self-custodial login path for users who already
 * have a wallet (Freighter, Albedo, xBull, Lobstr, Ledger…). Fully independent
 * of Pollar: this wallet signs its own challenges and its own escrow
 * transactions. Pollar stays the path for users without any crypto wallet.
 */

export const WALLET_NETWORK_PASSPHRASE = IS_MAINNET
  ? Networks.PUBLIC
  : Networks.TESTNET;

/** Which wallet the user logged in with (drives how escrow actions are signed). */
export type WalletSource = 'pollar' | 'swk';
const WALLET_SOURCE_KEY = 'bolpay.walletSource';

/** Persist which wallet the user logged in with. */
export function setWalletSource(source: WalletSource): void {
  localStorage.setItem(WALLET_SOURCE_KEY, source);
}
/** Read the logged-in wallet source, or null when none is stored. */
export function getWalletSource(): WalletSource | null {
  return localStorage.getItem(WALLET_SOURCE_KEY) as WalletSource | null;
}
/** Forget the stored wallet source (used on logout). */
export function clearWalletSource(): void {
  localStorage.removeItem(WALLET_SOURCE_KEY);
}

let initialised = false;

/** Initialise the kit once (idempotent). Call before any kit method. */
export function ensureWalletKit(): typeof StellarWalletsKit {
  if (!initialised) {
    StellarWalletsKit.init({
      network: WALLET_NETWORK_PASSPHRASE,
      modules: defaultModules(),
    });
    initialised = true;
  }
  return StellarWalletsKit;
}
