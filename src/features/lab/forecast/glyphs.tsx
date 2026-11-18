import { useState, type ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Word-sized graphics (Tufte's sparklines) and emphasized numbers that sit
 * inside a sentence. Each is about one line-height tall, rides the text
 * baseline, and opens a tooltip with the exact source values.
 */

/** A number in the prose: emphasized, and hoverable/focusable for the raw value. */
export function Num({ children, tip, className }: { children: ReactNode; tip?: ReactNode; className?: string }) {
  const body = (
    <span
      tabIndex={tip ? 0 : undefined}
      className={cn(
        'font-semibold text-foreground tabular-nums',
        tip && 'cursor-help rounded-sm underline decoration-foreground/25 decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </span>
  )
  if (!tip) return body
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent className="max-w-72">{tip}</TooltipContent>
    </Tooltip>
  )
}

/** A status dot that rides next to a word (the word carries the meaning; the dot repeats it). */
export function StatusDot({ tone }: { tone: 'success' | 'warning' | 'destructive' }) {
  const bg = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-destructive'
  return <span aria-hidden className={cn('mx-0.5 inline-block size-2 rounded-full align-middle', bg)} />
}

interface Point {
  label: string
  value: number
  text: string
}

/** Shared shell: an inline SVG with per-point hover that names the point in a tooltip. */
function InlineGlyph({
  points,
  width,
  summary,
  children,
}: {
  points: Point[]
  width: number
  summary: string
  children: (hover: number | null) => ReactNode
}) {
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

/** Temperature line for the next day, with a dot at now and at the high. */
export function InlineSpark({ points, summary }: { points: Point[]; summary: string }) {
  const W = 68
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const x = (i: number) => 2 + (i / Math.max(1, points.length - 1)) * (W - 4)
  const y = (v: number) => 14 - ((v - min) / (max - min || 1)) * 12
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const hi = vals.indexOf(max)
  return (
    <InlineGlyph points={points} width={W} summary={summary}>
      {(hover) => (
        <>
          <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(hi)} cy={y(max)} r={2} fill="var(--series-1)" />
          <circle cx={x(0)} cy={y(vals[0])} r={2.5} fill="var(--foreground)" />
          {hover !== null && <circle cx={x(hover)} cy={y(vals[hover])} r={2.5} fill="var(--series-1)" stroke="var(--background)" strokeWidth={1} />}
        </>
      )}
    </InlineGlyph>
  )
}

/** Hourly rain chance as micro bars; hours at 50% or more are solid, the rest a wash. */
export function InlineBars({ points, summary }: { points: Point[]; summary: string }) {
  const bw = 2
  const gap = 1
  const W = points.length * (bw + gap) - gap
  return (
    <InlineGlyph points={points} width={W} summary={summary}>
      {(hover) => (
        <>
          <line x1={0} x2={W} y1={15.5} y2={15.5} stroke="var(--chart-axis)" strokeWidth={1} />
          {points.map((p, i) => {
            const h = Math.max(0.75, (p.value / 100) * 15)
            return (
              <rect
                key={i}
                x={i * (bw + gap)}
                y={15 - h}
                width={bw}
                height={h}
                rx={0.5}
                fill="var(--series-1)"
                opacity={hover === i ? 1 : p.value >= 50 ? 0.95 : 0.4}
              />
            )
          })}
        </>
      )}
    </InlineGlyph>
  )
}

/** A week of daily low–high ranges on one shared scale. */
export function InlineRanges({ points, summary }: { points: (Point & { lo: number })[]; summary: string }) {
  const step = 8
  const W = points.length * step - 4
  const lo = Math.min(...points.map((p) => p.lo))
  const hi = Math.max(...points.map((p) => p.value))
  const y = (v: number) => 15 - ((v - lo) / (hi - lo || 1)) * 14
  return (
    <InlineGlyph points={points} width={W} summary={summary}>
      {(hover) =>
        points.map((p, i) => (
          <rect
            key={i}
            x={i * step}
            y={y(p.value)}
            width={4}
            height={Math.max(1.5, y(p.lo) - y(p.value))}
            rx={2}
            fill="var(--series-1)"
            opacity={hover === null || hover === i ? 1 : 0.45}
          />
        ))
      }
    </InlineGlyph>
  )
}
