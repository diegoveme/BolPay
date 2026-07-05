import { useState } from 'react';
import { Button, Modal, TextareaField } from '@/components/ui';

/** Company modal to request changes on a submitted deliverable. */
export function RequestChangesModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal title="Request changes on the deliverable" onClose={onClose}>
      <TextareaField
        label="What needs to be fixed?"
        value={note}
        onChange={setNote}
        placeholder="Describe the expected changes…"
      />
      <Button loading={loading} onClick={() => onSubmit(note)}>
        Send feedback
      </Button>
    </Modal>
  );
}
