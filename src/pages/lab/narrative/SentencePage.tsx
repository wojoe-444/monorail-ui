import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { useCarbonWindow, useKpForecast, useQuakesMonth } from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { LoadGate } from '@/features/lab/LabKit'
import { buildModel, displayName, META, ProseName, regionWord, type Model } from '@/features/lab/narrative/country'
import { Figure } from '@/features/lab/narrative/Figure'
import { InlineCounts, InlineTrend } from '@/features/lab/narrative/glyphs'
import { NarrativeHeader, countWord, median, ordinal, plural, ukClock } from '@/features/lab/narrative/kit'
import { CITIES, WORLD_INDICATORS, type CarbonSlot, type IndicatorCode, type KpPoint, type Quake, type WorldIndicators } from '@/features/lab/sources'
import { useLiveData, type LiveData } from '@/features/lab/useLiveData'
import { href, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Sentence Builder: the query is a sentence whose underlined words are
 * native selects (Tab between them, arrow keys change them). The answer is
 * the next paragraph, written from live data, with a word-sized chart and
 * one annotated figure. The whole sentence lives in the URL.
 */

const PATH = '/lab/narrative/sentence'
type Subject = 'quakes' | 'grid' | 'country' | 'sky'
type Params = Record<string, string>

const DEFAULTS: Record<Subject, Params> = {
  quakes: { mag: '4.5', where: 'anywhere', span: 'week' },
  grid: { pick: 'cleanest', task: 'dishwasher', when: 'tonight' },
  country: { iso: 'KEN', code: 'SP.DYN.LE00.IN', since: '2000', vs: 'region' },
  sky: { city: 'london', when: 'tonight' },
}

function useSentence(): [Subject, Params, (s: Subject, p: Params) => void] {
  const q = useSearchParams()
  const s = (['quakes', 'grid', 'country', 'sky'] as Subject[]).find((x) => x === q.get('s')) ?? 'quakes'
  const p = { ...DEFAULTS[s], ...Object.fromEntries([...q.entries()].filter(([k]) => k !== 's')) }
  // Replace, not push: changing a word shouldn't fill the back button.
  const set = (ns: Subject, np: Params) => window.location.replace(href(`${PATH}?${new URLSearchParams({ s: ns, ...np })}`))
  return [s, p, set]
}

export function SentencePage() {
  const [s, p, set] = useSentence()
  const quakes = useQuakesMonth()
  const carbon = useCarbonWindow()
  const kp = useKpForecast()
  const wb = useLiveData<WorldIndicators>(WORLD_INDICATORS)
  const feed: Record<Subject, LiveData<unknown>> = { quakes, grid: carbon, country: wb, sky: kp }
  const model = useMemo(() => (wb.data ? buildModel(wb.data) : undefined), [wb.data])

  return (
    <div className="flex flex-col gap-10">
      <NarrativeHeader id="sentence" feeds={[feed[s]]} />
      <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-8">
        <p className="text-2xl leading-[1.7] font-medium tracking-tight text-pretty sm:text-[2rem] sm:leading-[1.65]">
          Tell me about{' '}
          <Slot
            label="Subject"
            value={s}
            onChange={(v) => set(v as Subject, DEFAULTS[v as Subject])}
            options={[
              { value: 'quakes', label: 'earthquakes' },
              { value: 'grid', label: 'Britain’s grid' },
              { value: 'country', label: 'a country' },
              { value: 'sky', label: 'the aurora' },
            ]}
          />
          {s === 'quakes' && <QuakeSlots p={p} set={(np) => set(s, np)} quakes={quakes.data} />}
          {s === 'grid' && <GridSlots p={p} set={(np) => set(s, np)} />}
          {s === 'country' && <CountrySlots p={p} set={(np) => set(s, np)} model={model} />}
          {s === 'sky' && <SkySlots p={p} set={(np) => set(s, np)} />}
        </p>
        <p className="-mt-4 text-xs text-muted-foreground">Change any underlined word. Tab moves between them; arrow keys change the one in focus.</p>
        <LoadGate feeds={[feed[s]]} label="Working out the answer">
          {() => (
            <Card className="gap-6 px-6 py-6 sm:px-8">
              {s === 'quakes' && <QuakeAnswer p={p} quakes={quakes.data!} />}
              {s === 'grid' && <GridAnswer p={p} carbon={carbon.data!} />}
              {s === 'country' && model && <CountryAnswer p={p} m={model} />}
              {s === 'sky' && <SkyAnswer p={p} kp={kp.data!} />}
            </Card>
          )}
        </LoadGate>
      </div>
    </div>
  )
}

// ── The slot: an inline native select that looks like an underlined word ────

function Slot({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <span className="relative inline-flex items-baseline whitespace-nowrap">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-sm bg-transparent pr-5 font-semibold text-primary underline decoration-primary/40 decoration-2 underline-offset-[7px] outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring"
        style={{ fieldSizing: 'content' } as CSSProperties}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-popover text-base font-normal text-popover-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-0 bottom-[0.5em] size-3.5 text-primary/60" />
    </span>
  )
}

const Sp = () => <> </>

// ── Earthquakes ─────────────────────────────────────────────────────────────

const SPANS: Record<string, { ms: number; words: string; label: string }> = {
  day: { ms: 86400_000, words: 'the last day', label: 'last day' },
  week: { ms: 7 * 86400_000, words: 'the last week', label: 'last week' },
  month: { ms: 30 * 86400_000, words: 'the last 30 days', label: 'last 30 days' },
}
function regionOf(place: string): string {
  const parts = place.split(', ')
  const r = parts.length > 1 ? parts.at(-1)! : place.replace(/^\d+ ?km [NSEW]+ of /, '')
  return r === 'CA' ? 'California' : r === 'MX' ? 'Mexico' : r
}
function QuakeSlots({ p, set, quakes }: { p: Params; set: (p: Params) => void; quakes?: Quake[] }) {
  const regions = useMemo(() => {
    const counts = new Map<string, number>()
    quakes?.forEach((q) => counts.set(regionOf(q.place), (counts.get(regionOf(q.place)) ?? 0) + 1))
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([r]) => r)
  }, [quakes])
  const where = regions.includes(p.where) || p.where === 'anywhere' ? p.where : 'anywhere'
  return (
    <>
      <Sp />
      <Slot
        label="Magnitude"
        value={p.mag}
        onChange={(mag) => set({ ...p, mag })}
        options={[
          { value: '2.5', label: 'of any size' },
          { value: '4.5', label: 'stronger than M4.5' },
          { value: '5', label: 'stronger than M5' },
          { value: '6', label: 'stronger than M6' },
        ]}
      />
      <Sp />
      <Slot label="Where" value={where} onChange={(w) => set({ ...p, where: w })} options={[{ value: 'anywhere', label: 'anywhere' }, ...regions.map((r) => ({ value: r, label: `near ${r}` }))]} />
      {' '}over the{' '}
      <Slot label="Time span" value={p.span} onChange={(span) => set({ ...p, span })} options={Object.entries(SPANS).map(([k, v]) => ({ value: k, label: v.label }))} />.
    </>
  )
}

