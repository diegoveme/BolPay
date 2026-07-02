import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { MilestoneDetail } from '@/lib/types';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { useWalletSign } from '@/lib/useWalletSign';
import { Button, Modal, TextareaField } from '@/components/ui';

/**
 * Modal for a party to open a dispute on a milestone. Trustless Work only lets
 * a party open it, so the opener signs the dispute XDR with their wallet.
 */
export function OpenDisputeModal({
  milestone,
  onClose,
  onDone,
}: {
  milestone: MilestoneDetail;
  onClose: () => void;
  onDone: (disputeId: string) => void;
}) {
  const { pushToast } = useNotificationsUi();
  const sign = useWalletSign();
  const [reason, setReason] = useState('');

  const open = useMutation({
    mutationFn: async () => {
      // TW only lets a PARTY open a dispute, so the opener signs it. Null XDR in
      // simulated mode (nothing to sign).
      const prep = await api.post<{ disputeXdr: string | null }>(
        '/disputes/prepare',
        { milestoneId: milestone.id, reason },
      );
      if (prep.data.disputeXdr) await sign(prep.data.disputeXdr);
      return (
        await api.post<{ id: string }>('/disputes', {
          milestoneId: milestone.id,
          reason,
        })
      ).data;
    },
    onSuccess: (data) => onDone(data.id),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  return (
    <Modal title={`Open dispute · ${milestone.title}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        The milestone is paused and the funds stay locked in the escrow until there
        is a mutual resolution or an administrator steps in.
      </p>
      <TextareaField
        label="Reason (minimum 10 characters)"
        value={reason}
        onChange={setReason}
        placeholder="Describe the problem…"
      />
      <Button
        variant="danger"
        loading={open.isPending}
        disabled={reason.trim().length < 10}
        onClick={() => open.mutate()}
      >
        Open dispute
      </Button>
    </Modal>
  );
}
