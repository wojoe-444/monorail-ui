import { useRef, useState } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { FloatingTip } from '@/features/lab/LabKit'
import type { CarbonSlot } from '@/features/lab/sources'

import { ukMinutes, ukTime, sentenceCase, type Window } from './util'

const W = 600
const H = 440
const CX = W / 2
const CY = H / 2
const R0 = 104
const RMAX = 176
const ARC_R = RMAX + 13
const LABEL_R = RMAX + 34
const GAP = 0.03 // radians trimmed from each side of a wedge: thin spokes with air between

const angleOf = (t: number) => (ukMinutes(t) / 1440) * Math.PI * 2
const pt = (a: number, r: number) => [CX + r * Math.sin(a), CY - r * Math.cos(a)] as const

function sector(a0: number, a1: number, r0: number, r1: number) {
  const [x0, y0] = pt(a0, r1)
  const [x1, y1] = pt(a1, r1)
  const [x2, y2] = pt(a1, r0)
  const [x3, y3] = pt(a0, r0)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`
}

function arc(a0: number, a1: number, r: number) {
  const [x0, y0] = pt(a0, r)
  const [x1, y1] = pt(a1, r)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`
}

/** Ramp fill: one hue, more ink for more carbon. Mixed with the card so it follows the theme. */
export function rampFill(t: number) {
  return `color-mix(in oklab, var(--series-1) ${Math.round(28 + 72 * t)}%, var(--card))`
}

/**
 * The next 24 hours as a clock face. Each half-hour is a wedge at its UK
 * clock position: length and ink both grow with forecast intensity, so the
 * clean hours are the short, pale ones. The best window rides the outside.
 */
export function Dial({
  slots,
  now,
  best,
  current,
  index,
}: {
  slots: CarbonSlot[]
  now: number
  best: Window | undefined
  current: number
  index: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...slots.map((s) => s.forecast), 1)
  const min = Math.min(...slots.map((s) => s.forecast))
  const rOf = (v: number) => R0 + 8 + (RMAX - R0 - 8) * (v / max)

  const nowA = angleOf(now)
  let bestA0 = 0
  let bestA1 = 0
  if (best) {
    bestA0 = angleOf(best.start)
    bestA1 = angleOf(best.end)
    if (bestA1 <= bestA0) bestA1 += Math.PI * 2
  }
  const bestMid = (bestA0 + bestA1) / 2
  const [lx, ly] = pt(bestMid, LABEL_R)
  const anchor = Math.sin(bestMid) > 0.3 ? 'start' : Math.sin(bestMid) < -0.3 ? 'end' : 'middle'

  const scale = (box.current?.clientWidth ?? W) / W
  const h = hover !== null ? slots[hover] : undefined
  let tip: { x: number; y: number } | undefined
  if (h) {
    const a = angleOf(h.from) + Math.PI / 48
    const [x, y] = pt(a, rOf(h.forecast))
    tip = { x: x * scale, y: y * scale }
  }

  return (
    <div ref={box} className="relative w-full" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Forecast carbon intensity for the next 24 hours, as a clock face">
        {/* track */}
        <circle cx={CX} cy={CY} r={R0} fill="none" stroke="var(--chart-grid)" strokeWidth={1} />
        <circle cx={CX} cy={CY} r={RMAX} fill="none" stroke="var(--chart-grid)" strokeWidth={1} />

        {/* hour ticks: 24 small, four labeled */}
        {Array.from({ length: 24 }, (_, hr) => {
          const a = (hr / 24) * Math.PI * 2
          const major = hr % 6 === 0
          const [x0, y0] = pt(a, R0 - 4)
          const [x1, y1] = pt(a, R0 - (major ? 12 : 8))
          const [tx, ty] = pt(a, R0 - 24)
          return (
            <g key={hr}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--chart-axis)" strokeWidth={major ? 1.5 : 1} />
              {major && (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[15px] tabular-nums">
                  {String(hr).padStart(2, '0')}
                </text>
              )}
            </g>
          )
        })}

        {/* wedges */}
        {slots.map((s, i) => {
          const a0 = angleOf(s.from)
          const a1 = a0 + Math.PI / 24
          const t = max === min ? 0.5 : (s.forecast - min) / (max - min)
          const on = hover === i
          return (
            <g key={s.from}>
              <path
                d={sector(a0 + GAP, a1 - GAP, R0 + 2, rOf(s.forecast))}
                fill={rampFill(t)}
                stroke={on ? 'var(--foreground)' : 'none'}
                strokeWidth={1.5}
              />
              {/* hit area: the whole spoke, bigger than the mark */}
              <path
                d={sector(a0, a1, R0 - 2, RMAX + 4)}
                fill="transparent"
                tabIndex={0}
                aria-label={`${ukTime(s.from)}: ${s.forecast} grams per kilowatt hour, ${s.index}`}
                className="cursor-crosshair outline-none"
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            </g>
          )
        })}

        {/* recommended window */}
        {best && (
          <g pointerEvents="none">
            <path d={arc(bestA0 + GAP, bestA1 - GAP, ARC_R)} fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" className="fill-foreground text-[18px] font-semibold tabular-nums">
              {ukTime(best.start)}–{ukTime(best.end)}
            </text>
          </g>
        )}

        {/* now hand */}
        <g pointerEvents="none">
          <line
            x1={pt(nowA, R0 - 30)[0]}
            y1={pt(nowA, R0 - 30)[1]}
            x2={pt(nowA, RMAX + 6)[0]}
            y2={pt(nowA, RMAX + 6)[1]}
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={pt(nowA, RMAX + 6)[0]} cy={pt(nowA, RMAX + 6)[1]} r={4.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
        </g>

        {/* center readout */}
        <g pointerEvents="none">
          <text x={CX} y={CY - 6} textAnchor="middle" className="fill-foreground text-[44px] font-semibold tracking-tight">
            {h ? h.forecast : current}
          </text>
          <text x={CX} y={CY + 22} textAnchor="middle" className="fill-muted-foreground text-[14px]">
            gCO₂/kWh {h ? `at ${ukTime(h.from)}` : 'now'}
          </text>
          <text x={CX} y={CY + 42} textAnchor="middle" className="fill-muted-foreground text-[14px] font-medium">
            {sentenceCase(h ? h.index : index)}
          </text>
        </g>
      </svg>

      {h && tip && (
        <FloatingTip x={tip.x} y={tip.y} width={box.current?.clientWidth ?? W}>
          <ChartTooltipContent
            title={`${ukTime(h.from)}–${ukTime(h.to)} UK`}
            rows={[{ key: 'f', label: 'gCO₂/kWh forecast', value: String(h.forecast), color: 'var(--series-1)' }]}
            footer={sentenceCase(h.index)}
          />
        </FloatingTip>
      )}
    </div>
  )
}