function QuakeAnswer({ p, quakes }: { p: Params; quakes: Quake[] }) {
  const span = SPANS[p.span] ?? SPANS.week
  const mag = Number(p.mag)
  const now = Date.now()
  const match = (q: Quake) => q.mag >= mag && (p.where === 'anywhere' || regionOf(q.place) === p.where)
  const hits = quakes.filter((q) => q.time >= now - span.ms && match(q))
  const prior = span.ms <= 15 * 86400_000 ? quakes.filter((q) => q.time < now - span.ms && q.time >= now - 2 * span.ms && match(q)) : undefined
  const sizeWords = mag <= 2.5 ? 'of M2.5 or more' : `of M${mag} or more`
  const place = p.where === 'anywhere' ? 'worldwide' : `near ${p.where}`
  const when = (t: number) =>
    `${new Date(t).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} at ${new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).toLowerCase()} UTC`

  if (!hits.length) {
    const last = [...quakes].reverse().find(match)
    return (
      <p className="text-lg leading-relaxed text-pretty">
        No earthquakes {sizeWords} struck {place} in {span.words}.{' '}
        {last ? (
          <>
            The most recent was <Num tip={`${last.place}, ${new Date(last.time).toISOString()}`}>M{last.mag.toFixed(1)}</Num>, {last.place},{' '}
            <Num tip={new Date(last.time).toISOString()}>{Math.max(1, Math.round((now - last.time) / 86400_000))} days ago</Num>.
          </>
        ) : (
          <>None did in the past 30 days either, the longest the feed goes back.</>
        )}
      </p>
    )
  }
  const top = hits.reduce((a, b) => (b.mag > a.mag ? b : a))
  const deep = hits.reduce((a, b) => (b.depth > a.depth ? b : a))
  const buckets = p.span === 'day' ? 24 : Math.round(span.ms / 86400_000)
  const size = span.ms / buckets
  const counts = Array.from({ length: buckets }, (_, i) => hits.filter((q) => q.time >= now - span.ms + i * size && q.time < now - span.ms + (i + 1) * size).length)
  const unitWord = p.span === 'day' ? 'hour' : 'day'
  const perDay = hits.length / (span.ms / 86400_000)
  const shallow = hits.filter((q) => q.depth < 70).length / hits.length

  return (
    <>
      <p className="text-lg leading-relaxed text-pretty">
        <Num tip={`${hits.length} events in the USGS M2.5+ feed`}>
          {countWord(hits.length)[0].toUpperCase() + countWord(hits.length).slice(1)} {plural(hits.length, 'earthquake')}
        </Num>{' '}
        {sizeWords} struck {place} in {span.words}
        <InlineCounts points={counts.map((c, i) => ({ label: `${unitWord} ${i + 1} of ${buckets}`, value: c, text: String(c) }))} summary={`Earthquakes per ${unitWord}`} />
        {p.span !== 'day' && perDay >= 1.5 ? <>, about {Math.round(perDay)} a day</> : null}.{' '}
        {hits.length === 1 ? 'It' : 'The largest'}, <Num tip={`USGS ${top.id}: M${top.mag}, depth ${top.depth.toFixed(0)} km`}>M{top.mag.toFixed(1)}</Num>, hit {top.place} on {when(top.time)}
        {top.depth > 300 ? <>, so deep (<Num>{Math.round(top.depth)} km</Num>) that little of its shaking reached the surface</> : top.depth < 20 ? <>, shallow enough to shake hard</> : null}
        {top.tsunami ? <>; it triggered a tsunami bulletin</> : null}.{' '}
        {prior && (
          <>
            {prior.length === hits.length ? (
              <>That’s exactly as many as the {span.label.replace('last', 'previous')}.</>
            ) : (
              <>
                That’s {hits.length > prior.length ? 'more' : 'fewer'} than the {span.label.replace('last', 'previous')} (<Num tip="Same filter, the window before">{prior.length}</Num>).
              </>
            )}{' '}
          </>
        )}
        {hits.length >= 5 && (
          <>
            <Num tip={`${Math.round(shallow * 100)}% shallower than 70 km`}>{shallow >= 0.95 ? 'Nearly all' : shallow >= 0.6 ? 'Most' : shallow >= 0.4 ? 'About half' : 'Few'}</Num> were shallow
            {deep.depth > 300 ? (
              <>
                ; the deepest was <Num tip={deep.place}>{Math.round(deep.depth)} km</Num> down, {deep.place}
              </>
            ) : null}
            .
          </>
        )}
      </p>
      <Figure
        label={`Each earthquake by time and magnitude, ${span.words}`}
        xDomain={[now - span.ms, now]}
        yDomain={[Math.max(2.5, Math.floor(mag)), Math.max(Math.ceil(top.mag + 0.3), mag + 1)]}
        yTicks={Array.from({ length: 6 }, (_, i) => Math.floor(mag) + i).filter((v) => v <= Math.ceil(top.mag + 0.3))}
        yFmt={(v) => `M${v}`}
        xTicks={Array.from({ length: 5 }, (_, i) => {
          const t = now - span.ms + (i * span.ms) / 4
          return { x: t, label: p.span === 'day' ? `${new Date(t).getUTCHours()}:00` : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) }
        })}
        dots={hits.map((q) => ({ x: q.time, y: q.mag, r: Math.min(9, 1.5 + (q.mag - 2) * 1.3), color: 'var(--series-1)', opacity: 0.55, tip: `M${q.mag.toFixed(1)} · ${q.place}` }))}
        notes={[{ x: top.time, y: top.mag, text: `M${top.mag.toFixed(1)} · ${regionOf(top.place)}` }]}
        height={220}
      />
      <Caption>Each dot is one earthquake, sized by magnitude. Times in UTC. Source: USGS, M2.5+ feed, past 30 days.</Caption>
    </>
  )
}

