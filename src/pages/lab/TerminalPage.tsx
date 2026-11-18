import { useCallback, useEffect, useMemo, useState } from 'react'

import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import {
  CARBON_GENERATION,
  CARBON_REGIONAL,
  SWPC_KP_FORECAST,
  SWPC_WIND_1M,
  SWPC_XRAY_1D,
  USGS_DAY_ALL,
  carbonWindowUrl,
  flareClass,
  parseCarbon,
  parseGeneration,
  parseKpForecast,
  parseQuakes,
  parseRegional,
  parseXray,
  type CarbonRegion,
  type CarbonSlot,
  type FuelShare,
  type KpPoint,
  type Quake,
  type WindPoint,
  type XrayPoint,
} from '@/features/lab/sources'
import { ago, utcDay, utcTime } from '@/features/lab/terminal/format'
import {
  GridBody,
  HelpOverlay,
  HnBody,
  Pane,
  QuakesBody,
  SpaceBody,
  Ticker,
  currentSlot,
  intensityTone,
  magTone,
  parseWind10,
  quakeMeta,
  type TickerItem,
} from '@/features/lab/terminal/panes'
import { useHackerNews } from '@/features/lab/terminal/useHackerNews'
import { useLiveData, useNow, type LiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

const EXP = experiment('terminal')

const PANES = ['QUAKES', 'SPACE', 'GRID', 'HN'] as const

export function TerminalPage() {
  const now = useNow(1000)
  // Charts move once a minute; only the clock and freshness ticks every second.
  const minuteNow = Math.floor(now / 60_000) * 60_000

  const quakes = useLiveData<Quake[]>(USGS_DAY_ALL, {
    parse: (raw) => parseQuakes(raw).reverse(),
    key: 'terminal:quakes-newest-first',
    refreshMs: 60_000,
  })
  const kp = useLiveData<KpPoint[]>(SWPC_KP_FORECAST, { parse: parseKpForecast, refreshMs: 10 * 60_000 })
  const xray = useLiveData<XrayPoint[]>(SWPC_XRAY_1D, { parse: parseXray, refreshMs: 60_000 })
  const wind = useLiveData<WindPoint[]>(SWPC_WIND_1M, { parse: parseWind10, key: 'terminal:wind-10min', refreshMs: 5 * 60_000 })
  const [carbonUrl] = useState(() => carbonWindowUrl(new Date(), 24))
  const carbon = useLiveData<CarbonSlot[]>(carbonUrl, { parse: parseCarbon, refreshMs: 15 * 60_000 })
  const gen = useLiveData<{ from: number; mix: FuelShare[] }>(CARBON_GENERATION, { parse: parseGeneration, refreshMs: 15 * 60_000 })
  const regional = useLiveData<CarbonRegion[]>(CARBON_REGIONAL, { parse: parseRegional, refreshMs: 15 * 60_000 })
  const hn = useHackerNews(30)

  const all = [quakes, kp, xray, wind, carbon, gen, regional, hn] as LiveData<unknown>[]

  const [focus, setFocus] = useState(1)
  const [selQ, setSelQ] = useState(0)
  const [selH, setSelH] = useState(0)
  const [detail, setDetail] = useState(false)
  const [help, setHelp] = useState(false)

  const nQ = quakes.data?.length ?? 0
  const nH = hn.data?.length ?? 0

  const openSelected = useCallback(() => {
    if (focus === 1 && quakes.data?.[selQ]) window.open(quakes.data[selQ].url, '_blank', 'noopener')
    if (focus === 4 && hn.data?.[selH]) window.open(hn.data[selH].url, '_blank', 'noopener')
  }, [focus, quakes.data, hn.data, selQ, selH])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable="true"]')) return
      const move = (d: number | 'top' | 'bottom') => {
        if (focus === 1 || focus === 4) {
          const n = focus === 1 ? nQ : nH
          const set = focus === 1 ? setSelQ : setSelH
          set((i) => (d === 'top' ? 0 : d === 'bottom' ? n - 1 : Math.max(0, Math.min(n - 1, i + d))))
        } else {
          const body = document.querySelector(`[data-pane-body="${focus}"]`)
          if (d === 'top') body?.scrollTo({ top: 0 })
          else if (d === 'bottom') body?.scrollTo({ top: body.scrollHeight })
          else body?.scrollBy({ top: d * 54 })
        }
      }
      let handled = true
      if (e.key >= '1' && e.key <= '4') setFocus(Number(e.key))
      else if (e.key === 'j' || e.key === 'ArrowDown') move(1)
      else if (e.key === 'k' || e.key === 'ArrowUp') move(-1)
      else if (e.key === 'g') move('top')
      else if (e.key === 'G') move('bottom')
      else if (e.key === 'Enter') {
        if (focus === 1) setDetail((v) => !v)
        else openSelected()
      } else if (e.key === 'o') openSelected()
      else if (e.key === 'r') all.forEach((f) => f.reload())
      else if (e.key === '?') setHelp((v) => !v)
      else if (e.key === 'Escape') {
        setHelp(false)
        setDetail(false)
      } else handled = false
      if (handled) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // `all` is rebuilt every render; reload() identities are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, nQ, nH, openSelected])

  const ticker = useTicker({ quakes: quakes.data, kp: kp.data, xray: xray.data, wind: wind.data, carbon: carbon.data, gen: gen.data, now })

  const fresh: [string, LiveData<unknown>[], number][] = [
    ['USGS', [quakes], 60_000],
    ['SWPC', [kp, xray, wind], 5 * 60_000],
    ['NESO', [carbon, gen, regional], 15 * 60_000],
    ['HN', [hn], 120_000],
  ]

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-background font-mono text-[11px] lg:overflow-hidden">
      {/* Title row */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5 xl:flex-nowrap">
        <span className="font-semibold tracking-[0.2em] text-primary uppercase">{EXP.title}</span>
        <span className="hidden min-w-0 flex-1 truncate font-sans text-xs text-muted-foreground md:inline">{EXP.thesis}</span>
        <SourceLine source={EXP.source} feeds={all} className="min-w-0 xl:shrink-0 xl:flex-nowrap" />
        <span className="shrink-0 tabular-nums">
          {utcDay(now)} {utcTime(now)} <span className="text-muted-foreground">UTC</span>
        </span>
      </div>

      <Ticker items={ticker} />

      {/* Panes: hairline dividers are the 1px gaps showing the border color behind */}
      <div className="grid grid-cols-1 gap-px bg-border lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Pane
          id={1}
          label={PANES[0]}
          focused={focus === 1}
          onFocus={() => setFocus(1)}
          meta={quakes.data ? quakeMeta(quakes.data) : '…'}
          className="xl:row-span-2"
        >
          <LoadGate feeds={[quakes]} className="h-full min-h-48">
            {() => (
              <QuakesBody
                quakes={quakes.data!}
                selected={Math.min(selQ, nQ - 1)}
                onSelect={(i) => {
                  setSelQ(i)
                  setFocus(1)
                }}
                detail={detail}
              />
            )}
          </LoadGate>
        </Pane>
        <Pane
          id={2}
          label={PANES[1]}
          focused={focus === 2}
          onFocus={() => setFocus(2)}
          meta={spaceMeta(kp.data, xray.data, wind.data)}
          className="xl:row-span-2"
        >
          <LoadGate feeds={[kp, xray, wind]} className="h-full min-h-48" label="Reading NOAA SWPC">
            {() => <SpaceBody kp={kp.data!} xray={xray.data!} wind={wind.data!} now={minuteNow} />}
          </LoadGate>
        </Pane>
        <Pane id={3} label={PANES[2]} focused={focus === 3} onFocus={() => setFocus(3)} meta={gridMeta(carbon.data, now)}>
          <LoadGate feeds={[carbon, gen, regional]} className="h-full min-h-48" label="Reading NESO carbon intensity">
            {() => <GridBody slots={carbon.data!} mix={gen.data!.mix} regions={regional.data!} now={minuteNow} />}
          </LoadGate>
        </Pane>
        <Pane
          id={4}
          label={PANES[3]}
          focused={focus === 4}
          onFocus={() => setFocus(4)}
          meta={hn.data ? `top ${hn.data.length} · ${hn.data.reduce((s, x) => s + x.score, 0).toLocaleString()} pts` : '…'}
        >
          <LoadGate feeds={[hn]} className="h-full min-h-48" label="Reading Hacker News">
            {() => (
              <HnBody
                stories={hn.data!}
                selected={Math.min(selH, nH - 1)}
                onSelect={(i) => {
                  setSelH(i)
                  setFocus(4)
                }}
                now={now}
              />
            )}
          </LoadGate>
        </Pane>
      </div>

      {/* Status line */}
      <div className="sticky bottom-0 z-20 flex h-6 shrink-0 items-center gap-4 border-t bg-card px-3 text-muted-foreground">
        <span className="font-semibold text-foreground">
          [{focus}] {PANES[focus - 1]}
        </span>
        <span className="hidden truncate md:inline">1–4 pane · j/k move · ⏎ open · r refresh · ? help</span>
        <span className="ml-auto flex shrink-0 gap-3 tabular-nums">
          {fresh.map(([name, feeds, every]) => {
            const t = Math.min(...feeds.map((f) => f.updatedAt ?? Infinity))
            const err = feeds.some((f) => f.error)
            const stale = !Number.isFinite(t) || now - t > every * 2.5
            return (
              <span key={name} className={cn(err ? 'text-destructive' : stale ? 'text-warning-soft-foreground' : undefined)}>
                {name} <span className="text-foreground">{Number.isFinite(t) ? ago(t, now) : '…'}</span>
              </span>
            )
          })}
        </span>
      </div>

      {help && <HelpOverlay onClose={() => setHelp(false)} />}
    </div>
  )
}

