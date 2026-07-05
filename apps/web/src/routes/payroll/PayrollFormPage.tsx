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
  amount: string;
}

const emptyItem = (): ItemDraft => ({
  recipientUserId: '',
  amount: '',
});

/**
 * Form to create or edit a payroll: name, frequency and a list of fixed-employee
 * recipients with their amounts. Submits to create or update the payroll.
 */
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
        amount: item.amount,
      })),
    );
  }, [existing]);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  // Only registered fixed employees who have already connected a wallet can be paid.
  const payableEmployees = (employees ?? []).filter((e) => e.stellarAddress);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        frequency,
        items: items.map((item) => ({
          recipientUserId: item.recipientUserId,
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

  if (isEdit && isLoading) return <Spinner label="Loading payroll…" />;

  const valid =
    name.trim().length >= 3 &&
    items.length > 0 &&
    items.every((item) => Number(item.amount) > 0 && item.recipientUserId !== '');

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit payroll' : 'New payroll'}
        subtitle="Recurring payments to your registered fixed employees"
      />

      <Card title="Details">
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Core team payroll"
        />
        <SelectField
          label="Frequency"
          value={frequency}
          onChange={(value) => setFrequency(value as PayrollFrequency)}
          options={[
            { value: PayrollFrequency.Weekly, label: 'Weekly' },
            { value: PayrollFrequency.Biweekly, label: 'Biweekly' },
            { value: PayrollFrequency.Monthly, label: 'Monthly' },
          ]}
        />
      </Card>

      <Card
        title={`Recipients · total ${formatUSDC(total)}`}
        actions={
          <Button variant="secondary" onClick={() => setItems((p) => [...p, emptyItem()])}>
            + Add recipient
          </Button>
        }
      >
        {payableEmployees.length === 0 && (
          <p className="muted" style={{ marginBottom: 12 }}>
            You don't have any fixed employees with a connected wallet yet. Invite
            them by email as a "fixed employee"; once they sign in and connect their
            wallet you can add them to the payroll.
          </p>
        )}
        {items.map((item, index) => (
          <div key={index} className="milestone">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Recipient {index + 1}</strong>
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              )}
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <SelectField
                label="Fixed employee"
                value={item.recipientUserId}
                onChange={(value) => patchItem(setItems, index, { recipientUserId: value })}
                options={[
                  { value: '', label: 'Select an employee…' },
                  ...payableEmployees.map((emp) => ({
                    value: emp.id,
                    label: emp.name ?? emp.email,
                  })),
                ]}
              />
              <Field
                label="Amount (USDC)"
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
          {isEdit ? 'Save changes' : 'Create payroll'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </>
  );
}

/** Updates a single recipient draft at the given index with a partial patch. */
function patchItem(
  set: React.Dispatch<React.SetStateAction<ItemDraft[]>>,
  index: number,
  patch: Partial<ItemDraft>,
) {
  set((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
}
