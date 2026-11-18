import { useMemo, useState, type ReactNode } from 'react'

import { ChartTooltipContent, type TooltipRow } from '@/components/charts/ChartTooltip'
import { Legend } from '@/components/charts/Legend'
import { FloatingTip } from '@/features/lab/LabKit'
import { useElementSize } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Small answer charts for Ask, Inbox and Box Score. One axis each, hairline
 * grid, 2px lines, a crosshair (lines) or nearest-mark hover (dots, bars),
 * and a legend whenever there's more than one series. They size to their
 * container and stay quiet: the sentence above them carries the claim.
 */

export interface XY {
  x: number
  y: number
}

export interface LineSeries {
  key: string
  label: string
  color: string
  points: XY[]
  /** Draw thinner and lighter (a forecast next to its actuals, a reference line). */
  faded?: boolean
  /** A 10% wash under the line. */
  area?: boolean
}

/** Round-number ticks spanning [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => raw <= s) ?? 10 * mag
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

/** Clock-aligned ticks for a time axis (ms): whole hours, or local midnights for spans over 3 days. */
export function timeTicks(x0: number, x1: number, target = 4): number[] {
  const span = x1 - x0
  const H = 3600_000
  if (span > 3 * 24 * H) {
    const days = Math.ceil(span / (24 * H) / target)
    const out: number[] = []
    const d = new Date(x0)
    d.setHours(0, 0, 0, 0)
    for (let t = d.getTime() + 24 * H; t <= x1; t += 24 * H) out.push(t)
    return out.filter((_, i) => i % days === 0)
  }
  const step = [1, 2, 3, 6, 12, 24].find((h) => span / (h * H) <= target + 1) ?? 24
  const out: number[] = []
  for (let t = Math.ceil(x0 / (step * H)) * step * H; t <= x1; t += step * H) out.push(t)
  return out
}

function nearestIndex(points: XY[], x: number): number {
  let lo = 0
  let hi = points.length - 1
  if (hi < 0) return -1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (points[m].x < x) lo = m
    else hi = m
  }
  return Math.abs(points[lo].x - x) <= Math.abs(points[hi].x - x) ? lo : hi
}

