import { useState, type ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Word-sized glyphs for the narrative views, in the manner of Forecast,
 * Written's: one line-height tall, on the text baseline, hover or focus for
 * the exact values. InlineTrend reads left to right in time and marks the
 * latest point (Forecast's spark marks "now" at the start instead).
 */

export interface GlyphPoint {
  label: string
  value: number
  text: string
}

function Shell({ points, width, summary, children }: { points: GlyphPoint[]; width: number; summary: string; children: (hover: number | null) => ReactNode }) {
  const [hover, setHover] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const p = hover !== null ? points[hover] : undefined
  return (
    <Tooltip open={open || hover !== null} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <svg
          viewBox={`0 0 ${width} 16`}
          width={width}
          height={16}
          tabIndex={0}
          role="img"
          aria-label={summary}
          className="mx-1 inline-block cursor-crosshair overflow-visible rounded-sm align-[-0.15em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1))
            setHover(Math.max(0, Math.min(points.length - 1, i)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {children(hover)}
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        {p ? (
          <span className="tabular-nums">
            <span className="font-semibold">{p.text}</span> <span className="opacity-70">{p.label}</span>
          </span>
        ) : (
          summary
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/** A trend in time, oldest left, the latest point dotted. */
export function InlineTrend({ points, summary, width = 56 }: { points: GlyphPoint[]; summary: string; width?: number }) {
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const x = (i: number) => 2 + (i / Math.max(1, points.length - 1)) * (width - 4)
  const y = (v: number) => 14 - ((v - min) / (max - min || 1)) * 12
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = vals.length - 1
  return (
    <Shell points={points} width={width} summary={summary}>
      {(hover) => (
        <>
          <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(last)} cy={y(vals[last])} r={2.5} fill="var(--foreground)" />
          {hover !== null && <circle cx={x(hover)} cy={y(vals[hover])} r={2.5} fill="var(--series-1)" stroke="var(--background)" strokeWidth={1} />}
        </>
      )}
    </Shell>
  )
}

/** Two values side by side as tiny bars on one scale ("this vs that"). */
export function InlinePair({ a, b, summary }: { a: GlyphPoint; b: GlyphPoint; summary: string }) {
  const max = Math.max(a.value, b.value, 1e-9)
  const pts = [a, b]
  return (
    <Shell points={pts} width={22} summary={summary}>
      {(hover) =>
        pts.map((p, i) => {
          const h = Math.max(1, (p.value / max) * 14)
          return <rect key={i} x={i * 12} y={15 - h} width={8} height={h} rx={1.5} fill={i === 0 ? 'var(--series-1)' : 'var(--series-2)'} opacity={hover === null || hover === i ? 1 : 0.45} />
        })
      }
    </Shell>
  )
}

/** Counts per bucket (e.g. quakes per day) as micro bars on one scale. */
export function InlineCounts({ points, summary }: { points: GlyphPoint[]; summary: string }) {
  const bw = points.length > 20 ? 2 : 4
  const gap = 1
  const W = Math.max(8, points.length * (bw + gap) - gap)
  const max = Math.max(1, ...points.map((p) => p.value))
  return (
    <Shell points={points} width={W} summary={summary}>
      {(hover) => (
        <>
          <line x1={0} x2={W} y1={15.5} y2={15.5} stroke="var(--chart-axis)" strokeWidth={1} />
          {points.map((p, i) => {
            const h = p.value === 0 ? 0 : Math.max(1.5, (p.value / max) * 14)
            return <rect key={i} x={i * (bw + gap)} y={15 - h} width={bw} height={h} rx={0.5} fill="var(--series-1)" opacity={hover === null || hover === i ? 1 : 0.45} />
          })}
        </>
      )}
    </Shell>
  )
}