// ── Grid ────────────────────────────────────────────────────────────────────

const TASKS: Record<string, { label: string; slots: number; kwh: number; noun: string }> = {
  kettle: { label: 'boil a kettle', slots: 1, kwh: 0.1, noun: 'a boil' },
  washing: { label: 'do a load of washing', slots: 4, kwh: 0.8, noun: 'a 0.8 kWh wash' },
  dishwasher: { label: 'run the dishwasher', slots: 4, kwh: 1.1, noun: 'a typical 1.1 kWh cycle' },
  ev: { label: 'charge an electric car', slots: 12, kwh: 40, noun: 'a 40 kWh charge' },
}
function GridSlots({ p, set }: { p: Params; set: (p: Params) => void }) {
  return (
    <>
      : when is the{' '}
      <Slot
        label="Cleanest or dirtiest"
        value={p.pick}
        onChange={(pick) => set({ ...p, pick })}
        options={[
          { value: 'cleanest', label: 'cleanest' },
          { value: 'dirtiest', label: 'dirtiest' },
        ]}
      />{' '}
      time to <Slot label="Task" value={p.task} onChange={(task) => set({ ...p, task })} options={Object.entries(TASKS).map(([k, v]) => ({ value: k, label: v.label }))} />
      <Sp />
      <Slot
        label="When"
        value={p.when}
        onChange={(when) => set({ ...p, when })}
        options={[
          { value: 'tonight', label: 'tonight' },
          { value: 'day', label: 'in the next 24 hours' },
        ]}
      />
      ?
    </>
  )
}

