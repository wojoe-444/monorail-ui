import { useMemo, useState, type PointerEvent } from 'react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { FloatingTip } from '@/features/lab/LabKit'
import { useElementSize } from '@/features/lab/useLiveData'

import { placeLabels } from '../place'
import { font, useFontsReady, wrap } from '../text'
import type { DatasetView } from './datasets'
import type { Note } from './engine'

/**
 * A line with its notes in the margins. Notes never sit on the plot: each is
 * a box in a band above or below, laid out in up to two rows per band by
 * importance, as close to its moment as the neighbours allow, with a leader
 * that drops onto the exact point. Notes that find no room (and every note on
 * a phone) become numbered markers on the line, written out in the list.
 */

const GAP_TO_PLOT = 20
const ROW_GAP = 10
const AXIS_H = 24

interface Box {
  note: Note
  x: number
  y: number
  w: number
  h: number
  side: 'top' | 'bottom'
  row: number
  title: string[]
  lines: string[]
  lx: number
}

export function MarginChart({
  view,
  detail,
  active,
  onActive,
}: {
  view: DatasetView
  detail: number
  active: string | null
  onActive: (id: string | null) => void
}) {
  const [ref, { width }] = useElementSize()
  const fonts = useFontsReady()
  const [hoverI, setHoverI] = useState<number | null>(null)
  const narrow = width < 640
  const padL = 52
  const padR = 16
  const plotH = narrow ? 230 : 300
  const pts = view.pts
  const t0 = pts[0]?.t ?? 0
  const t1 = pts[pts.length - 1]?.t ?? 1
  const x = (t: number) => padL + ((t - t0) / (t1 - t0 || 1)) * (width - padL - padR)

  const vMin = Math.min(...pts.map((p) => p.v))
  const vMax = Math.max(...pts.map((p) => p.v))
  const yDom: [number, number] = view.log
    ? [10 ** Math.floor(Math.log10(Math.max(1, vMin))), Math.max(10, vMax) * 1.6]
    : [vMin - (vMax - vMin) * 0.06, vMax + (vMax - vMin) * 0.06]
  const yUnit = (v: number) =>
    view.log ? (Math.log10(Math.max(yDom[0], v)) - Math.log10(yDom[0])) / (Math.log10(yDom[1]) - Math.log10(yDom[0])) : (v - yDom[0]) / (yDom[1] - yDom[0])

  const visible = useMemo(() => view.notes.filter((n) => (n.rank ?? 99) <= detail), [view.notes, detail])

  // ── Layout the margin boxes ──
  const layout = useMemo(() => {
    const boxes: Box[] = []
    const markers: Note[] = []
    if (!width) return { boxes, markers, top: 0, bottom: 0, rowH: { top: [0, 0], bottom: [0, 0] } }
    if (narrow) return { boxes, markers: visible, top: 0, bottom: 0, rowH: { top: [0, 0], bottom: [0, 0] } }
    const noteW = Math.max(150, Math.min(200, width / 5.4))
    const rows: Record<'top' | 'bottom', { x: number; w: number }[][]> = { top: [[], []], bottom: [[], []] }
    const maxShift = noteW * 1.4
    const fits = (side: 'top' | 'bottom', row: number, bx: number, w: number, lx: number) => {
      if (rows[side][row].some((o) => bx < o.x + o.w + 12 && o.x < bx + w + 12)) return false
      // A second-row leader must not run through a first-row box.
      if (row === 1 && rows[side][0].some((o) => lx > o.x - 6 && lx < o.x + o.w + 6)) return false
      return true
    }
    for (const n of visible) {
      const px = x(n.t)
      const title = wrap(`${n.rank}  ${n.title}`, noteW, font(11.5, 600), 2)
      const lines = wrap(n.text, noteW, font(11, 400), 4)
      const h = title.length * 15 + lines.length * 14 + 4
      const pref: 'top' | 'bottom' = n.side ?? (yUnit(n.v) > 0.5 ? 'top' : 'bottom')
      const order: ['top' | 'bottom', number][] = [
        [pref, 0],
        [pref, 1],
        [pref === 'top' ? 'bottom' : 'top', 0],
        [pref === 'top' ? 'bottom' : 'top', 1],
      ]
      let done = false
      for (const [side, row] of order) {
        for (let k = 0; k <= maxShift / 8 && !done; k++) {
          for (const sign of k ? [1, -1] : [1]) {
            const bx = Math.max(padL - 40, Math.min(width - padR - noteW, px - noteW / 2 + sign * k * 8))
            const lx = Math.max(bx + 10, Math.min(px, bx + noteW - 10))
            if (!fits(side, row, bx, noteW, lx)) continue
            rows[side][row].push({ x: bx, w: noteW })
            boxes.push({ note: n, x: bx, y: 0, w: noteW, h, side, row, title, lines, lx })
            done = true
            break
          }
        }
        if (done) break
      }
      if (!done) markers.push(n)
    }
    const rowH = {
      top: [0, 1].map((r) => Math.max(0, ...boxes.filter((b) => b.side === 'top' && b.row === r).map((b) => b.h))),
      bottom: [0, 1].map((r) => Math.max(0, ...boxes.filter((b) => b.side === 'bottom' && b.row === r).map((b) => b.h))),
    }
    const top = rowH.top[0] + (rowH.top[1] ? rowH.top[1] + ROW_GAP : 0)
    const bottom = rowH.bottom[0] + (rowH.bottom[1] ? rowH.bottom[1] + ROW_GAP : 0)
    return { boxes, markers, top, bottom, rowH }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, width, fonts, view])

  const plotTop = (layout.top ? layout.top + GAP_TO_PLOT : 12) + 4
  const plotBottom = plotTop + plotH
  const bottomStart = plotBottom + AXIS_H + (layout.bottom ? GAP_TO_PLOT : 0)
  const H = bottomStart + layout.bottom + 8
  const y = (v: number) => plotBottom - yUnit(v) * plotH

  // Vertical positions now that the bands are known.
  const boxes = layout.boxes.map((b) => {
    if (b.side === 'top') {
      const bottomEdge = b.row === 0 ? layout.top : layout.top - layout.rowH.top[0] - ROW_GAP
      return { ...b, y: bottomEdge - b.h + 4 }
    }
    const topEdge = b.row === 0 ? bottomStart : bottomStart + layout.rowH.bottom[0] + ROW_GAP
    return { ...b, y: topEdge }
  })

  // Numbered markers for notes without a margin box.
  const markers = useMemo(() => {
    if (!width || !layout.markers.length) return []
    const { placed } = placeLabels(
      layout.markers.map((n) => ({ id: n.id, x: x(n.t), y: y(n.v), r: 3.5, w: 18, h: 18, priority: 100 - (n.rank ?? 0), rings: [8, 18, 30] })),
      { bounds: { x: padL - 10, y: plotTop - 10, w: width - padL - padR + 20, h: plotH + 20 }, pad: 2 },
    )
    return placed.map((p) => ({ p, note: layout.markers.find((n) => n.id === p.id)! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.markers, width, plotTop, plotH])

  // ── Line ──
  const path = (subset: { t: number; v: number }[]) => subset.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const fStart = pts.findIndex((p) => p.forecast)
  const measured = fStart === -1 ? pts : pts.slice(0, fStart + 1)
  const forecast = fStart === -1 ? [] : pts.slice(Math.max(0, fStart - 1))

  // ── Axes ──
  const yTicks: number[] = []
  if (view.log) {
    for (let v = yDom[0]; v <= yDom[1]; v *= 10) yTicks.push(v)
  } else {
    const raw = (yDom[1] - yDom[0]) / 4
    const mag = 10 ** Math.floor(Math.log10(raw))
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
    for (let v = Math.ceil(yDom[0] / step) * step; v <= yDom[1]; v += step) yTicks.push(v)
  }
  // Keep ticks at least ~56px apart so labels never collide on narrow screens.
  const xTicks = (width ? view.ticks(t0, t1).filter((tk) => x(tk.t) >= padL + 10 && x(tk.t) <= width - padR - 14) : []).reduce<{ t: number; label: string }[]>(
    (kept, tk) => (kept.length && x(tk.t) - x(kept[kept.length - 1].t) < 56 ? kept : [...kept, tk]),
    [],
  )
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

  const activeNote = view.notes.find((n) => n.id === active)
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left + padL
    let lo = 0
    let hi = pts.length - 1
    const t = t0 + ((px - padL) / (width - padL - padR)) * (t1 - t0)
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (pts[m].t < t) lo = m
      else hi = m
    }
    const i = Math.abs(pts[lo].t - t) < Math.abs(pts[hi].t - t) ? lo : hi
    setHoverI(i)
    const near = visible
      .map((n) => ({ n, d: Math.abs(x(n.t) - px) }))
      .filter((k) => k.d < 28)
      .sort((a, b) => a.d - b.d)[0]
    onActive(near?.n.id ?? null)
  }
  const hp = hoverI != null ? pts[hoverI] : undefined

  return (
    <div ref={ref} className="relative w-full" style={{ height: H || 300 }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`${view.yLabel}, with ${visible.length} notes`}>
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
              <text x={padL - 8} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[11px] tabular-nums">
                {view.log || v >= 10_000 ? compact.format(v) : Math.round(v * 10) / 10}
              </text>
            </g>
          ))}
          <line x1={padL} x2={width - padR} y1={plotBottom} y2={plotBottom} stroke="var(--chart-axis)" />

          {/* Active span */}
          {activeNote?.t0 !== undefined && activeNote.t1 !== undefined && (
            <rect x={x(activeNote.t0)} y={plotTop} width={Math.max(2, x(activeNote.t1) - x(activeNote.t0))} height={plotH} fill="var(--foreground)" opacity={0.07} />
          )}

          {/* Now */}
          {view.nowT !== undefined && (
            <g>
              <line x1={x(view.nowT)} x2={x(view.nowT)} y1={plotTop} y2={plotBottom} stroke="var(--chart-axis)" />
              <text x={x(view.nowT) + 4} y={plotBottom - 6} className="fill-muted-foreground text-[10px]">
                forecast →
              </text>
            </g>
          )}

          {/* The line */}
          <path d={path(measured)} fill="none" stroke="var(--series-1)" strokeWidth={view.pts.length > 400 ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
          {forecast.length > 1 && <path d={path(forecast)} fill="none" stroke="var(--series-1)" strokeOpacity={0.45} strokeWidth={2} strokeLinejoin="round" />}

          {/* Hover layer over the plot (markers and notes sit above it) */}
          <rect x={padL} y={plotTop} width={Math.max(0, width - padL - padR)} height={plotH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHoverI(null)} />

          {/* Span brackets on the plot edge, for visible notes about a span */}
          {boxes.map(({ note: n, side }) =>
            n.t0 !== undefined && n.t1 !== undefined ? (
              <g key={`br${n.id}`} opacity={active && active !== n.id ? 0.3 : 0.7}>
                {(() => {
                  const yy = side === 'top' ? plotTop - 4 : plotBottom + 3
                  const a = x(n.t0)
                  const b = Math.max(a + 3, x(n.t1))
                  const tick = side === 'top' ? 4 : -4
                  return <path d={`M${a},${yy + tick} V${yy} H${b} V${yy + tick}`} fill="none" stroke="var(--foreground)" strokeWidth={1} />
                })()}
              </g>
            ) : null,
          )}

          {/* Leaders and boxes */}
          {boxes.map((b) => {
            const n = b.note
            const px = x(n.t)
            const py = y(n.v)
            const on = active === n.id
            const dim = active != null && !on
            const edge = b.side === 'top' ? b.y + b.h : b.y
            const bandEdge = b.side === 'top' ? layout.top + 6 : bottomStart - 2
            const plotEdge = b.side === 'top' ? plotTop - 8 : plotBottom + AXIS_H - 4
            const dotGap = b.side === 'top' ? -5 : 5
            return (
              <g
                key={n.id}
                opacity={dim ? 0.4 : 1}
                className="transition-opacity outline-none"
                tabIndex={0}
                role="note"
                aria-label={`Note ${n.rank}: ${n.title}. ${n.text}`}
                onPointerEnter={() => onActive(n.id)}
                onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(n.id)}
                onBlur={() => onActive(null)}
              >
                <polyline
                  points={`${b.lx},${edge} ${b.lx},${bandEdge} ${px},${plotEdge} ${px},${py + dotGap}`}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={on ? 0.7 : 0.35}
                  strokeWidth={1}
                />
                <circle cx={px} cy={py} r={on ? 5 : 3.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
                <rect x={b.x} y={b.y - 4} width={b.w + 4} height={b.h + 4} rx={6} fill="transparent" stroke={on ? 'var(--foreground)' : 'transparent'} strokeOpacity={0.3} />
                <text x={b.x + 4} y={b.y + 10} className="fill-foreground text-[11.5px] font-semibold">
                  {b.title.map((l, i) => (
                    <tspan key={i} x={b.x + 4} dy={i ? 15 : 0}>
                      {i === 0 ? (
                        <>
                          <tspan className="fill-muted-foreground font-mono text-[10.5px] font-normal">{l.slice(0, String(n.rank).length)}</tspan>
                          {l.slice(String(n.rank).length)}
                        </>
                      ) : (
                        l
                      )}
                    </tspan>
                  ))}
                </text>
                <text x={b.x + 4} y={b.y + b.title.length * 15 + 9} className="fill-muted-foreground text-[11px]">
                  {b.lines.map((l, i) => (
                    <tspan key={i} x={b.x + 4} dy={i ? 14 : 0}>
                      {l}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}

          {/* Time axis labels, drawn over the leaders with a surface halo */}
          {xTicks.map((tk) => (
            <text key={tk.t} x={x(tk.t)} y={plotBottom + 16} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums" style={{ paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 4, strokeLinejoin: 'round' }}>
              {tk.label}
            </text>
          ))}

          {/* Markers */}
          {markers.map(({ p, note: n }) => {
            const on = active === n.id
            const cx = p.rect.x + p.rect.w / 2
            const cy = p.rect.y + p.rect.h / 2
            return (
              <g
                key={`m${n.id}`}
                opacity={active && !on ? 0.45 : 1}
                tabIndex={0}
                role="note"
                aria-label={`Note ${n.rank}: ${n.title}. ${n.text}`}
                onPointerEnter={() => onActive(n.id)}
                onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(n.id)}
                onBlur={() => onActive(null)}
                className="outline-none"
              >
                {p.leader && <line {...p.leader} stroke="var(--foreground)" strokeOpacity={0.4} />}
                <circle cx={x(n.t)} cy={y(n.v)} r={3} fill="var(--foreground)" stroke="var(--card)" strokeWidth={1.5} />
                <circle cx={cx} cy={cy} r={9} fill={on ? 'var(--foreground)' : 'var(--card)'} stroke="var(--foreground)" strokeOpacity={0.6} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className={on ? 'fill-background font-mono text-[10px]' : 'fill-foreground font-mono text-[10px]'}>
                  {n.rank}
                </text>
              </g>
            )
          })}

          {hp && (
            <g pointerEvents="none">
              <line x1={x(hp.t)} x2={x(hp.t)} y1={plotTop} y2={plotBottom} stroke="var(--chart-axis)" />
              <circle cx={x(hp.t)} cy={y(hp.v)} r={4} fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hp && (
        <FloatingTip x={x(hp.t)} y={y(hp.v)} width={width}>
          <ChartTooltipContent
            title={view.fmtT(hp.t)}
            rows={[{ key: 'v', label: hp.forecast ? 'forecast' : view.unit, value: view.fmtV(hp.v), color: 'var(--series-1)' }]}
            footer={activeNote ? `${activeNote.rank} · ${activeNote.title}` : undefined}
          />
        </FloatingTip>
      )}
    </div>
  )
}
