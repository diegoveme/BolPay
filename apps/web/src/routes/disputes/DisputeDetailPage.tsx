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
  // A proposal that pays the freelancer does NOT settle on accept: it reopens
  // the milestone so the freelancer delivers and the company approves before
  // any funds move. A pure refund to the company settles immediately.
  const freelancerGetsShare = Number(dispute.proposalFreelancerAmount ?? 0) > 0;

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

      {dispute.status === 'agreed' && (
        <Card title="Agreement reached">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
            You agreed on the split, but no funds have moved yet. The freelancer
            delivers the work on the{' '}
            <Link
              to={`/contracts/${contract.id}`}
              style={{ color: 'var(--color-primary)' }}
            >
              contract
            </Link>
            ; once the company approves it, the escrow releases the agreed
            amounts.
          </p>
          <div className="row" style={{ gap: 24 }}>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>To the freelancer</p>
              <p>{formatUSDC(dispute.freelancerAmount ?? '0')}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>To the company</p>
              <p>{formatUSDC(dispute.companyAmount ?? '0')}</p>
            </div>
          </div>
          {dispute.resolution && (
            <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{dispute.resolution}</p>
          )}
        </Card>
      )}

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
                  ? freelancerGetsShare
                    ? 'You proposed this split. Once the other party accepts, the freelancer delivers the work and the company approves it before the escrow pays out. You can change it below.'
                    : 'You proposed this refund. It runs on the escrow as soon as the other party accepts. You can change it below.'
                  : freelancerGetsShare
                    ? `${dispute.proposedBy?.email ?? 'The other party'} proposed this split. Accept it to lock it in: the freelancer then delivers and the company approves before any funds move. Or counter with your own.`
                    : `${dispute.proposedBy?.email ?? 'The other party'} proposed this refund. Accept it to run it on the escrow now, or counter with your own.`}
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
                    {freelancerGetsShare ? 'Accept agreement' : 'Accept and refund'}
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
          confirmLabel={freelancerGetsShare ? 'Accept agreement' : 'Execute refund'}
          danger
          loading={accept.isPending}
          onClose={() => setConfirmAccept(false)}
          onConfirm={() => accept.mutate()}
        >
          {freelancerGetsShare ? (
            <>
              <p>
                You are accepting a split of {toFreelancer} to the freelancer and{' '}
                {toCompany} to the company. No funds move yet: the milestone
                reopens so the freelancer delivers the work and the company
                approves it. The escrow releases these amounts on that approval.
              </p>
              <div className="modal__danger-note">
                Once approved, the on-chain settlement cannot be undone.
              </div>
            </>
          ) : (
            <>
              <p>
                Accepting refunds {toCompany} to the company on the escrow now.
                The freelancer receives nothing for this milestone.
              </p>
              <div className="modal__danger-note">
                This runs on-chain and cannot be undone.
              </div>
            </>
          )}
        </ConfirmModal>
      )}
    </>
  );
}
