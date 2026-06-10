import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';
import type { ContractListItem } from '@/lib/types';
import {
  contractStatusLabel,
  contractStatusTone,
  formatDate,
  formatUSDC,
} from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  ErrorState,
} from '@/components/ui';
import { apiErrorMessage } from '@/lib/api';

export function ContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => (await api.get<ContractListItem[]>('/contracts')).data,
  });

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle="Acuerdos con milestones respaldados por escrow en Stellar"
        actions={
          user?.role === 'company' && (
            <Link to="/contracts/new" className="btn btn--primary">
              + Nuevo contrato
            </Link>
          )
        }
      />
      <Card>
        {isLoading ? (
          <Spinner label="Cargando contratos…" />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No hay contratos"
            hint={
              user?.role === 'company'
                ? 'Crea el primero con el botón “Nuevo contrato”.'
                : 'Cuando recibas una propuesta aparecerá aquí.'
            }
          />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>{user?.role === 'freelancer' ? 'Empresa' : 'Freelancer'}</th>
                <th>Monto total</th>
                <th>Milestones</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <td style={{ fontWeight: 600 }}>{contract.title}</td>
                  <td className="muted">
                    {user?.role === 'freelancer'
                      ? contract.company.name
                      : contract.freelancer.displayName}
                  </td>
                  <td>{formatUSDC(contract.totalAmount)}</td>
                  <td className="muted">
                    {contract.milestones.filter((m) => m.status === 'released').length}/
                    {contract.milestones.length} pagados
                  </td>
                  <td>
                    <Badge tone={contractStatusTone[contract.status]}>
                      {contractStatusLabel[contract.status]}
                    </Badge>
                  </td>
                  <td className="muted">{formatDate(contract.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
