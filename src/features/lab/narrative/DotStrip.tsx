import { useState } from 'react'

/**
 * Sidenote: every country's value on one line, the region's in the series
 * hue, this country marked and labeled. It answers "where does that number
 * sit?" for the sentence beside it.
 */
export function DotStrip({
  values,
  mine,
  region,
  fmt,
  log,
  caption,
  name,
}: {
  values: { iso: string; name: string; value: number }[]
  mine: string
  region: Set<string>
  fmt: (v: number) => string
  log?: boolean
  caption: string
  name: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 256
  const H = 54
  const pad = 10
  const t = (v: number) => (log ? Math.log10(Math.max(v, 1e-3)) : v)
  const vals = values.map((v) => t(v.value))
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const x = (v: number) => pad + ((t(v) - lo) / (hi - lo || 1)) * (W - pad * 2)
  const me = values.find((v) => v.iso === mine)
  const minV = values.reduce((a, b) => (b.value < a.value ? b : a), values[0])
  const maxV = values.reduce((a, b) => (b.value > a.value ? b : a), values[0])
  const h = hover !== null ? values[hover] : undefined
  const meX = me ? x(me.value) : 0
  const anchor = meX < 60 ? 'start' : meX > W - 60 ? 'end' : 'middle'
  return (
    <figure className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${caption}: ${name} at ${me ? fmt(me.value) : 'no data'}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          let best = 0
          values.forEach((v, i) => {
            if (Math.abs(x(v.value) - px) < Math.abs(x(values[best].value) - px)) best = i
          })
          setHover(best)
        }}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={pad} x2={W - pad} y1={30} y2={30} stroke="var(--chart-axis)" />
        {values.map((v, i) =>
          v.iso === mine ? null : (
            <circle key={v.iso} cx={x(v.value)} cy={30} r={region.has(v.iso) ? 3 : 2.25} fill={region.has(v.iso) ? 'var(--series-1)' : 'var(--series-other)'} opacity={hover === i ? 1 : region.has(v.iso) ? 0.75 : 0.45} />
          ),
        )}
        {me && (
          <>
            <line x1={meX} x2={meX} y1={18} y2={38} stroke="var(--foreground)" strokeWidth={2} />
            <text x={meX} y={12} textAnchor={anchor} className="fill-foreground text-[11px] font-semibold">
              {name} {fmt(me.value)}
            </text>
          </>
        )}
        <text x={pad} y={H - 2} className="fill-muted-foreground text-[10px]">
          {fmt(minV.value)}
        </text>
        <text x={W - pad} y={H - 2} textAnchor="end" className="fill-muted-foreground text-[10px]">
          {fmt(maxV.value)}
        </text>
        {h && (
          <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
            {h.name}: {fmt(h.value)}
          </text>
        )}
      </svg>
      <figcaption className="text-xs leading-relaxed text-muted-foreground">
        {caption}.{' '}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="inline-block size-2 rounded-full bg-[var(--series-1)]" /> same region
        </span>
        {log ? ', log scale' : ''}.
      </figcaption>
    </figure>
  )
}
