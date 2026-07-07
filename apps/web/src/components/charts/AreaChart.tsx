import { type CSSProperties, useId } from 'react';
import { scaleLinear } from 'd3-scale';
import { area as d3area, curveMonotoneX, line as d3line } from 'd3-shape';
import type { MetricPoint } from '@bolpay/shared';
import { CHART_COLORS, niceTicks } from './theme';

/**
 * Filled area chart for evenly-spaced money series (monthly earnings/payments).
 * Uses the Rosen Charts line/area technique (d3 `line` + `area`, monotone
 * curve) over a 0-100 viewBox, with a token-coloured gradient fill that adapts
 * to the theme. Points are indexed (buckets are evenly spaced), so no time scale.
 */
export function AreaChart({
  data,
  color = CHART_COLORS[0],
  format = (n) => String(n),
}: {
  data: MetricPoint[];
  color?: string;
  format?: (value: number) => string;
}) {
  const gradientId = useId();
  const hasData = data.some((d) => d.value > 0);
  if (!hasData || data.length < 2)
    return <div className="chart-empty">No data yet</div>;

  const max = Math.max(...data.map((d) => d.value));
  const x = scaleLinear()
    .domain([0, data.length - 1])
    .range([0, 100]);
  const y = scaleLinear().domain([0, max]).range([100, 0]);
  const ticks = niceTicks(max, 4);

  const line = d3line<MetricPoint>()
    .x((_, i) => x(i))
    .y((d) => y(d.value))
    .curve(curveMonotoneX);
  const area = d3area<MetricPoint>()
    .x((_, i) => x(i))
    .y0(y(0))
    .y1((d) => y(d.value))
    .curve(curveMonotoneX);

  const linePath = line(data) ?? undefined;
  const areaPath = area(data) ?? undefined;

  return (
    <div
      className="chart chart--plot"
      style={
        {
          '--m-top': '6px',
          '--m-right': '8px',
          '--m-bottom': '22px',
          '--m-left': '44px',
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
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
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
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            className="chart__area-line"
            d={linePath}
            stroke={color}
          />
        </svg>

        {data.map((d, i) => (
          <div
            key={`x${i}`}
            className="chart__axis"
            style={{
              top: '100%',
              left: `${x(i)}%`,
              transform: `translate(${i === 0 ? '0' : i === data.length - 1 ? '-100%' : '-50%'}, 4px)`,
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
