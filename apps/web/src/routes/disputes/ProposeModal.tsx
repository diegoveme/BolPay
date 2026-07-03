import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DisputeOutcome } from '@bolpay/shared';
import { api, apiErrorMessage } from '@/lib/api';
import type { DisputeDetail } from '@/lib/types';
import { formatUSDC } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Button,
  Field,
  Modal,
  SelectField,
  TextareaField,
} from '@/components/ui';

/**
 * Modal where a party proposes (or counter-proposes) how the disputed funds are
 * split. The other party must accept the proposal before anything settles on the
 * escrow, so proposing never moves money by itself.
 */
export function ProposeModal({
  dispute,
  onClose,
  onDone,
}: {
  dispute: DisputeDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const { pushToast } = useNotificationsUi();
  // Prefill from the standing proposal so counter-proposing tweaks it instead of
  // starting from scratch.
  const [outcome, setOutcome] = useState<DisputeOutcome>(
    dispute.proposalOutcome ?? DisputeOutcome.ReleaseToFreelancer,
  );
  const [freelancerAmount, setFreelancerAmount] = useState(
    dispute.proposalFreelancerAmount ?? '',
  );
  const [companyAmount, setCompanyAmount] = useState(
    dispute.proposalCompanyAmount ?? '',
  );
  const [resolution, setResolution] = useState(dispute.proposalNote ?? '');

  const propose = useMutation({
    mutationFn: async () =>
      api.post(`/disputes/${dispute.id}/propose`, {
        outcome,
        resolution: resolution.trim() || undefined,
        ...(outcome === DisputeOutcome.Split
          ? { freelancerAmount, companyAmount }
          : {}),
      }),
    onSuccess: onDone,
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const milestoneAmount = Number(dispute.milestone.amount);
  const splitOk =
    outcome !== DisputeOutcome.Split ||
    Number(freelancerAmount) + Number(companyAmount) === milestoneAmount;
  const isCounter = Boolean(dispute.proposedById);

  return (
    <Modal
      title={isCounter ? 'Counter-propose' : 'Propose a resolution'}
      onClose={onClose}
    >
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        The other party has to accept this before it runs on the escrow (
        {formatUSDC(dispute.milestone.amount)}).
      </p>
      <SelectField
        label="Outcome"
        value={outcome}
        onChange={(value) => setOutcome(value as DisputeOutcome)}
        options={[
          {
            value: DisputeOutcome.ReleaseToFreelancer,
            label: 'Release everything to the freelancer',
          },
          {
            value: DisputeOutcome.RefundToCompany,
            label: 'Refund everything to the company',
          },
          { value: DisputeOutcome.Split, label: 'Split the amount' },
        ]}
      />
      {outcome === DisputeOutcome.Split && (
        <div className="form-grid">
          <Field
            label="For the freelancer (USDC)"
            type="number"
            min="0"
            step="0.01"
            value={freelancerAmount}
            onChange={(e) => setFreelancerAmount(e.target.value)}
          />
          <Field
            label="For the company (USDC)"
            type="number"
            min="0"
            step="0.01"
            value={companyAmount}
            onChange={(e) => setCompanyAmount(e.target.value)}
            error={
              splitOk
                ? undefined
                : `The total must be ${formatUSDC(milestoneAmount)}`
            }
          />
        </div>
      )}
      <TextareaField
        label="Agreement / justification"
        value={resolution}
        onChange={setResolution}
      />
      <Button
        loading={propose.isPending}
        disabled={!splitOk}
        onClick={() => propose.mutate()}
      >
        {isCounter ? 'Send counter-proposal' : 'Send proposal'}
      </Button>
    </Modal>
  );
}
