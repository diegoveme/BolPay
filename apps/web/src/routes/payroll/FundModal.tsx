import { useState } from 'react';
import { formatUSDC } from '@/lib/format';
import { Button, Field, Modal } from '@/components/ui';

/**
 * Modal to fund a payroll cycle: deploys and funds the Stellar escrow and lets
 * the company optionally pick the date of the first run.
 */
export function FundModal({
  total,
  loading,
  onClose,
  onSubmit,
}: {
  total: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (firstRun: string) => void;
}) {
  const [firstRun, setFirstRun] = useState('');
  return (
    <Modal title="Fund payroll cycle" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        An escrow for {formatUSDC(total)} is deployed and funded on Stellar. The
        distribution runs automatically on the scheduled date.
      </p>
      <Field
        label="First run (optional)"
        type="datetime-local"
        value={firstRun}
        onChange={(e) => setFirstRun(e.target.value)}
        hint="If left empty, it is scheduled based on the payroll frequency"
      />
      <Button loading={loading} onClick={() => onSubmit(firstRun)}>
        Fund and schedule
      </Button>
    </Modal>
  );
}
