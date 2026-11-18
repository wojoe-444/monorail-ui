import { useMemo, useState, type ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import {
  PHASE_NAMES,
  dayOfYear,
  daylightYear,
  isLeap,
  isoWeek,
  moonNow,
  nextSeason,
  phasesAround,
  sunDay,
  type SunEvent,
} from '@/features/lab/almanac/astro'
import { DayLengthCurve, Lead, MoonGlyph, Row, SectionHead, spread, useOnThisDay } from '@/features/lab/almanac/parts'
import { experiment } from '@/features/lab/catalog'
import { useTides, useWeather, weatherWords, type Tide, type Weather } from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { CITIES, type City } from '@/features/lab/sources'
import { useNow } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Almanac: a printed reference page for today in one city. Sun and moon are
 * computed here (NOAA solar equations, Meeus lunar phases) and cross-checked
 * against Open-Meteo; tides come from NOAA; the week is Open-Meteo; history
 * is Wikipedia's "On this day". Tables with dot leaders, small-caps heads,
 * hairline rules: set like the back pages of a farmer's almanac.
 */

const EXP = experiment('almanac')
type Unit = 'c' | 'f'

export function AlmanacPage() {
  const asked = useSearchParams().get('city')
  const cityId = CITIES.some((c) => c.id === asked) ? asked! : 'nyc'
  const city = CITIES.find((c) => c.id === cityId)!
  const setCity = (id: string) => navigate(id === 'nyc' ? '/lab/almanac' : `/lab/almanac?city=${id}`)
  const [unitPick, setUnitPick] = useState<Unit | null>(null)
  const unit: Unit = unitPick ?? (city.id === 'nyc' ? 'f' : 'c')

  const weather = useWeather(city)
  const tides = useTides()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} href="https://open-meteo.com/" feeds={city.id === 'nyc' ? [weather, tides] : [weather]} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="sm:hidden">
          <Label htmlFor="almanac-city" className="sr-only">
            City
          </Label>
          <NativeSelect id="almanac-city" value={cityId} onChange={(e) => setCity(e.target.value)} className="w-44">
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Segmented aria-label="City" value={cityId} onChange={setCity} options={CITIES.map((c) => ({ value: c.id, label: c.name }))} className="hidden sm:inline-flex" />
        <Segmented
          aria-label="Temperature unit"
          value={unit}
          onChange={setUnitPick}
          options={[
            { value: 'c', label: '°C' },
            { value: 'f', label: '°F' },
          ]}
        />
      </div>
      <LoadGate feeds={[weather]} label={`Setting the almanac for ${city.name}`}>
        {() => <Sheet key={city.id} city={city} w={weather.data!} tides={city.id === 'nyc' ? tides.data : undefined} tidesError={tides.error} unit={unit} />}
      </LoadGate>
    </div>
  )
}

// ── Formatting in the city's own clock ──────────────────────────────────────

function useFormatters(tz: string) {
  return useMemo(() => {
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
    const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
    const ymdF = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    const t = (ms: number) => time.format(ms).replace(' AM', ' am').replace(' PM', ' pm')
    return {
      time: t,
      day: (ms: number) => day.format(ms),
      ymd: (ms: number) => ymdF.format(ms),
      event: (e: SunEvent, polarUp: string, polarDown: string) => (typeof e === 'number' ? t(e) : e === 'up' ? polarUp : polarDown),
    }
  }, [tz])
}

