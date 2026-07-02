import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { MilestoneDetail } from '@/lib/types';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { useWalletSign } from '@/lib/useWalletSign';
import { Button, Field, Modal, TextareaField } from '@/components/ui';

/**
 * Freelancer modal to submit a deliverable for a milestone and mark it
 * delivered on-chain (the freelancer signs the deliver XDR with their wallet).
 */
export function DeliverableModal({
  milestone,
  onClose,
  onDone,
}: {
  milestone: MilestoneDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const { pushToast } = useNotificationsUi();
  const sign = useWalletSign();
  const [linkUrl, setLinkUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      await api.post(`/milestones/${milestone.id}/deliverables`, {
        linkUrl: linkUrl.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        note: note.trim() || undefined,
      });
      // Mark the milestone delivered on-chain: the freelancer signs it with
      // their own wallet. Null XDR in simulated mode (nothing to sign).
      const { data } = await api.post<{ deliverXdr: string | null }>(
        `/milestones/${milestone.id}/deliver/prepare`,
      );
      if (data.deliverXdr) await sign(data.deliverXdr);
    },
    onSuccess: onDone,
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  return (
    <Modal title={`Deliverable · ${milestone.title}`} onClose={onClose}>
      <Field
        label="Link (repository, demo, document)"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="https://…"
      />
      <Field
        label="File URL (optional)"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="https://storage…/deliverable.zip"
      />
      <TextareaField label="Note" value={note} onChange={setNote} />
      <Button
        loading={submit.isPending}
        disabled={!linkUrl.trim() && !fileUrl.trim() && !note.trim()}
        onClick={() => submit.mutate()}
      >
        Send deliverable
      </Button>
    </Modal>
  );
}
