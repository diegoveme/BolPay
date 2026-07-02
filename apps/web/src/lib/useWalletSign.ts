import { usePollar } from '@pollar/react';
import { api } from '@/lib/api';
import {
  ensureWalletKit,
  getWalletSource,
  WALLET_NETWORK_PASSPHRASE,
} from '@/lib/walletKit';

/**
 * Sign + submit an unsigned Stellar XDR with whatever wallet the user logged in
 * with, so each party signs its OWN escrow actions (fund / approve / release /
 * deliver). BolPay never holds or signs for anyone's money.
 *
 *  - Pollar (custodial): `signAndSubmitTx` signs AND broadcasts client-side.
 *  - Stellar Wallets Kit (self-custodial: Freighter, Albedo, xBull, Lobstr…):
 *    the wallet signs, and we relay the signed XDR through the backend (which
 *    holds the Trustless Work API key) to broadcast it.
 *
 * Returns the on-chain transaction hash. Throws on rejection / failure.
 */
export function useWalletSign() {
  const pollar = usePollar();

  return async function signAndSubmit(unsignedXdr: string): Promise<string> {
    if (getWalletSource() === 'swk') {
      const kit = ensureWalletKit();
      const { address } = await kit.getAddress();
      const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
        address,
        networkPassphrase: WALLET_NETWORK_PASSPHRASE,
      });
      const { data } = await api.post<{ txHash: string }>('/escrows/submit', {
        signedXdr: signedTxXdr,
      });
      return data.txHash;
    }

    const outcome = await pollar.signAndSubmitTx(unsignedXdr);
    if (outcome.status === 'error') {
      throw new Error(
        outcome.details ?? 'Could not sign and submit the transaction',
      );
    }
    return outcome.hash;
  };
}
