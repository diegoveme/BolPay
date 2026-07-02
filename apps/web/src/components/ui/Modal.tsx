/** Modal primitives: base dialog and a confirmation dialog for risky actions. */
import type { ReactNode } from 'react';
import { Button } from './Button';

/** Centered dialog with a backdrop that closes on outside click. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for irreversible / money-moving actions (accept contract,
 * fund escrow, approve milestone, resolve dispute, execute payroll...). Always
 * state the consequence; echo the amount in the confirm label where relevant.
 */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
  loading = false,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal title={title} onClose={loading ? () => {} : onClose}>
      <div>{children}</div>
      <div className="modal__footer">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
