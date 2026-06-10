import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PayrollFrequency } from '@bolpay/shared';
import { api, apiErrorMessage } from '@/lib/api';
import type { EmployeeDirectoryItem, PayrollDetail } from '@/lib/types';
import { formatUSDC } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Button,
  Card,
  Field,
  PageHeader,
  SelectField,
  Spinner,
} from '@/components/ui';

interface ItemDraft {
  recipientUserId: string;
  recipientAddress: string;
  recipientLabel: string;
  amount: string;
}

const emptyItem = (): ItemDraft => ({
  recipientUserId: '',
  recipientAddress: '',
  recipientLabel: '',
  amount: '',
});

export function PayrollFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { pushToast } = useNotificationsUi();

  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<PayrollFrequency>(PayrollFrequency.Monthly);
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () =>
      (await api.get<EmployeeDirectoryItem[]>('/users/employees')).data,
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['payrolls', id],
    queryFn: async () => (await api.get<PayrollDetail>(`/payrolls/${id}`)).data,
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setFrequency(existing.frequency);
    setItems(
      existing.items.map((item) => ({
        recipientUserId: item.recipientUserId ?? '',
        recipientAddress: item.recipientUserId ? '' : item.recipientAddress,
        recipientLabel: item.recipientLabel ?? '',
        amount: item.amount,
      })),
    );
  }, [existing]);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        frequency,
        items: items.map((item) => ({
          recipientUserId: item.recipientUserId || undefined,
          recipientAddress: item.recipientUserId
            ? undefined
            : item.recipientAddress.trim(),
          recipientLabel: item.recipientLabel.trim() || undefined,
          amount: item.amount,
        })),
      };
      if (isEdit) {
        return (await api.patch<PayrollDetail>(`/payrolls/${id}`, payload)).data;
      }
      return (await api.post<PayrollDetail>('/payrolls', payload)).data;
    },
    onSuccess: (payroll) => navigate(`/payrolls/${payroll.id}`),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isEdit && isLoading) return <Spinner label="Cargando planilla…" />;

  const valid =
    name.trim().length >= 3 &&
    items.length > 0 &&
    items.every(
      (item) =>
        Number(item.amount) > 0 &&
        (item.recipientUserId || /^G[A-Z2-7]{55}$/.test(item.recipientAddress.trim())),
    );

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar planilla' : 'Nueva planilla'}
        subtitle="Empleados fijos de la plataforma o wallets Stellar externas"
      />

      <Card title="Datos">
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nómina equipo core"
        />
        <SelectField
          label="Frecuencia"
          value={frequency}
          onChange={(value) => setFrequency(value as PayrollFrequency)}
          options={[
            { value: PayrollFrequency.Weekly, label: 'Semanal' },
            { value: PayrollFrequency.Biweekly, label: 'Quincenal' },
            { value: PayrollFrequency.Monthly, label: 'Mensual' },
          ]}
        />
      </Card>

      <Card
        title={`Destinatarios — total ${formatUSDC(total)}`}
        actions={
          <Button variant="secondary" onClick={() => setItems((p) => [...p, emptyItem()])}>
            + Agregar destinatario
          </Button>
        }
      >
        {items.map((item, index) => (
          <div key={index} className="milestone">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Destinatario {index + 1}</strong>
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  Quitar
                </Button>
              )}
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <SelectField
                label="Empleado de la plataforma"
                value={item.recipientUserId}
                onChange={(value) => patchItem(setItems, index, { recipientUserId: value })}
                options={[
                  { value: '', label: 'Wallet externa…' },
                  ...(employees ?? []).map((emp) => ({
                    value: emp.id,
                    label: `${emp.name ?? emp.email}${emp.stellarAddress ? '' : ' (sin wallet)'}`,
                  })),
                ]}
              />
              {!item.recipientUserId && (
                <Field
                  label="Wallet Stellar (G…)"
                  value={item.recipientAddress}
                  onChange={(e) =>
                    patchItem(setItems, index, { recipientAddress: e.target.value })
                  }
                  placeholder="G…"
                  error={
                    item.recipientAddress &&
                    !/^G[A-Z2-7]{55}$/.test(item.recipientAddress.trim())
                      ? 'Dirección Stellar inválida'
                      : undefined
                  }
                />
              )}
              <Field
                label="Etiqueta"
                value={item.recipientLabel}
                onChange={(e) =>
                  patchItem(setItems, index, { recipientLabel: e.target.value })
                }
                placeholder="Juan — DevOps"
              />
              <Field
                label="Monto (USDC)"
                type="number"
                min="0"
                step="0.01"
                value={item.amount}
                onChange={(e) => patchItem(setItems, index, { amount: e.target.value })}
              />
            </div>
          </div>
        ))}
      </Card>

      <div className="row">
        <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
          {isEdit ? 'Guardar cambios' : 'Crear planilla'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </div>
    </>
  );
}

function patchItem(
  set: React.Dispatch<React.SetStateAction<ItemDraft[]>>,
  index: number,
  patch: Partial<ItemDraft>,
) {
  set((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
}
