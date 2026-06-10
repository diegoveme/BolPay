import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { PayrollDetail } from '@/lib/types';
import {
  formatDateTime,
  formatUSDC,
  payrollStatusLabel,
  payrollStatusTone,
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
} from '@/components/ui';

export function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();
  const [showFund, setShowFund] = useState(false);

  const { data: payroll, isLoading, error } = useQuery({
    queryKey: ['payrolls', id],
    queryFn: async () => (await api.get<PayrollDetail>(`/payrolls/${id}`)).data,
  });

  const action = useMutation({
    mutationFn: async (args: { path: string; body?: unknown }) =>
      api.post(`/payrolls/${id}/${args.path}`, args.body ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      setShowFund(false);
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Cargando planilla…" />;
  if (error || !payroll) return <ErrorState message={apiErrorMessage(error)} />;

  const total = payroll.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const canEdit = ['draft', 'active', 'paused'].includes(payroll.status);

  return (
    <>
      <PageHeader
        title={payroll.name}
        subtitle={`${payroll.items.length} destinatarios · ${formatUSDC(total)} por ciclo`}
        actions={
          <Badge tone={payrollStatusTone[payroll.status]}>
            {payrollStatusLabel[payroll.status]}
          </Badge>
        }
      />

      <Card title="Ciclo">
        <div className="row" style={{ gap: 24 }}>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Próxima ejecución</p>
            <p>{formatDateTime(payroll.nextRun)}</p>
          </div>
          {payroll.escrow && (
            <>
              <div>
                <p className="muted" style={{ fontSize: 13 }}>Escrow del ciclo</p>
                <p className="mono">{shortAddress(payroll.escrow.trustlessWorkId)}</p>
              </div>
              <div>
                <p className="muted" style={{ fontSize: 13 }}>Fondeado</p>
                <p>{formatUSDC(payroll.escrow.fundedAmount)}</p>
              </div>
            </>
          )}
        </div>
        <hr className="divider" />
        <div className="row">
          {canEdit && (
            <>
              <Link to={`/payrolls/${payroll.id}/edit`} className="btn btn--secondary">
                Editar
              </Link>
              <Button onClick={() => setShowFund(true)}>Fondear ciclo</Button>
            </>
          )}
          {payroll.status === 'funded' && (
            <Button
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'execute' })}
            >
              Ejecutar ahora
            </Button>
          )}
          {(payroll.status === 'funded' || payroll.status === 'active') && (
            <Button
              variant="secondary"
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'pause' })}
            >
              Pausar
            </Button>
          )}
          {payroll.status === 'paused' && (
            <Button
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'resume' })}
            >
              Reanudar
            </Button>
          )}
          {payroll.status !== 'funded' && payroll.status !== 'completed' && (
            <Button
              variant="ghost"
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'archive' })}
            >
              Archivar
            </Button>
          )}
        </div>
      </Card>

      <Card title="Destinatarios">
        <table className="table">
          <thead>
            <tr>
              <th>Destinatario</th>
              <th>Wallet</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {payroll.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>
                  {item.recipientLabel ??
                    item.recipientUser?.email ??
                    'Wallet externa'}
                </td>
                <td className="mono muted">{shortAddress(item.recipientAddress)}</td>
                <td>{formatUSDC(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={`Historial de ejecuciones (${payroll.executions.length})`}>
        {payroll.executions.length === 0 ? (
          <p className="muted">Aún no se ejecutó ningún ciclo.</p>
        ) : (
          payroll.executions.map((execution) => (
            <div key={execution.id} className="milestone">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{formatDateTime(execution.executedAt)}</strong>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {formatUSDC(execution.totalAmount)} distribuidos
                  </p>
                </div>
                <Badge
                  tone={
                    execution.status === 'succeeded'
                      ? 'success'
                      : execution.status === 'failed'
                        ? 'danger'
                        : execution.status === 'partial'
                          ? 'warning'
                          : 'info'
                  }
                >
                  {execution.status}
                </Badge>
              </div>
              {execution.transactions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {execution.transactions.map((tx) => (
                    <p key={tx.id} className="muted" style={{ fontSize: 12.5 }}>
                      {formatUSDC(tx.amount)} →{' '}
                      {tx.stellarHash &&
                        (stellarExpertTxUrl(tx.stellarHash) ? (
                          <a
                            href={stellarExpertTxUrl(tx.stellarHash)!}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {shortAddress(tx.stellarHash)}
                          </a>
                        ) : (
                          <span className="mono">
                            {shortAddress(tx.stellarHash)} (simulado)
                          </span>
                        ))}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {showFund && (
        <FundModal
          total={total}
          loading={action.isPending}
          onClose={() => setShowFund(false)}
          onSubmit={(firstRun) =>
            action.mutate({
              path: 'fund',
              body: firstRun ? { firstRun: new Date(firstRun).toISOString() } : {},
            })
          }
        />
      )}
    </>
  );
}

function FundModal({
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
    <Modal title="Fondear ciclo de nómina" onClose={onClose}>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        Se despliega y fondea un escrow por {formatUSDC(total)} en Stellar. La
        distribución se ejecuta automáticamente en la fecha programada.
      </p>
      <Field
        label="Primera ejecución (opcional)"
        type="datetime-local"
        value={firstRun}
        onChange={(e) => setFirstRun(e.target.value)}
        hint="Si lo dejas vacío se programa según la frecuencia de la planilla"
      />
      <Button loading={loading} onClick={() => onSubmit(firstRun)}>
        Fondear y programar
      </Button>
    </Modal>
  );
}