function spaceMeta(kp?: KpPoint[], xray?: XrayPoint[], wind?: WindPoint[]): string {
  const k = kp && [...kp].reverse().find((d) => d.kind !== 'predicted')
  const x = xray?.[xray.length - 1]
  const w = wind && [...wind].reverse().find((d) => d.speed != null)
  return `Kp ${k?.kp.toFixed(2) ?? '—'} · ${x ? flareClass(x.flux) : '—'} · ${w?.speed?.toFixed(0) ?? '—'} km/s`
}

function gridMeta(slots: CarbonSlot[] | undefined, now: number): string {
  const s = slots && currentSlot(slots, now)
  return s ? `GB ${s.actual ?? s.forecast} g/kWh · ${s.index}` : '…'
}

function useTicker({
  quakes,
  kp,
  xray,
  wind,
  carbon,
  gen,
  now,
}: {
  quakes?: Quake[]
  kp?: KpPoint[]
  xray?: XrayPoint[]
  wind?: WindPoint[]
  carbon?: CarbonSlot[]
  gen?: { mix: FuelShare[] }
  now: number
}): TickerItem[] {
  // Re-derive once a minute, not every clock tick, so the animation isn't restarted.
  const minute = Math.floor(now / 60_000)
  return useMemo(() => {
    const items: TickerItem[] = []
    if (quakes?.length) {
      const big = quakes.reduce((m, q) => (q.mag > m.mag ? q : m))
      items.push({ key: 'qmax', label: 'MAX QUAKE 24H', value: `M${big.mag.toFixed(1)} ${big.place.replace(/^.* of /, '')}`, tone: magTone(big.mag) })
      items.push({ key: 'qn', label: 'EVENTS 24H', value: quakes.length.toLocaleString() })
      items.push({ key: 'q45', label: 'M4.5+', value: quakes.filter((q) => q.mag >= 4.5).length })
    }
    const k = kp && [...kp].reverse().find((d) => d.kind !== 'predicted')
    if (k) items.push({ key: 'kp', label: 'KP', value: k.kp.toFixed(2), tone: k.kp >= 5 ? 'text-warning-soft-foreground' : undefined })
    const x = xray?.[xray.length - 1]
    if (x) items.push({ key: 'xr', label: 'X-RAY', value: flareClass(x.flux), tone: x.flux >= 1e-5 ? 'text-warning-soft-foreground' : undefined })
    const w = wind && [...wind].reverse().find((d) => d.speed != null)
    if (w?.speed) items.push({ key: 'sw', label: 'SOLAR WIND', value: `${w.speed.toFixed(0)} km/s` })
    const c = carbon && currentSlot(carbon, minute * 60_000)
    if (c) items.push({ key: 'ci', label: 'GB GRID', value: `${c.actual ?? c.forecast} g/kWh ${c.index}`, tone: intensityTone(c.index) })
    if (gen) {
      const top = [...gen.mix].sort((a, b) => b.perc - a.perc)[0]
      items.push({ key: 'gm', label: 'TOP FUEL', value: `${top.fuel} ${top.perc.toFixed(0)}%` })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quakes, kp, xray, wind, carbon, gen, minute])
}
