import { useState } from 'react';
import { Button, Modal, TextareaField } from '@/components/ui';

/** Freelancer modal to reject a contract or request changes, with a note. */
export function ContractDecisionModal({
  mode,
  loading,
  onClose,
  onSubmit,
}: {
  mode: 'reject' | 'request-changes';
  loading: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal
      title={mode === 'reject' ? 'Reject contract' : 'Request changes'}
      onClose={onClose}
    >
      <TextareaField
        label="Message for the company"
        value={note}
        onChange={setNote}
        placeholder="Explain the reason…"
      />
      <Button
        variant={mode === 'reject' ? 'danger' : 'primary'}
        loading={loading}
        onClick={() => onSubmit(note)}
      >
        {mode === 'reject' ? 'Reject' : 'Send request'}
      </Button>
    </Modal>
  );
}
