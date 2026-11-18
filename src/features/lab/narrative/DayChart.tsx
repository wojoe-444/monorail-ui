import { useMemo, useState } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { Legend } from '@/components/charts/Legend'
import { FloatingTip } from '@/features/lab/LabKit'
import { useElementSize } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

import { GROUPS, type DaySlot } from './gridday'
import { ukClock } from './kit'

/**
 * The one picture One Day on the Grid keeps re-framing: carbon intensity on
 * top, the generation mix as a 100% stack below, sharing one time axis. A
 * step sets the span (everything outside it dims) and the focus (one fuel,
 * or intensity, stays at full ink while the rest recede).
 */

export interface Frame {
  span: [number, number]
  focus?: string
  /** Slot index and words for the one label this step adds. */
  note?: { i: number; text: string }
}

const TOP_H = 104
const MID = 18
const MIX_H = 168
const AXIS = 24

export function DayChart({ slots, frame, compact }: { slots: DaySlot[]; frame: Frame; compact?: boolean }) {
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<number | null>(null)
  const topH = compact ? 48 : TOP_H
  const mixH = compact ? 72 : MIX_H
  const H = topH + MID + mixH + AXIS
  const pad = { l: 36, r: 12 }
  const w = Math.max(0, width - pad.l - pad.r)
  const n = slots.length
  const x = (i: number) => pad.l + (i / Math.max(1, n)) * w
  const maxI = Math.max(...slots.map((s) => s.intensity))
  const yTop = (v: number) => 10 + (1 - v / (maxI * 1.08 || 1)) * (topH - 14)
  const yMix = (p: number) => topH + MID + (1 - p / 100) * mixH

  const line = useMemo(
    () => slots.map((s, i) => `${i ? 'L' : 'M'}${(x(i) + w / n / 2).toFixed(1)},${yTop(s.intensity).toFixed(1)}`).join(''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, width, topH],
  )

  // Stack from the baseline up: low-carbon first, gas and the rest on top.
  const areas = useMemo(() => {
    const cum = slots.map(() => 0)
    return GROUPS.map((g) => {
      const lower = [...cum]
      slots.forEach((s, i) => (cum[i] += s.groups[g.key] ?? 0))
      const upper = [...cum]
      const top = upper.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yMix(v).toFixed(1)} L${x(i + 1).toFixed(1)},${yMix(v).toFixed(1)}`).join(' ')
      const bottom = lower
        .map((v, i) => [i, v] as const)
        .reverse()
        .map(([i, v]) => `L${x(i + 1).toFixed(1)},${yMix(v).toFixed(1)} L${x(i).toFixed(1)},${yMix(v).toFixed(1)}`)
        .join(' ')
      return { g, d: `${top} ${bottom} Z` }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, width, topH, mixH])

  const ticks = slots.map((s, i) => ({ i, t: ukClock(s.from) })).filter((t) => t.t.endsWith(':00') && Number(t.t.slice(0, 2)) % 6 === 0)
  const [a, b] = frame.span
  const sx = x(Math.max(0, a))
  const ex = x(Math.min(n, b + 1))
  const focus = frame.focus
  const hs = hover !== null ? slots[hover] : undefined
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const ease = reduced ? undefined : 'x 500ms ease, width 500ms ease, opacity 400ms ease'

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative w-full" style={{ height: H }} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label="Carbon intensity and generation mix for each half hour of the past 24 hours"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const i = Math.floor(((e.clientX - r.left - pad.l) / w) * n)
              setHover(i >= 0 && i < n ? i : null)
            }}
          >
            {/* intensity panel */}
            {[0, Math.round(maxI / 2 / 50) * 50].map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={pad.l + w} y1={yTop(v)} y2={yTop(v)} stroke="var(--chart-grid)" />
                <text x={pad.l - 6} y={yTop(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            <text x={pad.l} y={8} className="fill-muted-foreground text-[10px]">
              gCO₂/kWh
            </text>
            <path
              d={line}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ opacity: !focus || focus === 'intensity' ? 1 : 0.45, transition: ease }}
            />

            {/* mix panel */}
            <text x={pad.l} y={topH + MID - 5} className="fill-muted-foreground text-[10px]">
              share of generation
            </text>
            {areas.map(({ g, d }) => (
              <path
                key={g.key}
                d={d}
                fill={g.color}
                stroke="var(--card)"
                strokeWidth={0.75}
                style={{ opacity: !focus || focus === 'intensity' ? 0.72 : focus === g.key ? 0.95 : 0.14, transition: ease }}
              />
            ))}
            {[0, 50, 100].map((p) => (
              <text key={p} x={pad.l - 6} y={yMix(p)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {p}%
              </text>
            ))}

            {/* the step's span: dim what's outside it */}
            <rect x={pad.l} y={0} width={Math.max(0, sx - pad.l)} height={topH + MID + mixH} fill="var(--card)" style={{ opacity: 0.72, transition: ease }} />
            <rect x={ex} y={0} width={Math.max(0, pad.l + w - ex)} height={topH + MID + mixH} fill="var(--card)" style={{ opacity: 0.72, transition: ease }} />

            {/* the step's one label */}
            {frame.note && (
              <g>
                <line
                  x1={x(frame.note.i) + w / n / 2}
                  x2={x(frame.note.i) + w / n / 2}
                  y1={yTop(slots[frame.note.i].intensity)}
                  y2={topH + MID + mixH}
                  stroke="var(--foreground)"
                  strokeOpacity={0.5}
                />
                <circle cx={x(frame.note.i) + w / n / 2} cy={yTop(slots[frame.note.i].intensity)} r={4} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
                <text
                  x={x(frame.note.i) + w / n / 2 + (frame.note.i > n * 0.6 ? -8 : 8)}
                  y={Math.max(12, yTop(slots[frame.note.i].intensity) - 10)}
                  textAnchor={frame.note.i > n * 0.6 ? 'end' : 'start'}
                  className="fill-foreground text-[11px] font-semibold"
                  style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 4 }}
                >
                  {frame.note.text}
                </text>
              </g>
            )}

            {/* axis */}
            {ticks.map((t) => (
              <text key={t.i} x={x(t.i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {t.t}
              </text>
            ))}
            {hover !== null && <line x1={x(hover) + w / n / 2} x2={x(hover) + w / n / 2} y1={4} y2={topH + MID + mixH} stroke="var(--chart-axis)" />}
          </svg>
        )}
        {hs && hover !== null && (
          <FloatingTip x={x(hover) + w / n / 2} y={20} width={width}>
            <ChartTooltipContent
              title={`${ukClock(hs.from)}–${ukClock(hs.to)} UK`}
              rows={[
                { key: 'i', label: hs.measured ? 'gCO₂/kWh measured' : 'gCO₂/kWh forecast', value: String(hs.intensity) },
                ...GROUPS.filter((g) => (hs.groups[g.key] ?? 0) >= 0.5)
                  .sort((p, q) => hs.groups[q.key] - hs.groups[p.key])
                  .slice(0, 4)
                  .map((g) => ({ key: g.key, label: g.label.toLowerCase(), value: `${hs.groups[g.key].toFixed(0)}%`, color: g.color })),
              ]}
            />
          </FloatingTip>
        )}
      </div>
      <Legend items={GROUPS.map((g) => ({ key: g.key, label: compact && g.key === 'other' ? 'Other' : g.label, color: g.color }))} className={cn(compact && 'gap-x-2.5 text-[11px]')} />
    </div>
  )
}