function GridAnswer({ p, carbon }: { p: Params; carbon: CarbonSlot[] }) {
  const task = TASKS[p.task] ?? TASKS.dishwasher
  const now = Date.now()
  const cur = carbon.find((c) => c.from <= now && c.to > now) ?? carbon.find((c) => c.from > now)!
  let ahead = carbon.filter((c) => c.from >= cur.from).slice(0, 48)
  if (p.when === 'tonight') {
    const end = ahead.findIndex((c, i) => i > 0 && ukClock(c.from) === '08:00')
    ahead = ahead.slice(0, end === -1 ? ahead.length : end)
  }
  const n = Math.min(task.slots, ahead.length)
  let bestI = 0
  const avgAt = (i: number) => ahead.slice(i, i + n).reduce((s, c) => s + c.forecast, 0) / n
  for (let i = 0; i + n <= ahead.length; i++) {
    if (p.pick === 'dirtiest' ? avgAt(i) > avgAt(bestI) : avgAt(i) < avgAt(bestI)) bestI = i
  }
  const win = { start: ahead[bestI].from, end: ahead[bestI + n - 1].to, avg: avgAt(bestI) }
  const nowV = cur.actual ?? cur.forecast
  const delta = (win.avg - nowV) / nowV
  const savedG = (nowV - win.avg) * task.kwh
  const whenWords = p.when === 'tonight' ? 'tonight' : 'in the next 24 hours'
  const range = `${ukClock(win.start)}–${ukClock(win.end)}`
  const isNow = bestI === 0

  return (
    <>
      <p className="text-lg leading-relaxed text-pretty">
        {isNow ? (
          <>
            Right now is the {p.pick} time to {task.label} {whenWords}
            {p.pick === 'cleanest' ? ': go ahead.' : ': if you can wait, wait.'}{' '}
            {n > 1 && (
              <>
                The {p.pick} stretch runs <Num tip={`${n} half-hour slots`}>{range}</Num> at an average of{' '}
                <Num tip={`Mean forecast: ${win.avg.toFixed(1)} gCO₂/kWh`}>{Math.round(win.avg)} g</Num> of CO₂ per kilowatt-hour.{' '}
              </>
            )}
          </>
        ) : (
          <>
            The {p.pick} time to {task.label} {whenWords} is <Num tip={`${range} UK, ${n} half-hour slots`}>{n === 1 ? ukClock(win.start) : range}</Num>, when power averages{' '}
            <Num tip={`Mean forecast over the window: ${win.avg.toFixed(1)} gCO₂/kWh`}>{Math.round(win.avg)} g</Num> of CO₂ per kilowatt-hour,{' '}
            <Num tip={`Now: ${nowV} gCO₂/kWh`}>
              {Math.round(Math.abs(delta) * 100)}% {delta < 0 ? 'cleaner' : 'dirtier'}
            </Num>{' '}
            than right now.{' '}
          </>
        )}
        The forecast {whenWords}
        <InlineTrend points={ahead.map((c) => ({ label: `${ukClock(c.from)} UK`, value: c.forecast, text: `${c.forecast} g` }))} summary={`Forecast intensity ${whenWords}`} width={72} />
        runs from <Num>{Math.min(...ahead.map((c) => c.forecast))}</Num> to <Num>{Math.max(...ahead.map((c) => c.forecast))} g</Num>.{' '}
        {p.pick === 'cleanest' && !isNow && savedG > 0 && (
          <>
            Waiting saves about{' '}
            <Num tip={`(${nowV} − ${win.avg.toFixed(0)}) g/kWh × ${task.kwh} kWh`}>{savedG >= 1000 ? `${(savedG / 1000).toFixed(1)} kg` : `${Math.round(savedG)} g`}</Num> of CO₂ for {task.noun}
            {savedG >= 300 ? <>, about what a petrol car emits over <Num tip="At ~170 g CO₂ per km">{(savedG / 170).toFixed(savedG >= 1700 ? 0 : 1)} km</Num></> : null}.
          </>
        )}
      </p>
      <Figure
        label={`Forecast carbon intensity ${whenWords}, with the ${p.pick} window shaded`}
        xDomain={[ahead[0].from, ahead.at(-1)!.to]}
        yDomain={[0, Math.max(...ahead.map((c) => c.forecast)) * 1.15]}
        yTicks={[0, 50, 100, 150, 200, 250, 300].filter((v) => v <= Math.max(...ahead.map((c) => c.forecast)) * 1.15)}
        xTicks={ahead.filter((c) => ukClock(c.from).endsWith(':00') && Number(ukClock(c.from).slice(0, 2)) % (ahead.length > 24 ? 6 : 3) === 0).map((c) => ({ x: c.from, label: ukClock(c.from) }))}
        bands={[{ x0: win.start, x1: win.end, label: `${p.pick} ${n === 1 ? ukClock(win.start) : range}` }]}
        lines={[{ key: 'f', color: 'var(--series-1)', points: ahead.map((c) => ({ x: c.from + 15 * 60_000, y: c.forecast, tip: `${ukClock(c.from)} UK · ${c.forecast} g forecast` })) }]}
        notes={[{ x: ahead[0].from + 15 * 60_000, y: ahead[0].forecast, text: `now · ${nowV} g` }]}
        height={210}
      />
      <Caption>gCO₂/kWh, half-hourly forecast, UK time. Source: NESO Carbon Intensity API. Appliance energy use is a typical figure, not yours.</Caption>
    </>
  )
}

