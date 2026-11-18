import { useState } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { Legend } from '@/components/charts/Legend'
import { FloatingTip } from '@/features/lab/LabKit'
import type { CarbonSlot } from '@/features/lab/sources'

import { useWidth } from './useWidth'
import { ukTime } from './util'

const H = 150
const PAD = { top: 10, right: 8, bottom: 22, left: 34 }

/** Past 24 hours: what was forecast against what happened. One axis, two lines. */
export function PastChart({ slots }: { slots: CarbonSlot[] }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const pts = slots.filter((s) => s.actual !== null)
  const w = Math.max(width, 200)
  const iw = w - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const vmax = Math.max(...pts.flatMap((s) => [s.forecast, s.actual ?? 0]), 10)
  const step = vmax > 300 ? 100 : vmax > 120 ? 50 : 25
  const top = Math.ceil(vmax / step) * step
  const x = (i: number) => PAD.left + (pts.length < 2 ? 0 : (i / (pts.length - 1)) * iw)
  const y = (v: number) => PAD.top + ih - (v / top) * ih
  const line = (get: (s: CarbonSlot) => number) => pts.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(get(s)).toFixed(1)}`).join(' ')
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const xTicks = pts.map((s, i) => ({ s, i })).filter(({ s }) => new Date(s.from).getUTCMinutes() === 0 && ukTime(s.from).endsWith(':00') && Number(ukTime(s.from).slice(0, 2)) % 6 === 0)

  const h = hover !== null ? pts[hover] : undefined
  const err = pts.length ? pts.reduce((s, p) => s + Math.abs((p.actual ?? 0) - p.forecast), 0) / pts.length : 0

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg
            width={w}
            height={H}
            className="block"
            role="img"
            aria-label="Forecast and actual carbon intensity over the past 24 hours"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const i = Math.round(((e.clientX - r.left - PAD.left) / iw) * (pts.length - 1))
              setHover(Math.max(0, Math.min(pts.length - 1, i)))
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'} />
                <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map(({ s, i }) => (
              <text key={s.from} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
                {ukTime(s.from)}
              </text>
            ))}
            <path d={line((s) => s.forecast)} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={line((s) => s.actual ?? 0)} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {h && hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--chart-axis)" />
                <circle cx={x(hover)} cy={y(h.forecast)} r={4} fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
                <circle cx={x(hover)} cy={y(h.actual ?? 0)} r={4} fill="var(--series-2)" stroke="var(--card)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {h && hover !== null && (
          <FloatingTip x={x(hover)} y={y(Math.max(h.forecast, h.actual ?? 0))} width={w}>
            <ChartTooltipContent
              title={`${ukTime(h.from)}–${ukTime(h.to)} UK`}
              rows={[
                { key: 'a', label: 'actual', value: String(h.actual), color: 'var(--series-2)' },
                { key: 'f', label: 'forecast', value: String(h.forecast), color: 'var(--series-1)' },
              ]}
              footer="gCO₂/kWh"
            />
          </FloatingTip>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend
          shape="line"
          items={[
            { key: 'f', label: 'Forecast', color: 'var(--series-1)' },
            { key: 'a', label: 'Actual', color: 'var(--series-2)' },
          ]}
        />
        <span className="text-xs text-muted-foreground">
          off by <span className="font-semibold text-foreground tabular-nums">{err.toFixed(0)} g</span> on average
        </span>
      </div>
    </div>
  )
}
