/**
 * Single source of truth for the Stellar network BolPay runs on. Driven by
 * VITE_STELLAR_NETWORK so switching testnet -> mainnet is one config change,
 * shared by the wallet kit (walletKit.ts), Pollar (main.tsx) and the explorer
 * links (lib/format.ts). Must match the backend's STELLAR_NETWORK. Anything
 * other than 'mainnet' is treated as testnet.
 */
export const STELLAR_NETWORK =
  (import.meta.env.VITE_STELLAR_NETWORK as string) === 'mainnet'
    ? 'mainnet'
    : 'testnet';

export const IS_MAINNET = STELLAR_NETWORK === 'mainnet';
