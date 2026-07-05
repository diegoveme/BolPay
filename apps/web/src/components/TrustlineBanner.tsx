import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePollar } from '@pollar/react';
import { api, apiErrorMessage } from '@/lib/api';
import {
  ensureWalletKit,
  getWalletSource,
  WALLET_NETWORK_PASSPHRASE,
} from '@/lib/walletKit';
import { Button } from '@/components/ui';

interface TrustlineStatus {
  funded: boolean;
  hasTrustline: boolean;
}

/**
 * Reminder shown until the wallet trusts USDC. A Stellar account cannot hold or
 * receive USDC without a trustline, so without it the wallet can neither fund
 * nor be paid from an escrow. Works for both wallet types: Pollar signs and
 * submits client-side; a self-custodial wallet (SWK) signs and we broadcast the
 * changeTrust through the backend.
 */
export function TrustlineBanner({ address }: { address: string }) {
  const pollar = usePollar();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['usdc-trustline', address],
    queryFn: async () =>
      (
        await api.get<TrustlineStatus>('/escrows/usdc-trustline', {
          params: { address },
        })
      ).data,
    staleTime: 60_000,
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: prep } = await api.post<{ unsignedXdr: string }>(
        '/escrows/usdc-trustline/prepare',
        { address },
      );
      if (getWalletSource() === 'swk') {
        const kit = ensureWalletKit();
        const { signedTxXdr } = await kit.signTransaction(prep.unsignedXdr, {
          address,
          networkPassphrase: WALLET_NETWORK_PASSPHRASE,
        });
        await api.post('/escrows/usdc-trustline/submit', {
          signedXdr: signedTxXdr,
        });
      } else {
        const outcome = await pollar.signAndSubmitTx(prep.unsignedXdr);
        if (outcome.status === 'error') {
          throw new Error(outcome.details ?? 'Could not enable USDC');
        }
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['usdc-trustline', address] }),
  });

  // Show only once we know the wallet is missing the USDC trustline.
  if (!data || data.hasTrustline) return null;

  return (
    <div className="verify-banner">
      <span>
        Your wallet cannot send or receive USDC payments yet. Enable the asset
        (USDC trustline) so you can fund and get paid from the escrow.
      </span>
      {add.isError && (
        <span className="field__error" style={{ margin: 0 }}>
          {apiErrorMessage(add.error)}
        </span>
      )}
      <Button
        variant="ghost"
        onClick={() => add.mutate()}
        loading={add.isPending}
      >
        Enable USDC
      </Button>
    </div>
  );
}
