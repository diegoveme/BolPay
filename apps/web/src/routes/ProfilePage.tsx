import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePollar } from '@pollar/react';
import { UserRole } from '@bolpay/shared';
import type { Invitation } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate, roleLabel } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  SelectField,
  TextareaField,
} from '@/components/ui';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const pollar = usePollar();
  const { pushToast } = useNotificationsUi();

  const [companyName, setCompanyName] = useState(user?.companyProfile?.name ?? '');
  const [companyDescription, setCompanyDescription] = useState(
    user?.companyProfile?.description ?? '',
  );
  const [displayName, setDisplayName] = useState(
    user?.freelancerProfile?.displayName ?? '',
  );
  const [headline, setHeadline] = useState(user?.freelancerProfile?.headline ?? '');

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (user?.role === 'company') {
        return api.patch('/users/me/company-profile', {
          name: companyName.trim() || undefined,
          description: companyDescription.trim() || undefined,
        });
      }
      return api.patch('/users/me/freelancer-profile', {
        displayName: displayName.trim() || undefined,
        headline: headline.trim() || undefined,
      });
    },
    onSuccess: () => {
      pushToast('Perfil actualizado');
      void refreshUser();
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (!user) return null;

  return (
    <>
      <PageHeader title="Perfil" subtitle={`${roleLabel[user.role]} · ${user.email}`} />

      <Card title="Wallet Stellar (Pollar)">
        <div className="row" style={{ gap: 24 }}>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Dirección</p>
            <p className="mono">{user.stellarAddress ?? 'Sin wallet vinculada'}</p>
          </div>
          {pollar.isAuthenticated && (
            <div className="row">
              <Button variant="secondary" onClick={() => pollar.openWalletBalanceModal()}>
                Ver saldo
              </Button>
              <Button variant="secondary" onClick={() => pollar.openReceiveModal()}>
                Recibir
              </Button>
              <Button variant="secondary" onClick={() => pollar.openSendModal()}>
                Enviar
              </Button>
            </div>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          La wallet es custodiada por Pollar (AWS KMS): los pagos de milestones y
          nómina llegan directamente a esta dirección en la red Stellar.
        </p>
      </Card>

      {user.role === 'company' && (
        <Card title="Perfil empresarial">
          <Field
            label="Nombre de la empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <TextareaField
            label="Descripción"
            value={companyDescription}
            onChange={setCompanyDescription}
          />
          <Button loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            Guardar
          </Button>
        </Card>
      )}

      {user.role === 'freelancer' && (
        <Card title="Perfil profesional">
          <Field
            label="Nombre público"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Field
            label="Titular"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Full-stack developer — React / NestJS"
          />
          <Button loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            Guardar
          </Button>
        </Card>
      )}

      {(user.role === 'company' || user.role === 'administrator') && <InvitationsCard />}
    </>
  );
}

function InvitationsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useNotificationsUi();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FixedEmployee);

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => (await api.get<Invitation[]>('/users/invitations')).data,
  });

  const invite = useMutation({
    mutationFn: async () =>
      (await api.post<Invitation & { token: string }>('/users/invitations', {
        email: email.trim().toLowerCase(),
        role,
      })).data,
    onSuccess: async (invitation) => {
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
      await navigator.clipboard.writeText(invitation.token).catch(() => undefined);
      pushToast('Invitación creada — código copiado al portapapeles');
    },
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/invitations/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['invitations'] }),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  const roleOptions = [
    { value: UserRole.FixedEmployee, label: 'Empleado fijo' },
    { value: UserRole.Freelancer, label: 'Freelancer' },
    { value: UserRole.Company, label: 'Empresa' },
    ...(user?.role === 'administrator'
      ? [{ value: UserRole.Administrator, label: 'Administrador' }]
      : []),
  ];

  return (
    <Card title="Invitaciones por correo">
      <div className="form-grid">
        <Field
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nuevo@correo.com"
        />
        <SelectField
          label="Rol"
          value={role}
          onChange={(value) => setRole(value as UserRole)}
          options={roleOptions}
        />
      </div>
      <Button
        loading={invite.isPending}
        disabled={!email.includes('@')}
        onClick={() => invite.mutate()}
      >
        Invitar
      </Button>

      {invitations && invitations.length > 0 && (
        <>
          <hr className="divider" />
          <table className="table">
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td className="muted">{roleLabel[invitation.role]}</td>
                  <td>
                    <Badge
                      tone={
                        invitation.status === 'accepted'
                          ? 'success'
                          : invitation.status === 'pending'
                            ? 'info'
                            : 'neutral'
                      }
                    >
                      {invitation.status}
                    </Badge>
                  </td>
                  <td className="muted">expira {formatDate(invitation.expiresAt)}</td>
                  <td>
                    {invitation.status === 'pending' && (
                      <Button variant="ghost" onClick={() => revoke.mutate(invitation.id)}>
                        Revocar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