// ── Country ─────────────────────────────────────────────────────────────────

const SINCE = ['2000', '2005', '2010', '2015', '2020']
function CountrySlots({ p, set, model }: { p: Params; set: (p: Params) => void; model?: Model }) {
  const list = useMemo(() => (model ? [...model.data.countries].sort((a, b) => displayName(a.name).localeCompare(displayName(b.name))) : []), [model])
  if (!model) return <>…</>
  return (
    <>
      : how has <Slot label="Country" value={p.iso} onChange={(iso) => set({ ...p, iso })} options={list.map((c) => ({ value: c.iso3, label: `${displayName(c.name)}’s` }))} />{' '}
      <Slot
        label="Indicator"
        value={p.code}
        onChange={(code) => set({ ...p, code })}
        options={Object.values(META)
          .map((m) => ({ value: m.code, label: m.label }))}
      />{' '}
      changed since <Slot label="Since" value={p.since} onChange={(since) => set({ ...p, since })} options={SINCE.map((y) => ({ value: y, label: y }))} />, next to{' '}
      <Slot
        label="Compared with"
        value={p.vs}
        onChange={(vs) => set({ ...p, vs })}
        options={[
          { value: 'region', label: 'its region' },
          { value: 'world', label: 'the median country' },
        ]}
      />
      ?
    </>
  )
}

