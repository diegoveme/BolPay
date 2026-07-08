import { type CSSProperties, useId } from 'react';
import { scaleLinear } from 'd3-scale';
import { area as d3area, curveMonotoneX, line as d3line } from 'd3-shape';
import { SeriesLegend } from './ChartLegend';
import type { Series } from './GroupedBarChart';
import { type Datum, niceTicks, val } from './theme';

/**
 * Multi-series trend chart: a soft-filled line per series over evenly-spaced
 * points (e.g. funded vs released USDC per month). Same Rosen line/area D3
 * technique as AreaChart, extended to several series with the shared palette.
 */
export function TrendChart({
  data,
  series,
  format = (n) => String(n),
}: {
  data: Datum[];
  series: Series[];
  format?: (value: number) => string;
}) {
  const gradientId = useId();
  const max = Math.max(
    0,
    ...data.flatMap((d) => series.map((s) => val(d, s.key))),
  );
  if (max <= 0 || data.length < 2)
    return <div className="chart-empty">No data yet</div>;

  const x = scaleLinear()
    .domain([0, data.length - 1])
    .range([0, 100]);
  const y = scaleLinear().domain([0, max]).range([100, 0]);
  const ticks = niceTicks(max, 4);

  const line = d3line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v))
    .curve(curveMonotoneX);
  const area = d3area<number>()
    .x((_, i) => x(i))
    .y0(y(0))
    .y1((v) => y(v))
    .curve(curveMonotoneX);

  return (
    <div>
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
              {series.map((s, si) => (
                <linearGradient
                  key={s.key}
                  id={`${gradientId}-${si}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
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
            {series.map((s, si) => {
              const values = data.map((d) => val(d, s.key));
              return (
                <g key={s.key}>
                  <path d={area(values) ?? undefined} fill={`url(#${gradientId}-${si})`} />
                  <path
                    className="chart__area-line"
                    d={line(values) ?? undefined}
                    stroke={s.color}
                  />
                </g>
              );
            })}
          </svg>

          {data.map((d, i) => {
            if (i !== 0 && i !== data.length - 1 && i % 2 !== 0) return null;
            return (
              <div
                key={`x${i}`}
                className="chart__axis"
                style={{
                  top: '100%',
                  left: `${x(i)}%`,
                  transform: `translate(${
                    i === 0 ? '0' : i === data.length - 1 ? '-100%' : '-50%'
                  }, 4px)`,
                }}
              >
                {d.label}
              </div>
            );
          })}
        </div>
      </div>
      <SeriesLegend series={series} />
    </div>
  );
}
