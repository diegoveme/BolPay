/** Spinner: centered loading spinner with an optional caption. */
/** Centered loading spinner with an optional caption. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" aria-hidden />
      {label && <p>{label}</p>}
    </div>
  );
}
