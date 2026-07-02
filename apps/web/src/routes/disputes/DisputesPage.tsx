import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { DisputeListItem } from '@/lib/types';
import {
  disputeStatusLabel,
  disputeStatusTone,
  formatDateTime,
  formatUSDC,
} from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';

/** Disputes list: paused milestones with funds locked until they are resolved. */
export function DisputesPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => (await api.get<DisputeListItem[]>('/disputes')).data,
  });

  return (
    <>
      <PageHeader
        title="Disputes"
        subtitle="Paused milestones with funds locked until they are resolved"
      />
      <Card>
        {isLoading ? (
          <Spinner label="Loading disputes…" />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error)} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No disputes"
            hint="You can open one from a milestone's detail view."
          />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Contract</th>
                <th>Amount</th>
                <th>Opened by</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((dispute) => (
                <tr key={dispute.id} onClick={() => navigate(`/disputes/${dispute.id}`)}>
                  <td style={{ fontWeight: 600 }}>{dispute.milestone.title}</td>
                  <td className="muted">{dispute.milestone.contract.title}</td>
                  <td>{formatUSDC(dispute.milestone.amount)}</td>
                  <td className="muted">{dispute.openedBy.email}</td>
                  <td>
                    <Badge tone={disputeStatusTone[dispute.status]}>
                      {disputeStatusLabel[dispute.status]}
                    </Badge>
                  </td>
                  <td className="muted">{formatDateTime(dispute.openedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
