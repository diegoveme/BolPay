import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { PayrollDetail } from '@/lib/types';
import {
  formatDateTime,
  formatUSDC,
  payrollStatusLabel,
  payrollStatusTone,
} from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';

/** Maps a payroll frequency value to its display label. */
const frequencyLabel = { weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

/**
 * Lists all payrolls in a table, showing frequency, recipient count, per-cycle
 * total, next run and status. Rows link to the payroll detail page.
 */
export function PayrollsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => (await api.get<PayrollDetail[]>('/payrolls')).data,
  });

  return (
    <>
      <PageHeader
        title="On-chain payroll"
        subtitle="Recurring payrolls with automatic USDC distribution"
        actions={
          <Link to="/payrolls/new" className="btn btn--primary">
            + New payroll
          </Link>
        }
      />
      <Card>
        {isLoading ? (
          <Spinner label="Loading payrolls…" />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No payrolls"
            hint="Create a payroll, add recipients and fund it to schedule the distribution."
          />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Payroll</th>
                <th>Frequency</th>
                <th>Recipients</th>
                <th>Total per cycle</th>
                <th>Next run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((payroll) => {
                const total = payroll.items.reduce(
                  (sum, item) => sum + Number(item.amount),
                  0,
                );
                return (
                  <tr key={payroll.id} onClick={() => navigate(`/payrolls/${payroll.id}`)}>
                    <td style={{ fontWeight: 600 }}>{payroll.name}</td>
                    <td className="muted">{frequencyLabel[payroll.frequency]}</td>
                    <td className="muted">{payroll.items.length}</td>
                    <td>{formatUSDC(total)}</td>
                    <td className="muted">{formatDateTime(payroll.nextRun)}</td>
                    <td>
                      <Badge tone={payrollStatusTone[payroll.status]}>
                        {payrollStatusLabel[payroll.status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
