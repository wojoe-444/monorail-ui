import { useMemo, type ReactNode } from 'react'
import { ArrowRight, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  useCarbonWindow,
  useHackerNews,
  useKpForecast,
  useKpNow,
  useLaunchesUpcoming,
  useQuakesDay,
  useQuakesMonth,
  useWeather,
  useWikiLatest,
  useXray,
  weatherWords,
} from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { SourceLine } from '@/features/lab/LabKit'
import {
  CO2_MONTHLY,
  LIFE_EXPECTANCY,
  WORLD_INDICATORS,
  flareClass,
  parseCo2,
  type CarbonSlot,
  type Co2Month,
  type LifeData,
  type Quake,
  type WorldIndicators,
} from '@/features/lab/sources'
import { useLiveData, useNow, type LiveData } from '@/features/lab/useLiveData'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

import { DotTimeline, KpColumns, LineChart, RankBars, type LineSeries } from './charts'
import { cap, countWord, dayWord, fmtInt, localHm, plural, relative, signed, ukHm, utcHm } from './format'
import { EXAMPLES, INDICATORS, type Intent } from './query'

/*
 * One component per intent. Each fetches through the shared feed hooks, so
 * an answer re-runs live whenever the transcript is shown, and writes its
 * claim as one or two sentences with the numbers emphasized (hover a number
 * for the exact value). The chart underneath is the evidence.
 */

// ── shared hooks for the snapshots ───────────────────────────────────────────
export const useIndicators = () => useLiveData<WorldIndicators>(WORLD_INDICATORS, { key: 'feed:indicators' })
export const useLife = () => useLiveData<LifeData>(LIFE_EXPECTANCY, { key: 'feed:life' })
export const useCo2 = () => useLiveData<Co2Month[]>(CO2_MONTHLY, { as: 'text', parse: parseCo2, key: 'feed:co2' })

// ── frame ───────────────────────────────────────────────────────────────────

export interface AnswerProps {
  q: string
  intent: Intent
  at: number
  onRemove: () => void
  onRun: (q: string) => void
}

function Frame({
  q,
  at,
  onRemove,
  feeds,
  source,
  sourceHref,
  link,
  children,
  chart,
}: {
  q: string
  at: number
  onRemove: () => void
  feeds: LiveData<unknown>[]
  source: string
  sourceHref?: string
  link?: { label: string; path: string }
  children: ReactNode
  chart?: ReactNode
}) {
  const now = useNow(30_000)
  const waiting = feeds.some((f) => f.data === undefined && !f.error)
  const failed = feeds.find((f) => f.data === undefined && f.error)
  return (
    <Card className="gap-4 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 font-mono text-sm">
          <span className="text-muted-foreground select-none">› </span>
          <span className="break-words">{q}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{relative(at, now)}</span>
          <Button variant="ghost" size="icon" className="-mr-2 size-7" aria-label={`Remove “${q}”`} onClick={onRemove}>
            <X />
          </Button>
        </div>
      </div>
      {failed ? (
        <p className="text-sm text-muted-foreground">Couldn’t reach the feed ({failed.error}). The answer will appear when it’s back.</p>
      ) : waiting ? (
        <p className="animate-pulse text-sm text-muted-foreground">Looking it up…</p>
      ) : (
        <>
          <div className="max-w-[68ch] text-base leading-relaxed text-foreground/90">{children}</div>
          {chart && <div>{chart}</div>}
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
        {feeds.length ? <SourceLine source={source} href={sourceHref} feeds={feeds} /> : <span className="font-mono text-[11px] text-muted-foreground">{source}</span>}
        {link && (
          <a
            href={href(link.path)}
            className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground/80 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open in {link.label}
            <ArrowRight className="size-3.5" />
          </a>
        )}
      </div>
    </Card>
  )
}

/** Clickable query chips. */
export function Chips({ items, onRun, className }: { items: string[]; onRun: (q: string) => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onRun(s)}
          className="rounded-full border bg-card px-3 py-1 font-mono text-xs text-foreground/80 transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {s}
        </button>
      ))}
    </div>
  )
}

export function Answer(p: AnswerProps) {
  switch (p.intent.kind) {
    case 'quakes':
      return <QuakesAnswer {...p} intent={p.intent} />
    case 'grid':
      return <GridAnswer {...p} intent={p.intent} />
    case 'weather':
      return <WeatherAnswer {...p} intent={p.intent} />
    case 'space':
      return <SpaceAnswer {...p} intent={p.intent} />
    case 'co2':
      return <Co2Answer {...p} intent={p.intent} />
    case 'indicator':
      return <IndicatorAnswer {...p} intent={p.intent} />
    case 'wiki':
      return <WikiAnswer {...p} intent={p.intent} />
    case 'launch':
      return <LaunchAnswer {...p} intent={p.intent} />
    case 'hn':
      return <HnAnswer {...p} intent={p.intent} />
    case 'help':
      return <HelpAnswer {...p} />
    default:
      return <UnknownAnswer {...p} intent={p.intent} />
  }
}

type P<K extends Intent['kind']> = Omit<AnswerProps, 'intent'> & { intent: Extract<Intent, { kind: K }> }

// ── quakes ──────────────────────────────────────────────────────────────────

