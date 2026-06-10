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

const frequencyLabel = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

export function PayrollsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => (await api.get<PayrollDetail[]>('/payrolls')).data,
  });

  return (
    <>
      <PageHeader
        title="Nómina on-chain"
        subtitle="Planillas periódicas con distribución automática en USDC"
        actions={
          <Link to="/payrolls/new" className="btn btn--primary">
            + Nueva planilla
          </Link>
        }
      />
      <Card>
        {isLoading ? (
          <Spinner label="Cargando planillas…" />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No hay planillas"
            hint="Crea una planilla, agrégale destinatarios y fondéala para programar la distribución."
          />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Planilla</th>
                <th>Frecuencia</th>
                <th>Destinatarios</th>
                <th>Total por ciclo</th>
                <th>Próxima ejecución</th>
                <th>Estado</th>
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
