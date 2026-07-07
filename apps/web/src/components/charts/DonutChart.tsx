import { arc, pie, type PieArcDatum } from 'd3-shape';
import type { CategoryCount } from '@bolpay/shared';
import { ChartLegend } from './ChartLegend';
import { colorAt, humanize } from './theme';

const RADIUS = 100;

/**
 * Donut breakdown of a categorical count (roles, statuses). Built on the Rosen
 * Charts pie technique (d3 `pie` + `arc`) with a hollow centre showing the
 * total; slices use the shared palette and a legend lists each category.
 */
export function DonutChart({
  data,
  caption,
  label = humanize,
  format = (n) => String(n),
}: {
  data: CategoryCount[];
  caption?: string;
  label?: (key: string) => string;
  format?: (value: number) => string;
}) {
  const slices = data.filter((d) => d.value > 0);
  if (slices.length === 0) return <div className="chart-empty">No data yet</div>;

  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const layout = pie<CategoryCount>()
    .value((d) => d.value)
    .padAngle(0.02)
    .sort(null);
  const arcGen = arc<PieArcDatum<CategoryCount>>()
    .innerRadius(RADIUS * 0.62)
    .outerRadius(RADIUS)
    .cornerRadius(3);
  const arcs = layout(slices);

  return (
    <div>
      <div className="chart-donut">
        <svg
          width="100%"
          viewBox={`-${RADIUS} -${RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
        >
          {arcs.map((a, i) => (
            <path key={i} d={arcGen(a) ?? undefined} fill={colorAt(i)}>
              <title>{`${label(a.data.key)}: ${format(a.data.value)}`}</title>
            </path>
          ))}
        </svg>
        <div className="chart-donut__center">
          <span className="chart-donut__total">{format(total)}</span>
          {caption && <span className="chart-donut__caption">{caption}</span>}
        </div>
      </div>
      <ChartLegend items={slices} format={format} label={label} />
    </div>
  );
}
