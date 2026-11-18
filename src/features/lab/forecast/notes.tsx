import { useRef, useState } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { FloatingTip } from '@/features/lab/LabKit'

import { deg, rain, temp, weekday, weekdayShort, type Day, type Unit, type YearValue } from './model'

/**
 * Sidenote charts: small, annotated, set in the margin beside the paragraph
 * they back up. Each fills its column (viewBox, w-full) and has its own hover.
 */

const W = 256

/** Seven days as a low–high wash with the high drawn as a line. */
export function WeekBand({ days, unit }: { days: Day[]; unit: Unit }) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const cw = box.current?.clientWidth ?? W
  const s = cw / W
  const H = 132
  const pad = { top: 18, right: 10, bottom: 24, left: 10 }
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const x = (i: number) => pad.left + (i / (days.length - 1)) * (W - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.top - pad.bottom)
  const top = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.max).toFixed(1)}`).join(' ')
  const bottom = [...days].reverse().map((d, j) => `L${x(days.length - 1 - j).toFixed(1)},${y(d.min).toFixed(1)}`).join(' ')
  const iHi = days.findIndex((d) => d.max === hi)
  const iLo = days.findIndex((d) => d.min === lo)
  const h = hover !== null ? days[hover] : undefined

  return (
    <figure className="flex flex-col gap-2">
      <div ref={box} className="relative" onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Daily highs and lows for the next ${days.length} days`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const px = ((e.clientX - r.left) / r.width) * W
            const i = Math.round(((px - pad.left) / (W - pad.left - pad.right)) * (days.length - 1))
            setHover(Math.max(0, Math.min(days.length - 1, i)))
          }}
        >
          <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom + 4} y2={H - pad.bottom + 4} stroke="var(--chart-axis)" />
          <path d={`${top} ${bottom} Z`} fill="var(--series-1)" opacity={0.12} />
          <path d={days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.min).toFixed(1)}`).join(' ')} fill="none" stroke="var(--series-1)" strokeWidth={1} opacity={0.45} />
          <path d={top} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top - 6} y2={H - pad.bottom + 4} stroke="var(--chart-axis)" />}
          {days.map((d, i) => (
            <text key={d.date} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[10px]">
              {i === 0 ? 'Today' : weekdayShort(d.date)}
            </text>
          ))}
          <circle cx={x(iHi)} cy={y(hi)} r={4} fill="var(--series-1)" stroke="var(--background)" strokeWidth={2} />
          <text x={x(iHi)} y={y(hi) - 8} textAnchor={iHi === 0 ? 'start' : iHi === days.length - 1 ? 'end' : 'middle'} className="fill-foreground text-[11px] font-semibold">
            {deg(hi, unit)}
          </text>
          {/* The coldest night sits on the floor of the wash: label it beside its dot, clear of the day labels. */}
          <circle cx={x(iLo)} cy={y(lo)} r={3} fill="var(--series-1)" opacity={0.6} stroke="var(--background)" strokeWidth={1.5} />
          <text
            x={iLo === days.length - 1 ? x(iLo) - 7 : x(iLo) + 7}
            y={y(lo)}
            dominantBaseline="middle"
            textAnchor={iLo === days.length - 1 ? 'end' : 'start'}
            className="fill-muted-foreground text-[11px] font-semibold"
          >
            {deg(lo, unit)}
          </text>
          {h && hover !== null && (
            <>
              <circle cx={x(hover)} cy={y(h.max)} r={3.5} fill="var(--series-1)" stroke="var(--background)" strokeWidth={2} />
            </>
          )}
        </svg>
        {h && hover !== null && (
          <FloatingTip x={x(hover) * s} y={y(h.max) * s} width={cw}>
            <ChartTooltipContent
              title={hover === 0 ? 'Today' : weekday(h.date)}
              rows={[
                { key: 'hi', label: 'high', value: deg(h.max, unit), color: 'var(--series-1)' },
                { key: 'lo', label: 'low', value: deg(h.min, unit) },
                { key: 'p', label: 'rain', value: rain(h.precip, unit) },
              ]}
            />
          </FloatingTip>
        )}
      </div>
      <figcaption className="text-xs leading-relaxed text-muted-foreground">
        The week’s highs (line) and lows (bottom of the wash).
      </figcaption>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">Numbers</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody className="divide-y">
            {days.map((d, i) => (
              <tr key={d.date}>
                <td className="py-1">{i === 0 ? 'Today' : weekday(d.date)}</td>
                <td className="py-1 text-right text-foreground">{deg(d.max, unit)}</td>
                <td className="py-1 text-right">{deg(d.min, unit)}</td>
                <td className="py-1 text-right">{rain(d.precip, unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Thirty years of this week's highs as a dot strip, today's forecast high marked. */
export function YearsStrip({ years, today, unit, season }: { years: YearValue[]; today: number; unit: Unit; season: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const cw = box.current?.clientWidth ?? W
  const s = cw / W
  const pad = { left: 12, right: 12 }
  const vals = years.map((y) => temp(y.value, unit))
  const t = temp(today, unit)
  const lo = Math.min(...vals, t) - 1
  const hi = Math.max(...vals, t) + 1
  const x = (v: number) => pad.left + ((v - lo) / (hi - lo)) * (W - pad.left - pad.right)

  // Dodge: stack dots that would overlap into rows, so every year stays visible.
  const R = 4
  const rows: number[][] = []
  const placed = years
    .map((y, i) => ({ ...y, i, px: x(unit === 'f' ? y.value * 1.8 + 32 : y.value) }))
    .sort((a, b) => a.px - b.px)
    .map((p) => {
      let row = 0
      while (rows[row]?.some((q) => Math.abs(q - p.px) < R * 2 + 1)) row++
      ;(rows[row] ??= []).push(p.px)
      return { ...p, row }
    })
  const base = 26 + Math.max(0, rows.length - 1) * (R * 2 + 1)
  const H = base + 26
  const tx = x(t)
  const h = hover !== null ? placed.find((p) => p.i === hover) : undefined
  const warmer = years.filter((y) => y.value < today).length

  return (
    <figure className="flex flex-col gap-2">
      <div ref={box} className="relative" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Highs for ${season} in each year, ${years[0]?.year}–${years.at(-1)?.year}, against today's forecast high`}>
          <line x1={pad.left} x2={W - pad.right} y1={base + R + 4} y2={base + R + 4} stroke="var(--chart-axis)" />
          <line x1={tx} x2={tx} y1={14} y2={base + R + 4} stroke="var(--foreground)" strokeWidth={1.5} />
          <text x={tx} y={10} textAnchor={tx > W - 50 ? 'end' : tx < 50 ? 'start' : 'middle'} className="fill-foreground text-[11px] font-semibold">
            today {t}°
          </text>
          {placed.map((p) => (
            <circle
              key={p.year}
              cx={p.px}
              cy={base - p.row * (R * 2 + 1)}
              r={hover === p.i ? R + 1 : R}
              fill={hover === p.i ? 'var(--series-1)' : 'var(--series-other)'}
              stroke="var(--background)"
              strokeWidth={1.5}
              onPointerEnter={() => setHover(p.i)}
            />
          ))}
          <text x={pad.left} y={H - 4} className="fill-muted-foreground text-[10px] tabular-nums">
            {Math.round(lo + 1)}°
          </text>
          <text x={W - pad.right} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
            {Math.round(hi - 1)}°
          </text>
        </svg>
        {h && (
          <FloatingTip x={h.px * s} y={(base - h.row * (R * 2 + 1)) * s - 10} width={cw}>
            <ChartTooltipContent title={String(h.year)} rows={[{ key: 'v', label: 'average high that week', value: `${temp(h.value, unit)}°` }]} />
          </FloatingTip>
        )}
      </div>
      <figcaption className="text-xs leading-relaxed text-muted-foreground">
        Each dot is one year’s average high for the week around this date, {years[0]?.year}–{years.at(-1)?.year}. Today’s forecast beats{' '}
        {warmer} of {years.length}.
      </figcaption>
    </figure>
  )
}
