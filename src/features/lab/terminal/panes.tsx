import { useEffect, useMemo, useRef, type ReactNode } from 'react'

import type { CarbonRegion, CarbonSlot, FuelShare, KpPoint, Quake, WindPoint, XrayPoint } from '@/features/lab/sources'
import { flareClass, parseWind } from '@/features/lab/sources'
import { cn } from '@/lib/utils'

import { KpBars, MiniLine, type Pt } from './charts'
import { ago, blockBar, niceTicks, utcDay, utcHm, utcTime } from './format'
import type { HnStory } from './useHackerNews'

// ── Frame ──────────────────────────────────────────────────────────────────

export function Pane({
  id,
  label,
  focused,
  onFocus,
  meta,
  children,
  className,
}: {
  id: number
  label: string
  focused: boolean
  onFocus: () => void
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      data-pane={id}
      aria-label={label}
      onPointerDown={onFocus}
      className={cn('flex min-h-[22rem] min-w-0 flex-col bg-background lg:min-h-0', className)}
    >
      <header
        className={cn(
          'flex h-6 shrink-0 items-center gap-2 border-t-2 border-b pr-2 text-[11px]',
          focused ? 'border-t-primary' : 'border-t-transparent',
        )}
      >
        <span
          className={cn(
            'flex h-full shrink-0 items-center px-2 font-semibold tracking-wider whitespace-nowrap',
            focused ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          {id} {label}
        </span>
        <span className="ml-auto truncate text-muted-foreground tabular-nums">{meta}</span>
      </header>
      <div data-pane-body={id} className="relative min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </section>
  )
}

/** Keeps the selected row of a pane in view as j/k move it. */
export function useScrollSelected(pane: number, row: number) {
  const prev = useRef(row)
  useEffect(() => {
    // Only when the row changes, not on mount: on a phone the page itself scrolls, and it would jump to the pane.
    if (prev.current === row) return
    prev.current = row
    document.querySelector(`[data-pane="${pane}"] [data-row="${row}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [pane, row])
}

// ── 1 QUAKES ───────────────────────────────────────────────────────────────

export function magTone(mag: number): string {
  if (mag >= 6.5) return 'text-destructive font-semibold'
  if (mag >= 5) return 'text-warning-soft-foreground font-semibold'
  return ''
}

const QUAKE_COLS = 'grid grid-cols-[4.25rem_2.25rem_3rem_3.25rem_minmax(0,1fr)] gap-x-2'

export function QuakesBody({
  quakes,
  selected,
  onSelect,
  detail,
}: {
  quakes: Quake[]
  selected: number
  onSelect: (i: number) => void
  detail: boolean
}) {
  useScrollSelected(1, selected)
  const q = quakes[selected]
  return (
    <div className="flex min-h-full flex-col">
      <div className={cn(QUAKE_COLS, 'sticky top-0 z-10 border-b bg-background px-2 py-0.5 text-[10px] tracking-wider text-muted-foreground uppercase')}>
        <span>Time UTC</span>
        <span className="text-right">Mag</span>
        <span />
        <span className="text-right">Depth</span>
        <span>Place</span>
      </div>
      <ol className="flex-1">
        {quakes.map((qk, i) => (
          <li
            key={qk.id}
            data-row={i}
            onClick={() => onSelect(i)}
            className={cn(
              QUAKE_COLS,
              'h-[18px] cursor-default items-center px-2 leading-[18px]',
              i === selected ? 'bg-accent text-accent-foreground shadow-[inset_2px_0_0_var(--primary)]' : 'hover:bg-muted',
            )}
          >
            <span className="text-muted-foreground tabular-nums">{utcTime(qk.time)}</span>
            <span className={cn('text-right tabular-nums', magTone(qk.mag))}>{qk.mag.toFixed(1)}</span>
            <span className="overflow-hidden text-[10px] whitespace-nowrap text-muted-foreground/60" aria-hidden>
              {blockBar(Math.max(0, qk.mag) / 8, 5)}
            </span>
            <span className="text-right text-muted-foreground tabular-nums">{Math.round(qk.depth) || 0}km</span>
            <span className="truncate">{qk.place}</span>
          </li>
        ))}
      </ol>
      {detail && q && (
        <dl className="sticky bottom-0 grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2 border-t bg-card px-2 py-1.5 leading-[17px] shadow-elevation-2">
          <dt className="text-muted-foreground">EVENT</dt>
          <dd className="truncate font-semibold">{q.place}</dd>
          <dt className="text-muted-foreground">ID</dt>
          <dd className="truncate">{q.id}</dd>
          <dt className="text-muted-foreground">TIME</dt>
          <dd className="tabular-nums">
            {utcDay(q.time)} {utcTime(q.time)} UTC · {ago(q.time)} ago
          </dd>
          <dt className="text-muted-foreground">MAG / DEPTH</dt>
          <dd className="tabular-nums">
            <span className={magTone(q.mag)}>M{q.mag.toFixed(2)}</span> · {q.depth.toFixed(1)} km
          </dd>
          <dt className="text-muted-foreground">LAT / LON</dt>
          <dd className="tabular-nums">
            {q.lat.toFixed(3)}, {q.lon.toFixed(3)}
          </dd>
          <dt className="text-muted-foreground">FELT / SIG</dt>
          <dd className="tabular-nums">
            {q.felt ?? 0} reports · significance {q.sig}
            {q.alert ? ` · PAGER ${q.alert.toUpperCase()}` : ''}
            {q.tsunami ? ' · TSUNAMI BULLETIN' : ''}
          </dd>
          <dt className="text-muted-foreground">KEYS</dt>
          <dd className="text-muted-foreground">o open USGS page · ⏎ close</dd>
        </dl>
      )}
    </div>
  )
}

export function quakeMeta(quakes: Quake[]): string {
  const max = quakes.reduce((m, q) => Math.max(m, q.mag), -Infinity)
  const big = quakes.filter((q) => q.mag >= 4.5).length
  const felt = quakes.filter((q) => (q.felt ?? 0) > 0).length
  return `${quakes.length} ev/24h · max M${Number.isFinite(max) ? max.toFixed(1) : '—'} · ≥4.5 ${big} · felt ${felt}`
}

// ── 2 SPACE ────────────────────────────────────────────────────────────────

/** 1-minute solar wind averaged into 10-minute buckets (≈1,000 points a week instead of 10,000). */
export function parseWind10(raw: unknown): WindPoint[] {
  const rows = parseWind(raw)
  const buckets = new Map<number, { s: number; n: number; d: number; dn: number; temp: number; tn: number }>()
  for (const r of rows) {
    const k = Math.floor(r.time / 600_000) * 600_000
    const b = buckets.get(k) ?? { s: 0, n: 0, d: 0, dn: 0, temp: 0, tn: 0 }
    if (r.speed != null) {
      b.s += r.speed
      b.n++
    }
    if (r.density != null) {
      b.d += r.density
      b.dn++
    }
    if (r.temperature != null) {
      b.temp += r.temperature
      b.tn++
    }
    buckets.set(k, b)
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, b]) => ({
      time: t,
      speed: b.n ? b.s / b.n : null,
      density: b.dn ? b.d / b.dn : null,
      temperature: b.tn ? b.temp / b.tn : null,
    }))
}

const FLARE_TICKS = [
  { v: -8, label: 'A' },
  { v: -7, label: 'B' },
  { v: -6, label: 'C' },
  { v: -5, label: 'M' },
  { v: -4, label: 'X' },
]

export function SpaceBody({ kp, xray, wind, now }: { kp: KpPoint[]; xray: XrayPoint[]; wind: WindPoint[]; now: number }) {
  const xrayPts = useMemo<Pt[]>(() => xray.map((p) => ({ t: p.time, v: Math.log10(p.flux) })), [xray])
  const windPts = useMemo<Pt[]>(() => {
    const from = now - 3 * 86_400_000
    return wind.filter((w) => w.time >= from && w.speed != null).map((w) => ({ t: w.time, v: w.speed! }))
  }, [wind, now])
  const lastX = xray[xray.length - 1]
  const peakX = xray.reduce<XrayPoint | null>((m, p) => (!m || p.flux > m.flux ? p : m), null)
  const lastW = [...wind].reverse().find((w) => w.speed != null)
  const wMin = Math.min(250, ...windPts.map((p) => p.v))
  const wMax = Math.max(650, ...windPts.map((p) => p.v))
  const wTicks = niceTicks(wMin, wMax, 4).filter((v) => v > wMin && v < wMax)
  const xDomain: [number, number] = xray.length ? [xray[0].time, xray[xray.length - 1].time] : [now - 86_400_000, now]

  return (
    <div className="flex h-full min-h-[20rem] flex-col gap-2 p-2">
      <KpBars data={kp} now={now} className="flex-1" />
      <MiniLine
        className="flex-1"
        label="X-ray · 24h · log"
        data={xrayPts}
        domain={xDomain}
        y={[-8.6, -3.6]}
        ticks={FLARE_TICKS}
        color="var(--series-2)"
        format={(p) => `${utcHm(p.t)} · ${flareClass(10 ** p.v)} · ${(10 ** p.v).toExponential(2)} W/m²`}
        latest={
          lastX ? (
            <>
              {flareClass(lastX.flux)} · peak {peakX ? `${flareClass(peakX.flux)} ${utcHm(peakX.time)}` : '—'}
            </>
          ) : (
            '—'
          )
        }
      />
      <MiniLine
        className="flex-1"
        label="Wind · 3d · km/s"
        data={windPts}
        domain={[now - 3 * 86_400_000, windPts[windPts.length - 1]?.t ?? now]}
        y={[wMin, wMax]}
        ticks={wTicks.map((v) => ({ v, label: String(v) }))}
        color="var(--series-6)"
        format={(p) => `${utcDay(p.t)} ${utcHm(p.t)} · ${p.v.toFixed(0)} km/s`}
        latest={
          lastW ? (
            <>
              {lastW.speed!.toFixed(0)} km/s · ρ {lastW.density?.toFixed(1) ?? '—'} p/cm³ · T {lastW.temperature ? `${(lastW.temperature / 1000).toFixed(0)}k` : '—'} K
            </>
          ) : (
            '—'
          )
        }
      />
    </div>
  )
}

// ── 3 GRID ─────────────────────────────────────────────────────────────────

const LOW_CARBON = new Set(['wind', 'solar', 'nuclear', 'hydro', 'biomass'])

export function intensityTone(index: string): string {
  if (index === 'very low' || index === 'low') return 'text-success'
  if (index === 'moderate') return 'text-warning-soft-foreground'
  return 'text-destructive'
}

export function currentSlot(slots: CarbonSlot[], now: number): CarbonSlot | undefined {
  return slots.find((s) => s.from <= now && now < s.to) ?? slots.filter((s) => s.from <= now).pop()
}

export function GridBody({
  slots,
  mix,
  regions,
  now,
}: {
  slots: CarbonSlot[]
  mix: FuelShare[]
  regions: CarbonRegion[]
  now: number
}) {
  const pts = useMemo<Pt[]>(
    () => slots.map((s) => ({ t: (s.from + s.to) / 2, v: s.from + 15 * 60_000 <= now ? (s.actual ?? s.forecast) : s.forecast })),
    [slots, now],
  )
  const cur = currentSlot(slots, now)
  const next24 = slots.filter((s) => s.from >= now && s.from < now + 86_400_000)
  const best = next24.reduce<CarbonSlot | null>((m, s) => (!m || s.forecast < m.forecast ? s : m), null)
  const worst = next24.reduce<CarbonSlot | null>((m, s) => (!m || s.forecast > m.forecast ? s : m), null)
  const yMax = Math.max(100, Math.ceil(Math.max(...pts.map((p) => p.v)) / 50) * 50 + 25)
  const sortedMix = [...mix].sort((a, b) => b.perc - a.perc)
  const lowShare = mix.filter((m) => LOW_CARBON.has(m.fuel)).reduce((s, m) => s + m.perc, 0)
  const dno = regions.filter((r) => r.id <= 14).sort((a, b) => a.forecast - b.forecast)
  const rMax = Math.max(1, ...dno.map((r) => r.forecast))

  return (
    <div className="flex min-h-full flex-col gap-2 p-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <span>
          <span className="text-muted-foreground">NOW </span>
          <span className="text-base font-semibold">{cur ? (cur.actual ?? cur.forecast) : '—'}</span>
          <span className="text-muted-foreground"> gCO₂/kWh </span>
          {cur && <span className={cn('font-semibold uppercase', intensityTone(cur.index))}>{cur.index}</span>}
        </span>
        {best && (
          <span>
            <span className="text-muted-foreground">24h LOW </span>
            {best.forecast} @ {utcHm(best.from)}
          </span>
        )}
        {worst && (
          <span>
            <span className="text-muted-foreground">HIGH </span>
            {worst.forecast} @ {utcHm(worst.from)}
          </span>
        )}
      </div>
      <MiniLine
        className="h-24 shrink-0"
        label="gCO₂/kWh · ±24h"
        data={pts}
        domain={[slots[0]?.from ?? now, slots[slots.length - 1]?.to ?? now]}
        y={[0, yMax]}
        ticks={niceTicks(0, yMax, 3)
          .filter((v) => v > 0 && v < yMax)
          .map((v) => ({ v, label: String(v) }))}
        now={now}
        color="var(--series-3)"
        format={(p) => `${utcDay(p.t)} ${utcHm(p.t)} · ${Math.round(p.v)} g · ${p.t > now ? 'forecast' : 'actual'}`}
        latest="solid actual · faded forecast"
      />
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-[10px] tracking-wider text-muted-foreground uppercase">
            <span>Mix</span>
            <span>low-carbon {lowShare.toFixed(0)}%</span>
          </div>
          <ul>
            {sortedMix.map((m) => (
              <li key={m.fuel} className="grid h-[17px] grid-cols-[4.5rem_minmax(0,1fr)_2.75rem] items-center gap-x-1.5">
                <span className="text-muted-foreground">{m.fuel}</span>
                <span
                  className="overflow-hidden whitespace-nowrap"
                  style={{ color: LOW_CARBON.has(m.fuel) ? 'var(--series-3)' : m.fuel === 'gas' || m.fuel === 'coal' ? 'var(--series-2)' : 'var(--series-other)' }}
                  aria-hidden
                >
                  {blockBar(m.perc / 50, 16) || '▏'}
                </span>
                <span className="text-right tabular-nums">{m.perc.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
            <Key color="var(--series-3)">low-carbon</Key>
            <Key color="var(--series-2)">fossil</Key>
            <Key color="var(--series-other)">imports / other</Key>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] tracking-wider text-muted-foreground uppercase">
            <span>Regions, now</span>
            <span>g/kWh</span>
          </div>
          <ul>
            {dno.map((r) => (
              <li key={r.id} className="grid h-[17px] grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-x-1.5">
                <span className="truncate text-muted-foreground">{r.name}</span>
                <span className="overflow-hidden whitespace-nowrap text-muted-foreground/70" aria-hidden>
                  {blockBar(r.forecast / rMax, 10) || '▏'}
                </span>
                <span className={cn('text-right tabular-nums', intensityTone(r.index))}>{r.forecast}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Key({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className="size-2 rounded-[2px]" style={{ background: color }} />
      {children}
    </span>
  )
}

// ── 4 HN ───────────────────────────────────────────────────────────────────

const HN_COLS = 'grid grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_2.5rem_2rem] gap-x-2'

export function HnBody({
  stories,
  selected,
  onSelect,
  now,
}: {
  stories: HnStory[]
  selected: number
  onSelect: (i: number) => void
  now: number
}) {
  useScrollSelected(4, selected)
  return (
    <div>
      <div className={cn(HN_COLS, 'sticky top-0 z-10 border-b bg-background px-2 py-0.5 text-[10px] tracking-wider text-muted-foreground uppercase')}>
        <span className="text-right">#</span>
        <span className="text-right">Pts</span>
        <span>Story</span>
        <span className="text-right">Cmts</span>
        <span className="text-right">Age</span>
      </div>
      <ol>
        {stories.map((s, i) => (
          <li
            key={s.id}
            data-row={i}
            onClick={() => onSelect(i)}
            onDoubleClick={() => window.open(s.url, '_blank', 'noopener')}
            className={cn(
              HN_COLS,
              'h-[18px] cursor-default items-center px-2 leading-[18px]',
              i === selected ? 'bg-accent text-accent-foreground shadow-[inset_2px_0_0_var(--primary)]' : 'hover:bg-muted',
            )}
          >
            <span className="text-right text-muted-foreground tabular-nums">{s.rank}</span>
            <span className="text-right tabular-nums">{s.score}</span>
            <span className="truncate">
              {s.title} <span className="text-muted-foreground">{s.domain}</span>
            </span>
            <span className="text-right text-muted-foreground tabular-nums">{s.comments}</span>
            <span className="text-right text-muted-foreground tabular-nums">{ago(s.time, now)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Ticker ─────────────────────────────────────────────────────────────────

export interface TickerItem {
  key: string
  label: string
  value: ReactNode
  tone?: string
}

/**
 * Headline numbers scrolling right to left. Driven by the Web Animations API
 * (no global CSS), paused on hover or focus, and static for people who ask
 * for reduced motion.
 */
export function Ticker({ items }: { items: TickerItem[] }) {
  const track = useRef<HTMLDivElement>(null)
  const anim = useRef<Animation | null>(null)
  const sig = items.map((i) => i.key).join('|')
  useEffect(() => {
    const el = track.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const half = el.scrollWidth / 2
    anim.current = el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${half}px)` }], {
      duration: Math.max(20_000, half * 28),
      iterations: Infinity,
    })
    return () => anim.current?.cancel()
  }, [sig])
  const row = (dup: boolean) =>
    items.map((it) => (
      <span key={`${dup ? 'b' : 'a'}${it.key}`} className="inline-flex shrink-0 items-baseline gap-1.5 px-4" aria-hidden={dup}>
        <span className="text-muted-foreground">{it.label}</span>
        <span className={cn('font-semibold tabular-nums', it.tone)}>{it.value}</span>
        <span aria-hidden className="pl-4 text-border">│</span>
      </span>
    ))
  return (
    <div
      className="relative h-6 shrink-0 overflow-hidden border-b bg-card"
      onPointerEnter={() => anim.current?.pause()}
      onPointerLeave={() => anim.current?.play()}
      aria-label="Headline numbers"
    >
      <div ref={track} className="flex h-full w-max items-center whitespace-nowrap">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

// ── Help ───────────────────────────────────────────────────────────────────

const KEYS: [string, string][] = [
  ['1 – 4', 'focus a pane'],
  ['j / k  ↓ / ↑', 'move the selection (or scroll)'],
  ['g / G', 'top / bottom'],
  ['⏎', 'quake detail · open story'],
  ['o', 'open the selected item'],
  ['r', 'refresh every feed'],
  ['?', 'this help'],
  ['esc', 'close'],
]

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="w-80 rounded-lg border bg-popover p-4 text-popover-foreground shadow-elevation-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Keys</div>
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-y-1.5">
          {KEYS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-sm border bg-muted px-1.5 py-px">{k}</kbd>
              </dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