const hm = (hours: number) => {
  const h = Math.floor(hours + 1e-9)
  const m = Math.round((hours - h) * 60)
  return m === 60 ? `${h + 1} h 0 min` : `${h} h ${m} min`
}
const hmShort = (hours: number) => {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 60 ? `${h + 1}h` : `${h}h ${String(m).padStart(2, '0')}m`
}
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0] ?? 'th'}`
const tempOf = (c: number, u: Unit) => Math.round(u === 'f' ? c * 1.8 + 32 : c)
const degOf = (c: number, u: Unit) => {
  const v = tempOf(c, u)
  return `${v < 0 ? '−' : ''}${Math.abs(v)}°`
}

// ── The sheet ───────────────────────────────────────────────────────────────

function Sheet({ city, w, tides, tidesError, unit }: { city: City; w: Weather; tides?: Tide[]; tidesError?: string; unit: Unit }) {
  const now = useNow(60_000)
  const f = useFormatters(w.timezone)
  const today = w.current.time.slice(0, 10)
  const [y, m, d] = today.split('-').map(Number)
  const longDate = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const weekdayName = longDate.split(',')[0]

  return (
    <article className="rounded-xl bg-card px-4 py-6 text-card-foreground ring-1 ring-foreground/10 sm:px-8 sm:py-8">
      {/* Title block */}
      <header className="flex flex-col items-center gap-1 border-y-4 border-double border-foreground py-4 text-center">
        <div className="text-[11px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">The Almanac · {city.name}</div>
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {weekdayName}, the {ordinal(d)} of {new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}, {y}
        </h2>
        <div className="font-mono text-[11px] text-muted-foreground">
          {Math.abs(city.lat).toFixed(2)}°{city.lat >= 0 ? 'N' : 'S'} · {Math.abs(city.lon).toFixed(2)}°{city.lon >= 0 ? 'E' : 'W'} · {w.timezone.replace('_', ' ')}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2 lg:divide-x lg:divide-border">
        <div className="flex flex-col gap-8 lg:pr-10">
          <SunSection city={city} w={w} today={today} f={f} />
          <MoonSection city={city} now={now} f={f} />
        </div>
        <div className="flex flex-col gap-8">
          <TideSection city={city} tides={tides} error={tidesError} />
          <WeekSection w={w} today={today} unit={unit} />
          <DaysSection today={today} now={now} f={f} />
          <HistorySection month={m} day={d} />
        </div>
      </div>
    </article>
  )
}

type Fmt = ReturnType<typeof useFormatters>

function SunSection({ city, w, today, f }: { city: City; w: Weather; today: string; f: Fmt }) {
  const yesterdayYmd = new Date(Date.parse(`${today}T12:00:00Z`) - 86400_000).toISOString().slice(0, 10)
  const sun = useMemo(() => sunDay(today, city.lat, city.lon), [today, city])
  const prev = useMemo(() => sunDay(yesterdayYmd, city.lat, city.lon), [yesterdayYmd, city])
  const year = useMemo(() => daylightYear(Number(today.slice(0, 4)), city.lat, city.lon), [today, city])
  const hours = sun.daylight / 3600_000
  const deltaMin = Math.round((sun.daylight - prev.daylight) / 60_000)
  const deltaSec = Math.round((sun.daylight - prev.daylight) / 1000)

  // Cross-check against Open-Meteo's own sunrise and sunset.
  const i = w.daily.time.indexOf(today)
  const omRise = i >= 0 ? Date.parse(w.daily.sunrise[i] + ':00Z') : NaN
  const ownRiseLocal = typeof sun.rise === 'number' ? Date.parse(`${f.ymd(sun.rise)}T${toHHMM(f.time(sun.rise))}:00Z`) : NaN
  const agree = Number.isFinite(omRise) && Number.isFinite(ownRiseLocal) ? Math.round(Math.abs(omRise - ownRiseLocal) / 60_000) : null

  const polar = typeof sun.rise !== 'number'
  const fmtDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <section className="flex flex-col gap-3">
      <SectionHead aside="computed; NOAA solar equations">Sun</SectionHead>
      <Lead>
        {polar ? (
          sun.rise === 'up' ? (
            <>The sun does not set today: it stays up all <Num>24 hours</Num>.</>
          ) : (
            <>The sun does not rise today. Polar night: twilight is all the light there is.</>
          )
        ) : (
          <>
            The sun is up for{' '}
            <Num tip={<>Sunrise to sunset, upper limb on the horizon with refraction (zenith 90.833°): {(sun.daylight / 3600_000).toFixed(3)} h</>}>{hm(hours)}</Num> today,{' '}
            {Math.abs(deltaSec) < 30 ? (
              <>about the same as yesterday</>
            ) : (
              <>
                <Num tip={<>{deltaSec > 0 ? '+' : '−'}{Math.abs(deltaSec)} s vs yesterday</>}>
                  {Math.abs(deltaMin) || '<1'} {Math.abs(deltaMin) === 1 ? 'minute' : 'minutes'}
                </Num>{' '}
                {deltaSec > 0 ? 'more' : 'less'} than yesterday
              </>
            )}
            . At noon it climbs to <Num tip={<>Solar altitude at solar noon: {sun.noonAltitude.toFixed(2)}°</>}>{Math.round(sun.noonAltitude)}°</Num> above the horizon.
          </>
        )}
      </Lead>
      <dl>
        <Row label="Sunrise" value={f.event(sun.rise, 'sun up all day', 'no sunrise')} strong />
        <Row label="Solar noon" value={f.time(sun.noon)} />
        <Row label="Sunset" value={f.event(sun.set, 'sun up all day', 'no sunset')} strong />
        <Row label="Day length" value={polar ? (sun.rise === 'up' ? '24 h 0 min' : '0 h 0 min') : hm(hours)} note={!polar && Math.abs(deltaSec) >= 30 ? `${deltaSec > 0 ? '+' : '−'}${Math.abs(deltaMin) || '<1'} min` : undefined} />
        <Row label="Civil twilight" value={`${f.event(sun.civil.dawn, 'all night', '—')} – ${f.event(sun.civil.dusk, 'all night', '—')}`} />
        <Row label="Nautical twilight" value={`${f.event(sun.nautical.dawn, 'all night', '—')} – ${f.event(sun.nautical.dusk, 'all night', '—')}`} />
        <Row label="Astronomical twilight" value={`${f.event(sun.astronomical.dawn, 'all night', '—')} – ${f.event(sun.astronomical.dusk, 'all night', '—')}`} />
      </dl>
      <figure className="mt-1 flex flex-col gap-1">
        <DayLengthCurve days={year} today={today} fmtLen={hmShort} fmtDate={fmtDate} />
        <figcaption className="text-xs text-muted-foreground">
          Hours of daylight in {city.name} through {today.slice(0, 4)}, on a 0–24 hour scale. <Extremes year={year} fmtDate={fmtDate} />
        </figcaption>
      </figure>
      {agree !== null && (
        <p className="text-xs text-muted-foreground">
          Cross-check: Open-Meteo puts sunrise at {w.daily.sunrise[i].slice(11)}; {agree === 0 ? 'this page’s own calculation agrees to the minute.' : `this page’s own calculation is ${agree} min off.`}
        </p>
      )}
    </section>
  )
}

/** "Longest: 15h 06m on Jun 21. Shortest: 9h 15m on Dec 21." (the dots on the curve) */
function Extremes({ year, fmtDate }: { year: { ymd: string; hours: number }[]; fmtDate: (ymd: string) => string }) {
  const max = year.reduce((a, b) => (b.hours > a.hours ? b : a))
  const min = year.reduce((a, b) => (b.hours < a.hours ? b : a))
  if (max.hours >= 24 || min.hours <= 0) {
    const up = year.filter((d) => d.hours >= 24).length
    const down = year.filter((d) => d.hours <= 0).length
    return (
      <>
        {up > 0 && <>The sun never sets on {up} days. </>}
        {down > 0 && <>It never rises on {down}.</>}
      </>
    )
  }
  return (
    <>
      Longest: {hmShort(max.hours)} on {fmtDate(max.ymd)}. Shortest: {hmShort(min.hours)} on {fmtDate(min.ymd)}.
    </>
  )
}

/** "6:45 am" → "06:45" (for comparing with Open-Meteo's local ISO strings). */
function toHHMM(t: string): string {
  const [hm2, ap] = t.split(' ')
  let [h, mm] = hm2.split(':').map(Number)
  if (ap === 'pm' && h !== 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function MoonSection({ city, now, f }: { city: City; now: number; f: Fmt }) {
  const moon = useMemo(() => moonNow(now), [now])
  const { next } = useMemo(() => phasesAround(now, 4), [now])
  const nextFull = next.find((e) => e.kind === 'full')!
  const nextNew = next.find((e) => e.kind === 'new')!
  const daysTo = (t: number) => Math.round((t - now) / 86400_000)
  const soon = next[0]
  const soonDays = (soon.at - now) / 86400_000
  return (
    <section className="flex flex-col gap-3">
      <SectionHead aside="computed; Meeus, ch. 49">Moon</SectionHead>
      <div className="flex items-start gap-5">
        <MoonGlyph phaseAngle={moon.phaseAngle} south={city.lat < 0} />
        <Lead>
          {/^(New|Full|First|Last)/.test(moon.name) ? <>{moon.name === 'New moon' ? 'A new moon' : moon.name === 'Full moon' ? 'The moon is full' : `The moon is at ${moon.name.toLowerCase()}`}</> : <>A {moon.name.toLowerCase()} moon</>}
          ,{' '}
          <Num tip={<>Illuminated fraction of the disc: {(moon.illumination * 100).toFixed(1)}%</>}>{Math.round(moon.illumination * 100)}%</Num> lit and{' '}
          <Num tip={<>{moon.age.toFixed(2)} days since the new moon</>}>{moon.age.toFixed(1)} days</Num> old.{' '}
          {soonDays < 1 ? (
            <>
              {PHASE_NAMES[soon.kind]} arrives at {f.time(soon.at)} {f.ymd(soon.at) === f.ymd(now) ? 'today' : 'tomorrow'}.
            </>
          ) : (
            <>
              It will be full {daysTo(nextFull.at) <= 1 ? 'tomorrow' : <>in <Num>{daysTo(nextFull.at)} days</Num></>}, on {f.day(nextFull.at)}
              {nextNew.at < nextFull.at ? <>, after the new moon on {f.day(nextNew.at)}</> : null}.
            </>
          )}
          {city.lat < 0 && <> Seen from the southern hemisphere, it waxes from the left.</>}
        </Lead>
      </div>
      <dl>
        {next.map((e) => (
          <Row key={e.at} label={PHASE_NAMES[e.kind]} value={`${f.day(e.at)}, ${f.time(e.at)}`} />
        ))}
      </dl>
    </section>
  )
}

function TideSection({ city, tides, error }: { city: City; tides?: Tide[]; error?: string }) {
  if (city.id !== 'nyc') {
    return (
      <section className="flex flex-col gap-3">
        <SectionHead>Tides</SectionHead>
        <p className="text-sm text-muted-foreground">NOAA publishes tide predictions for United States stations only, so there is no table for {city.name}.</p>
      </section>
    )
  }
  if (!tides) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHead aside="NOAA · The Battery">Tides</SectionHead>
        <p className="text-sm text-muted-foreground">{error ? `NOAA’s tide service didn’t answer (${error}).` : 'Asking NOAA…'}</p>
      </section>
    )
  }
  const nowLocal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(Date.now())
  const upcoming = tides.filter((t) => t.t > nowLocal)
  const nextHigh = upcoming.find((t) => t.type === 'H')
  const nextLow = upcoming.find((t) => t.type === 'L')
  const clock = (s: string) => {
    const h = Number(s.slice(11, 13))
    return `${h % 12 === 0 ? 12 : h % 12}:${s.slice(14, 16)} ${h < 12 ? 'am' : 'pm'}`
  }
  const dayLabel = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
  const range = upcoming.length >= 2 ? Math.abs(upcoming[0].v - upcoming[1].v) : null
  const days = [...new Set(upcoming.slice(0, 8).map((t) => t.t.slice(0, 10)))].slice(0, 2)
  return (
    <section className="flex flex-col gap-3">
      <SectionHead aside="NOAA · The Battery, station 8518750">Tides</SectionHead>
      {nextHigh && nextLow && (
        <Lead>
          {nextHigh.t < nextLow.t ? 'The tide is rising.' : 'The tide is falling.'} Next high water at{' '}
          <Num tip={<>{nextHigh.v.toFixed(3)} ft above mean lower low water</>}>{clock(nextHigh.t)}</Num>, {nextHigh.v.toFixed(1)} ft; next low at{' '}
          <Num tip={<>{nextLow.v.toFixed(3)} ft above MLLW</>}>{clock(nextLow.t)}</Num>, {nextLow.v.toFixed(1)} ft
          {range !== null && <>, a swing of {range.toFixed(1)} ft</>}.
        </Lead>
      )}
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {days.map((day) => (
          <div key={day}>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">{dayLabel(day)}</div>
            <dl>
              {tides
                .filter((t) => t.t.startsWith(day))
                .map((t) => (
                  <Row key={t.t} label={t.type === 'H' ? 'High' : 'Low'} value={clock(t.t)} note={`${t.v.toFixed(1)} ft`} strong={t.type === 'H'} />
                ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

const SKY: Record<string, string> = {
  clear: 'Fair',
  'partly cloudy': 'Some cloud',
  overcast: 'Overcast',
  foggy: 'Fog',
  drizzly: 'Drizzle',
  rainy: 'Rain',
  snowy: 'Snow',
  showery: 'Showers',
  'snow showers': 'Snow showers',
  stormy: 'Thunderstorms',
}
function feel(maxC: number): string {
  if (maxC < 0) return 'bitter'
  if (maxC < 6) return 'cold'
  if (maxC < 12) return 'cool'
  if (maxC < 20) return 'mild'
  if (maxC < 27) return 'warm'
  return 'hot'
}

function WeekSection({ w, today, unit }: { w: Weather; today: string; unit: Unit }) {
  const start = Math.max(0, w.daily.time.indexOf(today))
  const days = w.daily.time.slice(start, start + 7).map((ymd, k) => ({
    ymd,
    code: w.daily.code[start + k],
    max: w.daily.max[start + k],
    min: w.daily.min[start + k],
    pop: w.daily.rainChance[start + k] ?? 0,
    rain: w.daily.rain[start + k] ?? 0,
  }))
  const warmest = days.reduce((a, b) => (b.max > a.max ? b : a))
  const wet = days.filter((x) => x.pop >= 50)
  const name = (ymd: string) => (ymd === today ? 'today' : new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }))
  return (
    <section className="flex flex-col gap-3">
      <SectionHead aside="Open-Meteo">The week</SectionHead>
      <Lead>
        Warmest {name(warmest.ymd)} at <Num tip={<>temperature_2m_max: {warmest.max} °C</>}>{degOf(warmest.max, unit)}</Num>.{' '}
        {wet.length === 0 ? (
          <>No day looks more likely wet than dry.</>
        ) : wet.length === 1 ? (
          <>Rain is more likely than not on {name(wet[0].ymd)} only.</>
        ) : (
          <>
            Rain is more likely than not on <Num>{wet.length}</Num> days, starting {name(wet[0].ymd)}.
          </>
        )}
      </Lead>
      <ul className="flex flex-col">
        {days.map((x) => {
          const dt = new Date(`${x.ymd}T12:00:00Z`)
          const sky = SKY[weatherWords(x.code)] ?? 'Mixed'
          return (
            <li key={x.ymd} className="grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border/70 py-1.5 text-sm last:border-b-0">
              <span className={cn('tabular-nums', x.ymd === today ? 'font-semibold' : 'text-foreground/85')}>
                {dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} {dt.getUTCDate()}
              </span>
              <span className="truncate">
                {sky} and {feel(x.max)}
                {x.pop >= 20 && <span className="text-muted-foreground"> · rain {x.pop}%</span>}
              </span>
              <span className="text-right tabular-nums">
                <span className="text-muted-foreground">{degOf(x.min, unit)}</span> / <span className="font-medium">{degOf(x.max, unit)}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DaysSection({ today, now, f }: { today: string; now: number; f: Fmt }) {
  const year = Number(today.slice(0, 4))
  const doy = dayOfYear(today)
  const total = isLeap(year) ? 366 : 365
  const season = nextSeason(now)
  const toSeason = Math.ceil((season.at - now) / 86400_000)
  return (
    <section className="flex flex-col gap-3">
      <SectionHead>Days</SectionHead>
      <Lead>
        Day <Num>{doy}</Num> of {total}, with <Num>{total - doy}</Num> left in {year}. The {season.name} is{' '}
        {toSeason <= 1 ? 'tomorrow' : <>in <Num tip={<>{new Date(season.at).toISOString().replace('T', ' ').slice(0, 16)} UTC (Meeus mean value)</>}>{toSeason} days</Num></>}.
      </Lead>
      <dl>
        <Row label="Day of the year" value={doy} />
        <Row label="ISO week" value={isoWeek(today)} />
        <Row label="Year elapsed" value={`${((doy / total) * 100).toFixed(1)}%`} />
        <Row label={season.name} value={`${f.day(season.at)}, ${f.time(season.at)}`} />
      </dl>
    </section>
  )
}

function HistorySection({ month, day }: { month: number; day: number }) {
  const otd = useOnThisDay(month, day)
  let body: ReactNode
  if (!otd.data) body = <p className="text-sm text-muted-foreground">{otd.error ? `Wikipedia’s “On this day” didn’t answer (${otd.error}).` : 'Looking it up…'}</p>
  else {
    const picks = spread(otd.data, 5)
    body = (
      <ol className="flex flex-col gap-2.5">
        {picks.map((e) => (
          <li key={`${e.year}-${e.text.slice(0, 20)}`} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 text-sm">
            <span className="font-semibold tabular-nums">{e.year}</span>
            <span className="leading-relaxed text-foreground/85">
              {e.text}{' '}
              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer" className="text-xs whitespace-nowrap text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  Read
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionHead aside="Wikipedia · On this day">On this day</SectionHead>
      {body}
    </section>
  )
}