export function LineChart({
  series,
  height = 132,
  xFormat,
  yFormat,
  tipTitle,
  yZero = false,
  band,
  marks = [],
  vline,
  xNice = false,
  xTicks,
  className,
}: {
  series: LineSeries[]
  height?: number
  xFormat: (x: number) => string
  yFormat: (y: number) => string
  /** Tooltip title for an x; defaults to xFormat. */
  tipTitle?: (x: number) => string
  yZero?: boolean
  /** A shaded x-range with a label (a recommended window, a highlighted year). */
  band?: { x0: number; x1: number; label: string }
  /** Annotated points: a dot and a short label. */
  marks?: { x: number; y: number; label: string }[]
  /** A vertical hairline with a label (now). */
  vline?: { x: number; label: string }
  /** Round x ticks (years, plain numbers) instead of four evenly spaced ones. */
  xNice?: boolean
  /** Explicit x tick positions (e.g. clock hours). */
  xTicks?: number[]
  className?: string
}) {
  const [ref, { width }] = useElementSize()
  const [hx, setHx] = useState<number | null>(null)
  const all = series.flatMap((s) => s.points)
  const m = { l: 40, r: 12, t: band || marks.length ? 18 : 8, b: 20 }
  const W = Math.max(0, width - m.l - m.r)
  const H = height - m.t - m.b
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  let y0 = yZero ? Math.min(0, ...ys) : Math.min(...ys)
  let y1 = Math.max(...ys)
  if (y0 === y1) {
    y0 -= 1
    y1 += 1
  }
  const pad = (y1 - y0) * 0.08
  const yt = niceTicks(yZero ? y0 : y0 - pad, y1 + pad, 3)
  const yLo = Math.min(yZero ? y0 : y0 - pad, yt[0] ?? y0)
  const yHi = Math.max(y1 + pad, yt.at(-1) ?? y1)
  const sx = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * W
  const sy = (v: number) => m.t + (1 - (v - yLo) / (yHi - yLo || 1)) * H

  const paths = useMemo(
    () =>
      width
        ? series.map((s) => {
            const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('')
            const a = s.area && s.points.length ? `${d}L${sx(s.points.at(-1)!.x).toFixed(1)},${sy(yLo)}L${sx(s.points[0].x).toFixed(1)},${sy(yLo)}Z` : ''
            return { d, a }
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, width, height, yLo, yHi],
  )

  const isTime = x0 > 1e12
  const xt = xTicks ? xTicks.filter((v) => v >= x0 && v <= x1) : isTime ? timeTicks(x0, x1, width < 420 ? 3 : 4) : xNice ? niceTicks(x0, x1, width < 420 ? 3 : 5).filter((v) => v >= x0 && v <= x1) : [0, 1 / 3, 2 / 3, 1].map((f) => x0 + f * (x1 - x0))
  const rows: TooltipRow[] = []
  let tipX = 0
  let tipY = Infinity
  if (hx !== null) {
    for (const s of series) {
      const i = nearestIndex(s.points, hx)
      if (i < 0) continue
      const p = s.points[i]
      if (Math.abs(p.x - hx) > (x1 - x0) / Math.max(8, s.points.length / 2)) continue
      rows.push({ key: s.key, label: s.label, value: yFormat(p.y), color: s.color })
      tipY = Math.min(tipY, sy(p.y))
    }
    tipX = sx(hx)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setHx(null)}>
        {width > 0 && all.length > 0 && (
          <svg
            width={width}
            height={height}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const px = e.clientX - r.left
              if (px < m.l - 4 || px > m.l + W + 4) return setHx(null)
              const v = x0 + ((px - m.l) / (W || 1)) * (x1 - x0)
              const ref0 = series.find((s) => s.points.length)!.points
              setHx(ref0[nearestIndex(ref0, v)].x)
            }}
            role="img"
            aria-label={series.map((s) => s.label).join(', ')}
          >
            {yt.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={m.l + W} y1={sy(t)} y2={sy(t)} stroke="var(--chart-grid)" />
                <text x={m.l - 6} y={sy(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {yFormat(t)}
                </text>
              </g>
            ))}
            <line x1={m.l} x2={m.l + W} y1={m.t + H} y2={m.t + H} stroke="var(--chart-axis)" />
            {xt.filter((v) => sx(v) >= 14 && sx(v) <= width - 16).map((t, i) => (
              <text
                key={i}
                x={sx(t)}
                y={height - 5}
                textAnchor={xNice || xTicks || isTime ? 'middle' : i === 0 ? 'start' : i === xt.length - 1 ? 'end' : 'middle'}
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {xFormat(t)}
              </text>
            ))}
            {band && (
              <g>
                <rect x={sx(band.x0)} y={m.t} width={Math.max(2, sx(band.x1) - sx(band.x0))} height={H} fill="var(--primary)" opacity={0.12} rx={2} />
                <text
                  x={Math.min(Math.max(sx((band.x0 + band.x1) / 2), m.l + 30), m.l + W - 30)}
                  y={m.t - 5}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium"
                >
                  {band.label}
                </text>
              </g>
            )}
            {vline && (
              <g>
                <line x1={sx(vline.x)} x2={sx(vline.x)} y1={m.t} y2={m.t + H} stroke="var(--muted-foreground)" strokeWidth={1} />
                <text x={sx(vline.x) + 3} y={m.t + 9} className="fill-muted-foreground text-[10px]">
                  {vline.label}
                </text>
              </g>
            )}
            {series.map((s, i) => (
              <g key={s.key}>
                {paths[i]?.a && <path d={paths[i].a} fill={s.color} opacity={0.1} />}
                <path
                  d={paths[i]?.d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.faded ? 1.5 : 2}
                  opacity={s.faded ? 0.55 : 1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            ))}
            {marks.map((mk, i) => {
              const cx = sx(mk.x)
              const anchor = cx < m.l + 40 ? 'start' : cx > m.l + W - 40 ? 'end' : 'middle'
              const above = sy(mk.y) > m.t + 14
              return (
                <g key={i}>
                  <circle cx={cx} cy={sy(mk.y)} r={4} fill={series[0]?.color} stroke="var(--card)" strokeWidth={2} />
                  <text x={cx} y={above ? sy(mk.y) - 8 : sy(mk.y) + 16} textAnchor={anchor} className="fill-foreground text-[10px] font-medium">
                    {mk.label}
                  </text>
                </g>
              )
            })}
            {hx !== null && (
              <g pointerEvents="none">
                <line x1={tipX} x2={tipX} y1={m.t} y2={m.t + H} stroke="var(--chart-axis)" />
                {series.map((s) => {
                  const i = nearestIndex(s.points, hx)
                  if (i < 0) return null
                  const p = s.points[i]
                  return <circle key={s.key} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={2} />
                })}
              </g>
            )}
          </svg>
        )}
        {hx !== null && rows.length > 0 && (
          <FloatingTip x={tipX} y={Number.isFinite(tipY) ? tipY : m.t} width={width}>
            <ChartTooltipContent title={(tipTitle ?? xFormat)(hx)} rows={rows} />
          </FloatingTip>
        )}
      </div>
      {series.length > 1 && <Legend shape="line" items={series.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />}
    </div>
  )
}

