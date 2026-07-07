/**
 * Categorical palette wired to the design-system CSS variables (defined in
 * index.css for both themes), so every chart recolours itself in dark mode
 * without any JS. Series cycle through these in order.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;

/** Colour for slice/series `i`, cycling through the palette. */
export function colorAt(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

/** Humanize an enum key ("pending_acceptance" -> "Pending acceptance"). */
export function humanize(key: string): string {
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Round `raw` up to a "nice" step (1, 2 or 5 times a power of ten) so axis
 * ticks land on readable values.
 */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

/** Evenly spaced tick values from 0 up to at least `max` (about `count` of them). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = niceStep(max / count);
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 1e-6; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}
