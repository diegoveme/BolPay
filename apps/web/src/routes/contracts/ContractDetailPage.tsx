import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import type { ContractDetail, MilestoneDetail } from '@/lib/types';
import {
  contractStatusLabel,
  contractStatusTone,
  formatDate,
  formatUSDC,
  milestoneStatusLabel,
  milestoneStatusTone,
  shortAddress,
  stellarTxUrl,
} from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { useWalletSign } from '@/lib/useWalletSign';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { PartyMini } from './components/PartyMini';
import { ContractDecisionModal } from './components/ContractDecisionModal';
import { DeliverableModal } from './components/DeliverableModal';
import { RequestChangesModal } from './components/RequestChangesModal';
import { OpenDisputeModal } from './components/OpenDisputeModal';

/**
 * Contract detail view: parties, escrow status and milestone lifecycle.
 * Drives the non-custodial funding, approval and dispute flows for both the
 * company and the freelancer.
 */
export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();

  const [deliverableFor, setDeliverableFor] = useState<MilestoneDetail | null>(null);
  const [reviewFor, setReviewFor] = useState<MilestoneDetail | null>(null);
  const [disputeFor, setDisputeFor] = useState<MilestoneDetail | null>(null);
  const [decision, setDecision] = useState<'reject' | 'request-changes' | null>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmFund, setConfirmFund] = useState(false);
  const [approveFor, setApproveFor] = useState<MilestoneDetail | null>(null);
  const sign = useWalletSign();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contracts', id],
    queryFn: async () => (await api.get<ContractDetail>(`/contracts/${id}`)).data,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['contracts'] });
    void queryClient.invalidateQueries({ queryKey: ['disputes'] });
  };

  const contractAction = useMutation({
    mutationFn: async (args: { action: string; note?: string }) =>
      api.post(`/contracts/${id}/${args.action}`, args.note ? { note: args.note } : {}),
    onSuccess: () => {
      invalidate();
      setDecision(null);
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const milestoneAction = useMutation({
    mutationFn: async (args: {
      milestoneId: string;
      action: 'approve' | 'request-changes';
      note?: string;
    }) =>
      api.post(
        `/milestones/${args.milestoneId}/${args.action}`,
        args.note ? { note: args.note } : {},
      ),
    onSuccess: (_, args) => {
      invalidate();
      setReviewFor(null);
      if (args.action === 'approve') {
        pushToast('Milestone approved: funds released to the freelancer');
      }
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  // Non-custodial funding: the company signs the fund XDR with its own wallet.
  const fund = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ unsignedXdr: string | null }>(
        `/contracts/${id}/escrow/prepare-fund`,
      );
      const txHash = data.unsignedXdr ? await sign(data.unsignedXdr) : undefined;
      return api.post(
        `/contracts/${id}/escrow/confirm-fund`,
        txHash ? { txHash } : {},
      );
    },
    onSuccess: () => {
      invalidate();
      setConfirmFund(false);
      pushToast('Escrow funded successfully');
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  // The company signs ONLY the approval; the platform then executes the release
  // to the freelancer (a single signature covers approve + payout).
  const approveRelease = useMutation({
    mutationFn: async (milestoneId: string) => {
      const a = await api.post<{ approveXdr: string | null }>(
        `/milestones/${milestoneId}/approve/prepare`,
      );
      if (a.data.approveXdr) await sign(a.data.approveXdr);
      return api.post(`/milestones/${milestoneId}/approve/confirm`);
    },
    onSuccess: () => {
      invalidate();
      setApproveFor(null);
      pushToast('Milestone approved: funds released to the freelancer');
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Loading contract…" />;
  if (error || !contract) return <ErrorState message={apiErrorMessage(error)} />;

  const isCompany = contract.company.user.id === user?.id;
  const isFreelancer = contract.freelancer.user.id === user?.id;
  const editable = ['draft', 'changes_requested'].includes(contract.status);
  // When the milestone being approved carries an agreed dispute, approving
  // settles that split (executed by the platform) instead of a full release.
  const approveAgreed = approveFor?.disputes.find((d) => d.status === 'agreed');

  return (
    <>
      <PageHeader
        title={contract.title}
        subtitle={
          <>
            {contract.company.name} ↔ {contract.freelancer.displayName} ·{' '}
            {formatUSDC(contract.totalAmount)}
          </>
        }
        actions={
          <Badge tone={contractStatusTone[contract.status]}>
            {contractStatusLabel[contract.status]}
          </Badge>
        }
      />

      <Card title="Parties">
        <div className="form-grid">
          <PartyMini
            label="Company"
            name={contract.company.name}
            avatarUrl={contract.company.avatarUrl}
            subtitle={[contract.company.industry, contract.company.location]
              .filter(Boolean)
              .join(' · ')}
            website={contract.company.website}
          />
          <PartyMini
            label="Freelancer"
            name={contract.freelancer.displayName}
            avatarUrl={contract.freelancer.avatarUrl}
            subtitle={[contract.freelancer.headline, contract.freelancer.location]
              .filter(Boolean)
              .join(' · ')}
            website={contract.freelancer.website}
            skills={contract.freelancer.skills}
          />
        </div>
      </Card>

      {contract.description && (
        <Card title="Description">
          <p style={{ whiteSpace: 'pre-wrap' }}>{contract.description}</p>
          {contract.deadline && (
            <p className="muted" style={{ marginTop: 10 }}>
              Due date: {formatDate(contract.deadline)}
            </p>
          )}
        </Card>
      )}

      {contract.reviewNote &&
        ['changes_requested', 'rejected'].includes(contract.status) && (
          <Card title="Note from the freelancer">
            <p style={{ whiteSpace: 'pre-wrap' }}>{contract.reviewNote}</p>
          </Card>
        )}

      {/* Company lifecycle actions */}
      {isCompany && editable && (
        <Card title="Actions">
          <div className="row">
            <Link to={`/contracts/${contract.id}/edit`} className="btn btn--secondary">
              Edit
            </Link>
            <Button onClick={() => setConfirmSend(true)}>Send to freelancer</Button>
          </div>
        </Card>
      )}

      {/* Freelancer decision */}
      {isFreelancer && contract.status === 'pending_acceptance' && (
        <Card title="You have a contract proposal">
          <p className="muted" style={{ marginBottom: 12 }}>
            When you accept, the platform deploys and funds the escrow on Stellar;
            payments are released to your wallet as each milestone is approved.
          </p>
          <div className="row">
            <Button onClick={() => setConfirmAccept(true)}>Accept contract</Button>
            <Button variant="secondary" onClick={() => setDecision('request-changes')}>
              Request changes
            </Button>
            <Button variant="danger" onClick={() => setDecision('reject')}>
              Reject
            </Button>
          </div>
        </Card>
      )}

      {/* Escrow summary */}
      {contract.escrow && (
        <Card title="Escrow (Trustless Work · Stellar testnet)">
          <div className="row" style={{ gap: 24 }}>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Soroban contract</p>
              <p className="mono">{shortAddress(contract.escrow.trustlessWorkId)}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Funded</p>
              {/* fundedAmount holds the expected total from deploy; show 0 until
                  the escrow is actually funded (status leaves 'created'). */}
              <p>
                {formatUSDC(
                  contract.escrow.status === 'created'
                    ? '0'
                    : contract.escrow.fundedAmount,
                )}
              </p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Released</p>
              <p>{formatUSDC(contract.escrow.releasedAmount ?? '0')}</p>
            </div>
            <Badge tone={contract.escrow.status === 'released' ? 'success' : 'info'}>
              {contract.escrow.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Company funds the escrow with its own wallet (non-custodial) */}
      {isCompany && contract.escrow?.status === 'created' && (
        <Card title="Fund escrow">
          <p className="muted" style={{ marginBottom: 12 }}>
            To activate payments, fund the escrow with{' '}
            {formatUSDC(contract.totalAmount)} from your wallet. You sign it with
            your own wallet; BolPay never touches your funds.
          </p>
          <Button onClick={() => setConfirmFund(true)}>Fund escrow</Button>
        </Card>
      )}

      {/* Milestones */}
      <Card title={`Milestones (${contract.milestones.length})`}>
        {contract.milestones.map((milestone) => {
          const releaseTx = milestone.transactions.find(
            (t) => t.operation === 'release',
          );
          const openDispute = milestone.disputes.find((d) =>
            ['open', 'under_review', 'escalated', 'agreed'].includes(d.status),
          );
          return (
            <div key={milestone.id} className="milestone">
              <div className="milestone__head">
                <div>
                  <p className="milestone__title">
                    {milestone.position + 1}. {milestone.title}
                  </p>
                  <p className="milestone__meta">
                    {formatUSDC(milestone.amount)}
                    {milestone.deadline && <> · due {formatDate(milestone.deadline)}</>}
                  </p>
                </div>
                <div className="row">
                  <Badge tone={milestoneStatusTone[milestone.status]}>
                    {milestoneStatusLabel[milestone.status]}
                  </Badge>

                  {isFreelancer &&
                    contract.status === 'active' &&
                    ['pending', 'submitted', 'in_review'].includes(milestone.status) && (
                      <Button
                        variant="secondary"
                        onClick={() => setDeliverableFor(milestone)}
                      >
                        {milestone.deliverables.length > 0
                          ? 'New version'
                          : 'Upload deliverable'}
                      </Button>
                    )}

                  {isCompany &&
                    ['submitted', 'in_review'].includes(milestone.status) && (
                      <>
                        {contract.escrow?.status === 'funded' ? (
                          <Button onClick={() => setApproveFor(milestone)}>
                            Approve and pay
                          </Button>
                        ) : (
                          <span className="muted" style={{ fontSize: 12.5 }}>
                            Fund the escrow to release
                          </span>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => setReviewFor(milestone)}
                        >
                          Request changes
                        </Button>
                      </>
                    )}

                  {(isCompany || isFreelancer) &&
                    contract.status === 'active' &&
                    !openDispute &&
                    !['released', 'disputed'].includes(milestone.status) && (
                      <Button variant="ghost" onClick={() => setDisputeFor(milestone)}>
                        Open dispute
                      </Button>
                    )}

                  {openDispute && (
                    <Link to={`/disputes/${openDispute.id}`} className="btn btn--ghost">
                      View dispute
                    </Link>
                  )}
                </div>
              </div>

              {milestone.description && (
                <p className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
                  {milestone.description}
                </p>
              )}

              {milestone.deliverables.map((deliverable) => (
                <div key={deliverable.id} className="deliverable">
                  <div className="row">
                    <strong>v{deliverable.version}</strong>
                    <Badge
                      tone={
                        deliverable.status === 'approved'
                          ? 'success'
                          : deliverable.status === 'changes_requested'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {deliverable.status === 'approved'
                        ? 'Approved'
                        : deliverable.status === 'changes_requested'
                          ? 'Changes requested'
                          : 'Delivered'}
                    </Badge>
                    <span className="muted">{formatDate(deliverable.submittedAt)}</span>
                  </div>
                  {deliverable.note && <p style={{ marginTop: 4 }}>{deliverable.note}</p>}
                  <div className="row" style={{ marginTop: 4 }}>
                    {deliverable.linkUrl && (
                      <a
                        href={deliverable.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {deliverable.linkUrl}
                      </a>
                    )}
                    {deliverable.fileUrl && (
                      <a
                        href={deliverable.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        file
                      </a>
                    )}
                  </div>
                  {deliverable.reviewNote && (
                    <p className="muted" style={{ marginTop: 4 }}>
                      Feedback: {deliverable.reviewNote}
                    </p>
                  )}
                </div>
              ))}

              {releaseTx?.stellarHash && (
                <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
                  On-chain payment:{' '}
                  {stellarTxUrl(releaseTx.stellarHash) ? (
                    <a
                      className="mono"
                      style={{ color: 'var(--color-primary)' }}
                      href={stellarTxUrl(releaseTx.stellarHash)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddress(releaseTx.stellarHash)}
                    </a>
                  ) : (
                    <span className="mono">{shortAddress(releaseTx.stellarHash)} (simulated)</span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </Card>

      {/* Modals */}
      {confirmSend && (
        <ConfirmModal
          title="Send contract to the freelancer"
          confirmLabel="Send to freelancer"
          loading={contractAction.isPending}
          onClose={() => setConfirmSend(false)}
          onConfirm={() =>
            contractAction.mutate(
              { action: 'send' },
              { onSuccess: () => setConfirmSend(false) },
            )
          }
        >
          <p>
            The contract will be sent to the freelancer for acceptance. While you
            wait for their response you will not be able to edit it.
          </p>
        </ConfirmModal>
      )}
      {confirmFund && (
        <ConfirmModal
          title="Fund escrow"
          confirmLabel={`Fund ${formatUSDC(contract.totalAmount)}`}
          loading={fund.isPending}
          onClose={() => setConfirmFund(false)}
          onConfirm={() => fund.mutate()}
        >
          <p>
            You are about to fund the escrow with {formatUSDC(contract.totalAmount)}{' '}
            from your wallet. You sign the transaction with your own wallet.
          </p>
          <div className="modal__danger-note">
            The funds stay locked in the escrow until you approve each milestone.
          </div>
        </ConfirmModal>
      )}
      {confirmAccept && (
        <ConfirmModal
          title="Accept contract"
          confirmLabel="Accept and deploy escrow"
          loading={contractAction.isPending}
          onClose={() => setConfirmAccept(false)}
          onConfirm={() =>
            contractAction.mutate(
              { action: 'accept' },
              { onSuccess: () => setConfirmAccept(false) },
            )
          }
        >
          <p>
            When you accept, the escrow is deployed on Stellar for{' '}
            {formatUSDC(contract.totalAmount)} and the company will fund it to
            activate payments. Funds are released to your wallet as each milestone is
            approved.
          </p>
          <div className="modal__danger-note">
            This starts an on-chain escrow; the action cannot be undone.
          </div>
        </ConfirmModal>
      )}
      {approveFor && (
        <ConfirmModal
          title="Approve milestone"
          danger
          confirmLabel={
            approveAgreed
              ? `Settle ${formatUSDC(approveAgreed.freelancerAmount ?? '0')}`
              : `Release ${formatUSDC(approveFor.amount)}`
          }
          loading={approveRelease.isPending}
          onClose={() => setApproveFor(null)}
          onConfirm={() => approveRelease.mutate(approveFor.id)}
        >
          {approveAgreed ? (
            <>
              <p>
                Approving <strong>{approveFor.title}</strong> settles the agreed
                dispute split from the escrow:{' '}
                {formatUSDC(approveAgreed.freelancerAmount ?? '0')} to the
                freelancer and {formatUSDC(approveAgreed.companyAmount ?? '0')} back
                to the company.
              </p>
              <div className="modal__danger-note">
                BolPay executes the agreed resolution on-chain. The settlement is
                irreversible.
              </div>
            </>
          ) : (
            <>
              <p>
                Approving <strong>{approveFor.title}</strong> releases{' '}
                {formatUSDC(approveFor.amount)} from the escrow to the freelancer's
                wallet.
              </p>
              <div className="modal__danger-note">
                Your wallet will ask you to sign the <strong>approval</strong>;
                BolPay then releases the funds to the freelancer. The payment is
                irreversible.
              </div>
            </>
          )}
        </ConfirmModal>
      )}
      {decision && (
        <ContractDecisionModal
          mode={decision}
          loading={contractAction.isPending}
          onClose={() => setDecision(null)}
          onSubmit={(note) => contractAction.mutate({ action: decision, note })}
        />
      )}
      {deliverableFor && (
        <DeliverableModal
          milestone={deliverableFor}
          onClose={() => setDeliverableFor(null)}
          onDone={() => {
            setDeliverableFor(null);
            invalidate();
          }}
        />
      )}
      {reviewFor && (
        <RequestChangesModal
          loading={milestoneAction.isPending}
          onClose={() => setReviewFor(null)}
          onSubmit={(note) =>
            milestoneAction.mutate({
              milestoneId: reviewFor.id,
              action: 'request-changes',
              note,
            })
          }
        />
      )}
      {disputeFor && (
        <OpenDisputeModal
          milestone={disputeFor}
          onClose={() => setDisputeFor(null)}
          onDone={(disputeId) => {
            setDisputeFor(null);
            invalidate();
            navigate(`/disputes/${disputeId}`);
          }}
        />
      )}
    </>
  );
}
