import { useMemo, useState, type ReactNode } from 'react'

import type { KpPoint } from '@/features/lab/sources'
import { useElementSize } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

import { utcDay, utcHm, utcMidnights } from './format'

/*
 * Terminal charts: one axis each, hairline grid, tick labels set inside the
 * plot so no pixel goes to margins. Hover puts a crosshair on the nearest
 * point and writes its value into the chart's header line, the way a
 * terminal shows a cursor readout, instead of floating a tooltip over data.
 */

export interface Pt {
  t: number
  v: number
}

interface ChartFrameProps {
  label: string
  /** Shown on the right of the header: the hover readout, or the latest value. */
  readout: ReactNode
  className?: string
  children: (size: { width: number; height: number }) => ReactNode
}

function ChartFrame({ label, readout, className, children }: ChartFrameProps) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex h-5 shrink-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="shrink-0 tracking-wider whitespace-nowrap uppercase">{label}</span>
        <span className="truncate text-foreground tabular-nums">{readout}</span>
      </div>
      <div ref={ref} className="relative min-h-0 flex-1">
        {size.width > 0 && size.height > 0 && children(size)}
      </div>
    </div>
  )
}

/** UTC day boundaries, labelled along the top (bars and lines rarely reach it); labels thin out when days are narrow. */
function DayGrid({ t0, t1, x, width, height }: { t0: number; t1: number; x: (t: number) => number; width: number; height: number }) {
  const days = utcMidnights(t0, t1)
  const dayPx = x(t0 + 86_400_000) - x(t0)
  const every = Math.max(1, Math.ceil(44 / Math.max(1, dayPx)))
  return (
    <g aria-hidden>
      {days.map((t, i) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={0} y2={height} stroke="var(--chart-grid)" />
          {i % every === 0 && x(t) < width - 64 && (
            <text x={x(t) + 3} y={9} fontSize={9} fill="var(--muted-foreground)">
              {utcDay(t)}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}

export function MiniLine({
  label,
  data,
  domain,
  y,
  ticks,
  now,
  format,
  latest,
  color = 'var(--series-1)',
  className,
}: {
  label: string
  data: Pt[]
  domain: [number, number]
  y: [number, number]
  ticks: { v: number; label: string }[]
  /** Points after `now` are a forecast: drawn at reduced opacity. */
  now?: number
  format: (p: Pt) => ReactNode
  latest: ReactNode
  color?: string
  className?: string
}) {
  const [hover, setHover] = useState<Pt | null>(null)
  return (
    <ChartFrame label={label} readout={hover ? format(hover) : latest} className={className}>
      {({ width, height }) => {
        const x = (t: number) => ((t - domain[0]) / (domain[1] - domain[0])) * width
        const yy = (v: number) => height - 2 - ((Math.max(y[0], Math.min(y[1], v)) - y[0]) / (y[1] - y[0])) * (height - 4)
        const past = now ? data.filter((p) => p.t <= now) : data
        const future = now ? data.filter((p) => p.t >= (past[past.length - 1]?.t ?? now)) : []
        const path = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${yy(p.v).toFixed(1)}`).join('')
        const onMove = (e: React.PointerEvent) => {
          const px = e.clientX - e.currentTarget.getBoundingClientRect().left
          const t = domain[0] + (px / width) * (domain[1] - domain[0])
          let best: Pt | null = null
          for (const p of data) if (!best || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p
          setHover(best)
        }
        return (
          <svg width={width} height={height} className="absolute inset-0 block" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            {ticks.map((tk) => (
              <g key={tk.v}>
                <line x1={0} x2={width} y1={yy(tk.v)} y2={yy(tk.v)} stroke="var(--chart-grid)" />
                <text x={width - 2} y={yy(tk.v) - 2} fontSize={9} textAnchor="end" fill="var(--muted-foreground)">
                  {tk.label}
                </text>
              </g>
            ))}
            <DayGrid t0={domain[0]} t1={domain[1]} x={x} width={width} height={height} />
            {future.length > 1 && <path d={path(future)} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={1.5} />}
            <path d={path(past)} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            {now && now > domain[0] && now < domain[1] && (
              <line x1={x(now)} x2={x(now)} y1={0} y2={height} stroke="var(--foreground)" strokeOpacity={0.5} />
            )}
            {past.length > 0 && !hover && (
              <circle cx={x(past[past.length - 1].t)} cy={yy(past[past.length - 1].v)} r={3} fill={color} stroke="var(--background)" strokeWidth={1.5} />
            )}
            {hover && (
              <g pointerEvents="none">
                <line x1={x(hover.t)} x2={x(hover.t)} y1={0} y2={height} stroke="var(--foreground)" strokeOpacity={0.35} />
                <circle cx={x(hover.t)} cy={yy(hover.v)} r={3} fill={color} stroke="var(--background)" strokeWidth={1.5} />
              </g>
            )}
          </svg>
        )
      }}
    </ChartFrame>
  )
}

/**
 * Planetary Kp, 3-hourly. Observed bars are solid, NOAA's estimate is a
 * lighter fill, and the 3-day prediction is an outline: the encoding of
 * certainty doesn't rely on color. Kp 5+ is a geomagnetic storm (status
 * amber), with a hairline at the G1 threshold.
 */
export function KpBars({ data, now, className }: { data: KpPoint[]; now: number; className?: string }) {
  const [hover, setHover] = useState<KpPoint | null>(null)
  const current = useMemo(() => [...data].reverse().find((d) => d.kind !== 'predicted'), [data])
  const peak = useMemo(() => data.filter((d) => d.kind === 'predicted').reduce((m, d) => Math.max(m, d.kp), 0), [data])
  return (
    <ChartFrame
      label="Kp · 3h"
      className={className}
      readout={
        hover ? (
          <>
            {utcDay(hover.time)} {utcHm(hover.time)} · Kp {hover.kp.toFixed(2)} · {hover.kind}
          </>
        ) : (
          <>
            now {current?.kp.toFixed(2) ?? '—'} · forecast (outline) max {peak.toFixed(1)}
          </>
        )
      }
    >
      {({ width, height }) => {
        if (data.length === 0) return null
        const t0 = data[0].time
        const t1 = data[data.length - 1].time + 3 * 3600_000
        const x = (t: number) => ((t - t0) / (t1 - t0)) * width
        const bw = Math.max(1, width / data.length - 1)
        const yy = (v: number) => height - ((v / 9) * (height - 4))
        return (
          <svg width={width} height={height} className="absolute inset-0 block" onPointerLeave={() => setHover(null)}>
            {[3, 5, 7].map((v) => (
              <g key={v}>
                <line x1={0} x2={width} y1={yy(v)} y2={yy(v)} stroke={v === 5 ? 'var(--chart-axis)' : 'var(--chart-grid)'} />
                <text x={width - 2} y={yy(v) - 2} fontSize={9} textAnchor="end" fill="var(--muted-foreground)">
                  {v === 5 ? 'G1 storm · 5' : v}
                </text>
              </g>
            ))}
            <DayGrid t0={t0} t1={t1} x={x} width={width} height={height} />
            {data.map((d) => {
              const h = Math.max(1, height - yy(d.kp))
              const storm = d.kp >= 5
              const fill = storm ? 'var(--warning)' : 'var(--series-1)'
              const predicted = d.kind === 'predicted'
              return (
                <g key={d.time} onPointerEnter={() => setHover(d)}>
                  <rect x={x(d.time)} y={0} width={width / data.length} height={height} fill="transparent" />
                  <rect
                    x={x(d.time) + (predicted ? 0.5 : 0)}
                    y={yy(d.kp) + (predicted ? 0.5 : 0)}
                    width={Math.max(1, bw - (predicted ? 1 : 0))}
                    height={Math.max(1, h - (predicted ? 1 : 0))}
                    fill={predicted ? 'none' : fill}
                    fillOpacity={d.kind === 'estimated' ? 0.5 : hover === d ? 1 : 0.85}
                    stroke={predicted ? fill : 'none'}
                    strokeWidth={1}
                  />
                </g>
              )
            })}
            <line x1={x(now)} x2={x(now)} y1={0} y2={height} stroke="var(--foreground)" strokeOpacity={0.5} pointerEvents="none" />
          </svg>
        )
      }}
    </ChartFrame>
  )
}
