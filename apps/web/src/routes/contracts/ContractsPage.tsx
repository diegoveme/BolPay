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

/** Lists the current user's contracts (company or freelancer view). */
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
        title="Contracts"
        subtitle="Milestone-based agreements backed by escrow on Stellar"
        actions={
          user?.role === 'company' && (
            <Link to="/contracts/new" className="btn btn--primary">
              + New contract
            </Link>
          )
        }
      />
      <Card>
        {isLoading ? (
          <Spinner label="Loading contracts…" />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No contracts"
            hint={
              user?.role === 'company'
                ? 'Create your first one with the “New contract” button.'
                : 'When you receive a proposal it will appear here.'
            }
          />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Contract</th>
                <th>{user?.role === 'freelancer' ? 'Company' : 'Freelancer'}</th>
                <th>Total amount</th>
                <th>Milestones</th>
                <th>Status</th>
                <th>Created</th>
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
                    {contract.milestones.length} paid
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
