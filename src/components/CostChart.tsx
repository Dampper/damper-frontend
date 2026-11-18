import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { multiple, usd } from '../format';
import { ratio, type PlotRow, type SideName } from '../derive';
import { TierBadge } from './TierBadge';

const ROW_H = 44;
const AXIS_H = 30;
const PAD = 14;
const DOT_R = 6; // 6px radius with a 2px surface ring leaves a 5px filled dot (10px across)

/** Whole powers of ten that bound the data, at least two decades wide so the dots do not crowd. */
export function logDomain(values: number[]): { loE: number; hiE: number } | undefined {
  const v = values.filter((x) => x > 0 && Number.isFinite(x));
  if (v.length === 0) return undefined;
  let loE = Math.floor(Math.log10(Math.min(...v)));
  let hiE = Math.ceil(Math.log10(Math.max(...v)));
  if (hiE === loE) hiE += 1;
  while (hiE - loE < 2) {
    if ((hiE - loE) % 2 === 1) loE -= 1;
    else hiE += 1;
  }
  return { loE, hiE };
}

export function xOf(value: number, loE: number, hiE: number, width: number): number {
  const t = (Math.log10(value) - loE) / (hiE - loE);
  return PAD + t * Math.max(0, width - 2 * PAD);
}

function useWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

const COPY: Record<SideName, { cost: string; exposure: string; costShort: string; exposureShort: string }> = {
  collateral: {
    cost: 'Capital to push the price up 10×',
    exposure: 'Borrowable from the other reserves',
    costShort: 'Cost to push the price up 10×',
    exposureShort: 'Borrowable from other reserves',
  },
  debt: {
    cost: 'Value to sell to push the price down 10×',
    exposure: 'Borrowable from this reserve',
    costShort: 'Value to sell to push it down 10×',
    exposureShort: 'Borrowable from this reserve',
  },
};

interface Hover {
  i: number;
  x: number;
  y: number;
}

