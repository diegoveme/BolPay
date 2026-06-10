import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ActivityLog } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';
import type { ContractListItem } from '@/lib/types';
import { formatDateTime, formatUSDC, roleLabel } from '@/lib/format';
import { Card, EmptyState, PageHeader, Spinner, Stat } from '@/components/ui';

export function DashboardPage() {
  const { user } = useAuth();
  const managesContracts = user?.role !== 'fixed_employee';

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => (await api.get<ContractListItem[]>('/contracts')).data,
    enabled: managesContracts,
  });

  const { data: activity } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => (await api.get<ActivityLog[]>('/activity-logs')).data,
  });

  const active = contracts?.filter((c) => c.status === 'active') ?? [];
  const pending = contracts?.filter((c) => c.status === 'pending_acceptance') ?? [];
  const completed = contracts?.filter((c) => c.status === 'completed') ?? [];
  const lockedAmount = active.reduce((sum, c) => sum + Number(c.totalAmount), 0);

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name ?? user?.email}`}
        subtitle={`Panel de ${roleLabel[user!.role].toLowerCase()} — pagos en USDC sobre Stellar`}
      />

      {managesContracts && (
        <div className="stats-grid">
          <Stat label="Contratos activos" value={active.length} />
          <Stat label="Pendientes de aceptación" value={pending.length} />
          <Stat label="Completados" value={completed.length} />
          <Stat label="USDC en escrow (activos)" value={formatUSDC(lockedAmount)} />
        </div>
      )}

      {managesContracts && (
        <Card title="Contratos recientes">
          {isLoading ? (
            <Spinner />
          ) : !contracts || contracts.length === 0 ? (
            <EmptyState
              title="Aún no hay contratos"
              hint={
                user?.role === 'company'
                  ? 'Crea tu primer contrato desde la sección Contratos.'
                  : 'Cuando una empresa te envíe un contrato aparecerá aquí.'
              }
            />
          ) : (
            <table className="table">
              <tbody>
                {contracts.slice(0, 5).map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <Link to={`/contracts/${contract.id}`} style={{ fontWeight: 600 }}>
                        {contract.title}
                      </Link>
                    </td>
                    <td className="muted">
                      {user?.role === 'freelancer'
                        ? contract.company.name
                        : contract.freelancer.displayName}
                    </td>
                    <td>{formatUSDC(contract.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card title="Actividad reciente">
        {!activity || activity.length === 0 ? (
          <EmptyState title="Sin actividad registrada todavía" />
        ) : (
          <table className="table">
            <tbody>
              {activity.slice(0, 8).map((log) => (
                <tr key={log.id}>
                  <td className="mono">{log.event}</td>
                  <td className="muted">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
