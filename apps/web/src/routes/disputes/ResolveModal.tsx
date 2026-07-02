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

/** Modal where the counterparty accepts the agreed fund split and executes it on the escrow. */
export function ResolveModal({
  dispute,
  onClose,
  onDone,
}: {
  dispute: DisputeDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const { pushToast } = useNotificationsUi();
  const [outcome, setOutcome] = useState<DisputeOutcome>(
    DisputeOutcome.ReleaseToFreelancer,
  );
  const [freelancerAmount, setFreelancerAmount] = useState('');
  const [companyAmount, setCompanyAmount] = useState('');
  const [resolution, setResolution] = useState('');

  const resolve = useMutation({
    mutationFn: async () =>
      api.post(`/disputes/${dispute.id}/resolve`, {
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

  return (
    <Modal title="Resolve dispute" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        The split is executed on-chain on the escrow (
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
          { value: DisputeOutcome.RefundToCompany, label: 'Refund everything to the company' },
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
              splitOk ? undefined : `The total must be ${formatUSDC(milestoneAmount)}`
            }
          />
        </div>
      )}
      <TextareaField
        label="Agreement / justification"
        value={resolution}
        onChange={setResolution}
      />
      <Button loading={resolve.isPending} disabled={!splitOk} onClick={() => resolve.mutate()}>
        Execute resolution
      </Button>
    </Modal>
  );
}