const PLACE_ALIASES: Record<string, RegExp> = {
  california: /(, CA\b|California)/i,
  ca: /(, CA\b|California)/i,
  alaska: /Alaska/i,
  hawaii: /Hawaii/i,
  usa: /(, (CA|NV|WA|OR|UT|ID|MT|WY|TX|OK|NM|AZ|CO)\b|Alaska|Hawaii|California|Nevada|Washington|Oregon|Utah|Idaho|Montana|Wyoming|Texas|Oklahoma|Puerto Rico)/i,
  us: /(, (CA|NV|WA|OR|UT|ID|MT|WY|TX|OK|NM|AZ|CO)\b|Alaska|Hawaii|California|Nevada|Puerto Rico)/i,
}
function placeMatcher(place: string | null): (q: Quake) => boolean {
  if (!place) return () => true
  const re = PLACE_ALIASES[place] ?? new RegExp(place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(' ').join('.*'), 'i')
  return (q) => re.test(q.place)
}
const WINDOW_MS = { '24h': 86400_000, '7d': 7 * 86400_000, '30d': 30 * 86400_000 }
const WINDOW_WORDS = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' }

function QuakesAnswer({ q, at, onRemove, intent }: P<'quakes'>) {
  const month = useQuakesMonth()
  const day = useQuakesDay()
  const now = useNow(60_000)
  const useDay = intent.window === '24h' && intent.minMag < 2.5
  const feed = useDay ? day : month
  const match = placeMatcher(intent.place)
  const all = feed.data ?? []
  const hits = all.filter((e) => e.time >= now - WINDOW_MS[intent.window] && e.mag >= intent.minMag && match(e))
  const largest = hits.reduce<Quake | null>((m, e) => (!m || e.mag > m.mag ? e : m), null)
  const shallow = hits.filter((e) => e.depth < 70).length
  const earlier = !hits.length ? [...(month.data ?? [])].reverse().find((e) => e.mag >= intent.minMag && match(e)) : undefined
  const where = intent.place ? ` near ${intent.place.length <= 3 ? intent.place.toUpperCase() : cap(intent.place)}` : ' worldwide'
  const magWord = `M${intent.minMag % 1 ? intent.minMag.toFixed(1) : intent.minMag}+`

  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source="USGS earthquakes"
      sourceHref="https://earthquake.usgs.gov/earthquakes/map/"
      link={{ label: 'Terminal', path: '/lab/terminal' }}
      chart={
        hits.length > 0 && (
          <DotTimeline
            points={hits.map((e) => ({ id: e.id, x: e.time, y: e.mag }))}
            x0={now - WINDOW_MS[intent.window]}
            x1={now}
            highlight={largest?.id}
            xFormat={(t) => (intent.window === '24h' ? ukHmLocal(t) : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
            yFormat={(v) => `M${v}`}
            tip={(id) => {
              const e = hits.find((h) => h.id === id)!
              return {
                title: e.place,
                rows: [
                  { key: 'm', label: 'magnitude', value: `M${e.mag.toFixed(1)}` },
                  { key: 'd', label: 'deep', value: `${Math.round(e.depth)} km` },
                  { key: 't', label: `${dayWord(e.time, now)}, your time`, value: localHm(e.time) },
                ],
              }
            }}
            onPick={(id) => window.open(hits.find((h) => h.id === id)!.url, '_blank', 'noopener')}
          />
        )
      }
    >
      {hits.length ? (
        <p>
          <Num tip={`${hits.length} events in the USGS feed`}>{fmtInt(hits.length)}</Num> {plural(hits.length, 'earthquake')} of {magWord}
          {where} in the last {WINDOW_WORDS[intent.window]}. {hits.length > 1 ? 'The largest was ' : 'It was '}
          <Num tip={`Magnitude ${largest!.mag} · depth ${largest!.depth.toFixed(1)} km`}>M{largest!.mag.toFixed(1)}</Num>, {largest!.place}, {dayWord(largest!.time, now)} at{' '}
          <Num tip={utcHm(largest!.time)}>{localHm(largest!.time)}</Num>.
          {hits.length >= 3 && (
            <>
              {' '}
              <Num tip={`${shallow} of ${hits.length} shallower than 70 km`}>{cap(countWord(shallow))}</Num> of them {shallow === 1 ? 'was' : 'were'} shallower than 70 km, where
              quakes do the most damage.
            </>
          )}
        </p>
      ) : (
        <p>
          No earthquakes of {magWord}
          {where} in the last {WINDOW_WORDS[intent.window]}.{' '}
          {earlier ? (
            <>
              The most recent was <Num tip={`${earlier.place}, depth ${earlier.depth.toFixed(0)} km`}>M{earlier.mag.toFixed(1)}</Num>, {earlier.place}, {relative(earlier.time, now)}.
            </>
          ) : month.data ? (
            'None in the past 30 days either.'
          ) : null}
          {intent.place && !earlier && month.data && ' USGS names places by the nearest town, so try a country or region name.'}
        </p>
      )}
    </Frame>
  )
}
const ukHmLocal = (t: number) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric' })

// ── grid ────────────────────────────────────────────────────────────────────

function bestWindow(slots: CarbonSlot[], n: number): { start: number; end: number; avg: number } | null {
  let best: { start: number; end: number; avg: number } | null = null
  for (let i = 0; i + n <= slots.length; i++) {
    const w = slots.slice(i, i + n)
    const avg = w.reduce((s, x) => s + x.forecast, 0) / n
    if (!best || avg < best.avg) best = { start: w[0].from, end: w[n - 1].to, avg }
  }
  return best
}

function GridAnswer({ q, at, onRemove, intent }: P<'grid'>) {
  const feed = useCarbonWindow()
  const now = useNow(60_000)
  const slots = feed.data ?? []
  const cur = slots.find((s) => s.from <= now && now < s.to) ?? slots.filter((s) => s.from <= now).at(-1)
  const curV = cur ? (cur.actual ?? cur.forecast) : 0
  const next = slots.filter((s) => s.to > now && s.from < now + 86400_000)
  const past = slots.filter((s) => s.to <= now && s.from >= now - 86400_000)
  const mid = (s: CarbonSlot) => (s.from + s.to) / 2
  const lo = next.reduce<CarbonSlot | null>((m, s) => (!m || s.forecast < m.forecast ? s : m), null)
  const hi = next.reduce<CarbonSlot | null>((m, s) => (!m || s.forecast > m.forecast ? s : m), null)

  let body: ReactNode = null
  let chart: ReactNode = null
  const actualSeries: LineSeries = { key: 'a', label: 'Actual', color: 'var(--series-1)', points: past.filter((s) => s.actual != null).map((s) => ({ x: mid(s), y: s.actual! })) }
  const fcSeries = (list: CarbonSlot[]): LineSeries => ({ key: 'f', label: 'Forecast', color: 'var(--series-1)', faded: true, points: list.map((s) => ({ x: mid(s), y: s.forecast })) })
  const fmtG = (v: number) => `${Math.round(v)}`
  const tipTitle = (t: number) => `${ukHm(t)} UK`

  if (intent.mode === 'best') {
    const w = bestWindow(next, intent.hours * 2)
    if (w && cur) {
      const pct = curV > 0 ? Math.round((1 - w.avg / curV) * 100) : 0
      const startsNow = w.start <= now + 30 * 60_000
      body = (
        <p>
          {startsNow ? (
            <>
              Right now is the cleanest {intent.hours}-hour window in the next 24 hours: until <Num>{ukHm(w.end)}</Num> the grid averages{' '}
              <Num tip={`${w.avg.toFixed(1)} gCO₂/kWh forecast`}>{Math.round(w.avg)} g</Num> CO₂ per kWh. Go ahead.
            </>
          ) : (
            <>
              The cleanest {intent.hours}-hour window in the next 24 hours is{' '}
              <Num tip="UK time">
                {ukHm(w.start)}–{ukHm(w.end)}
              </Num>
              , averaging <Num tip={`${w.avg.toFixed(1)} gCO₂/kWh forecast`}>{Math.round(w.avg)} g</Num> CO₂ per kWh.{' '}
              {pct > 0 ? (
                <>
                  That’s <Num tip={`now ${curV} g`}>{pct}%</Num> cleaner than right now.
                </>
              ) : (
                'It’s barely cleaner than right now.'
              )}
            </>
          )}
        </p>
      )
      chart = (
        <LineChart
          series={[{ ...fcSeries(next), faded: false, area: true }]}
          xFormat={(t) => ukHm(t)}
          tipTitle={tipTitle}
          yFormat={fmtG}
          yZero
          band={{ x0: w.start, x1: w.end, label: startsNow ? 'best window, starting now' : 'best window' }}
          vline={startsNow ? undefined : { x: now, label: 'now' }}
        />
      )
    }
  } else if (intent.mode === 'today') {
    const withActual = past.filter((s) => s.actual != null)
    const avg = withActual.reduce((s, x) => s + x.actual!, 0) / Math.max(1, withActual.length)
    const mn = withActual.reduce<CarbonSlot | null>((m, s) => (!m || s.actual! < m.actual! ? s : m), null)
    const mx = withActual.reduce<CarbonSlot | null>((m, s) => (!m || s.actual! > m.actual! ? s : m), null)
    const mae = withActual.reduce((s, x) => s + Math.abs(x.actual! - x.forecast), 0) / Math.max(1, withActual.length)
    if (mn && mx) {
      body = (
        <p>
          Over the past 24 hours the GB grid averaged <Num tip={`${avg.toFixed(1)} gCO₂/kWh over ${withActual.length} half hours`}>{Math.round(avg)} g</Num> CO₂ per kWh.
          It was cleanest at <Num>{ukHm(mn.from)}</Num> ({mn.actual} g) and dirtiest at <Num>{ukHm(mx.from)}</Num> ({mx.actual} g). The forecast was off by{' '}
          <Num tip={`mean absolute error ${mae.toFixed(1)} g`}>{Math.round(mae)} g</Num> on average.
        </p>
      )
      chart = (
        <LineChart
          series={[actualSeries, { ...fcSeries(withActual), label: 'Forecast' }]}
          xFormat={(t) => ukHm(t)}
          tipTitle={tipTitle}
          yFormat={fmtG}
          yZero
          marks={[
            { x: mid(mn), y: mn.actual!, label: `${mn.actual} g` },
            { x: mid(mx), y: mx.actual!, label: `${mx.actual} g` },
          ]}
        />
      )
    }
  } else if (cur && lo && hi) {
    body = (
      <p>
        The GB grid is running at <Num tip={`${cur.actual != null ? 'measured' : 'forecast'} for ${ukHm(cur.from)}–${ukHm(cur.to)} UK`}>{curV} g</Num> CO₂ per kWh right now,
        which NESO rates <strong className="font-semibold">{cur.index}</strong>. Over the next 24 hours it ranges from <Num>{lo.forecast} g</Num> at {ukHm(lo.from)} to{' '}
        <Num>{hi.forecast} g</Num> at {ukHm(hi.from)}.
      </p>
    )
    chart = (
      <LineChart
        series={[actualSeries, fcSeries(slots.filter((s) => s.to > now - 3600_000 && s.from < now + 86400_000))]}
        xFormat={(t) => ukHm(t)}
        tipTitle={tipTitle}
        yFormat={fmtG}
        yZero
        vline={{ x: now, label: 'now' }}
      />
    )
  }

  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source="NESO carbon intensity"
      sourceHref="https://carbonintensity.org.uk/"
      link={{ label: 'Grid Clock', path: '/lab/grid-clock' }}
      chart={chart}
    >
      {body ?? <p>The forecast doesn’t cover that window yet.</p>}
    </Frame>
  )
}

