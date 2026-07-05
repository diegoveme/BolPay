/** Placeholder states: empty-list placeholder and inline error panel. */
/** Placeholder shown when a list or section has no content. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {hint && <p className="empty__hint">{hint}</p>}
    </div>
  );
}

/** Inline error panel with an alert role. */
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty empty--error" role="alert">
      <p className="empty__title">Something went wrong</p>
      <p className="empty__hint">{message}</p>
    </div>
  );
}
