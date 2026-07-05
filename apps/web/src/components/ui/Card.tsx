/** Card: bordered content panel with an optional title and header actions. */
import type { ReactNode } from 'react';

/** Bordered content panel with an optional title and header actions. */
export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
