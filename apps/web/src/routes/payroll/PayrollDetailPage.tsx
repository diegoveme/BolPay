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
import { FundModal } from './FundModal';

/**
 * Shows a single payroll: cycle info, recipients and execution history, with
 * actions to edit, fund, run, pause/resume and archive the payroll.
 */
export function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();
  const [showFund, setShowFund] = useState(false);
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

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

  // Non-custodial funding: the company signs the fund XDR with its own wallet.
  const sign = useWalletSign();
  const fundMutation = useMutation({
    mutationFn: async (firstRun: string) => {
      const { data } = await api.post<{ unsignedXdr: string | null }>(
        `/payrolls/${id}/fund/prepare`,
      );
      const txHash = data.unsignedXdr ? await sign(data.unsignedXdr) : undefined;
      return api.post(`/payrolls/${id}/fund/confirm`, {
        ...(txHash ? { txHash } : {}),
        ...(firstRun ? { firstRun: new Date(firstRun).toISOString() } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      setShowFund(false);
      pushToast('Payroll escrow funded');
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isLoading) return <Spinner label="Loading payroll…" />;
  if (error || !payroll) return <ErrorState message={apiErrorMessage(error)} />;

  const total = payroll.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const canEdit = ['draft', 'active', 'paused'].includes(payroll.status);

  return (
    <>
      <PageHeader
        title={payroll.name}
        subtitle={`${payroll.items.length} recipients · ${formatUSDC(total)} per cycle`}
        actions={
          <Badge tone={payrollStatusTone[payroll.status]}>
            {payrollStatusLabel[payroll.status]}
          </Badge>
        }
      />

      <Card title="Cycle">
        <div className="row" style={{ gap: 24 }}>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Next run</p>
            <p>{formatDateTime(payroll.nextRun)}</p>
          </div>
          {payroll.escrow && (
            <>
              <div>
                <p className="muted" style={{ fontSize: 13 }}>Cycle escrow</p>
                <p className="mono">{shortAddress(payroll.escrow.trustlessWorkId)}</p>
              </div>
              <div>
                <p className="muted" style={{ fontSize: 13 }}>Funded</p>
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
                Edit
              </Link>
              <Button onClick={() => setShowFund(true)}>Fund cycle</Button>
            </>
          )}
          {payroll.status === 'funded' && (
            <Button onClick={() => setConfirmExecute(true)}>Run now</Button>
          )}
          {(payroll.status === 'funded' || payroll.status === 'active') && (
            <Button
              variant="secondary"
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'pause' })}
            >
              Pause
            </Button>
          )}
          {payroll.status === 'paused' && (
            <Button
              loading={action.isPending}
              onClick={() => action.mutate({ path: 'resume' })}
            >
              Resume
            </Button>
          )}
          {payroll.status !== 'funded' && payroll.status !== 'completed' && (
            <Button variant="ghost" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          )}
        </div>
      </Card>

      <Card title="Recipients">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Wallet</th>
              <th>Amount</th>
              <th>Last transaction</th>
            </tr>
          </thead>
          <tbody>
            {payroll.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>
                  {item.recipientLabel ??
                    item.recipientUser?.email ??
                    'External wallet'}
                </td>
                <td className="mono muted">{shortAddress(item.recipientAddress)}</td>
                <td>{formatUSDC(item.amount)}</td>
                <td>
                  <TxLink hash={item.transactions[0]?.stellarHash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={`Execution history (${payroll.executions.length})`}>
        {payroll.executions.length === 0 ? (
          <p className="muted">No cycle has run yet.</p>
        ) : (
          payroll.executions.map((execution) => (
            <div key={execution.id} className="milestone">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{formatDateTime(execution.executedAt)}</strong>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {formatUSDC(execution.totalAmount)} distributed
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
                      {formatUSDC(tx.amount)} → <TxLink hash={tx.stellarHash} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {confirmExecute && (
        <ConfirmModal
          title="Run payroll now"
          danger
          confirmLabel={`Distribute ${formatUSDC(total)}`}
          loading={action.isPending}
          onClose={() => setConfirmExecute(false)}
          onConfirm={() =>
            action.mutate(
              { path: 'execute' },
              { onSuccess: () => setConfirmExecute(false) },
            )
          }
        >
          <p>
            {formatUSDC(total)} will be distributed to {payroll.items.length}{' '}
            recipients from the escrow.
          </p>
          <div className="modal__danger-note">
            The distribution is on-chain and irreversible.
          </div>
        </ConfirmModal>
      )}
      {confirmArchive && (
        <ConfirmModal
          title="Archive payroll"
          danger
          confirmLabel="Archive payroll"
          loading={action.isPending}
          onClose={() => setConfirmArchive(false)}
          onConfirm={() =>
            action.mutate(
              { path: 'archive' },
              { onSuccess: () => setConfirmArchive(false) },
            )
          }
        >
          <p>
            The payroll <strong>{payroll.name}</strong> will be archived and will
            stop running. If it holds funds in escrow, they will be returned to the
            company.
          </p>
        </ConfirmModal>
      )}
      {showFund && (
        <FundModal
          total={total}
          loading={fundMutation.isPending}
          onClose={() => setShowFund(false)}
          onSubmit={(firstRun) => fundMutation.mutate(firstRun)}
        />
      )}
    </>
  );
}

/**
 * Render a transaction hash as a link to the Stellar explorer, a "(simulated)"
 * tag when there is no explorer URL (simulated escrow mode), or a placeholder
 * when the recipient has not been paid yet.
 */
function TxLink({ hash }: { hash?: string | null }) {
  if (!hash) return <span className="muted">·</span>;
  const url = stellarTxUrl(hash);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="mono">
      {shortAddress(hash)}
    </a>
  ) : (
    <span className="mono muted">{shortAddress(hash)} (simulated)</span>
  );
}
