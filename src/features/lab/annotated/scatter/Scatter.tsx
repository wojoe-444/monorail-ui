import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FloatingTip } from '@/features/lab/LabKit'
import type { WorldIndicators } from '@/features/lab/sources'
import { useElementSize } from '@/features/lab/useLiveData'

import { placeLabels, type LabelRequest, type Placed, type Rect } from '../place'
import { font, measure, useFontsReady, wrap } from '../text'
import { callouts, money, people, regionColor, trailFor, yrs, type Callout, type Fit, type Row } from './model'

/**
 * GDP per capita (log) against life expectancy, every country a dot sized by
 * population, and every dot offered a label. Labels are placed greedily by
 * priority (callouts, then the populous and the unusual) with leader lines
 * when they have to move; whatever can't fit waits for zoom, where the extra
 * room lets the next tier in. Ctrl/⌘-scroll, pinch, double-click or the
 * buttons zoom; drag pans; click pins a country and draws its trail.
 */

interface View {
  k: number
  tx: number
  ty: number
}

const LABEL_SIZE = 11
const LABEL_H = 13

export function Scatter({
  data,
  rows,
  fit,
  year,
  firstYear,
  domain,
  pinned,
  onPin,
  onStats,
  animate,
}: {
  data: WorldIndicators
  rows: Row[]
  fit: Fit
  year: number
  firstYear: number
  domain: { x: [number, number]; y: [number, number] }
  pinned: string | null
  onPin: (iso3: string | null) => void
  onStats: (s: { placed: number; total: number; zoom: number }) => void
  animate: boolean
}) {
  const [ref, { width }] = useElementSize()
  const fonts = useFontsReady()
  const narrow = width < 640
  const H = narrow ? 470 : Math.round(Math.min(700, Math.max(540, width * 0.56)))
  const pad = { l: 46, r: 14, t: narrow ? 26 : 14, b: 38 }
  const plot: Rect = { x: pad.l, y: pad.t, w: Math.max(0, width - pad.l - pad.r), h: H - pad.t - pad.b }
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Base scales (k = 1) and the zoomed ones.
  const bx = (gdp: number) => plot.x + ((Math.log10(gdp) - domain.x[0]) / (domain.x[1] - domain.x[0])) * plot.w
  const by = (le: number) => plot.y + (1 - (le - domain.y[0]) / (domain.y[1] - domain.y[0])) * plot.h
  const sx = (gdp: number) => plot.x + (bx(gdp) - plot.x) * view.k + view.tx
  const sy = (le: number) => plot.y + (by(le) - plot.y) * view.k + view.ty
  const invX = (px: number) => 10 ** (domain.x[0] + ((px - view.tx - plot.x) / view.k / plot.w) * (domain.x[1] - domain.x[0]))
  const invY = (py: number) => domain.y[0] + (1 - (py - view.ty - plot.y) / view.k / plot.h) * (domain.y[1] - domain.y[0])

  const clamp = (v: View): View => {
    const k = Math.min(14, Math.max(1, v.k))
    return { k, tx: Math.min(0, Math.max(-plot.w * (k - 1), v.tx)), ty: Math.min(0, Math.max(-plot.h * (k - 1), v.ty)) }
  }
  const zoomAt = (factor: number, px: number, py: number) =>
    setView((v) => {
      const k = Math.min(14, Math.max(1, v.k * factor))
      const f = k / v.k
      return clamp({ k, tx: px - plot.x - (px - plot.x - v.tx) * f, ty: py - plot.y - (py - plot.y - v.ty) * f })
    })

  const maxPop = useMemo(() => Math.max(...rows.map((r) => r.pop), 1), [rows])
  const rMax = narrow ? 18 : 30
  const radius = (pop: number) => Math.max(2.5, Math.sqrt(pop / maxPop) * rMax)

  const dots = useMemo(
    () =>
      rows
        .map((r) => ({ r, x: sx(r.gdp), y: sy(Math.max(r.le, domain.y[0])), rad: radius(r.pop), off: r.le < domain.y[0] }))
        .filter((d) => d.x >= plot.x - d.rad && d.x <= plot.x + plot.w + d.rad && d.y >= plot.y - d.rad && d.y <= plot.y + plot.h + d.rad)
        .sort((a, b) => b.rad - a.rad),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, view, width, H, domain, maxPop],
  )

  const notes: Callout[] = useMemo(() => (width >= 760 ? callouts(rows) : []), [rows, width])

  // The fitted curve, sampled across the visible income range.
  const curve = useMemo(() => {
    if (!width) return { d: '', pts: [] as [number, number][] }
    const pts: [number, number][] = []
    const lo = Math.max(domain.x[0], Math.log10(invX(plot.x)))
    const hi = Math.min(domain.x[1], Math.log10(invX(plot.x + plot.w)))
    for (let i = 0; i <= 80; i++) {
      const g = 10 ** (lo + ((hi - lo) * i) / 80)
      pts.push([sx(g), sy(fit.predict(g))])
    }
    return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''), pts }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, view, width, H, domain])

  // ── Label layout ──
  const layout = useMemo(() => {
    if (!width) return { placed: new Map<string, Placed>(), callouts: [] as { c: Callout; p: Placed; lines: string[]; tlines: string[] }[], curveLabel: undefined as Placed | undefined, deferred: 0 }
    const obstacles: Rect[] = dots.map((d) => ({ x: d.x - d.rad, y: d.y - d.rad, w: d.rad * 2, h: d.rad * 2 }))
    // The zoom buttons float over the top-right corner.
    obstacles.push({ x: width - 60, y: 0, w: 60, h: 130 })
    const sd = Math.sqrt(rows.reduce((s, r) => s + r.residual ** 2, 0) / Math.max(1, rows.length))
    const reqs: LabelRequest[] = []

    // The curve's own label: near its high-income end, above the line.
    const tenfold = fit.slopeAt(20_000)
    const curveText = `Typical for its income · about ${tenfold >= 0 ? '+' : ''}${tenfold.toFixed(0)} years per tenfold richer`
    const cw = Math.min(plot.w - 8, measure(curveText, font(11, 500)) + 2)
    const cp = curve.pts[Math.floor(curve.pts.length * 0.82)]
    if (cp && !narrow) reqs.push({ id: '__curve', x: cp[0], y: cp[1], r: 2, w: cw, h: 14, priority: 5000, rings: [14, 30, 50] })

    // Callouts: wrapped boxes, always on leaders, placed before country names.
    const noteW = 200
    const calloutBoxes = notes.map((c) => {
      const tlines = wrap(c.title, noteW, font(11.5, 600), 2)
      const lines = wrap(c.text, noteW, font(11, 400), 3)
      return { c, tlines, lines, h: tlines.length * 15 + lines.length * 14 + 4 }
    })
    for (const b of calloutBoxes) {
      const d = dots.find((k) => k.r.iso3 === b.c.iso3)
      if (!d) continue
      reqs.push({ id: `__note:${b.c.iso3}`, x: d.x, y: d.y, r: d.rad, w: noteW + 16, h: b.h + 10, priority: 4000 + b.c.weight, rings: [26, 52, 90, 140, 200] })
    }

    for (const d of dots) {
      const big = d.r.pop >= 30e6
      const w = measure(d.r.name, font(LABEL_SIZE, big ? 600 : 400)) + 1
      const unusual = Math.abs(d.r.residual) / (sd || 1)
      const isPinned = d.r.iso3 === pinned
      reqs.push({
        id: d.r.iso3,
        x: d.x,
        y: d.y,
        r: d.rad,
        w,
        h: LABEL_H,
        priority: (isPinned ? 3000 : 0) + Math.log10(d.r.pop) * 1.2 + unusual,
        rings: [8, 18],
      })
    }
    const { placed, deferred } = placeLabels(reqs, { bounds: plot, obstacles, pad: 1.5 })
    const byId = new Map(placed.map((p) => [p.id, p]))
    const outCallouts = calloutBoxes.flatMap((b) => {
      const p = byId.get(`__note:${b.c.iso3}`)
      return p ? [{ c: b.c, p, lines: b.lines, tlines: b.tlines }] : []
    })
    return {
      placed: byId,
      callouts: outCallouts,
      curveLabel: byId.get('__curve') ? { ...byId.get('__curve')!, text: curveText } : undefined,
      deferred: deferred.filter((id) => !id.startsWith('__')).length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots, notes, curve, pinned, fonts, width, H])

  const placedNames = dots.length - layout.deferred
  useEffect(() => {
    onStats({ placed: placedNames, total: rows.length, zoom: view.k })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedNames, rows.length, view.k])

  // ── Interaction ──
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, H])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; moved: boolean; v: View; pinch?: { d: number; mx: number; my: number } } | null>(null)
  const local = (e: RPointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const nearest = (x: number, y: number) => {
    let best: (typeof dots)[number] | null = null
    let bd = Infinity
    for (const d of dots) {
      const dist = Math.hypot(d.x - x, d.y - y) - d.rad
      if (dist < bd && dist < 14) {
        bd = dist
        best = d
      }
    }
    return best
  }
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      drag.current = { x: p.x, y: p.y, moved: true, v: view, pinch: { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 } }
    } else drag.current = { x: p.x, y: p.y, moved: false, v: view }
  }
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const p = local(e)
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p)
    const g = drag.current
    if (g?.pinch && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const f = Math.hypot(a.x - b.x, a.y - b.y) / (g.pinch.d || 1)
      const k = Math.min(14, Math.max(1, g.v.k * f))
      const ff = k / g.v.k
      setView(clamp({ k, tx: g.pinch.mx - plot.x - (g.pinch.mx - plot.x - g.v.tx) * ff, ty: g.pinch.my - plot.y - (g.pinch.my - plot.y - g.v.ty) * ff }))
      return
    }
    if (g && pointers.current.size === 1) {
      const dx = p.x - g.x
      const dy = p.y - g.y
      if (Math.hypot(dx, dy) > 4) g.moved = true
      if (g.moved && g.v.k > 1) {
        setView(clamp({ k: g.v.k, tx: g.v.tx + dx, ty: g.v.ty + dy }))
        return
      }
    }
    setHover(nearest(p.x, p.y)?.r.iso3 ?? null)
  }
  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    const g = drag.current
    pointers.current.delete(e.pointerId)
    if (g && !g.moved && pointers.current.size === 0) {
      const p = local(e)
      const hit = nearest(p.x, p.y)
      onPin(hit ? (hit.r.iso3 === pinned ? null : hit.r.iso3) : null)
    }
    if (pointers.current.size === 0) drag.current = null
  }

  // ── Trail for the hovered or pinned country ──
  const focus = hover ?? pinned
  const trail = useMemo(() => (focus ? trailFor(data, focus, firstYear, year) : []), [data, focus, firstYear, year])
  const focusRow = rows.find((r) => r.iso3 === focus)
  const focusDot = dots.find((d) => d.r.iso3 === focus)

  // ── Axes ──
  // Visible income ticks, thinned so labels keep ~44px apart.
  const xTicks = [200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000, 200_000]
    .filter((g) => {
      const x = sx(g)
      return x >= plot.x - 1 && x <= plot.x + plot.w + 1
    })
    .reduce<number[]>((kept, g) => (kept.length && sx(g) - sx(kept[kept.length - 1]) < 44 ? kept : [...kept, g]), [])
  const yStep = view.k > 3 ? 1 : view.k > 1.6 ? 2 : 5
  const yTicks: number[] = []
  for (let v = Math.ceil(invY(plot.y + plot.h) / yStep) * yStep; v <= invY(plot.y); v += yStep) yTicks.push(v)
  const motion = animate ? 'transform 650ms cubic-bezier(.2,.7,.2,1)' : 'none'

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={H}
          className={view.k > 1 ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-none'}
          role="img"
          aria-label={`Life expectancy against GDP per capita for ${rows.length} countries in ${year}. ${placedNames} are labeled at this zoom.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={(e) => {
            const r = svgRef.current!.getBoundingClientRect()
            zoomAt(2, e.clientX - r.left, e.clientY - r.top)
          }}
        >
          <defs>
            <clipPath id="ec-plot">
              <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
            </clipPath>
          </defs>

          {/* Axes */}
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={plot.x} x2={plot.x + plot.w} y1={sy(v)} y2={sy(v)} stroke="var(--chart-grid)" />
              <text x={plot.x - 8} y={sy(v)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[11px] tabular-nums">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((g) => (
            <g key={`x${g}`}>
              <line x1={sx(g)} x2={sx(g)} y1={plot.y} y2={plot.y + plot.h} stroke="var(--chart-grid)" />
              <text x={sx(g)} y={plot.y + plot.h + 16} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
                {money(g)}
              </text>
            </g>
          ))}
          <line x1={plot.x} x2={plot.x + plot.w} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke="var(--chart-axis)" />
          <text x={plot.x + plot.w} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
            {narrow ? 'GDP per person (log) →' : 'GDP per person, US$ (log scale) →'}
          </text>
          <text x={narrow ? 6 : plot.x} y={narrow ? 12 : H - 4} className="fill-muted-foreground text-[11px]">
            ↑ Life expectancy, years
          </text>

          <g clipPath="url(#ec-plot)">
            {/* The curve */}
            <path d={curve.d} fill="none" stroke="var(--foreground)" strokeOpacity={0.35} strokeWidth={1.5} />

            {/* Trail */}
            {trail.length > 1 && (
              <g>
                <path
                  d={trail.map((t, i) => `${i ? 'L' : 'M'}${sx(t.gdp).toFixed(1)},${sy(t.le).toFixed(1)}`).join('')}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  opacity={0.7}
                />
                {trail.map((t) => (
                  <circle key={t.year} cx={sx(t.gdp)} cy={sy(t.le)} r={2} fill="var(--foreground)" opacity={0.7} />
                ))}
                <text x={sx(trail[0].gdp)} y={sy(trail[0].le) + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums" style={halo}>
                  {trail[0].year}
                </text>
              </g>
            )}

            {/* Dots, biggest first so small ones stay on top */}
            {dots.map((d) => {
              const on = d.r.iso3 === focus
              const dim = focus && !on
              return (
                <g key={d.r.iso3} style={{ transform: `translate(${d.x}px, ${d.y}px)`, transition: motion }}>
                  {d.off && <path d="M-4,6 L4,6 L0,11 Z" fill="var(--foreground)" opacity={0.6} />}
                  <circle
                    r={d.rad}
                    fill={regionColor(d.r.region)}
                    fillOpacity={dim ? 0.18 : 0.55}
                    stroke={on ? 'var(--foreground)' : 'var(--card)'}
                    strokeWidth={on ? 2 : 1}
                  />
                </g>
              )
            })}

            {/* Leaders, then labels with a surface halo */}
            {dots.map((d) => {
              const p = layout.placed.get(d.r.iso3)
              if (!p) return null
              const dim = focus && d.r.iso3 !== focus
              const big = d.r.pop >= 30e6
              const tx = p.rect.x
              const ty = p.rect.y + LABEL_H - 3
              return (
                <g key={`l${d.r.iso3}`} opacity={dim ? 0.3 : 1} style={{ transition: animate ? 'opacity 300ms' : undefined }}>
                  {p.leader && <line {...p.leader} stroke="var(--chart-axis)" strokeWidth={1} />}
                  <text
                    x={tx}
                    y={ty}
                    className={big ? 'fill-foreground text-[11px] font-semibold' : 'fill-foreground/80 text-[11px]'}
                    style={halo}
                    onPointerEnter={() => setHover(d.r.iso3)}
                  >
                    {d.r.name}
                  </text>
                </g>
              )
            })}

            {/* Curve label */}
            {layout.curveLabel && (
              <g>
                {layout.curveLabel.leader && <line {...layout.curveLabel.leader} stroke="var(--chart-axis)" />}
                <text x={layout.curveLabel.rect.x} y={layout.curveLabel.rect.y + 11} className="fill-muted-foreground text-[11px] font-medium italic" style={halo}>
                  {(layout.curveLabel as Placed & { text: string }).text}
                </text>
              </g>
            )}

            {/* Callouts */}
            {layout.callouts.map(({ c, p, lines, tlines }) => {
              const dim = focus && c.iso3 !== focus
              return (
                <g key={c.iso3} opacity={dim ? 0.35 : 1} onPointerEnter={() => setHover(c.iso3)}>
                  {p.leader && <line {...p.leader} stroke="var(--foreground)" strokeOpacity={0.5} strokeWidth={1} />}
                  <rect x={p.rect.x + 1} y={p.rect.y + 1} width={p.rect.w - 2} height={p.rect.h - 2} rx={6} fill="var(--card)" fillOpacity={0.94} stroke="var(--border)" />
                  <text x={p.rect.x + 8} y={p.rect.y + 16} className="fill-foreground text-[11.5px] font-semibold">
                    {tlines.map((l, i) => (
                      <tspan key={i} x={p.rect.x + 8} dy={i ? 15 : 0}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                  <text x={p.rect.x + 8} y={p.rect.y + tlines.length * 15 + 16} className="fill-muted-foreground text-[11px]">
                    {lines.map((l, i) => (
                      <tspan key={i} x={p.rect.x + 8} dy={i ? 14 : 0}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {/* Zoom controls */}
      {width > 0 && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 rounded-lg border bg-card/90 p-1 backdrop-blur">
          <ZoomButton label="Zoom in" onClick={() => zoomAt(1.8, plot.x + plot.w / 2, plot.y + plot.h / 2)}>
            <Plus />
          </ZoomButton>
          <ZoomButton label="Zoom out" onClick={() => zoomAt(1 / 1.8, plot.x + plot.w / 2, plot.y + plot.h / 2)}>
            <Minus />
          </ZoomButton>
          <ZoomButton label="Reset zoom" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} disabled={view.k === 1}>
            <RotateCcw />
          </ZoomButton>
        </div>
      )}

      {focusRow && focusDot && (
        <FloatingTip x={focusDot.x + focusDot.rad} y={focusDot.y} width={width}>
          <ChartTooltipContent
            title={`${focusRow.name}, ${year}`}
            rows={[
              { key: 'le', label: 'life expectancy, years', value: focusRow.le.toFixed(1), color: regionColor(focusRow.region) },
              { key: 'gdp', label: 'GDP per person', value: money(focusRow.gdp) },
              { key: 'pop', label: 'people', value: people(focusRow.pop) },
            ]}
            footer={`${yrs(focusRow.residual)} years ${focusRow.residual >= 0 ? 'above' : 'below'} the curve for its income${trail.length > 1 ? ` · trail since ${trail[0].year}` : ''}`}
          />
        </FloatingTip>
      )}
    </div>
  )
}

const halo = { paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3, strokeLinejoin: 'round' } as const

function ZoomButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}
