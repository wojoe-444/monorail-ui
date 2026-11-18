import { useMemo, type ReactNode } from 'react'

import { useElementSize } from '@/features/lab/useLiveData'

import { placeLabels, spread, type Rect } from '../place'
import { font, measure, useFontsReady } from '../text'
import { shortDay, type Arc, type Day } from './model'

/**
 * Bump chart of daily ranks with the story drawn on: every line is named at
 * least once (at its ends, or at its peak if it came and went mid-window),
 * and its notable moments carry short labels placed clear of every dot and
 * every other label. Hovering a line isolates it and prints its rank at each
 * day. Days outside the top N drop into a band at the bottom.
 */

export function ArcsChart({
  arcs,
  days,
  n,
  active,
  onActive,
  mode,
}: {
  arcs: Arc[]
  days: Day[]
  n: number
  active: string | null
  onActive: (a: string | null) => void
  /** key: annotate the six featured stories; all: every moment of every arc. */
  mode: 'key' | 'all'
}) {
  const [ref, { width }] = useElementSize()
  const fonts = useFontsReady()
  const narrow = width < 640
  const row = narrow ? (n > 10 ? 20 : 28) : n > 10 ? 26 : 38
  const padT = 34
  const offBand = row * 1.4
  const H = padT + row * n + offBand + 30
  const marginL = narrow ? 34 : Math.min(190, width * 0.15)
  const marginR = narrow ? 92 : Math.min(220, width * 0.17)
  const x0 = marginL + 8
  const x1 = width - marginR - 8
  const x = (d: number) => x0 + (d / Math.max(1, days.length - 1)) * (x1 - x0)
  const offY = padT + row * n + offBand / 2 + 4
  const y = (r: number | null) => (r !== null && r <= n ? padT + row * (r - 0.5) : offY)
  const inTop = (r: number | null) => r !== null && r <= n
  const last = days.length - 1

  // Draw order: gray lines first, featured on top, active above all.
  const order = useMemo(() => [...arcs].sort((a, b) => Number(a.featured) - Number(b.featured)), [arcs])

  // ── Names at the ends (and mid-window arcs named at their peak) ──
  const names = useMemo(() => {
    const charW = (s: string) => measure(s, font(12, 500))
    const fit = (s: string, max: number) => {
      if (charW(s) <= max) return s
      let t = s
      while (t.length > 2 && charW(t + '…') > max) t = t.slice(0, -1)
      return t.trimEnd() + '…'
    }
    const right = arcs.filter((a) => inTop(a.ranks[last]))
    const left = arcs.filter((a) => inTop(a.ranks[0]))
    const ry = spread(right.map((a) => y(a.ranks[last])), 14, padT, padT + row * n)
    const ly = spread(left.map((a) => y(a.ranks[0])), 14, padT, padT + row * n)
    return {
      right: right.map((a, i) => ({ a, y: ry[i], text: fit(a.title, marginR - 34) })),
      left: narrow ? [] : left.map((a, i) => ({ a, y: ly[i], text: fit(a.title, marginL - 30) })),
      midNamed: new Set(arcs.filter((a) => !inTop(a.ranks[last]) && (narrow || !inTop(a.ranks[0]))).map((a) => a.article)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcs, width, n, fonts])

  // ── Event annotations, placed clear of dots and each other ──
  const placed = useMemo(() => {
    if (!width) return []
    const obstacles: Rect[] = []
    for (const a of arcs) a.ranks.forEach((r, d) => inTop(r) && obstacles.push({ x: x(d) - 4, y: y(r) - 4, w: 8, h: 8 }))
    const reqs = arcs.filter((a) => mode === 'all' || a.featured).flatMap((a, idx) => {
      const evs = a.events.map((e) => {
        const named = names.midNamed.has(a.article) && (e.kind === 'peak' || e.kind === 'run' || (e.kind === 'debut' && !a.events.some((k) => k.kind === 'peak' || k.kind === 'run')))
        const text = named ? `${a.title.length > 22 ? a.title.slice(0, 21) + '…' : a.title} · ${e.label}` : e.label
        return { a, e, text, named }
      })
      // A mid-window arc with no peak/run label still needs its name somewhere: put it on its best day.
      if (names.midNamed.has(a.article) && !evs.some((k) => k.named)) {
        evs.push({ a, e: { kind: 'peak', day: a.bestDay, rank: a.best, label: `peak #${a.best}`, importance: 2.5 }, text: `${a.title.length > 22 ? a.title.slice(0, 21) + '…' : a.title} · peak #${a.best}`, named: true })
      }
      return evs.map((k) => ({
        id: `${a.article}|${k.e.kind}|${k.e.day}`,
        x: x(k.e.day),
        y: y(k.e.rank),
        r: 4,
        w: measure(k.text, font(10.5, k.named ? 600 : 500)) + 2,
        h: 12,
        priority: (k.named ? 10 : 0) + k.e.importance + (a.featured ? 1 : 0) - idx * 0.001,
        rings: [6, 14, 24],
        meta: k,
      }))
    })
    const { placed: out } = placeLabels(reqs, { bounds: { x: x0 - 6, y: 20, w: x1 - x0 + 12, h: padT - 20 + row * n + 6 }, obstacles, pad: 1.5 })
    const byId = new Map(reqs.map((q) => [q.id, q]))
    return out.map((p) => ({ p, ...byId.get(p.id)!.meta }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcs, names, width, n, fonts, mode])

  const act = arcs.find((a) => a.article === active)
  // Label every k-th day so date labels keep ~52px apart, always including the latest day.
  const step = Math.max(1, Math.ceil(52 / Math.max(1, (x1 - x0) / Math.max(1, last))))
  const dayTicks = days.map((d, i) => ({ i, label: shortDay(d.date) })).filter((t) => (last - t.i) % step === 0)
  const line = (a: Arc): ReactNode[] => {
    const segs: ReactNode[] = []
    for (let d = 1; d <= last; d++) {
      const r0 = a.ranks[d - 1]
      const r1 = a.ranks[d]
      const both = inTop(r0) && inTop(r1)
      const none = !inTop(r0) && !inTop(r1)
      if (none) continue
      const xa = x(d - 1)
      const xb = x(d)
      const ya = y(r0)
      const yb = y(r1)
      const mid = (xa + xb) / 2
      segs.push(
        <path
          key={d}
          d={`M${xa},${ya} C${mid},${ya} ${mid},${yb} ${xb},${yb}`}
          fill="none"
          stroke={a.color}
          strokeWidth={a.featured ? 2.25 : 1.5}
          strokeOpacity={both ? 1 : 0.3}
          strokeLinecap="round"
        />,
      )
    }
    return segs
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Daily rank of ${arcs.length} articles over ${days.length} days, top ${n}`} onPointerLeave={() => onActive(null)}>
          {/* Rank rows */}
          {Array.from({ length: n }, (_, i) => i + 1).map((r) => (
            <g key={r}>
              {(r === 1 || r % 5 === 0) && (
                <>
                  <line x1={x0 - 6} x2={x1 + 6} y1={y(r)} y2={y(r)} stroke="var(--chart-grid)" />
                  <text x={x0 - 12} y={y(r)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[10px] tabular-nums">
                    {narrow ? r : ''}
                  </text>
                </>
              )}
            </g>
          ))}
          <rect x={x0 - 6} y={padT + row * n + 6} width={x1 - x0 + 12} height={offBand - 4} rx={4} fill="var(--muted)" opacity={0.6} />
          <text x={(x0 + x1) / 2} y={offY} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
            outside the top {n}
          </text>
          {dayTicks.map((t) => (
            <g key={t.i}>
              <line x1={x(t.i)} x2={x(t.i)} y1={padT - 6} y2={padT + row * n} stroke="var(--chart-grid)" />
              <text x={x(t.i)} y={14} textAnchor="middle" className="fill-muted-foreground text-[10.5px] tabular-nums">
                {t.label}
              </text>
            </g>
          ))}

          {/* Lines */}
          {order.map((a) => {
            const dim = active != null && active !== a.article
            return (
              <g key={a.article} opacity={dim ? 0.12 : a.featured ? 1 : mode === 'all' ? 0.55 : 0.35} className="transition-opacity" onPointerEnter={() => onActive(a.article)}>
                {line(a)}
                {a.ranks.map((r, d) =>
                  inTop(r) ? <circle key={d} cx={x(d)} cy={y(r)} r={a.featured ? 3.5 : 2.5} fill={a.color} stroke="var(--card)" strokeWidth={1.5} /> : null,
                )}
                {/* Generous hit area */}
                <path
                  d={a.ranks.map((r, d) => `${d ? 'L' : 'M'}${x(d)},${y(r)}`).join('')}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  onPointerEnter={() => onActive(a.article)}
                />
              </g>
            )
          })}

          {/* Event labels */}
          {!act &&
            placed.map(({ p, a, text, named }) => (
              <g key={p.id} onPointerEnter={() => onActive(a.article)}>
                {p.leader && <line {...p.leader} stroke="var(--foreground)" strokeOpacity={0.35} />}
                <text x={p.rect.x + 1} y={p.rect.y + 9.5} className={named ? 'fill-foreground text-[10.5px] font-semibold' : 'fill-foreground/75 text-[10.5px] font-medium'} style={halo}>
                  {text}
                </text>
              </g>
            ))}

          {/* Isolated arc: rank at every day */}
          {act &&
            act.ranks.map((r, d) =>
              inTop(r) ? (
                <g key={d}>
                  <circle cx={x(d)} cy={y(r)} r={4.5} fill={act.color} stroke="var(--card)" strokeWidth={2} />
                  <text x={x(d)} y={y(r) - 9} textAnchor="middle" className="fill-foreground text-[10.5px] font-semibold tabular-nums" style={halo}>
                    #{r}
                  </text>
                </g>
              ) : null,
            )}

          {/* Names at the ends */}
          {names.right.map(({ a, y: ly, text }) => {
            const dim = active != null && active !== a.article
            const ay = y(a.ranks[last])
            return (
              <g key={`r${a.article}`} opacity={dim ? 0.25 : 1} onPointerEnter={() => onActive(a.article)} className="cursor-default">
                {Math.abs(ly - ay) > 1 && <path d={`M${x1 + 6},${ay} L${x1 + 14},${ly}`} stroke="var(--chart-axis)" fill="none" />}
                <text x={x1 + 16} y={ly} dominantBaseline="central" className="text-[12px]">
                  <tspan className="fill-muted-foreground tabular-nums">#{a.ranks[last]} </tspan>
                  <tspan className={a.featured ? 'fill-foreground font-medium' : 'fill-foreground/75'}>{text}</tspan>
                </text>
              </g>
            )
          })}
          {names.left.map(({ a, y: ly, text }) => {
            const dim = active != null && active !== a.article
            const ay = y(a.ranks[0])
            return (
              <g key={`l${a.article}`} opacity={dim ? 0.25 : 1} onPointerEnter={() => onActive(a.article)}>
                {Math.abs(ly - ay) > 1 && <path d={`M${x0 - 6},${ay} L${x0 - 14},${ly}`} stroke="var(--chart-axis)" fill="none" />}
                <text x={x0 - 16} y={ly} textAnchor="end" dominantBaseline="central" className={a.featured ? 'fill-foreground text-[12px] font-medium' : 'fill-foreground/75 text-[12px]'}>
                  {text} <tspan className="fill-muted-foreground tabular-nums">#{a.ranks[0]}</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

const halo = { paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3.5, strokeLinejoin: 'round' } as const
