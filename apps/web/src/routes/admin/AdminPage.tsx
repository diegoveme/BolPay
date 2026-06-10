import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ActivityLog, Escrow, User } from '@bolpay/shared';
import { api, apiErrorMessage } from '@/lib/api';
import {
  formatDateTime,
  formatUSDC,
  roleLabel,
  shortAddress,
} from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';

type Tab = 'users' | 'escrows' | 'activity';

interface AdminEscrow extends Escrow {
  contract?: { id: string; title: string } | null;
  payroll?: { id: string; name: string } | null;
}

interface AdminActivity extends ActivityLog {
  user?: { id: string; email: string; role: string };
}

/** Platform supervision: users, escrow monitor and global activity (docs §Roles). */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Supervisión de la plataforma: usuarios, escrows y actividad global"
        actions={
          <div className="row">
            {(['users', 'escrows', 'activity'] as Tab[]).map((t) => (
              <Button
                key={t}
                variant={tab === t ? 'primary' : 'secondary'}
                onClick={() => setTab(t)}
              >
                {t === 'users' ? 'Usuarios' : t === 'escrows' ? 'Escrows' : 'Actividad'}
              </Button>
            ))}
          </div>
        }
      />
      {tab === 'users' && <UsersTab />}
      {tab === 'escrows' && <EscrowsTab />}
      {tab === 'activity' && <ActivityTab />}
    </>
  );
}

function UsersTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin usuarios" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Wallet</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600 }}>{user.email}</td>
                <td className="muted">
                  {user.name ??
                    user.companyProfile?.name ??
                    user.freelancerProfile?.displayName ??
                    '—'}
                </td>
                <td>
                  <Badge tone="info">{roleLabel[user.role]}</Badge>
                </td>
                <td className="mono muted">{shortAddress(user.stellarAddress)}</td>
                <td className="muted">{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function EscrowsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'escrows'],
    queryFn: async () => (await api.get<AdminEscrow[]>('/escrows')).data,
  });
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin escrows" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Origen</th>
              <th>Tipo</th>
              <th>Contrato Soroban</th>
              <th>Fondeado</th>
              <th>Liberado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((escrow) => (
              <tr key={escrow.id}>
                <td style={{ fontWeight: 600 }}>
                  {escrow.contract?.title ?? escrow.payroll?.name ?? '—'}
                </td>
                <td className="muted">{escrow.type}</td>
                <td className="mono muted">{shortAddress(escrow.trustlessWorkId)}</td>
                <td>{formatUSDC(escrow.fundedAmount)}</td>
                <td>{formatUSDC(escrow.releasedAmount ?? '0')}</td>
                <td>
                  <Badge
                    tone={
                      escrow.status === 'released'
                        ? 'success'
                        : escrow.status === 'disputed'
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {escrow.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function ActivityTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: async () => (await api.get<AdminActivity[]>('/activity-logs/all')).data,
  });
  return (
    <Card>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={apiErrorMessage(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin actividad" />
      ) : (
        <table className="table">
          <tbody>
            {data.map((log) => (
              <tr key={log.id}>
                <td className="mono">{log.event}</td>
                <td className="muted">{log.user?.email}</td>
                <td className="muted">{formatDateTime(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
