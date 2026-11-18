import { useMemo, useState, type PointerEvent } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { FloatingTip } from '@/features/lab/LabKit'
import type { WikiArticle } from '@/features/lab/sources'
import { useElementSize } from '@/features/lab/useLiveData'

import { compact, full, signedPct, type RankedArticle } from './useAttention'

/** Spread label positions so none sit closer than `gap`, staying inside [top, bottom]. */
function resolve(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const out = order.map((o) => o.y)
  for (let k = 0; k < out.length; k++) out[k] = Math.max(out[k], k ? out[k - 1] + gap : top)
  for (let k = out.length - 1; k >= 0; k--) out[k] = Math.min(out[k], k < out.length - 1 ? out[k + 1] - gap : bottom)
  const res: number[] = new Array(ys.length)
  order.forEach((o, k) => (res[o.i] = out[k]))
  return res
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)).trimEnd() + '…' : s
}

export interface Mover extends RankedArticle {
  prevRank: number
  prevViews: number
}

/**
 * Slope chart between two days on a log rank scale (rank 1 at the top).
 * Labels at both ends, spread apart with leader lines where they'd collide.
 */
export function SlopePanel({
  items,
  color,
  prevLabel,
  curLabel,
}: {
  items: Mover[]
  color: string
  prevLabel: string
  curLabel: string
}) {
  const [ref, { width }] = useElementSize()
  const [active, setActive] = useState<string | null>(null)
  const H = 380
  const padR = Math.min(230, Math.max(120, width * 0.48))
  const pad = { l: 52, r: padR, t: 30, b: 14 }
  const x0 = pad.l
  const x1 = width - pad.r
  const maxRank = Math.max(100, ...items.flatMap((m) => [m.rank, m.prevRank]))
  const domain = 10 ** Math.ceil(Math.log10(maxRank))
  const y = (rank: number) => pad.t + (Math.log10(rank) / Math.log10(domain)) * (H - pad.t - pad.b)
  const leftY = resolve(items.map((m) => y(m.prevRank)), 14, pad.t, H - pad.b)
  const rightY = resolve(items.map((m) => y(m.rank)), 14, pad.t, H - pad.b)
  const chars = Math.floor((pad.r - 22) / 6.6)
  const decades: number[] = []
  for (let d = 1; d <= domain; d *= 10) decades.push(d)
  const act = items.find((m) => m.article === active)

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }} onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Rank change from ${prevLabel} to ${curLabel}`}>
          {decades.map((d) => (
            <g key={d}>
              <line x1={x0} x2={x1} y1={y(d)} y2={y(d)} stroke="var(--chart-grid)" />
              <text x={(x0 + x1) / 2} y={y(d) - 3} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                #{d.toLocaleString()}
              </text>
            </g>
          ))}
          <line x1={x0} x2={x0} y1={pad.t} y2={H - pad.b} stroke="var(--chart-axis)" />
          <line x1={x1} x2={x1} y1={pad.t} y2={H - pad.b} stroke="var(--chart-axis)" />
          <text x={x0} y={12} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            {prevLabel}
          </text>
          <text x={x1} y={12} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            {curLabel}
          </text>
          {items.map((m, i) => {
            const ya = y(m.prevRank)
            const yb = y(m.rank)
            const dim = active != null && active !== m.article
            return (
              <g key={m.article} opacity={dim ? 0.25 : 1} onPointerEnter={() => setActive(m.article)} className="transition-opacity">
                <line x1={x0} x2={x1} y1={ya} y2={yb} stroke={color} strokeWidth={2} strokeLinecap="round" />
                <line x1={x0} x2={x1} y1={ya} y2={yb} stroke="transparent" strokeWidth={14} />
                <circle cx={x0} cy={ya} r={4} fill={color} className="stroke-card" strokeWidth={2} />
                <circle cx={x1} cy={yb} r={4} fill={color} className="stroke-card" strokeWidth={2} />
                {Math.abs(leftY[i] - ya) > 1.5 && <line x1={x0 - 6} x2={x0 - 14} y1={ya} y2={leftY[i]} stroke="var(--chart-axis)" />}
                <text x={x0 - 16} y={leftY[i]} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[11px] tabular-nums">
                  #{m.prevRank}
                </text>
                {Math.abs(rightY[i] - yb) > 1.5 && <line x1={x1 + 6} x2={x1 + 14} y1={yb} y2={rightY[i]} stroke="var(--chart-axis)" />}
                <text x={x1 + 16} y={rightY[i]} dominantBaseline="central" className="fill-foreground text-[12px]">
                  <tspan className="fill-muted-foreground tabular-nums">#{m.rank} </tspan>
                  {clip(m.title, chars - String(m.rank).length - 2)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {act && (
        <FloatingTip x={(x0 + x1) / 2} y={(y(act.prevRank) + y(act.rank)) / 2} width={width}>
          <ChartTooltipContent
            title={act.title}
            rows={[
              { key: 'cur', label: `${curLabel} · #${act.rank}`, value: full.format(act.views), color },
              { key: 'prev', label: `${prevLabel} · #${act.prevRank}`, value: full.format(act.prevViews) },
            ]}
            footer={`${signedPct(act.views / act.prevViews - 1)} readers`}
          />
        </FloatingTip>
      )}
    </div>
  )
}

