import { useState, type ReactNode } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { FloatingTip } from '@/features/lab/LabKit'
import { useElementSize, useLiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/**
 * Print furniture for the Almanac: section heads with a heavy rule, dot-leader
 * rows, the moon glyph and the year-long day-length curve.
 */

export function SectionHead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-2 border-foreground pb-1">
      <h2 className="text-xs font-bold tracking-[0.18em] uppercase">{children}</h2>
      {aside && <span className="text-[11px] text-muted-foreground">{aside}</span>}
    </div>
  )
}

/** "Sunrise ........ 6:45 am": label, dotted leader, value. */
export function Row({ label, value, note, strong }: { label: ReactNode; value: ReactNode; note?: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1 py-[3px] text-sm">
      <dt className={cn('shrink-0', strong ? 'font-semibold' : 'text-foreground/85')}>{label}</dt>
      <span aria-hidden className="mx-1 min-w-4 flex-1 translate-y-[-4px] border-b border-dotted border-foreground/30" />
      {/* On a narrow column a long value wraps under the label, still right-aligned. */}
      <dd className={cn('ml-auto text-right tabular-nums', strong ? 'font-semibold' : 'font-medium')}>
        {value}
        {note && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  )
}

/** A short line of prose under a section head. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-pretty text-foreground/90">{children}</p>
}

/**
 * The moon as seen from the city: lit limb plus a terminator ellipse. The
 * waxing moon is lit on the right in the north and on the left in the south.
 */
export function MoonGlyph({ phaseAngle, south, size = 88 }: { phaseAngle: number; south: boolean; size?: number }) {
  const r = size / 2 - 2
  const c = size / 2
  const a = (phaseAngle * Math.PI) / 180
  const waxing = phaseAngle < 180
  // Lit on the right while waxing (north). The terminator's x-radius shrinks to 0 at quarter.
  const litRight = waxing !== south
  const rx = Math.abs(Math.cos(a)) * r
  const gibbous = phaseAngle > 90 && phaseAngle < 270
  // Outer limb: the lit half circle. Terminator: an elliptical arc back, bulging out (gibbous) or in (crescent).
  const sweepLimb = litRight ? 1 : 0
  const sweepTerm = gibbous === litRight ? 1 : 0
  const d = `M${c},${c - r} A${r},${r} 0 0 ${sweepLimb} ${c},${c + r} A${rx},${r} 0 0 ${sweepTerm} ${c},${c - r} Z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Moon phase drawing" className="shrink-0">
      {/* Unlit disc: a faint wash of ink. Lit part: pale gold, brighter than the dark side in both themes. */}
      <circle cx={c} cy={c} r={r} fill="var(--foreground)" fillOpacity={0.12} />
      <path d={d} fill="var(--series-4)" fillOpacity={0.6} />
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--foreground)" strokeOpacity={0.3} />
    </svg>
  )
}

export interface DayLen {
  ymd: string
  hours: number
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/** Daylight through the year on an honest 0–24h scale, today marked, longest and shortest labeled. */
export function DayLengthCurve({ days, today, fmtLen, fmtDate }: { days: DayLen[]; today: string; fmtLen: (h: number) => string; fmtDate: (ymd: string) => string }) {
  // Longest and shortest days get dots here; their values are written in the caption.
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<number | null>(null)
  const H = 150
  const pad = { l: 26, r: 8, t: 22, b: 20 }
  const iw = Math.max(1, width - pad.l - pad.r)
  const ih = H - pad.t - pad.b
  const x = (i: number) => pad.l + (i / (days.length - 1)) * iw
  const y = (h: number) => pad.t + (1 - h / 24) * ih
  const line = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.hours).toFixed(1)}`).join('')
  const area = `${line} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const ti = days.findIndex((d) => d.ymd === today)
  let iMax = 0
  let iMin = 0
  days.forEach((d, i) => {
    if (d.hours > days[iMax].hours) iMax = i
    if (d.hours < days[iMin].hours) iMin = i
  })
  const h = hover !== null ? days[hover] : undefined
  const anchor = (i: number) => (x(i) < pad.l + 50 ? 'start' : x(i) > width - 60 ? 'end' : 'middle')

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Hours of daylight through the year: longest ${fmtLen(days[iMax].hours)} on ${fmtDate(days[iMax].ymd)}, shortest ${fmtLen(days[iMin].hours)} on ${fmtDate(days[iMin].ymd)}`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (days.length - 1))
            setHover(Math.max(0, Math.min(days.length - 1, i)))
          }}
        >
          {[0, 12, 24].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'} />
              <text x={pad.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {v}h
              </text>
            </g>
          ))}
          {MONTHS.map((m, k) => {
            const i = days.findIndex((d) => Number(d.ymd.slice(5, 7)) === k + 1)
            return (
              <text key={k} x={x(i) + 2} y={H - 5} className="fill-muted-foreground text-[10px]">
                {m}
              </text>
            )
          })}
          <path d={area} fill="var(--series-4)" opacity={0.14} />
          <path d={line} fill="none" stroke="var(--series-4)" strokeWidth={2} strokeLinejoin="round" />
          {[iMax, iMin].map((i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(days[i].hours)} r={3} fill="var(--series-4)" stroke="var(--card)" strokeWidth={1.5} />
            </g>
          ))}
          {ti >= 0 && (
            <g>
              <line x1={x(ti)} x2={x(ti)} y1={pad.t - 6} y2={y(0)} stroke="var(--foreground)" strokeOpacity={0.5} />
              <circle cx={x(ti)} cy={y(days[ti].hours)} r={4.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
              <text x={x(ti)} y={pad.t - 10} textAnchor={anchor(ti)} className="fill-foreground text-[11px] font-semibold">
                today
              </text>
            </g>
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--chart-axis)" />}
        </svg>
      )}
      {h && hover !== null && (
        <FloatingTip x={x(hover)} y={y(h.hours)} width={width}>
          <ChartTooltipContent title={fmtDate(h.ymd)} rows={[{ key: 'd', label: 'of daylight', value: fmtLen(h.hours), color: 'var(--series-4)' }]} />
        </FloatingTip>
      )}
    </div>
  )
}

// ── On this day (Wikipedia) ─────────────────────────────────────────────────

export interface OnThisDay {
  year: number
  text: string
  title?: string
  url?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseOtd(raw: any): OnThisDay[] {
  return (raw.selected as any[])
    .map((e) => {
      const page = (e.pages as any[] | undefined)?.[0]
      return {
        year: e.year as number,
        text: String(e.text),
        title: page?.titles?.normalized as string | undefined,
        url: page?.content_urls?.desktop?.page as string | undefined,
      }
    })
    .sort((a, b) => a.year - b.year)
}

export function useOnThisDay(month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return useLiveData<OnThisDay[]>(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${mm}/${dd}`, {
    key: `almanac:otd:${mm}-${dd}`,
    parse: parseOtd,
    persistMs: 12 * 3600_000,
  })
}

/** n events spread across the centuries rather than the n most recent. */
export function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))])
}
