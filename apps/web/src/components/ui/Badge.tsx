/** Badge: colored status pill used to surface enum states (design tokens in index.css). */
import type { ReactNode } from 'react';

/** Colored status pill. */
export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
