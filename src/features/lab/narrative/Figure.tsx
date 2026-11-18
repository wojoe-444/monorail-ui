import { useState } from 'react'

import { FloatingTip } from '@/features/lab/LabKit'
import { useElementSize } from '@/features/lab/useLiveData'

/**
 * A small annotated figure for the narrative views: lines, dots, bars,
 * shaded bands and horizontal rules on one x and one y scale, with a few
 * labeled notes (leader to the point) and nearest-point hover. Thin marks,
 * recessive grid, text in text tokens.
 */

export interface FigPoint {
  x: number
  y: number
  tip?: string
}
export interface FigLine {
  key: string
  points: FigPoint[]
  color: string
  width?: number
  opacity?: number
  label?: string
}
export interface FigDot extends FigPoint {
  r: number
  color: string
  opacity?: number
}
export interface FigBar extends FigPoint {
  w: number
  color: string
  outline?: boolean
}
export interface FigBand {
  x0: number
  x1: number
  label?: string
}
export interface FigRule {
  y: number
  label: string
}
export interface FigNote {
  x: number
  y: number
  text: string
}

export function Figure({
  lines = [],
  dots = [],
  bars = [],
  bands = [],
  rules = [],
  notes = [],
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  yFmt = (v) => String(v),
  height = 200,
  label,
}: {
  lines?: FigLine[]
  dots?: FigDot[]
  bars?: FigBar[]
  bands?: FigBand[]
  rules?: FigRule[]
  notes?: FigNote[]
  xDomain: [number, number]
  yDomain: [number, number]
  xTicks: { x: number; label: string }[]
  yTicks: number[]
  yFmt?: (v: number) => string
  height?: number
  label: string
}) {
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<FigPoint | null>(null)
  const pad = { l: 40, r: 14, t: 22, b: 24 }
  const w = Math.max(0, width - pad.l - pad.r)
  const h = height - pad.t - pad.b
  const x = (v: number) => pad.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0] || 1)) * w
  const y = (v: number) => pad.t + (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0] || 1)) * h
  const all: FigPoint[] = [...lines.flatMap((l) => l.points), ...dots, ...bars].filter((p) => p.tip)

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - r.left
            const py = e.clientY - r.top
            let best: FigPoint | null = null
            let bd = 28 * 28
            for (const p of all) {
              const d = (x(p.x) - px) ** 2 + ((y(p.y) - py) ** 2) / 4
              if (d < bd) {
                bd = d
                best = p
              }
            }
            setHover(best)
          }}
        >
          {bands.map((b, i) => (
            <g key={i}>
              <rect x={x(b.x0)} y={pad.t} width={Math.max(1, x(b.x1) - x(b.x0))} height={h} fill="var(--foreground)" opacity={0.07} />
              {b.label && (
                <text x={(x(b.x0) + x(b.x1)) / 2} y={pad.t - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                  {b.label}
                </text>
              )}
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
              <text x={pad.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {yFmt(t)}
              </text>
            </g>
          ))}
          {rules.map((r, i) => (
            <g key={i}>
              <line x1={pad.l} x2={pad.l + w} y1={y(r.y)} y2={y(r.y)} stroke="var(--foreground)" strokeOpacity={0.45} />
              <text x={pad.l + w} y={y(r.y) - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {r.label}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const top = y(Math.max(b.y, yDomain[0]))
            return (
              <rect
                key={i}
                x={x(b.x) - b.w / 2}
                y={top}
                width={b.w}
                height={Math.max(1, y(yDomain[0]) - top)}
                rx={2}
                fill={b.outline ? 'none' : b.color}
                stroke={b.outline ? b.color : 'none'}
                strokeWidth={b.outline ? 1.5 : 0}
                opacity={hover === b ? 1 : 0.9}
              />
            )
          })}
          {lines.map((l) => (
            <path
              key={l.key}
              d={l.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join('')}
              fill="none"
              stroke={l.color}
              strokeWidth={l.width ?? 2}
              strokeOpacity={l.opacity ?? 1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {dots.map((d, i) => (
            <circle key={i} cx={x(d.x)} cy={y(d.y)} r={d.r} fill={d.color} fillOpacity={d.opacity ?? 0.7} stroke="var(--card)" strokeWidth={d.r >= 4 ? 1.5 : 0} />
          ))}
          {notes.map((n, i) => {
            const right = x(n.x) < pad.l + w * 0.62
            const ly = Math.max(pad.t + 2, y(n.y) - 18)
            return (
              <g key={i}>
                <line x1={x(n.x)} y1={y(n.y)} x2={x(n.x) + (right ? 10 : -10)} y2={ly + 4} stroke="var(--foreground)" strokeOpacity={0.5} />
                <circle cx={x(n.x)} cy={y(n.y)} r={3.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={1.5} />
                <text
                  x={x(n.x) + (right ? 13 : -13)}
                  y={ly}
                  textAnchor={right ? 'start' : 'end'}
                  dominantBaseline="middle"
                  className="fill-foreground text-[11px] font-semibold"
                  style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 4 }}
                >
                  {n.text}
                </text>
              </g>
            )
          })}
          <line x1={pad.l} x2={pad.l + w} y1={pad.t + h} y2={pad.t + h} stroke="var(--chart-axis)" />
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={x(t.x)}
              y={height - 6}
              textAnchor={i === 0 && x(t.x) < pad.l + 20 ? 'start' : i === xTicks.length - 1 && x(t.x) > pad.l + w - 20 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              {t.label}
            </text>
          ))}
          {hover && <circle cx={x(hover.x)} cy={y(hover.y)} r={4.5} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />}
        </svg>
      )}
      {hover?.tip && (
        <FloatingTip x={x(hover.x)} y={y(hover.y)} width={width}>
          <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-elevation-3 tabular-nums">{hover.tip}</div>
        </FloatingTip>
      )}
    </div>
  )
}
