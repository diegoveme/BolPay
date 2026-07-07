import type { CategoryCount } from '@bolpay/shared';
import { colorAt, humanize } from './theme';

/** Colour-swatch legend shared by the categorical charts. */
export function ChartLegend({
  items,
  format = (n) => String(n),
  label = humanize,
}: {
  items: CategoryCount[];
  format?: (value: number) => string;
  label?: (key: string) => string;
}) {
  return (
    <div className="chart-legend">
      {items.map((item, i) => (
        <span key={item.key} className="chart-legend__item">
          <span
            className="chart-legend__swatch"
            style={{ background: colorAt(i) }}
          />
          {label(item.key)}
          <span className="chart-legend__value">{format(item.value)}</span>
        </span>
      ))}
    </div>
  );
}
