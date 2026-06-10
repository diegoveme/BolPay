import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import type { ContractDetail, FreelancerDirectoryItem } from '@/lib/types';
import { formatUSDC } from '@/lib/format';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import {
  Button,
  Card,
  Field,
  PageHeader,
  SelectField,
  Spinner,
  TextareaField,
} from '@/components/ui';

interface MilestoneDraft {
  title: string;
  description: string;
  amount: string;
  deadline: string;
}

const emptyMilestone = (): MilestoneDraft => ({
  title: '',
  description: '',
  amount: '',
  deadline: '',
});

/** Create or edit (draft / changes_requested) a contract with its milestones. */
export function ContractFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { pushToast } = useNotificationsUi();

  const [freelancerId, setFreelancerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([emptyMilestone()]);

  const { data: freelancers } = useQuery({
    queryKey: ['freelancers'],
    queryFn: async () =>
      (await api.get<FreelancerDirectoryItem[]>('/users/freelancers')).data,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['contracts', id],
    queryFn: async () => (await api.get<ContractDetail>(`/contracts/${id}`)).data,
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setFreelancerId(existing.freelancerId);
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setDeadline(existing.deadline?.slice(0, 10) ?? '');
    setMilestones(
      existing.milestones.map((m) => ({
        title: m.title,
        description: m.description ?? '',
        amount: m.amount,
        deadline: m.deadline?.slice(0, 10) ?? '',
      })),
    );
  }, [existing]);

  const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        milestones: milestones.map((m) => ({
          title: m.title.trim(),
          description: m.description.trim() || undefined,
          amount: m.amount,
          deadline: m.deadline || undefined,
        })),
      };
      if (isEdit) {
        return (await api.patch<ContractDetail>(`/contracts/${id}`, payload)).data;
      }
      return (
        await api.post<ContractDetail>('/contracts', { ...payload, freelancerId })
      ).data;
    },
    onSuccess: (contract) => navigate(`/contracts/${contract.id}`),
    onError: (err) => pushToast(apiErrorMessage(err)),
  });

  if (isEdit && loadingExisting) return <Spinner label="Cargando contrato…" />;

  const valid =
    title.trim().length >= 3 &&
    (isEdit || freelancerId) &&
    milestones.length > 0 &&
    milestones.every((m) => m.title.trim().length >= 2 && Number(m.amount) > 0);

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar contrato' : 'Nuevo contrato'}
        subtitle="Define los milestones: cada uno se paga desde el escrow al ser aprobado"
      />

      <Card title="Datos generales">
        {!isEdit && (
          <SelectField
            label="Freelancer"
            value={freelancerId}
            onChange={setFreelancerId}
            options={[
              { value: '', label: 'Selecciona un freelancer…' },
              ...(freelancers ?? []).map((f) => ({
                value: f.id,
                label: `${f.displayName} (${f.user.email})`,
              })),
            ]}
          />
        )}
        <Field
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Desarrollo de app móvil"
          required
        />
        <TextareaField
          label="Descripción"
          value={description}
          onChange={setDescription}
          placeholder="Alcance, entregables esperados, condiciones…"
          rows={4}
        />
        <Field
          label="Fecha límite (opcional)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </Card>

      <Card
        title={`Milestones — total ${formatUSDC(total)}`}
        actions={
          <Button
            variant="secondary"
            onClick={() => setMilestones((prev) => [...prev, emptyMilestone()])}
          >
            + Agregar milestone
          </Button>
        }
      >
        {milestones.map((milestone, index) => (
          <div key={index} className="milestone">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Milestone {index + 1}</strong>
              {milestones.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setMilestones((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Quitar
                </Button>
              )}
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <Field
                label="Título"
                value={milestone.title}
                onChange={(e) =>
                  updateMilestone(setMilestones, index, { title: e.target.value })
                }
                placeholder="Diseño UI/UX"
              />
              <Field
                label="Monto (USDC)"
                type="number"
                min="0"
                step="0.01"
                value={milestone.amount}
                onChange={(e) =>
                  updateMilestone(setMilestones, index, { amount: e.target.value })
                }
                placeholder="500.00"
              />
              <Field
                label="Deadline (opcional)"
                type="date"
                value={milestone.deadline}
                onChange={(e) =>
                  updateMilestone(setMilestones, index, { deadline: e.target.value })
                }
              />
            </div>
            <TextareaField
              label="Entregables esperados"
              value={milestone.description}
              onChange={(value) => updateMilestone(setMilestones, index, { description: value })}
              rows={2}
            />
          </div>
        ))}
      </Card>

      <div className="row">
        <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
          {isEdit ? 'Guardar cambios' : 'Crear borrador'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </div>
    </>
  );
}

function updateMilestone(
  set: React.Dispatch<React.SetStateAction<MilestoneDraft[]>>,
  index: number,
  patch: Partial<MilestoneDraft>,
) {
  set((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
}