/** Views against rank on log–log axes: the long tail of attention. */
export function ShapeChart({ list }: { list: WikiArticle[] }) {
  const [ref, { width }] = useElementSize()
  const [hover, setHover] = useState<number | null>(null)
  const H = 260
  const pad = { l: 44, r: 16, t: 16, b: 28 }
  const n = list.length
  const total = useMemo(() => list.reduce((s, a) => s + a.views, 0), [list])
  const top10 = list.slice(0, 10).reduce((s, a) => s + a.views, 0)
  const vMax = 10 ** Math.ceil(Math.log10(list[0]?.views ?? 10))
  const vMin = 10 ** Math.floor(Math.log10(list.at(-1)?.views ?? 1))
  const x = (rank: number) => pad.l + (Math.log10(rank) / Math.log10(n || 10)) * (width - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (Math.log10(v) - Math.log10(vMin)) / (Math.log10(vMax) - Math.log10(vMin))) * (H - pad.t - pad.b)
  const d = width ? list.map((a, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(a.views).toFixed(1)}`).join('') : ''
  const area = width
    ? `${list
        .slice(0, 10)
        .map((a, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(a.views).toFixed(1)}`)
        .join('')} L${x(10)},${H - pad.b} L${x(1)},${H - pad.b} Z`
    : ''
  const rankTicks = [1, 10, 100, 1000].filter((r) => r <= n)
  const viewTicks: number[] = []
  for (let v = vMin; v <= vMax; v *= 10) viewTicks.push(v)

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = (e.clientX - r.left - pad.l) / (width - pad.l - pad.r)
    const rank = Math.round(10 ** (Math.min(1, Math.max(0, f)) * Math.log10(n)))
    setHover(Math.min(n, Math.max(1, rank)) - 1)
  }
  const hp = hover != null ? list[hover] : undefined
  const roomy = width - x(10) > 210

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Views by rank, log–log">
          {viewTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={v === vMin ? 'var(--chart-axis)' : 'var(--chart-grid)'} />
              <text x={pad.l - 8} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[11px] tabular-nums">
                {compact.format(v)}
              </text>
            </g>
          ))}
          {rankTicks.map((r) => (
            <text key={r} x={x(r)} y={H - 8} textAnchor={r === 1 ? 'start' : 'middle'} className="fill-muted-foreground text-[11px] tabular-nums">
              #{r.toLocaleString()}
            </text>
          ))}
          <path d={area} fill="var(--series-1)" opacity={0.12} />
          <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
          {list[9] && (
            <g>
              <circle cx={x(10)} cy={y(list[9].views)} r={4} fill="var(--series-1)" className="stroke-card" strokeWidth={2} />
              <line x1={x(10)} x2={x(10)} y1={y(list[9].views) - 8} y2={y(list[9].views) - 54} stroke="var(--chart-axis)" />
              <text x={roomy ? x(10) + 10 : width - pad.r} textAnchor={roomy ? "start" : "end"} y={y(list[9].views) - 44} className="fill-foreground text-[12px] font-medium">
                Top 10 take {Math.round((top10 / total) * 100)}% of views
              </text>
              <text x={roomy ? x(10) + 10 : width - pad.r} textAnchor={roomy ? "start" : "end"} y={y(list[9].views) - 29} className="fill-muted-foreground text-[11px]">
                across the top {n.toLocaleString()} articles
              </text>
            </g>
          )}
          {hp && hover != null && (
            <>
              <line x1={x(hover + 1)} x2={x(hover + 1)} y1={pad.t} y2={H - pad.b} stroke="var(--chart-axis)" />
              <circle cx={x(hover + 1)} cy={y(hp.views)} r={4} fill="var(--series-1)" className="stroke-card" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {hp && hover != null && (
        <FloatingTip x={x(hover + 1)} y={y(hp.views)} width={width}>
          <ChartTooltipContent title={`#${hover + 1}`} rows={[{ key: 'v', label: hp.title, value: compact.format(hp.views), color: 'var(--series-1)' }]} />
        </FloatingTip>
      )}
    </div>
  )
}
