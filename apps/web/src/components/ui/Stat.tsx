/** Stat: single metric tile showing a value above its label. */
import type { ReactNode } from 'react';

/** Single metric tile showing a value above its label. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <p className="stat__value">{value}</p>
      <p className="stat__label">{label}</p>
    </div>
  );
}
