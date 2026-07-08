import { type CSSProperties } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import type { MetricPoint } from '@bolpay/shared';
import { CHART_COLORS, niceTicks } from './theme';

/**
 * Vertical bar chart for short labelled series (per-month counts, per-cycle
 * amounts). Adapted from the Rosen Charts D3 technique: a fixed 0-100 viewBox
 * SVG holds gridlines and bars while axis labels are absolutely-positioned
 * nodes, all styled from design-system tokens so it tracks light/dark.
 */
export function BarChart({
  data,
  color = CHART_COLORS[0],
  format = (n) => String(n),
  barPadding = 0.3,
}: {
  data: MetricPoint[];
  color?: string;
  format?: (value: number) => string;
  /** Band padding (0-1); higher = thinner bars. */
  barPadding?: number;
}) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return <div className="chart-empty">No data yet</div>;

  const max = Math.max(...data.map((d) => d.value));
  const x = scaleBand()
    .domain(data.map((_, i) => String(i)))
    .range([0, 100])
    .padding(barPadding);
  const y = scaleLinear().domain([0, max]).range([100, 0]);
  const ticks = niceTicks(max, 4);

  return (
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
        {/* Y axis labels (to the left of the plot box) */}
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
          {data.map((d, i) => {
            const by = y(d.value);
            return (
              <rect
                key={i}
                className="chart__bar"
                x={x(String(i)) ?? 0}
                y={by}
                width={x.bandwidth()}
                height={100 - by}
                rx={1.5}
                fill={color}
              >
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
            );
          })}
        </svg>

        {/* X axis labels */}
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
  );
}