function CountryAnswer({ p, m }: { p: Params; m: Model }) {
  const c = m.byIso.get(p.iso) ?? m.byIso.get('KEN')!
  const code = (p.code in META ? p.code : 'SP.DYN.LE00.IN') as IndicatorCode
  const meta = META[code]
  const since = Number(p.since)
  const Name = ProseName(c.name)
  const series = Object.entries(c.values[code] ?? {})
    .map(([y, v]) => ({ y: +y, v }))
    .filter((d) => d.y >= since)
    .sort((a, b) => a.y - b.y)
  const peers = m.data.countries.filter((o) => (p.vs === 'region' ? o.region === c.region : true))
  const peerName = p.vs === 'region' ? `the median in ${regionWord(c.region)}` : 'the median country'
  const peerSeries = series
    .map((d) => {
      const vals = peers.map((o) => o.values[code]?.[String(d.y)]).filter((v): v is number => v != null)
      return vals.length >= 3 ? { y: d.y, v: median(vals) } : undefined
    })
    .filter((d): d is { y: number; v: number } => !!d)

  if (series.length < 2) {
    return (
      <p className="text-lg leading-relaxed">
        The World Bank has too few {meta.label} figures for {Name} since {since} to say.
      </p>
    )
  }
  const a = series[0]
  const b = series.at(-1)!
  const d = b.v - a.v
  const rel = d / Math.abs(a.v || 1)
  const moves = series.slice(1).map((s, i) => ({ y: s.y, d: s.v - series[i].v }))
  const big = moves.reduce((x, yv) => (Math.abs(yv.d) > Math.abs(x.d) ? yv : x), moves[0])
  const pa = peerSeries[0]
  const pb = peerSeries.at(-1)
  const verb =
    Math.abs(rel) < 0.02 ? 'held steady' : d > 0 ? (meta.points || rel < 1 ? 'rose' : rel < 2 ? 'more than doubled' : `grew ${Math.floor(rel + 1)}-fold`) : !meta.points && rel <= -0.5 ? 'more than halved' : 'fell'
  const amount = meta.points ? `${Math.abs(d).toFixed(1)} points` : code === 'SP.DYN.LE00.IN' ? `${Math.abs(d).toFixed(1)} years` : `${Math.round(Math.abs(rel) * 100)}%`
  const rankAt = (y: number) => {
    const vals = m.data.countries.map((o) => o.values[code]?.[String(y)]).filter((v): v is number => v != null).sort((x, z) => z - x)
    const mine = c.values[code]?.[String(y)]
    return mine == null ? undefined : { r: vals.indexOf(mine) + 1, of: vals.length }
  }
  const ra = rankAt(a.y)
  const rb = rankAt(b.y)
  const peerD = pa && pb ? pb.v - pa.v : undefined

  return (
    <>
      <p className="text-lg leading-relaxed text-pretty">
        {Name}’s {meta.label}
        <InlineTrend points={series.map((s) => ({ label: String(s.y), value: s.v, text: meta.fmt(s.v) }))} summary={`${meta.label}, ${a.y}–${b.y}`} />
        {verb}
        {verb === 'held steady' ? (
          <>
            {' '}
            at about <Num tip={`World Bank ${code}`}>{meta.fmt(b.v)}</Num> between {a.y} and {b.y}
          </>
        ) : (
          <>
            {' '}
            from <Num tip={`World Bank ${code}, ${a.y}: ${a.v}`}>{meta.fmt(a.v)}</Num> in {a.y} to <Num tip={`World Bank ${code}, ${b.y}: ${b.v}`}>{meta.fmt(b.v)}</Num> in {b.y}
            {verb === 'rose' || verb === 'fell' ? <>, {d > 0 ? 'up' : 'down'} {amount}</> : null}
          </>
        )}
        .{' '}
        {pa && pb && peerD !== undefined && (
          <>
            Over the same years {peerName} went from <Num tip={`Median of ${peers.length} countries, ${pa.y}`}>{meta.fmt(pa.v)}</Num> to{' '}
            <Num tip={`Median, ${pb.y}`}>{meta.fmt(pb.v)}</Num>, so {Name}{' '}
            {Math.abs(d - peerD) < Math.max(Math.abs(peerD) * 0.15, Math.abs(pb.v) * 0.02) ? 'kept pace' : (d - peerD > 0) === (b.v >= pb.v) ? 'pulled further away' : 'closed the gap'}.{' '}
          </>
        )}
        {Math.abs(big.d) > 0 && moves.length >= 3 && (
          <>
            The biggest single-year move came in <Num tip={`${big.y - 1} → ${big.y}`}>{big.y}</Num>: {big.d > 0 ? 'up' : 'down'} {meta.points ? `${Math.abs(big.d).toFixed(1)} points` : meta.fmt(Math.abs(big.d))}.{' '}
          </>
        )}
        {ra && rb && ra.r !== rb.r && (
          <>
            It moved from <Num tip={`of ${ra.of} countries with ${a.y} data`}>{ordinal(ra.r)}</Num> to <Num tip={`of ${rb.of} countries with ${b.y} data`}>{ordinal(rb.r)}</Num> in the world (1st = highest).
          </>
        )}
      </p>
      <Figure
        label={`${meta.label} for ${displayName(c.name)} and ${peerName}, ${a.y}–${b.y}`}
        xDomain={[a.y, b.y]}
        yDomain={niceDomain([...series.map((s) => s.v), ...peerSeries.map((s) => s.v)])}
        yTicks={niceTicks(niceDomain([...series.map((s) => s.v), ...peerSeries.map((s) => s.v)]))}
        yFmt={(v) => meta.fmt(v)}
        xTicks={series.filter((s, i) => i === 0 || i === series.length - 1 || s.y % 5 === 0).map((s) => ({ x: s.y, label: String(s.y) }))}
        lines={[
          { key: 'peer', color: 'var(--series-other)', width: 2, points: peerSeries.map((s) => ({ x: s.y, y: s.v, tip: `${s.y} · ${peerName}: ${meta.fmt(s.v)}` })) },
          { key: 'me', color: 'var(--series-1)', width: 2, points: series.map((s) => ({ x: s.y, y: s.v, tip: `${s.y} · ${displayName(c.name)}: ${meta.fmt(s.v)}` })) },
        ]}
        notes={[{ x: b.y, y: b.v, text: `${displayName(c.name)} ${meta.fmt(b.v)}` }]}
        height={220}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full bg-[var(--series-1)]" />
          {displayName(c.name)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full bg-[var(--series-other)]" />
          {peerName[0].toUpperCase() + peerName.slice(1)}
        </span>
        <span>Source: World Bank WDI (snapshot), {code}.</span>
      </div>
    </>
  )
}

function niceDomain(vals: number[]): [number, number] {
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12
  return [Math.max(0, lo - pad), hi + pad]
}
function niceTicks([lo, hi]: [number, number]): number[] {
  const raw = (hi - lo) / 4
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? mag * 10
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(6))
  return out
}