// ── weather ─────────────────────────────────────────────────────────────────

function WeatherAnswer({ q, at, onRemove, intent }: P<'weather'>) {
  const feed = useWeather(intent.city)
  const w = feed.data
  const f = intent.city.id === 'nyc'
  const deg = (c: number) => Math.round(f ? (c * 9) / 5 + 32 : c)
  const exact = (c: number) => `${c.toFixed(1)}°C · ${((c * 9) / 5 + 32).toFixed(1)}°F`
  const u = f ? '°F' : '°C'
  let body: ReactNode = null
  let chart: ReactNode = null

  if (w) {
    const today = w.current.time.slice(0, 10)
    const di = Math.max(0, w.daily.time.indexOf(today))
    const hi0 = w.hourly.time.indexOf(w.current.time.slice(0, 13) + ':00')
    const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', ' ').toLowerCase()
    const hourSeries = (from: number, to: number): LineSeries => ({
      key: 't',
      label: 'Temperature',
      color: 'var(--series-1)',
      area: true,
      points: w.hourly.time.slice(from, to).map((t, i) => ({ x: Date.parse(t), y: deg(w.hourly.temp[from + i]) })),
    })
    const isoOf = (x: number) => {
      const d = new Date(x)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`
    }
    const xf = (x: number) => hourLabel(isoOf(x))

    if (intent.when === 'week') {
      const days = w.daily.time.slice(di, di + 7).map((t, i) => ({ t, max: w.daily.max[di + i], min: w.daily.min[di + i], rain: w.daily.rainChance[di + i] ?? 0 }))
      const warm = days.reduce((m, d) => (d.max > m.max ? d : m))
      const cold = days.reduce((m, d) => (d.min < m.min ? d : m))
      const rainy = days.filter((d) => d.rain >= 50).length
      const wd = (t: string) => new Date(t + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' })
      body = (
        <p>
          Over the next 7 days {intent.city.name} runs from <Num tip={exact(cold.min)}>{deg(cold.min)}°</Num> to <Num tip={exact(warm.max)}>{deg(warm.max)}°</Num>. The warmest day
          is {wd(warm.t)}, the coldest night {cold.t === today ? 'tonight' : `${wd(cold.t)} night`}.{' '}
          {rainy ? (
            <>
              <Num tip="days with a 50%+ chance of rain">{cap(countWord(rainy))}</Num> {plural(rainy, 'day has', 'days have')} a good chance of rain.
            </>
          ) : (
            'No day looks likely to be wet.'
          )}
        </p>
      )
      chart = (
        <LineChart
          series={[
            { key: 'hi', label: 'High', color: 'var(--series-2)', points: days.map((d) => ({ x: Date.parse(d.t + 'T12:00'), y: deg(d.max) })) },
            { key: 'lo', label: 'Low', color: 'var(--series-1)', points: days.map((d) => ({ x: Date.parse(d.t + 'T12:00'), y: deg(d.min) })) },
          ]}
          xFormat={(x) => new Date(x).toLocaleDateString('en-US', { weekday: 'short' })}
          xTicks={days.map((d) => Date.parse(d.t + 'T12:00'))}
          yFormat={(v) => `${Math.round(v)}${u}`}
        />
      )
    } else if (intent.when === 'tomorrow') {
      const i = di + 1
      const t0 = w.hourly.time.indexOf(w.daily.time[i] + 'T00:00')
      const rainP = w.daily.rainChance[i] ?? 0
      const diff = deg(w.daily.max[i]) - deg(w.daily.max[di])
      body = (
        <p>
          Tomorrow in {intent.city.name} looks <strong className="font-semibold">{weatherWords(w.daily.code[i])}</strong>, from <Num tip={exact(w.daily.min[i])}>{deg(w.daily.min[i])}°</Num> to{' '}
          <Num tip={exact(w.daily.max[i])}>{deg(w.daily.max[i])}°</Num>
          {u.slice(1)}.{' '}
          {Math.abs(diff) >= 2 ? (
            <>
              That’s <Num>{Math.abs(diff)}°</Num> {diff > 0 ? 'warmer' : 'colder'} than today.{' '}
            </>
          ) : (
            'About the same as today. '
          )}
          {rainP >= 50 ? (
            <>
              Rain is likely (<Num>{rainP}%</Num>), about <Num>{w.daily.rain[i].toFixed(1)} mm</Num> in all.
            </>
          ) : rainP >= 20 ? (
            <>
              There’s a <Num>{rainP}%</Num> chance of rain.
            </>
          ) : (
            'Rain isn’t expected.'
          )}
        </p>
      )
      if (t0 >= 0) chart = <LineChart series={[hourSeries(t0, t0 + 24)]} xFormat={xf} yFormat={(v) => `${Math.round(v)}°`} />
    } else {
      const c = w.current
      const next = w.hourly.rainChance.slice(Math.max(0, hi0), Math.max(0, hi0) + 12)
      const peak = Math.max(...next)
      const peakAt = w.hourly.time[Math.max(0, hi0) + next.indexOf(peak)]
      body = (
        <p>
          In {intent.city.name} it’s <Num tip={exact(c.temp)}>{deg(c.temp)}°</Num>
          {u.slice(1)} and <strong className="font-semibold">{weatherWords(c.code)}</strong>
          {Math.abs(deg(c.feels) - deg(c.temp)) >= 2 && (
            <>
              , feeling like <Num tip={exact(c.feels)}>{deg(c.feels)}°</Num>
            </>
          )}
          . Today’s high is <Num tip={exact(w.daily.max[di])}>{deg(w.daily.max[di])}°</Num> and the low <Num tip={exact(w.daily.min[di])}>{deg(w.daily.min[di])}°</Num>.{' '}
          {peak >= 40 ? (
            <>
              Rain chances peak at <Num>{peak}%</Num> around {hourLabel(peakAt)}.
            </>
          ) : (
            <>No rain is likely in the next 12 hours.</>
          )}
        </p>
      )
      if (hi0 >= 0) chart = <LineChart series={[hourSeries(hi0, hi0 + 25)]} xFormat={xf} yFormat={(v) => `${Math.round(v)}°`} />
    }
  }

  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source={`Open-Meteo · ${intent.city.name}`}
      sourceHref="https://open-meteo.com/"
      link={{ label: 'Forecast, Written', path: intent.city.id === 'nyc' ? '/lab/forecast' : `/lab/forecast?city=${intent.city.id}` }}
      chart={chart}
    >
      {body}
    </Frame>
  )
}

// ── space ───────────────────────────────────────────────────────────────────

function kpWord(kp: number): string {
  if (kp >= 5) return `at storm level (G${Math.min(5, Math.floor(kp) - 4)})`
  if (kp >= 4) return 'active'
  if (kp >= 3) return 'unsettled'
  return 'quiet'
}

function SpaceAnswer({ q, at, onRemove, intent }: P<'space'>) {
  const kpNow = useKpNow()
  const kpf = useKpForecast()
  const xray = useXray()
  const now = useNow(60_000)
  const peak = xray.data?.reduce((m, p) => (p.flux > m.flux ? p : m), xray.data[0])
  const latest = xray.data?.at(-1)
  const ahead = (kpf.data ?? []).filter((p) => p.time > now)
  const maxAhead = ahead.reduce<(typeof ahead)[number] | null>((m, p) => (!m || p.kp > m.kp ? p : m), null)
  const dayName = (t: number) => new Date(t).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const mPlus = useMemo(() => {
    // Distinct flare events: runs above 1e-5 W/m².
    let n = 0
    let inRun = false
    for (const p of xray.data ?? []) {
      if (p.flux >= 1e-5 && !inRun) n++
      inRun = p.flux >= 1e-5
    }
    return n
  }, [xray.data])

  const flares = intent.focus === 'flares'
  const xs = useMemo(() => {
    const d = xray.data ?? []
    const step = Math.max(1, Math.floor(d.length / 288))
    return d.filter((_, i) => i % step === 0).map((p) => ({ x: p.time, y: Math.log10(p.flux) }))
  }, [xray.data])
  const classOf = (lg: number) => (['A', 'B', 'C', 'M', 'X'][Math.max(0, Math.min(4, Math.floor(lg) + 8))] ?? '')

  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={flares ? [xray] : [kpNow, kpf, xray]}
      source="NOAA SWPC"
      sourceHref="https://www.swpc.noaa.gov/"
      link={{ label: 'Terminal', path: '/lab/terminal' }}
      chart={
        flares ? (
          xs.length > 1 && (
            <LineChart
              series={[{ key: 'x', label: 'X-ray flux (0.1–0.8 nm)', color: 'var(--series-1)', points: xs }]}
              xFormat={(t) => utcHm(t).replace(' UTC', '')}
              tipTitle={(t) => utcHm(t)}
              yFormat={(v) => (Number.isInteger(v) ? classOf(v) : flareClass(10 ** v))}
              marks={peak ? [{ x: peak.time, y: Math.log10(peak.flux), label: flareClass(peak.flux) }] : []}
            />
          )
        ) : (
          <KpColumns points={(kpf.data ?? []).filter((p) => p.time >= now - 2 * 86400_000)} now={now} />
        )
      }
    >
      {flares ? (
        peak && latest ? (
          <p>
            The strongest solar flare of the past 24 hours was <Num tip={`${peak.flux.toExponential(2)} W/m²`}>{flareClass(peak.flux)}</Num>, peaking at {utcHm(peak.time)}. Right
            now the Sun’s X-ray output is at <Num tip={`${latest.flux.toExponential(2)} W/m²`}>{flareClass(latest.flux)}</Num>.{' '}
            {mPlus ? (
              <>
                <Num>{cap(countWord(mPlus))}</Num> {plural(mPlus, 'flare')} reached M class or above, strong enough to cause brief radio blackouts on the sunlit side of Earth.
              </>
            ) : (
              'Nothing reached M class, so no radio blackouts.'
            )}
          </p>
        ) : null
      ) : kpNow.data ? (
        <p>
          Geomagnetic activity is <strong className="font-semibold">{kpWord(kpNow.data.kp)}</strong>: Kp is <Num tip={`estimated at ${utcHm(kpNow.data.time)}`}>{kpNow.data.kp.toFixed(2)}</Num>{' '}
          right now.{' '}
          {maxAhead && (
            <>
              The next three days peak at <Num tip={utcHm(maxAhead.time)}>Kp {maxAhead.kp.toFixed(2)}</Num> on {dayName(maxAhead.time)},{' '}
              {maxAhead.kp >= 5 ? `storm level G${Math.min(5, Math.floor(maxAhead.kp) - 4)}` : 'below storm level'}.{' '}
            </>
          )}
          {peak && (
            <>
              The strongest flare in the last 24 hours was <Num tip={`${peak.flux.toExponential(2)} W/m²`}>{flareClass(peak.flux)}</Num>.
            </>
          )}
        </p>
      ) : null}
    </Frame>
  )
}

// ── co2 ─────────────────────────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function Co2Answer({ q, at, onRemove, intent }: P<'co2'>) {
  const feed = useCo2()
  const d = feed.data ?? []
  const last = d.at(-1)
  let body: ReactNode = null
  if (last) {
    const yearAgo = d.find((r) => r.year === last.year - 1 && r.month === last.month)
    const first = d[0]
    if (intent.year === null) {
      body = (
        <p>
          Mauna Loa measured <Num tip={`monthly mean ${last.average} ppm; trend ${last.trend} ppm`}>{last.average.toFixed(1)} ppm</Num> of CO₂ in {MONTHS[last.month - 1]} {last.year}
          {yearAgo && (
            <>
              , <Num tip={`${MONTHS[last.month - 1]} ${last.year - 1}: ${yearAgo.average} ppm`}>{signed(last.average - yearAgo.average)} ppm</Num> on a year earlier
            </>
          )}{' '}
          and <Num tip={`${MONTHS[first.month - 1]} ${first.year}: ${first.average} ppm`}>{Math.round(last.average - first.average)} ppm</Num> more than when records began in{' '}
          {first.year}.
        </p>
      )
    } else {
      const rows = d.filter((r) => r.year === intent.year)
      if (!rows.length) {
        body = (
          <p>
            The Mauna Loa record runs from {MONTHS[first.month - 1]} {first.year} to {MONTHS[last.month - 1]} {last.year}, so there’s no reading for {intent.year}.
          </p>
        )
      } else {
        const mean = rows.reduce((s, r) => s + r.average, 0) / rows.length
        const diff = last.average - mean
        body = (
          <p>
            In {intent.year}, CO₂ at Mauna Loa averaged <Num tip={`mean of ${rows.length} monthly readings`}>{mean.toFixed(1)} ppm</Num>. The latest month,{' '}
            {MONTHS[last.month - 1]} {last.year}, read <Num>{last.average.toFixed(1)} ppm</Num>:{' '}
            <Num tip={`${diff.toFixed(2)} ppm`}>
              {diff >= 0 ? '' : '−'}
              {Math.abs(diff).toFixed(1)} ppm
            </Num>{' '}
            ({Math.round((diff / mean) * 100)}%) {diff >= 0 ? 'higher' : 'lower'}.
          </p>
        )
      }
    }
  }
  const pts = d.map((r) => ({ x: r.t, y: r.average }))
  return (
    <Frame q={q} at={at} onRemove={onRemove} feeds={[feed]} source="NOAA GML · Mauna Loa CO₂" sourceHref="https://gml.noaa.gov/ccgg/trends/">
      {body}
      {pts.length > 1 && (
        <div className="mt-4">
          <LineChart
            series={[{ key: 'co2', label: 'CO₂, monthly mean', color: 'var(--series-1)', points: pts }]}
            xFormat={(x) => String(Math.floor(x))}
            xNice
            tipTitle={(x) => {
              const r = d.find((m) => Math.abs(m.t - x) < 0.05)
              return r ? `${MONTHS[r.month - 1]} ${r.year}` : String(Math.floor(x))
            }}
            yFormat={(v) => `${Math.round(v)}`}
            band={intent.year && d.some((r) => r.year === intent.year) ? { x0: intent.year, x1: intent.year + 1, label: String(intent.year) } : undefined}
            marks={last && !intent.year ? [{ x: last.t, y: last.average, label: `${last.average.toFixed(1)}` }] : []}
          />
        </div>
      )}
    </Frame>
  )
}

// ── indicators ──────────────────────────────────────────────────────────────

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']
/** "the United States", "the Netherlands", "Japan" */
function theName(n: string): string {
  return /^(United |Netherlands|Philippines|Bahamas|Gambia|Maldives|Czech Republic|Dominican Republic|Central African|Solomon|Marshall|Comoros|Seychelles|Russian Federation|Slovak Republic|Kyrgyz Republic|Democratic|Republic)/.test(n) ? `the ${n}` : n
}

function IndicatorAnswer({ q, at, onRemove, onRun, intent }: P<'indicator'>) {
  const ind = useIndicators()
  const life = useLife()
  const meta = INDICATORS.find((m) => m.code === intent.code)!
  const isLife = intent.code === 'life'
  const feed = isLife ? life : ind

  const seriesOf = (iso: string): Record<string, number> | undefined =>
    isLife ? life.data?.countries.find((c) => c.iso3 === iso)?.series : ind.data?.countries.find((c) => c.iso3 === iso)?.values[intent.code as never]
  const nameOf = (iso: string) => (ind.data?.countries.find((c) => c.iso3 === iso)?.name ?? life.data?.countries.find((c) => c.iso3 === iso)?.name ?? iso).replace(/, (The|Rep\.|Islamic Rep\.|Arab Rep\.)$/, '')

  const content = useMemo(() => {
    if (!feed.data) return null
    if (!intent.countries.length) return { kind: 'none' as const }
    const rows = intent.countries.map((iso) => {
      const s = seriesOf(iso) ?? {}
      const years = Object.keys(s).sort()
      const y = intent.year && s[intent.year] !== undefined ? String(intent.year) : years.at(-1)
      return { iso, name: nameOf(iso), s, years, y, v: y ? s[y] : undefined }
    })
    // Rank among all countries for the first country's year.
    const all = isLife
      ? (life.data?.countries ?? []).map((c) => ({ iso: c.iso3, s: c.series }))
      : (ind.data?.countries ?? []).map((c) => ({ iso: c.iso3, s: c.values[intent.code as never] as Record<string, number> | undefined }))
    const y0 = rows[0].y
    const ranked = y0
      ? all
          .map((c) => ({ iso: c.iso, v: c.s?.[y0] }))
          .filter((c): c is { iso: string; v: number } => c.v !== undefined)
          .sort((a, b) => b.v - a.v)
      : []
    const rank = ranked.findIndex((c) => c.iso === rows[0].iso) + 1
    // Median country per year, as a reference line.
    const yrs = new Set<string>()
    all.forEach((c) => Object.keys(c.s ?? {}).forEach((y) => yrs.add(y)))
    const median = [...yrs]
      .sort()
      .map((y) => {
        const vs = all.map((c) => c.s?.[y]).filter((v): v is number => v !== undefined).sort((a, b) => a - b)
        return vs.length >= 20 ? { x: +y, y: vs[Math.floor(vs.length / 2)] } : null
      })
      .filter((p): p is { x: number; y: number } => !!p)
    return { kind: 'rows' as const, rows, rank, of: ranked.length, median }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.data, ind.data, life.data, intent])

  let body: ReactNode = null
  let chart: ReactNode = null
  if (content?.kind === 'none') {
    body = (
      <>
        <p>Which country? I didn’t recognise {intent.unknown.length ? `“${intent.unknown.join(', ')}”` : 'one in that question'}.</p>
        <Chips className="mt-3" items={[`${meta.words[0]} japan`, `${meta.words[0]} brazil vs mexico`, `${meta.words[0]} kenya`]} onRun={onRun} />
      </>
    )
  } else if (content?.kind === 'rows') {
    const { rows, rank, of, median } = content
    const missing = rows.filter((r) => r.v === undefined)
    const ok = rows.filter((r) => r.v !== undefined)
    if (!ok.length) {
      body = <p>World Bank has no {meta.noun} figures for {missing.map((r) => r.name).join(' or ')}.</p>
    } else if (ok.length === 1) {
      const r = ok[0]
      const firstY = r.years[0]
      const change = r.v! - r.s[firstY]
      const dir = change > 0 ? 'up' : 'down'
      body = (
        <p>
          {cap(meta.noun)} in {theName(r.name)} was <Num tip={`${r.v} (${r.y})`}>{meta.unit(r.v!)}</Num> in {r.y}
          {firstY !== r.y && Math.abs(change) > 0 && (
            <>
              , {dir} <Num tip={`${firstY}: ${meta.unit(r.s[firstY])}`}>{meta.unit(Math.abs(change)).replace(/^\$-?/, '$')}</Num> since {firstY}
            </>
          )}
          .{' '}
          {rank > 0 && (
            <>
              That’s the <Num tip={`rank ${rank} of ${of} with data for ${r.y}`}>{ordinal(rank)}</Num> highest of {of} countries.
            </>
          )}
          {missing.length > 0 && ` No figures for ${missing.map((m) => m.name).join(' or ')}.`}
        </p>
      )
    } else {
      const sorted = [...ok].sort((a, b) => b.v! - a.v!)
      const [top, low] = [sorted[0], sorted.at(-1)!]
      const ratio = top.v! / low.v!
      const sameYear = ok.every((r) => r.y === ok[0].y)
      body = (
        <p>
          {sameYear ? `In ${ok[0].y}, ${meta.noun} was ` : `${cap(meta.noun)} was `}
          {ok.map((r, i) => (
            <span key={r.iso}>
              {i > 0 && (i === ok.length - 1 ? ' and ' : ', ')}
              <Num tip={`${r.v} (${r.y})`}>{i === 0 ? meta.unit(r.v!) : meta.unit(r.v!).replace(/ years$/, '')}</Num> in {theName(r.name)}
              {!sameYear && ` (${r.y})`}
            </span>
          ))}
          .{' '}
          {ratio >= 1.5 && meta.unit(1).indexOf('%') < 0 ? (
            <>
              {cap(theName(top.name))}’s figure is <Num tip={`${ratio.toFixed(2)}×`}>{ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×</Num> {theName(low.name)}’s.
            </>
          ) : (
            <>
              {cap(theName(top.name))} leads by <Num tip={`${(top.v! - low.v!).toFixed(2)}`}>{meta.unit(top.v! - low.v!)}</Num>.
            </>
          )}
          {missing.length > 0 && ` No figures for ${missing.map((m) => m.name).join(' or ')}.`}
        </p>
      )
    }
    if (ok.length) {
      const series: LineSeries[] = ok.map((r, i) => ({
        key: r.iso,
        label: r.name,
        color: COLORS[i],
        points: r.years.map((y) => ({ x: +y, y: r.s[y] })),
      }))
      if (ok.length === 1 && median.length) series.push({ key: 'median', label: 'Median country', color: 'var(--series-other)', faded: true, points: median })
      chart = (
        <LineChart
          series={series}
          xFormat={(x) => String(Math.round(x))}
          yFormat={(v) => compactUnit(meta.code, v)}
          tipTitle={(x) => String(Math.round(x))}
          xNice
          band={intent.year ? { x0: intent.year - 0.4, x1: intent.year + 0.4, label: String(intent.year) } : undefined}
        />
      )
    }
  }

  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source={isLife ? 'World Bank · life expectancy (snapshot)' : 'World Bank · WDI (snapshot)'}
      sourceHref="https://data.worldbank.org/"
      link={{ label: meta.dashboard.label, path: meta.dashboard.path(intent.countries[0]) }}
      chart={chart}
    >
      {body}
    </Frame>
  )
}

function compactUnit(code: string, v: number): string {
  if (code === 'SP.POP.TOTL') return v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${Math.round(v / 1e6)}M` : `${Math.round(v / 1e3)}K`
  if (code === 'NY.GDP.PCAP.CD') return v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${Math.round(v)}`
  if (code.endsWith('.ZS')) return `${Math.round(v)}%`
  return Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 1 : 0)
}

// ── wiki / launches / hn ────────────────────────────────────────────────────

function WikiAnswer({ q, at, onRemove, intent }: P<'wiki'>) {
  const feed = useWikiLatest()
  const arts = feed.data?.articles.slice(0, intent.n) ?? []
  const date = feed.data?.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const views = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}K`)
  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source="Wikimedia pageviews"
      sourceHref="https://pageviews.wmcloud.org/topviews/"
      link={{ label: 'Attention', path: '/lab/attention' }}
      chart={
        arts.length > 0 && (
          <RankBars
            items={arts.map((a) => ({ key: a.article, label: a.title, value: a.views, href: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.article)}` }))}
            format={(v) => `${fmtInt(v)} views`}
          />
        )
      }
    >
      {arts.length > 0 && (
        <p>
          On {date}, the most-read article on English Wikipedia was <strong className="font-semibold">{arts[0].title}</strong>, with{' '}
          <Num tip={`${fmtInt(arts[0].views)} views`}>{views(arts[0].views)}</Num> views
          {arts.length > 2 && (
            <>
              . {arts[1].title} and {arts[2].title} followed
            </>
          )}
          .
        </p>
      )}
    </Frame>
  )
}

function LaunchAnswer({ q, at, onRemove, intent }: P<'launch'>) {
  const feed = useLaunchesUpcoming()
  const now = useNow(30_000)
  const next = (feed.data ?? []).filter((l) => l.net > now - 3600_000).slice(0, intent.n)
  const l = next[0]
  const when = (t: number) => new Date(t).toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC'
  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source="Launch Library 2"
      sourceHref="https://thespacedevs.com/llapi"
      link={{ label: 'Departures', path: '/lab/departures' }}
      chart={
        next.length > 1 && (
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {next.map((x) => (
                <tr key={x.id}>
                  <td className="py-1.5 pr-3 font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">{relative(x.net, now)}</td>
                  <td className="max-w-0 truncate py-1.5 pr-3">
                    <span className="font-medium">{x.rocket}</span> <span className="text-muted-foreground">· {x.mission}</span>
                  </td>
                  <td className="py-1.5 text-right text-xs whitespace-nowrap text-muted-foreground">{x.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    >
      {l ? (
        <p>
          The next launch is <strong className="font-semibold">{l.rocket}</strong> carrying {l.mission || 'an unnamed payload'} from {l.location.split(',')[0]},{' '}
          <Num tip={`${when(l.net)} · precision: ${l.precision || 'unknown'}`}>{relative(l.net, now)}</Num>. Status: {l.statusName.toLowerCase()}.
        </p>
      ) : (
        <p>No launches are scheduled in the feed right now.</p>
      )}
    </Frame>
  )
}

function HnAnswer({ q, at, onRemove, intent }: P<'hn'>) {
  const feed = useHackerNews(Math.max(intent.n, 5))
  const now = useNow(60_000)
  const top = feed.data?.slice(0, intent.n) ?? []
  const s = top[0]
  return (
    <Frame
      q={q}
      at={at}
      onRemove={onRemove}
      feeds={[feed]}
      source="Hacker News"
      sourceHref="https://news.ycombinator.com/"
      link={{ label: 'Terminal', path: '/lab/terminal' }}
      chart={
        top.length > 1 && (
          <RankBars
            items={top.map((x) => ({
              key: String(x.id),
              label: (
                <>
                  {x.title} <span className="text-muted-foreground">· {x.domain}</span>
                </>
              ),
              value: x.score,
              href: x.url,
            }))}
            format={(v) => `${fmtInt(v)} points`}
          />
        )
      }
    >
      {s && (
        <p>
          The top story on Hacker News is <strong className="font-semibold">“{s.title}”</strong> with <Num>{fmtInt(s.score)}</Num> points and <Num>{fmtInt(s.comments)}</Num> comments,
          posted {relative(s.time, now)}.
        </p>
      )}
    </Frame>
  )
}

// ── help / unknown ──────────────────────────────────────────────────────────

const HELP: [string, string, string[]][] = [
  ['Earthquakes', 'quakes [place] [24h | 7d | 30d] [>5]', ['quakes japan 7d', 'quakes >6 30d']],
  ['GB grid', 'grid [now | today | best 3h]', ['grid now', 'grid best 3h']],
  ['Weather', 'weather <city> [today | tomorrow | week]', ['weather london tomorrow', 'weather tokyo week']],
  ['Space weather', 'space · kp · flares', ['space', 'flares']],
  ['CO₂', 'co2 [year]', ['co2', 'co2 1990']],
  ['Countries', '<life | gdp | population | internet | electricity | renewables | emissions | fertility | infant mortality | urban> <country> [vs <country>] [year]', ['life japan vs united states', 'internet nigeria']],
  ['Lists', 'wiki top [n] · launch next · hn top [n]', ['wiki top 10', 'launch next', 'hn top 5']],
]

function HelpAnswer({ q, at, onRemove, onRun }: AnswerProps) {
  return (
    <Frame q={q} at={at} onRemove={onRemove} feeds={[]} source="Ask · built-in">
      <p className="mb-3">Ask in a few words; order doesn’t matter and close spellings work. Things I know:</p>
      <dl className="flex flex-col gap-3 text-sm">
        {HELP.map(([name, syntax, ex]) => (
          <div key={name} className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="font-medium">{name}</dt>
            <dd className="flex flex-col gap-1.5">
              <code className="font-mono text-xs break-words text-muted-foreground">{syntax}</code>
              <Chips items={ex} onRun={onRun} />
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  )
}

function UnknownAnswer({ q, at, onRemove, onRun, intent }: P<'unknown'>) {
  return (
    <Frame q={q} at={at} onRemove={onRemove} feeds={[]} source="Ask · built-in">
      <p>I can’t answer “{intent.text}” yet. The closest things I know:</p>
      <Chips className="mt-3" items={intent.suggestions.length ? intent.suggestions : EXAMPLES.slice(0, 3)} onRun={onRun} />
    </Frame>
  )
}
