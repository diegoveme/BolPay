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
  ConfirmModal,
  ErrorState,
  Field,
  PageHeader,
  Spinner,
  TextareaField,
} from '@/components/ui';
import { ProposeModal } from './ProposeModal';

const OPEN_STATES = ['open', 'under_review'];

/** Dispute detail: reason, evidence thread and the mutual propose/accept flow. */
export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();

  const [fileUrl, setFileUrl] = useState('');
  const [comment, setComment] = useState('');
  const [showPropose, setShowPropose] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);

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

  const accept = useMutation({
    mutationFn: async () => api.post(`/disputes/${id}/accept`),
    onSuccess: () => {
      setConfirmAccept(false);
      invalidate();
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Loading dispute…" />;
  if (error || !dispute) return <ErrorState message={apiErrorMessage(error)} />;

  const contract = dispute.milestone.contract;
  const isOpen = OPEN_STATES.includes(dispute.status);
  // A resolution proposal is on the table until the dispute is settled. Either
  // party may propose; only the party who did NOT make the current proposal can
  // accept it, which is what keeps the resolution mutual.
  const hasProposal = Boolean(dispute.proposedById);
  const isProposer = dispute.proposedById === user?.id;
  const toFreelancer = formatUSDC(dispute.proposalFreelancerAmount ?? '0');
  const toCompany = formatUSDC(dispute.proposalCompanyAmount ?? '0');

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
              <p className="muted" style={{ fontSize: 13 }}>Accepted by</p>
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
          {hasProposal ? (
            <>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
                {isProposer
                  ? 'You proposed this split. It runs on the escrow once the other party accepts. You can change it below.'
                  : `${dispute.proposedBy?.email ?? 'The other party'} proposed this split. Accept it to execute on the escrow, or counter with your own.`}
              </p>
              <div className="row" style={{ gap: 24 }}>
                <div>
                  <p className="muted" style={{ fontSize: 13 }}>To the freelancer</p>
                  <p>{toFreelancer}</p>
                </div>
                <div>
                  <p className="muted" style={{ fontSize: 13 }}>To the company</p>
                  <p>{toCompany}</p>
                </div>
              </div>
              {dispute.proposalNote && (
                <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
                  {dispute.proposalNote}
                </p>
              )}
              <hr className="divider" />
              <div className="row" style={{ gap: 12 }}>
                {!isProposer && (
                  <Button onClick={() => setConfirmAccept(true)}>
                    Accept and execute
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setShowPropose(true)}>
                  {isProposer ? 'Change proposal' : 'Counter-propose'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
                You settle this between yourselves: propose how the{' '}
                {formatUSDC(dispute.milestone.amount)} in escrow is split. It only
                executes once the other party accepts.
              </p>
              <Button onClick={() => setShowPropose(true)}>
                Propose a resolution
              </Button>
            </>
          )}
        </Card>
      )}

      {showPropose && (
        <ProposeModal
          dispute={dispute}
          onClose={() => setShowPropose(false)}
          onDone={() => {
            setShowPropose(false);
            invalidate();
          }}
        />
      )}

      {confirmAccept && (
        <ConfirmModal
          title="Accept resolution"
          confirmLabel="Execute resolution"
          danger
          loading={accept.isPending}
          onClose={() => setConfirmAccept(false)}
          onConfirm={() => accept.mutate()}
        >
          <p>
            Accepting executes the agreed split on the escrow: {toFreelancer} to
            the freelancer and {toCompany} to the company.
          </p>
          <div className="modal__danger-note">
            This runs on-chain and cannot be undone.
          </div>
        </ConfirmModal>
      )}
    </>
  );
}