export function CostChart({ rows: allRows, which }: { rows: PlotRow[]; which: SideName }) {
  const rows = allRows.filter((r) => !r.unused);
  const unused = allRows.filter((r) => r.unused);
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const width = useWidth(plotRef);
  const [hover, setHover] = useState<Hover | null>(null);
  const copy = COPY[which];

  const plottable = rows.filter((r) => r.plottable);
  const dom = logDomain(plottable.flatMap((r) => [r.side.costUsd!, r.side.exposureUsd]));
  const n = rows.length;
  const height = n * ROW_H + AXIS_H;

  const ticks: number[] = [];
  if (dom) for (let e = dom.loE; e <= dom.hiE; e++) ticks.push(e);
  const tickStep = ticks.length > 7 ? 2 : 1;

  const track = (i: number, e: React.MouseEvent) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (box) setHover({ i, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const focusRow = (i: number, e: React.FocusEvent<HTMLElement>) => {
    const box = chartRef.current?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    if (box) setHover({ i, x: r.right - box.left + 8, y: r.top - box.top + ROW_H / 2 });
  };

  const hovered = hover ? rows[hover.i] : undefined;
  const boxWidth = chartRef.current?.clientWidth ?? 0;

  return (
    <div>
      <div className="legend" aria-hidden="false">
        <span>
          <i style={{ background: 'var(--series-1)' }} />
          {copy.cost}
        </span>
        <span>
          <i style={{ background: 'var(--series-2)' }} />
          {copy.exposure}
        </span>
      </div>

      <div className="chart" ref={chartRef} onMouseLeave={() => setHover(null)}>
        {hover && hovered?.plottable && <div className="row-hl" style={{ gridRow: hover.i + 2 }} />}

        <div className="head" style={{ gridColumn: 1, gridRow: 1 }}>
          Reserve
        </div>
        <div className="head" style={{ gridColumn: 2, gridRow: 1 }} />
        <div className="head r" style={{ gridColumn: 3, gridRow: 1 }} title="Borrowable amount divided by the cost of moving the price">
          Exposure ÷ cost
        </div>
        <div className="head tier" style={{ gridColumn: 4, gridRow: 1 }}>
          <span style={{ paddingLeft: 14 }}>Tier</span>
        </div>

        {rows.map((r, i) => (
          <RowLabel key={r.reserve.asset} row={r} i={i} onFocus={focusRow} onBlur={() => setHover(null)} />
        ))}

        <div className="plot" ref={plotRef} style={{ gridColumn: 2, gridRow: `2 / span ${n + 1}` } as CSSProperties}>
          {width > 0 && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              role="img"
              aria-label={`Dot plot on a logarithmic dollar scale: ${copy.costShort.toLowerCase()} and ${copy.exposureShort.toLowerCase()}, one row per reserve. The same values are in the table below.`}
            >
              {dom &&
                ticks.map((e, k) => {
                  const x = xOf(10 ** e, dom.loE, dom.hiE, width);
                  const label = k % tickStep === 0;
                  return (
                    <g key={e}>
                      <line x1={x} x2={x} y1={0} y2={n * ROW_H} stroke="var(--grid)" strokeWidth={1} />
                      {label && (
                        <text
                          x={x}
                          y={n * ROW_H + 19}
                          textAnchor={x < 22 ? 'start' : x > width - 22 ? 'end' : 'middle'}
                          fontSize={12}
                          fill="var(--text-muted)"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {usd(10 ** e)}
                        </text>
                      )}
                    </g>
                  );
                })}

              {rows.map((_, i) => (
                <line key={i} x1={0} x2={width} y1={(i + 1) * ROW_H} y2={(i + 1) * ROW_H} stroke="var(--grid)" strokeWidth={1} />
              ))}
              <line x1={0} x2={width} y1={n * ROW_H} y2={n * ROW_H} stroke="var(--axis)" strokeWidth={1} />

              {dom &&
                rows.map((r, i) => {
                  if (!r.plottable) return null;
                  const cy = i * ROW_H + ROW_H / 2;
                  const cx = xOf(r.side.costUsd!, dom.loE, dom.hiE, width);
                  const ex = xOf(r.side.exposureUsd, dom.loE, dom.hiE, width);
                  return (
                    <g key={r.reserve.asset}>
                      <line x1={cx} x2={ex} y1={cy} y2={cy} stroke="var(--line)" strokeWidth={2} strokeLinecap="round" />
                      <circle cx={cx} cy={cy} r={DOT_R} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
                      <circle cx={ex} cy={cy} r={DOT_R} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={2} />
                    </g>
                  );
                })}

              {/* Whole-row hit targets, 44px tall, so no dot has to be hit exactly. */}
              {rows.map((r, i) =>
                r.plottable ? (
                  <rect
                    key={r.reserve.asset}
                    x={0}
                    y={i * ROW_H}
                    width={width}
                    height={ROW_H}
                    fill="transparent"
                    onMouseMove={(e) => track(i, e)}
                  />
                ) : null,
              )}
            </svg>
          )}
        </div>

        {rows.map((r, i) =>
          r.plottable ? null : (
            <div key={r.reserve.asset} className="reason" style={{ gridColumn: 2, gridRow: i + 2 }}>
              {r.reason}
            </div>
          ),
        )}

        {rows.map((r, i) => (
          <div key={`ratio-${r.reserve.asset}`} className="row-ratio" style={{ gridColumn: 3, gridRow: i + 2 }}>
            {r.plottable ? multiple(ratio(r.side)) : '—'}
          </div>
        ))}
        {rows.map((r, i) => (
          <div key={`tier-${r.reserve.asset}`} className="row-tier" style={{ gridColumn: 4, gridRow: i + 2 }}>
            {r.plottable || r.side.tier === 'external' ? <TierBadge tier={r.side.tier} /> : null}
          </div>
        ))}

        {hover && hovered?.plottable && (
          <div
            className="tooltip"
            role="status"
            style={{ left: Math.max(0, Math.min(hover.x + 14, boxWidth - 236)), top: hover.y + 14 }}
          >
            <strong>{hovered.reserve.symbol}</strong>
            <dl>
              <dt>{copy.costShort}</dt>
              <dd>{usd(hovered.side.costUsd)}</dd>
              <dt>{copy.exposureShort}</dt>
              <dd>{usd(hovered.side.exposureUsd)}</dd>
              <dt>Exposure ÷ cost</dt>
              <dd>{multiple(ratio(hovered.side))}</dd>
              {hovered.reserve.market && (
                <>
                  <dt>Traded on the DEX, 24 h</dt>
                  <dd>{usd(hovered.reserve.market.volume24hUsd)}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>

      {unused.length > 0 && (
        <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>
          {unused[0]!.reason}: {unused.map((r) => r.reserve.symbol).join(', ')}.
        </p>
      )}

      <details className="table-view">
        <summary>Show as a table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reserve</th>
                <th className="r">{copy.costShort}</th>
                <th className="r">{copy.exposureShort}</th>
                <th className="r">Exposure ÷ cost</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((r) => (
                <tr key={r.reserve.asset}>
                  <td className="cell-title">{r.reserve.symbol}</td>
                  <td className="r">{r.plottable ? usd(r.side.costUsd) : '—'}</td>
                  <td className="r">{r.side.exposureUsd > 0 ? usd(r.side.exposureUsd) : '—'}</td>
                  <td className="r">{r.plottable ? multiple(ratio(r.side)) : '—'}</td>
                  <td>
                    <TierBadge tier={r.side.tier} />
                    {!r.plottable && r.reason ? <span className="muted"> · {r.reason}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function RowLabel({
  row,
  i,
  onFocus,
  onBlur,
}: {
  row: PlotRow;
  i: number;
  onFocus: (i: number, e: React.FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}) {
  const label = row.plottable
    ? `${row.reserve.symbol}: cost ${usd(row.side.costUsd)}, exposure ${usd(row.side.exposureUsd)}`
    : `${row.reserve.symbol}: ${row.reason}`;
  return (
    <div
      className="row-label"
      role="group"
      style={{ gridColumn: 1, gridRow: i + 2 }}
      tabIndex={row.plottable ? 0 : undefined}
      aria-label={label}
      onFocus={row.plottable ? (e) => onFocus(i, e) : undefined}
      onBlur={onBlur}
    >
      {row.reserve.symbol}
    </div>
  );
}