/** Events in time, value on y (earthquakes: time × magnitude). Nearest-dot hover. */
export function DotTimeline({
  points,
  x0,
  x1,
  height = 132,
  xFormat,
  yFormat,
  tip,
  highlight,
  onPick,
}: {
  points: (XY & { id: string })[]
  x0: number
  x1: number
  height?: number
  xFormat: (x: number) => string
  yFormat: (y: number) => string
  tip: (id: string) => { title: string; rows: TooltipRow[] }
  /** One id drawn larger and in the accent; the others recede. */
  highlight?: string
  onPick?: (id: string) => void
}) {
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<number | null>(null)
  const m = { l: 40, r: 12, t: 10, b: 20 }
  const W = Math.max(0, width - m.l - m.r)
  const H = height - m.t - m.b
  const ys = points.map((p) => p.y)
  const yt = niceTicks(Math.floor(Math.min(...ys, 2.5)), Math.ceil(Math.max(...ys, 5)), 3)
  const yLo = yt[0] ?? 0
  const yHi = yt.at(-1) ?? 1
  const sx = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * W
  const sy = (v: number) => m.t + (1 - (v - yLo) / (yHi - yLo || 1)) * H
  const xt = timeTicks(x0, x1, width < 420 ? 3 : 5)
  const hp = hover !== null ? points[hover] : undefined
  const t = hp ? tip(hp.id) : undefined

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - r.left
            const py = e.clientY - r.top
            let best = -1
            let bd = 24 * 24
            points.forEach((p, i) => {
              const d = (sx(p.x) - px) ** 2 + (sy(p.y) - py) ** 2
              if (d < bd) {
                bd = d
                best = i
              }
            })
            setHover(best >= 0 ? best : null)
          }}
          onClick={() => hp && onPick?.(hp.id)}
          className={cn(onPick && hp && 'cursor-pointer')}
          role="img"
          aria-label={`${points.length} events over time`}
        >
          {yt.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + W} y1={sy(v)} y2={sy(v)} stroke="var(--chart-grid)" />
              <text x={m.l - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {yFormat(v)}
              </text>
            </g>
          ))}
          <line x1={m.l} x2={m.l + W} y1={m.t + H} y2={m.t + H} stroke="var(--chart-axis)" />
          {xt.filter((v) => sx(v) >= 14 && sx(v) <= width - 16).map((v, i) => (
            <text key={i} x={sx(v)} y={height - 5} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {xFormat(v)}
            </text>
          ))}
          {points.map((p, i) => {
            const on = p.id === highlight || i === hover
            return (
              <circle
                key={p.id}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={on ? 5.5 : Math.max(2.5, Math.min(6, (p.y - yLo) * 1.1 + 2))}
                fill={p.id === highlight ? 'var(--series-2)' : 'var(--series-1)'}
                opacity={highlight && p.id !== highlight ? 0.7 : 0.9}
                stroke="var(--card)"
                strokeWidth={on ? 2 : 1}
              />
            )
          })}
        </svg>
      )}
      {hp && t && (
        <FloatingTip x={sx(hp.x)} y={sy(hp.y)} width={width}>
          <ChartTooltipContent title={t.title} rows={t.rows} />
        </FloatingTip>
      )}
    </div>
  )
}

