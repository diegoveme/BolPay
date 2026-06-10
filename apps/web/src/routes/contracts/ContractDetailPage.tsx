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
  stellarExpertTxUrl,
} from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  TextareaField,
} from '@/components/ui';

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
        pushToast('Milestone aprobado: fondos liberados al freelancer');
      }
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Cargando contrato…" />;
  if (error || !contract) return <ErrorState message={apiErrorMessage(error)} />;

  const isCompany = contract.company.user.id === user?.id;
  const isFreelancer = contract.freelancer.user.id === user?.id;
  const editable = ['draft', 'changes_requested'].includes(contract.status);

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

      {contract.description && (
        <Card title="Descripción">
          <p style={{ whiteSpace: 'pre-wrap' }}>{contract.description}</p>
          {contract.deadline && (
            <p className="muted" style={{ marginTop: 10 }}>
              Fecha límite: {formatDate(contract.deadline)}
            </p>
          )}
        </Card>
      )}

      {contract.reviewNote &&
        ['changes_requested', 'rejected'].includes(contract.status) && (
          <Card title="Nota del freelancer">
            <p style={{ whiteSpace: 'pre-wrap' }}>{contract.reviewNote}</p>
          </Card>
        )}

      {/* Company lifecycle actions */}
      {isCompany && editable && (
        <Card title="Acciones">
          <div className="row">
            <Link to={`/contracts/${contract.id}/edit`} className="btn btn--secondary">
              Editar
            </Link>
            <Button
              loading={contractAction.isPending}
              onClick={() => contractAction.mutate({ action: 'send' })}
            >
              Enviar al freelancer
            </Button>
          </div>
        </Card>
      )}

      {/* Freelancer decision */}
      {isFreelancer && contract.status === 'pending_acceptance' && (
        <Card title="Tienes una propuesta de contrato">
          <p className="muted" style={{ marginBottom: 12 }}>
            Al aceptar, la plataforma despliega y fondea el escrow en Stellar; los
            pagos se liberan a tu wallet al aprobarse cada milestone.
          </p>
          <div className="row">
            <Button
              loading={contractAction.isPending}
              onClick={() => contractAction.mutate({ action: 'accept' })}
            >
              Aceptar contrato
            </Button>
            <Button variant="secondary" onClick={() => setDecision('request-changes')}>
              Pedir cambios
            </Button>
            <Button variant="danger" onClick={() => setDecision('reject')}>
              Rechazar
            </Button>
          </div>
        </Card>
      )}

      {/* Escrow summary */}
      {contract.escrow && (
        <Card title="Escrow (Trustless Work · Stellar testnet)">
          <div className="row" style={{ gap: 24 }}>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Contrato Soroban</p>
              <p className="mono">{shortAddress(contract.escrow.trustlessWorkId)}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Fondeado</p>
              <p>{formatUSDC(contract.escrow.fundedAmount)}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Liberado</p>
              <p>{formatUSDC(contract.escrow.releasedAmount ?? '0')}</p>
            </div>
            <Badge tone={contract.escrow.status === 'released' ? 'success' : 'info'}>
              {contract.escrow.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Milestones */}
      <Card title={`Milestones (${contract.milestones.length})`}>
        {contract.milestones.map((milestone) => {
          const releaseTx = milestone.transactions.find(
            (t) => t.operation === 'release',
          );
          const openDispute = milestone.disputes.find((d) =>
            ['open', 'under_review', 'escalated'].includes(d.status),
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
                    {milestone.deadline && <> · vence {formatDate(milestone.deadline)}</>}
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
                          ? 'Nueva versión'
                          : 'Subir entrega'}
                      </Button>
                    )}

                  {isCompany &&
                    ['submitted', 'in_review'].includes(milestone.status) && (
                      <>
                        <Button
                          loading={milestoneAction.isPending}
                          onClick={() =>
                            milestoneAction.mutate({
                              milestoneId: milestone.id,
                              action: 'approve',
                            })
                          }
                        >
                          Aprobar y pagar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setReviewFor(milestone)}
                        >
                          Pedir cambios
                        </Button>
                      </>
                    )}

                  {(isCompany || isFreelancer) &&
                    contract.status === 'active' &&
                    !['released', 'disputed'].includes(milestone.status) && (
                      <Button variant="ghost" onClick={() => setDisputeFor(milestone)}>
                        Abrir disputa
                      </Button>
                    )}

                  {openDispute && (
                    <Link to={`/disputes/${openDispute.id}`} className="btn btn--ghost">
                      Ver disputa
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
                        ? 'Aprobado'
                        : deliverable.status === 'changes_requested'
                          ? 'Cambios solicitados'
                          : 'Entregado'}
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
                        archivo
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
                  Pago on-chain:{' '}
                  {stellarExpertTxUrl(releaseTx.stellarHash) ? (
                    <a
                      className="mono"
                      style={{ color: 'var(--color-primary)' }}
                      href={stellarExpertTxUrl(releaseTx.stellarHash)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddress(releaseTx.stellarHash)}
                    </a>
                  ) : (
                    <span className="mono">{shortAddress(releaseTx.stellarHash)} (simulado)</span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </Card>

      {/* Modals */}
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

function ContractDecisionModal({
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
      title={mode === 'reject' ? 'Rechazar contrato' : 'Solicitar cambios'}
      onClose={onClose}
    >
      <TextareaField
        label="Mensaje para la empresa"
        value={note}
        onChange={setNote}
        placeholder="Explica el motivo…"
      />
      <Button
        variant={mode === 'reject' ? 'danger' : 'primary'}
        loading={loading}
        onClick={() => onSubmit(note)}
      >
        {mode === 'reject' ? 'Rechazar' : 'Enviar solicitud'}
      </Button>
    </Modal>
  );
}

function DeliverableModal({
  milestone,
  onClose,
  onDone,
}: {
  milestone: MilestoneDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const { pushToast } = useNotificationsUi();
  const [linkUrl, setLinkUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: async () =>
      api.post(`/milestones/${milestone.id}/deliverables`, {
        linkUrl: linkUrl.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: onDone,
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  return (
    <Modal title={`Entrega — ${milestone.title}`} onClose={onClose}>
      <Field
        label="Link (repositorio, demo, documento)"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="https://…"
      />
      <Field
        label="URL de archivo (opcional)"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="https://storage…/entrega.zip"
      />
      <TextareaField label="Nota" value={note} onChange={setNote} />
      <Button
        loading={submit.isPending}
        disabled={!linkUrl.trim() && !fileUrl.trim() && !note.trim()}
        onClick={() => submit.mutate()}
      >
        Enviar entrega
      </Button>
    </Modal>
  );
}

function RequestChangesModal({
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
    <Modal title="Solicitar cambios en la entrega" onClose={onClose}>
      <TextareaField
        label="¿Qué debe corregirse?"
        value={note}
        onChange={setNote}
        placeholder="Describe los cambios esperados…"
      />
      <Button loading={loading} onClick={() => onSubmit(note)}>
        Enviar feedback
      </Button>
    </Modal>
  );
}

function OpenDisputeModal({
  milestone,
  onClose,
  onDone,
}: {
  milestone: MilestoneDetail;
  onClose: () => void;
  onDone: (disputeId: string) => void;
}) {
  const { pushToast } = useNotificationsUi();
  const [reason, setReason] = useState('');

  const open = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ id: string }>('/disputes', {
          milestoneId: milestone.id,
          reason,
        })
      ).data,
    onSuccess: (data) => onDone(data.id),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  return (
    <Modal title={`Abrir disputa — ${milestone.title}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        El milestone se pausa y los fondos quedan bloqueados en el escrow hasta que
        haya una resolución mutua o intervenga un administrador.
      </p>
      <TextareaField
        label="Motivo (mínimo 10 caracteres)"
        value={reason}
        onChange={setReason}
        placeholder="Describe el problema…"
      />
      <Button
        variant="danger"
        loading={open.isPending}
        disabled={reason.trim().length < 10}
        onClick={() => open.mutate()}
      >
        Abrir disputa
      </Button>
    </Modal>
  );
}
