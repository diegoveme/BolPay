import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import type { DisputeDetail } from '@/lib/types';
import {
  disputeStatusLabel,
  disputeStatusTone,
  formatDateTime,
  formatUSDC,
} from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  Spinner,
  TextareaField,
} from '@/components/ui';
import { ResolveModal } from './ResolveModal';

const OPEN_STATES = ['open', 'under_review', 'escalated'];

/** Dispute detail: reason, evidence thread, resolution and mutual settlement flow. */
export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();

  const [fileUrl, setFileUrl] = useState('');
  const [comment, setComment] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const { data: dispute, isLoading, error } = useQuery({
    queryKey: ['disputes', id],
    queryFn: async () => (await api.get<DisputeDetail>(`/disputes/${id}`)).data,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['disputes'] });
    void queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };

  const addEvidence = useMutation({
    mutationFn: async () =>
      api.post(`/disputes/${id}/evidence`, {
        fileUrl: fileUrl.trim() || undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setFileUrl('');
      setComment('');
      invalidate();
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Loading dispute…" />;
  if (error || !dispute) return <ErrorState message={apiErrorMessage(error)} />;

  const contract = dispute.milestone.contract;
  const isOpen = OPEN_STATES.includes(dispute.status);
  const isOpener = dispute.openedById === user?.id;
  // Disputes are resolved mutually by the parties: the counterparty accepts the
  // agreed split and the company executes it. No platform/admin involvement.
  const canResolve = isOpen && !isOpener;

  return (
    <>
      <PageHeader
        title={`Dispute · ${dispute.milestone.title}`}
        subtitle={
          <>
            Contract{' '}
            <Link to={`/contracts/${contract.id}`} style={{ color: 'var(--color-primary)' }}>
              {contract.title}
            </Link>{' '}
            · {formatUSDC(dispute.milestone.amount)} at stake
          </>
        }
        actions={
          <Badge tone={disputeStatusTone[dispute.status]}>
            {disputeStatusLabel[dispute.status]}
          </Badge>
        }
      />

      <Card title="Reason">
        <p style={{ whiteSpace: 'pre-wrap' }}>{dispute.reason}</p>
        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          Opened by {dispute.openedBy.email} · {formatDateTime(dispute.openedAt)}
        </p>
      </Card>

      {dispute.status === 'resolved' && (
        <Card title="Resolution">
          <div className="row" style={{ gap: 24 }}>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>To the freelancer</p>
              <p>{formatUSDC(dispute.freelancerAmount ?? '0')}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>To the company</p>
              <p>{formatUSDC(dispute.companyAmount ?? '0')}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Resolved by</p>
              <p>{dispute.resolvedBy?.email ?? '·'}</p>
            </div>
          </div>
          {dispute.resolution && (
            <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{dispute.resolution}</p>
          )}
        </Card>
      )}

      <Card title={`Evidence and comments (${dispute.evidence.length})`}>
        {dispute.evidence.length === 0 && (
          <p className="muted">No evidence attached yet.</p>
        )}
        {dispute.evidence.map((item) => (
          <div key={item.id} className="deliverable">
            <div className="row">
              <strong>{item.submittedBy.email}</strong>
              <span className="muted">{formatDateTime(item.createdAt)}</span>
            </div>
            {item.comment && <p style={{ marginTop: 4 }}>{item.comment}</p>}
            {item.fileUrl && (
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mono"
                style={{ color: 'var(--color-primary)' }}
              >
                {item.fileUrl}
              </a>
            )}
          </div>
        ))}

        {isOpen && (
          <>
            <hr className="divider" />
            <Field
              label="Evidence URL (optional)"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
            />
            <TextareaField label="Comment" value={comment} onChange={setComment} />
            <Button
              loading={addEvidence.isPending}
              disabled={!fileUrl.trim() && !comment.trim()}
              onClick={() => addEvidence.mutate()}
            >
              Attach
            </Button>
          </>
        )}
      </Card>

      {isOpen && (
        <Card title="Resolution">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
            {canResolve
              ? 'You settle this between yourselves: review the evidence and, if you agree, accept how the funds are split. The company signs the resolution with its wallet.'
              : 'Once the other party accepts a resolution, it will be executed on the escrow. You can keep attaching evidence and negotiating.'}
          </p>
          {canResolve && (
            <Button onClick={() => setShowResolve(true)}>Resolve dispute</Button>
          )}
        </Card>
      )}

      {showResolve && (
        <ResolveModal
          dispute={dispute}
          onClose={() => setShowResolve(false)}
          onDone={() => {
            setShowResolve(false);
            invalidate();
          }}
        />
      )}
    </>
  );
}