// ── The aurora ──────────────────────────────────────────────────────────────

/** Dipole geomagnetic latitude (pole ~80.8°N, 72.8°W): a rough guide to auroral reach. */
function geomagLat(lat: number, lon: number): number {
  const r = Math.PI / 180
  const pLat = 80.8 * r
  const pLon = -72.8 * r
  const s = Math.sin(lat * r) * Math.sin(pLat) + Math.cos(lat * r) * Math.cos(pLat) * Math.cos(lon * r - pLon)
  return 90 - Math.acos(s) / r
}
/** Geomagnetic latitude the auroral oval reaches at a given Kp (NOAA's rule of thumb). */
const reach = (kp: number) => 66.5 - 2.05 * kp
const gScale = (kp: number) => (kp >= 9 ? 'an extreme G5' : kp >= 8 ? 'a severe G4' : kp >= 7 ? 'a strong G3' : kp >= 6 ? 'a moderate G2' : kp >= 5 ? 'a minor G1' : 'no')

function SkySlots({ p, set }: { p: Params; set: (p: Params) => void }) {
  return (
    <>
      : could I see it from <Slot label="City" value={p.city} onChange={(city) => set({ ...p, city })} options={CITIES.map((c) => ({ value: c.id, label: c.name }))} />
      <Sp />
      <Slot
        label="When"
        value={p.when}
        onChange={(when) => set({ ...p, when })}
        options={[
          { value: 'tonight', label: 'tonight' },
          { value: 'days', label: 'in the next three days' },
        ]}
      />
      ?
    </>
  )
}

