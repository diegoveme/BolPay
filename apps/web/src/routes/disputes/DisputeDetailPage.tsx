import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DisputeOutcome } from '@bolpay/shared';
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
  Modal,
  PageHeader,
  SelectField,
  Spinner,
  TextareaField,
} from '@/components/ui';

const OPEN_STATES = ['open', 'under_review', 'escalated'];

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

  const escalate = useMutation({
    mutationFn: async () => api.post(`/disputes/${id}/escalate`),
    onSuccess: invalidate,
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Cargando disputa…" />;
  if (error || !dispute) return <ErrorState message={apiErrorMessage(error)} />;

  const contract = dispute.milestone.contract;
  const isOpen = OPEN_STATES.includes(dispute.status);
  const isAdmin = user?.role === 'administrator';
  const isOpener = dispute.openedById === user?.id;
  const canResolveMutually = isOpen && dispute.status !== 'escalated' && !isOpener && !isAdmin;
  const canResolveAsAdmin = isOpen && isAdmin;

  return (
    <>
      <PageHeader
        title={`Disputa — ${dispute.milestone.title}`}
        subtitle={
          <>
            Contrato{' '}
            <Link to={`/contracts/${contract.id}`} style={{ color: 'var(--color-primary)' }}>
              {contract.title}
            </Link>{' '}
            · {formatUSDC(dispute.milestone.amount)} en juego
          </>
        }
        actions={
          <Badge tone={disputeStatusTone[dispute.status]}>
            {disputeStatusLabel[dispute.status]}
          </Badge>
        }
      />

      <Card title="Motivo">
        <p style={{ whiteSpace: 'pre-wrap' }}>{dispute.reason}</p>
        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          Abierta por {dispute.openedBy.email} · {formatDateTime(dispute.openedAt)}
        </p>
      </Card>

      {dispute.status === 'resolved' && (
        <Card title="Resolución">
          <div className="row" style={{ gap: 24 }}>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Al freelancer</p>
              <p>{formatUSDC(dispute.freelancerAmount ?? '0')}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>A la empresa</p>
              <p>{formatUSDC(dispute.companyAmount ?? '0')}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 13 }}>Resuelta por</p>
              <p>{dispute.resolvedBy?.email ?? '—'}</p>
            </div>
          </div>
          {dispute.resolution && (
            <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{dispute.resolution}</p>
          )}
        </Card>
      )}

      <Card title={`Evidencia y comentarios (${dispute.evidence.length})`}>
        {dispute.evidence.length === 0 && (
          <p className="muted">Aún no hay evidencia adjunta.</p>
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

        {isOpen && !isAdmin && (
          <>
            <hr className="divider" />
            <Field
              label="URL de evidencia (opcional)"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
            />
            <TextareaField label="Comentario" value={comment} onChange={setComment} />
            <Button
              loading={addEvidence.isPending}
              disabled={!fileUrl.trim() && !comment.trim()}
              onClick={() => addEvidence.mutate()}
            >
              Adjuntar
            </Button>
          </>
        )}
      </Card>

      {isOpen && (
        <Card title="Resolución">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
            {dispute.status === 'escalated'
              ? 'La disputa fue escalada: solo un administrador puede ejecutar la resolución sobre el escrow.'
              : 'La contraparte puede aceptar una resolución mutua, o cualquiera de las partes puede escalar al administrador.'}
          </p>
          <div className="row">
            {(canResolveMutually || canResolveAsAdmin) && (
              <Button onClick={() => setShowResolve(true)}>Resolver disputa</Button>
            )}
            {!isAdmin && dispute.status !== 'escalated' && (
              <Button
                variant="secondary"
                loading={escalate.isPending}
                onClick={() => escalate.mutate()}
              >
                Escalar al administrador
              </Button>
            )}
          </div>
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

function ResolveModal({
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
    <Modal title="Resolver disputa" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        La distribución se ejecuta on-chain sobre el escrow (
        {formatUSDC(dispute.milestone.amount)}).
      </p>
      <SelectField
        label="Resultado"
        value={outcome}
        onChange={(value) => setOutcome(value as DisputeOutcome)}
        options={[
          {
            value: DisputeOutcome.ReleaseToFreelancer,
            label: 'Liberar todo al freelancer',
          },
          { value: DisputeOutcome.RefundToCompany, label: 'Reembolsar todo a la empresa' },
          { value: DisputeOutcome.Split, label: 'Dividir el monto' },
        ]}
      />
      {outcome === DisputeOutcome.Split && (
        <div className="form-grid">
          <Field
            label="Para el freelancer (USDC)"
            type="number"
            min="0"
            step="0.01"
            value={freelancerAmount}
            onChange={(e) => setFreelancerAmount(e.target.value)}
          />
          <Field
            label="Para la empresa (USDC)"
            type="number"
            min="0"
            step="0.01"
            value={companyAmount}
            onChange={(e) => setCompanyAmount(e.target.value)}
            error={
              splitOk ? undefined : `La suma debe ser ${formatUSDC(milestoneAmount)}`
            }
          />
        </div>
      )}
      <TextareaField
        label="Acuerdo / justificación"
        value={resolution}
        onChange={setResolution}
      />
      <Button loading={resolve.isPending} disabled={!splitOk} onClick={() => resolve.mutate()}>
        Ejecutar resolución
      </Button>
    </Modal>
  );
}