/** Ranked horizontal bars: label on the left, value at the tip. For top-N lists. */
export function RankBars({
  items,
  format,
  color = 'var(--series-1)',
  onPick,
}: {
  items: { key: string; label: ReactNode; value: number; href?: string }[]
  format: (v: number) => string
  color?: string
  onPick?: (key: string) => void
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((it, i) => {
        const row = (
          <>
            <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{it.label}</span>
              <span className="mt-1 flex items-center gap-2">
                <span className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color }} />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{format(it.value)}</span>
              </span>
            </span>
          </>
        )
        return (
          <li key={it.key}>
            {it.href ? (
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-md px-1 py-0.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row}
              </a>
            ) : (
              <div className={cn('flex items-start gap-3 px-1 py-0.5', onPick && 'cursor-pointer')} onClick={() => onPick?.(it.key)}>
                {row}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Three-hourly Kp columns: observed solid, estimated lighter, predicted outlined. G1 storm line at Kp 5. */
export function KpColumns({ points, now, height = 120 }: { points: { time: number; kp: number; kind: string }[]; now: number; height?: number }) {
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<number | null>(null)
  const m = { l: 28, r: 8, t: 8, b: 20 }
  const W = Math.max(0, width - m.l - m.r)
  const H = height - m.t - m.b
  const n = points.length
  const bw = W / Math.max(1, n)
  const sy = (v: number) => m.t + (1 - v / 9) * H
  const hp = hover !== null ? points[hover] : undefined
  const fmtDay = (t: number) => new Date(t).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const fmt = (t: number) =>
    new Date(t).toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC'
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Planetary Kp index, 3-hourly">
            {[0, 3, 5, 9].map((v) => (
              <g key={v}>
                <line x1={m.l} x2={m.l + W} y1={sy(v)} y2={sy(v)} stroke={v === 5 ? 'var(--warning)' : 'var(--chart-grid)'} strokeWidth={1} />
                <text x={m.l - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {v === 5 ? 'G1' : v}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const x = m.l + i * bw
              const h = Math.max(1, sy(0) - sy(p.kp))
              const w = Math.max(1, Math.min(bw - 2, 12))
              const fill = p.kp >= 5 ? 'var(--warning)' : 'var(--series-1)'
              return (
                <g key={p.time} onPointerEnter={() => setHover(i)}>
                  <rect x={x} y={m.t} width={bw} height={H} fill="transparent" />
                  <rect
                    x={x + (bw - w) / 2}
                    y={sy(p.kp)}
                    width={w}
                    height={h}
                    rx={Math.min(2, w / 2)}
                    fill={p.kind === 'predicted' ? 'transparent' : fill}
                    fillOpacity={p.kind === 'estimated' ? 0.5 : 1}
                    stroke={p.kind === 'predicted' ? fill : 'none'}
                    strokeWidth={1}
                    opacity={hover === null || hover === i ? 1 : 0.6}
                  />
                </g>
              )
            })}
            {(() => {
              const i = points.findIndex((p) => p.time > now) - 1
              if (i < 0) return null
              const x = m.l + (i + 1) * bw
              return <line x1={x} x2={x} y1={m.t} y2={m.t + H} stroke="var(--muted-foreground)" />
            })()}
            {points.map((p, i) =>
              i % 8 === 0 ? (
                <text key={p.time} x={m.l + i * bw} y={height - 5} className="fill-muted-foreground text-[10px]">
                  {fmtDay(p.time)}
                </text>
              ) : null,
            )}
          </svg>
        )}
        {hp && (
          <FloatingTip x={m.l + (hover! + 0.5) * bw} y={sy(hp.kp)} width={width}>
            <ChartTooltipContent title={fmt(hp.time)} rows={[{ key: 'kp', label: hp.kind, value: `Kp ${hp.kp.toFixed(2)}` }]} />
          </FloatingTip>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-[var(--series-1)]" />
          observed
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-[var(--series-1)] opacity-50" />
          estimated
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] border border-[var(--series-1)]" />
          predicted
        </li>
      </ul>
    </div>
  )
}
