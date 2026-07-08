import { type CSSProperties } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { SeriesLegend } from './ChartLegend';
import { niceTicks } from './theme';

/** One measured series within a grouped bar chart. */
export interface Series {
  /** Key into each datum holding this series' numeric value. */
  key: string;
  label: string;
  color: string;
}

type Datum = { label: string };

/** Read a numeric series value from a datum by key (0 when missing). */
const val = (d: Datum, key: string): number =>
  Number((d as Record<string, unknown>)[key]) || 0;

/**
 * Grouped vertical bar chart: several series side by side per label (e.g.
 * contracts and payrolls per month). Same 0-100 viewBox technique as BarChart,
 * with an inner band scale positioning each series' bar inside its group.
 */
export function GroupedBarChart({
  data,
  series,
  format = (n) => String(n),
}: {
  data: Datum[];
  series: Series[];
  format?: (value: number) => string;
}) {
  const max = Math.max(
    0,
    ...data.flatMap((d) => series.map((s) => val(d, s.key))),
  );
  if (max <= 0) return <div className="chart-empty">No data yet</div>;

  const x = scaleBand()
    .domain(data.map((_, i) => String(i)))
    .range([0, 100])
    .padding(0.28);
  const inner = scaleBand()
    .domain(series.map((s) => s.key))
    .range([0, x.bandwidth()])
    .padding(0.12);
  const y = scaleLinear().domain([0, max]).range([100, 0]);
  const ticks = niceTicks(max, 4);

  return (
    <div>
      <div
        className="chart chart--plot"
        style={
          {
            '--m-top': '6px',
            '--m-right': '4px',
            '--m-bottom': '22px',
            '--m-left': '40px',
          } as CSSProperties
        }
      >
        <div
          style={{
            position: 'absolute',
            top: 'var(--m-top)',
            left: 'var(--m-left)',
            right: 'var(--m-right)',
            bottom: 'var(--m-bottom)',
          }}
        >
          {ticks.map((t, i) => (
            <div
              key={`y${i}`}
              className="chart__axis"
              style={{
                top: `${y(t)}%`,
                left: 0,
                transform: 'translate(calc(-100% - 6px), -50%)',
              }}
            >
              {format(t)}
            </div>
          ))}

          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {ticks.map((t, i) => (
              <line
                key={`g${i}`}
                className="chart__grid"
                x1={0}
                x2={100}
                y1={y(t)}
                y2={y(t)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {data.map((d, i) =>
              series.map((s) => {
                const v = val(d, s.key);
                const by = y(v);
                return (
                  <rect
                    key={`${i}-${s.key}`}
                    className="chart__bar"
                    x={(x(String(i)) ?? 0) + (inner(s.key) ?? 0)}
                    y={by}
                    width={inner.bandwidth()}
                    height={100 - by}
                    rx={1}
                    fill={s.color}
                  >
                    <title>{`${d.label} · ${s.label}: ${format(v)}`}</title>
                  </rect>
                );
              }),
            )}
          </svg>

          {data.map((d, i) => (
            <div
              key={`x${i}`}
              className="chart__axis"
              style={{
                top: '100%',
                left: `${(x(String(i)) ?? 0) + x.bandwidth() / 2}%`,
                transform: 'translate(-50%, 4px)',
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
      <SeriesLegend series={series} />
    </div>
  );
}