function SkyAnswer({ p, kp }: { p: Params; kp: KpPoint[] }) {
  const city = CITIES.find((c) => c.id === p.city) ?? CITIES[1]
  const now = Date.now()
  const gl = geomagLat(city.lat, city.lon)
  const abs = Math.abs(gl)
  const lights = gl < 0 ? 'southern lights' : 'northern lights'
  const horizon = gl < 0 ? 'southern' : 'northern'
  const window = kp.filter((k) => k.time + 3 * 3600_000 > now && (p.when === 'tonight' ? k.time < now + 12 * 3600_000 : true))
  if (!window.length) return <p className="text-lg">The Kp forecast for that window hasn’t been published.</p>
  const peak = window.reduce((a, b) => (b.kp > a.kp ? b : a))
  const need = Math.max(0, (66.5 - abs) / 2.05)
  const hourWords = (t: number) => {
    const w = new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'UTC' }).toLowerCase()
    return w === '12 am' ? 'midnight' : w === '12 pm' ? 'noon' : w
  }
  const when = (t: number) =>
    t <= now
      ? 'right now'
      : p.when === 'tonight'
        ? `around ${hourWords(t)} UTC`
        : `${new Date(t).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} around ${hourWords(t)} UTC`
  const level = peak.kp >= 5 ? `${gScale(peak.kp)} storm` : peak.kp >= 4 ? 'active' : peak.kp >= 3 ? 'unsettled' : 'quiet'
  const verdict: ReactNode =
    abs >= reach(peak.kp) ? (
      <>so yes, there’s a real chance if the sky is clear and dark: look {horizon}.</>
    ) : need <= 9 ? (
      <>
        so probably not: you’d need about <Num tip={`(66.5 − ${abs.toFixed(1)}) ÷ 2.05`}>Kp {need.toFixed(1)}</Num>, {gScale(need)} storm, to see it low on the {horizon} horizon.
      </>
    ) : (
      <>which is too close to the equator: even the strongest storms almost never reach that far.</>
    )

  return (
    <>
      <p className="text-lg leading-relaxed text-pretty">
        The planetary Kp index {peak.time <= now ? 'peaks' : 'is forecast to peak'} at <Num tip={`NOAA SWPC ${peak.kind} Kp for ${new Date(peak.time).toISOString().slice(0, 16)}Z: ${peak.kp}`}>{peak.kp.toFixed(1)}</Num>{' '}
        {when(peak.time)}: {level}. At that level the {lights} reach roughly <Num tip="66.5 − 2.05 × Kp, geomagnetic degrees">{reach(peak.kp).toFixed(0)}°</Num> geomagnetic latitude. {city.name} sits near{' '}
        <Num tip={`Dipole approximation from ${city.lat}°, ${city.lon}°`}>{abs.toFixed(0)}°</Num>, {verdict}
      </p>
      <Figure
        label={`Kp forecast ${p.when === 'tonight' ? 'tonight' : 'for the next three days'}, with the level ${city.name} needs`}
        xDomain={[window[0].time, window.at(-1)!.time + 3 * 3600_000]}
        yDomain={[0, 9]}
        yTicks={[0, 3, 5, 7, 9]}
        xTicks={window
          .filter((k, i) => (p.when === 'tonight' ? true : new Date(k.time).getUTCHours() === 0) || i === 0)
          .map((k) => ({ x: k.time + 1.5 * 3600_000, label: p.when === 'tonight' ? `${new Date(k.time).getUTCHours()}:00` : new Date(k.time).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) }))}
        bars={window.map((k) => ({
          x: k.time + 1.5 * 3600_000,
          y: k.kp,
          w: p.when === 'tonight' ? 28 : 10,
          color: k.kp >= 5 ? 'var(--warning)' : 'var(--series-1)',
          outline: k.kind === 'predicted',
          tip: `${new Date(k.time).toISOString().slice(5, 16).replace('T', ' ')} UTC · Kp ${k.kp.toFixed(2)} (${k.kind})`,
        }))}
        rules={need <= 9 ? [{ y: need, label: `Kp ${need.toFixed(1)}: needed in ${city.name}` }] : []}
        height={200}
      />
      <Caption>
        Kp in 3-hour blocks, UTC. Filled: observed or estimated; outlined: predicted. Amber marks storm levels (Kp 5+). Reach is a rule of thumb; the real oval bends with local conditions.
      </Caption>
    </>
  )
}

function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('-mt-3 text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
}
