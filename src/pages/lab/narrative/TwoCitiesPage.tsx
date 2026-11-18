import { type ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Num, StatusDot } from '@/features/lab/forecast/glyphs'
import {
  aqiCategory,
  clockWord,
  conditionWord,
  deg,
  degDelta,
  duration,
  parseAir,
  parseForecast,
  rain,
  skyWord,
  speed,
  weekday,
  windWord,
  type AirHour,
  type Forecast,
  type Unit,
} from '@/features/lab/forecast/model'
import { LoadGate } from '@/features/lab/LabKit'
import { InlineTrend } from '@/features/lab/narrative/glyphs'
import { NarrativeHeader, countWord, joinList } from '@/features/lab/narrative/kit'
import { airQualityUrl, CITIES, openMeteoUrl, type City } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Two Cities: a parallel text. Both cities are written with the same
 * sentence templates, so the columns line up phrase by phrase; the gutter
 * between them states the difference and leans toward the city that has
 * more of it. The closing paragraph ranks the differences.
 */

const PATH = '/lab/narrative/two-cities'
const A_COLOR = 'var(--series-1)'
const B_COLOR = 'var(--series-2)'

export function TwoCitiesPage() {
  const q = useSearchParams()
  const a = CITIES.find((c) => c.id === q.get('a')) ?? CITIES[0]
  const b = CITIES.find((c) => c.id === q.get('b') && c.id !== a.id) ?? CITIES.find((c) => c.id !== a.id && c.id === 'london') ?? CITIES.find((c) => c.id !== a.id)!
  const set = (na: string, nb: string) => navigate(`${PATH}?a=${na}&b=${nb}`)
  const unitQ = q.get('unit')
  const unit: Unit = unitQ === 'f' || unitQ === 'c' ? unitQ : a.id === 'nyc' || b.id === 'nyc' ? 'f' : 'c'

  const fa = useLiveData(openMeteoUrl(a), { parse: parseForecast, refreshMs: 15 * 60_000 })
  const fb = useLiveData(openMeteoUrl(b), { parse: parseForecast, refreshMs: 15 * 60_000 })
  const aa = useLiveData(airQualityUrl(a), { parse: parseAir })
  const ab = useLiveData(airQualityUrl(b), { parse: parseAir })

  return (
    <div className="flex flex-col gap-8">
      <NarrativeHeader id="two-cities" feeds={[fa, fb, aa, ab]} href="https://open-meteo.com/" />
      <div className="flex flex-wrap items-end gap-3">
        <CityPick id="tc-a" label="First city" value={a.id} exclude={b.id} color={A_COLOR} onChange={(v) => set(v, b.id)} />
        <Button variant="ghost" size="icon" aria-label="Swap cities" onClick={() => set(b.id, a.id)}>
          <ArrowLeftRight />
        </Button>
        <CityPick id="tc-b" label="Second city" value={b.id} exclude={a.id} color={B_COLOR} onChange={(v) => set(a.id, v)} />
        <Segmented
          aria-label="Temperature unit"
          value={unit}
          onChange={(u) => navigate(`${PATH}?a=${a.id}&b=${b.id}&unit=${u}`)}
          options={[
            { value: 'c', label: '°C' },
            { value: 'f', label: '°F' },
          ]}
        />
      </div>
      <LoadGate feeds={[fa, fb]} label={`Reading the sky over ${a.name} and ${b.name}`}>
        {() => <Parallel a={a} b={b} fa={fa.data!} fb={fb.data!} airA={aa.data} airB={ab.data} unit={unit} />}
      </LoadGate>
    </div>
  )
}

function CityPick({ id, label, value, exclude, color, onChange }: { id: string; label: string; value: string; exclude: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-44">
        {CITIES.filter((c) => c.id !== exclude).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

// ── One city's facts, computed the same way for both ────────────────────────

interface Facts {
  city: City
  f: Forecast
  nowIdx: number
  next: Forecast['hours']
  hour: number
  temp: number
  feels: number
  hi: number
  lo: number
  rainPeak: { pop: number; time: string }
  rainTotal: number
  windNow: number
  windPeak: number
  aqi?: number
  daylight: number
  sunrise: string
  sunset: string
  weekMean: number
  wetDays: number
}

function facts(city: City, f: Forecast, air?: AirHour[]): Facts {
  const nowKey = `${f.current.time.slice(0, 13)}:00`
  const nowIdx = Math.max(0, f.hours.findIndex((h) => h.time === nowKey))
  const next = f.hours.slice(nowIdx, nowIdx + 24)
  const today = f.days[1]
  const peak = next.reduce((p, h) => (h.pop > p.pop ? h : p), next[0])
  const week = f.days.slice(1, 8)
  return {
    city,
    f,
    nowIdx,
    next,
    hour: Number(f.current.time.slice(11, 13)),
    temp: f.current.temp,
    feels: f.current.feels,
    hi: today.max,
    lo: today.min,
    rainPeak: { pop: peak.pop, time: peak.time },
    rainTotal: next.reduce((s, h) => s + h.precip, 0),
    windNow: f.current.wind,
    windPeak: Math.max(...next.map((h) => h.wind)),
    aqi: air?.find((x) => x.time === nowKey)?.aqi ?? undefined,
    daylight: today.daylight,
    sunrise: today.sunrise,
    sunset: today.sunset,
    weekMean: week.reduce((s, d) => s + (d.max + d.min) / 2, 0) / week.length,
    wetDays: week.filter((d) => d.precip >= 1).length,
  }
}

// ── Parallel sentences ──────────────────────────────────────────────────────

function verbFor(hour: number): string {
  if (hour < 5) return 'sits in the dark at'
  if (hour < 10) return 'wakes to'
  if (hour < 17) return 'is at'
  if (hour < 21) return 'ends the day at'
  return 'is at'
}

interface Topic {
  kicker: string
  a: ReactNode
  b: ReactNode
  /** positive when A has more of the thing; `more` names it */
  diff: number
  scale: number
  gutter: ReactNode
}

function Parallel({ a, b, fa, fb, airA, airB, unit }: { a: City; b: City; fa: Forecast; fb: Forecast; airA?: AirHour[]; airB?: AirHour[]; unit: Unit }) {
  const A = facts(a, fa, airA)
  const B = facts(b, fb, airB)
  const T = (x: Facts, c: number, field: string) => <Num tip={`${x.city.name}, Open-Meteo ${field}: ${c} °C`}>{deg(c, unit)}</Num>
  const who = (d: number) => (d > 0 ? a.name : b.name)
  const tzGap = hoursAhead(A, B)

  const topics: Topic[] = []

  // Now
  const nowS = (x: Facts) => (
    <>
      At <Num tip={x.f.current.time.replace('T', ' ')}>{clockWord(x.f.current.time)}</Num>, {x.city.name} {verbFor(x.hour)} {T(x, x.temp, 'temperature_2m')}
      {x.hour < 5 || x.hour >= 21 ? ' and' : ','} {conditionWord(x.f.current.code)}.
    </>
  )
  const dT = A.temp - B.temp
  topics.push({
    kicker: 'Right now',
    a: nowS(A),
    b: nowS(B),
    diff: dT,
    scale: 15,
    gutter:
      Math.abs(dT) < 1 ? (
        <>the same temperature</>
      ) : (
        <>
          {who(dT)} is <Num tip={`${A.temp} vs ${B.temp} °C`}>{degDelta(dT, unit)} warmer</Num>
        </>
      ),
  })

  // Clocks
  topics.push({
    kicker: 'Daylight',
    a: (
      <>
        Sunrise came at <Num tip={A.sunrise}>{clockWord(A.sunrise)}</Num> and sunset {A.f.current.time > A.sunset ? 'came' : 'comes'} at <Num tip={A.sunset}>{clockWord(A.sunset)}</Num>: {daylightWords(A.daylight)}.
      </>
    ),
    b: (
      <>
        Sunrise came at <Num tip={B.sunrise}>{clockWord(B.sunrise)}</Num> and sunset {B.f.current.time > B.sunset ? 'came' : 'comes'} at <Num tip={B.sunset}>{clockWord(B.sunset)}</Num>: {daylightWords(B.daylight)}.
      </>
    ),
    diff: (A.daylight - B.daylight) / 3600,
    scale: 6,
    gutter: (
      <>
        {Math.abs(A.daylight - B.daylight) < 600 ? 'the same daylight' : <>{who(A.daylight - B.daylight)} gets <Num tip="daylight_duration difference">{duration(Math.abs(A.daylight - B.daylight))}</Num> more light</>}
        {tzGap !== 0 && (
          <span className="block text-muted-foreground">
            {a.name}’s clocks run {Math.abs(tzGap)} h {tzGap > 0 ? 'behind' : 'ahead'}
          </span>
        )}
      </>
    ),
  })

  // Feels
  const feelsS = (x: Facts) => {
    const g = x.feels - x.temp
    return Math.abs(g) < 2 ? (
      <>It feels like what it is{x.windNow >= 20 ? <>, despite a {windWord(x.windNow)}</> : <>, with a {windWord(x.windNow)}</>}.</>
    ) : g < 0 ? (
      <>
        The {x.windNow >= 15 ? 'wind' : 'damp'} makes it feel like {T(x, x.feels, 'apparent_temperature')}.
      </>
    ) : (
      <>The humidity makes it feel like {T(x, x.feels, 'apparent_temperature')}.</>
    )
  }
  const dF = A.feels - B.feels
  topics.push({
    kicker: 'Feels like',
    a: feelsS(A),
    b: feelsS(B),
    diff: dF,
    scale: 15,
    gutter: Math.abs(dF) < 1 ? <>they feel the same</> : <>{who(dF)} feels <Num tip={`${A.feels} vs ${B.feels} °C`}>{degDelta(dF, unit)} warmer</Num></>,
  })

  // Today's range
  const rangeS = (x: Facts) => (
    <>
      Today runs from {T(x, x.lo, 'temperature_2m_min')} to {T(x, x.hi, 'temperature_2m_max')}
      <InlineTrend points={x.next.map((h) => ({ label: h.time.slice(11, 16), value: h.temp, text: deg(h.temp, unit) }))} summary={`${x.city.name}, next 24 hours`} />
      {x.hi - x.lo >= 10 ? ', a big swing' : x.hi - x.lo <= 3 ? ', barely moving' : ''}.
    </>
  )
  const swingA = A.hi - A.lo
  const swingB = B.hi - B.lo
  topics.push({
    kicker: 'Today',
    a: rangeS(A),
    b: rangeS(B),
    diff: A.hi - B.hi,
    scale: 15,
    gutter: (
      <>
        {Math.abs(A.hi - B.hi) < 1 ? 'the same high' : <>{who(A.hi - B.hi)}’s high is <Num>{degDelta(A.hi - B.hi, unit)}</Num> warmer</>}
        <span className="block text-muted-foreground">
          swings: {degDelta(swingA, unit)} vs {degDelta(swingB, unit)}
        </span>
      </>
    ),
  })

  // Rain
  const rainS = (x: Facts) =>
    x.rainPeak.pop >= 50 ? (
      <>
        Rain is likely, peaking at <Num tip={`precipitation_probability at ${x.rainPeak.time}`}>{x.rainPeak.pop}%</Num>, with <Num tip={`24h sum: ${x.rainTotal.toFixed(1)} mm`}>{rain(x.rainTotal, unit)}</Num> to come.
      </>
    ) : x.rainPeak.pop >= 20 ? (
      <>
        A shower is possible, at <Num tip={`peak precipitation_probability`}>{x.rainPeak.pop}%</Num> at most.
      </>
    ) : (
      <>
        It stays dry: the chance of rain never tops <Num tip="peak precipitation_probability">{Math.max(5, Math.ceil(x.rainPeak.pop / 5) * 5)}%</Num>.
      </>
    )
  const dR = A.rainPeak.pop - B.rainPeak.pop
  topics.push({
    kicker: 'Rain',
    a: rainS(A),
    b: rainS(B),
    diff: dR,
    scale: 100,
    gutter: Math.abs(dR) < 10 ? <>about as dry</> : <>{who(dR)} is <Num tip="Peak hourly chance, next 24 h">{Math.abs(dR)} points</Num> likelier to get wet</>,
  })

  // Wind
  const windS = (x: Facts) => (
    <>
      The wind is a {windWord(x.windNow)} at <Num tip={`wind_speed_10m: ${x.windNow} km/h`}>{speed(x.windNow, unit)}</Num>
      {x.windPeak - x.windNow >= 8 ? (
        <>
          , rising to <Num tip="max wind_speed_10m, next 24 h">{speed(x.windPeak, unit)}</Num>
        </>
      ) : (
        ''
      )}
      .
    </>
  )
  const dW = A.windPeak - B.windPeak
  topics.push({
    kicker: 'Wind',
    a: windS(A),
    b: windS(B),
    diff: dW,
    scale: 40,
    gutter: Math.abs(dW) < 5 ? <>about as breezy</> : <>{who(dW)} is windier, by <Num>{speed(Math.abs(dW), unit)}</Num></>,
  })

  // Air
  if (A.aqi != null && B.aqi != null) {
    const airS = (x: Facts) => {
      const cat = aqiCategory(x.aqi!)
      return (
        <>
          The air is <StatusDot tone={cat.tone} /> <span className="font-semibold text-foreground">{cat.word}</span> (US AQI <Num tip="Open-Meteo us_aqi">{x.aqi}</Num>).
        </>
      )
    }
    const dA = A.aqi - B.aqi
    topics.push({
      kicker: 'Air',
      a: airS(A),
      b: airS(B),
      diff: -dA,
      scale: 100,
      gutter: Math.abs(dA) < 8 ? <>about as clean</> : <>{who(-dA)} breathes cleaner air, by <Num>{Math.abs(dA)} AQI</Num></>,
    })
  }

  // Week
  const weekS = (x: Facts) => {
    const days = x.f.days.slice(1, 8)
    const iWarm = days.reduce((m, d, i) => (d.max > days[m].max ? i : m), 0)
    return (
      <>
        The week peaks {iWarm === 0 ? 'today' : iWarm === 1 ? 'tomorrow' : <>on {weekday(days[iWarm].date)}</>} at {T(x, days[iWarm].max, 'temperature_2m_max')}, with rain on{' '}
        <Num tip="days with 1 mm or more">{countWord(x.wetDays)}</Num> of seven days.
      </>
    )
  }
  const dWk = A.weekMean - B.weekMean
  topics.push({
    kicker: 'The week',
    a: weekS(A),
    b: weekS(B),
    diff: dWk,
    scale: 15,
    gutter: Math.abs(dWk) < 1 ? <>an even week</> : <>{who(dWk)}’s week runs <Num tip="Mean of daily (max+min)/2, 7 days">{degDelta(dWk, unit)} warmer</Num></>,
  })

  return (
    <article className="flex flex-col">
      {/* Column heads */}
      <div className="sticky top-16 z-[1] hidden grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] gap-x-8 border-b bg-background/90 py-3 backdrop-blur lg:grid">
        <ColumnHead city={a} color={A_COLOR} x={A} right />
        <div className="text-center text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">The difference</div>
        <ColumnHead city={b} color={B_COLOR} x={B} />
      </div>
      {topics.map((t) => (
        <section key={t.kicker} className="grid grid-cols-1 gap-x-8 gap-y-2 border-b py-6 lg:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] lg:py-7">
          <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:hidden">{t.kicker}</div>
          <Side color={A_COLOR} name={a.name} className="lg:text-right">
            {t.a}
          </Side>
          <Gutter t={t} />
          <Side color={B_COLOR} name={b.name}>
            {t.b}
          </Side>
        </section>
      ))}
      <Closing A={A} B={B} unit={unit} />
    </article>
  )
}

function ColumnHead({ city, color, x, right }: { city: City; color: string; x: Facts; right?: boolean }) {
  return (
    <div className={cn('flex items-baseline gap-2', right && 'justify-end')}>
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
      <span className="text-lg font-semibold tracking-tight">{city.name}</span>
      <span className="text-sm text-muted-foreground tabular-nums">{clockWord(x.f.current.time)}</span>
    </div>
  )
}

function Side({ color, name, children, className }: { color: string; name: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-base leading-relaxed text-pretty text-foreground/85 sm:text-[17px] sm:leading-8', className)}>
      <span className="mr-1.5 inline-flex items-center gap-1.5 align-[0.1em] text-xs font-semibold text-muted-foreground lg:hidden">
        <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
        {name}
      </span>
      {children}
    </div>
  )
}

/** The gutter leans toward whichever city has more: a short bar from the center, in that city's color. */
function Gutter({ t }: { t: Topic }) {
  const share = Math.min(1, Math.abs(t.diff) / t.scale)
  const left = t.diff > 0
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-snug lg:items-center lg:bg-transparent lg:px-0 lg:py-1 lg:text-center">
      <div className="hidden text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:block">{t.kicker}</div>
      <div aria-hidden className="relative hidden h-1.5 w-full lg:block">
        <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
        {share > 0.02 && (
          <span
            className="absolute inset-y-0 rounded-full"
            style={{ background: left ? A_COLOR : B_COLOR, width: `${share * 50}%`, ...(left ? { right: '50%' } : { left: '50%' }) }}
          />
        )}
      </div>
      <div className="text-foreground/80">{t.gutter}</div>
    </div>
  )
}

function Closing({ A, B, unit }: { A: Facts; B: Facts; unit: Unit }) {
  // Each difference scaled by what counts as "a lot" for it.
  const cands = [
    { key: 'temperature', size: Math.abs(A.temp - B.temp) / 8, words: <>temperature: {degDelta(A.temp - B.temp, unit)} apart right now</> },
    { key: 'daylight', size: Math.abs(A.daylight - B.daylight) / 7200, words: <>daylight: {duration(Math.abs(A.daylight - B.daylight))} more in {A.daylight > B.daylight ? A.city.name : B.city.name}</> },
    { key: 'rain', size: Math.abs(A.rainPeak.pop - B.rainPeak.pop) / 50, words: <>rain: {Math.max(A.rainPeak.pop, B.rainPeak.pop)}% odds in {A.rainPeak.pop > B.rainPeak.pop ? A.city.name : B.city.name} against {Math.min(A.rainPeak.pop, B.rainPeak.pop)}%</> },
    { key: 'wind', size: Math.abs(A.windPeak - B.windPeak) / 20, words: <>wind, stronger in {A.windPeak > B.windPeak ? A.city.name : B.city.name}</> },
    { key: 'clock', size: Math.abs(A.hour - B.hour) >= 6 ? 1.2 : 0, words: <>the clock itself: it’s {partWord(A.hour)} in {A.city.name} and {partWord(B.hour)} in {B.city.name}</> },
    ...(A.aqi != null && B.aqi != null ? [{ key: 'air', size: Math.abs(A.aqi - B.aqi) / 50, words: <>the air, cleaner in {A.aqi < B.aqi ? A.city.name : B.city.name}</> }] : []),
  ].sort((x, y) => y.size - x.size)
  const top = cands.filter((c) => c.size >= 0.5).slice(0, 2)
  const alike = cands.at(-1)!
  return (
    <section className="mx-auto mt-10 max-w-[64ch] text-xl leading-snug font-medium tracking-tight text-pretty sm:text-2xl sm:leading-snug">
      <div className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">What’s most different</div>
      {top.length ? (
        <p>
          Today {A.city.name} and {B.city.name} differ most in {joinList(top.map((c) => <span key={c.key}>{c.words}</span>))}. They’re most alike in {alike.key}.
        </p>
      ) : (
        <p>
          Today {A.city.name} and {B.city.name} are close to twins: no difference here is big enough to matter, and they’re most alike in {alike.key}.
        </p>
      )}
      <p className="mt-3 text-sm font-normal tracking-normal text-muted-foreground">
        Differences are ranked after scaling each by what counts as a lot: 8° of temperature, two hours of daylight, 50 points of rain chance, 20 km/h of wind, 50 AQI.{' '}
        {skyWord(A.f.hours[A.nowIdx].cloud) === skyWord(B.f.hours[B.nowIdx].cloud) ? <>Both have {skyWord(A.f.hours[A.nowIdx].cloud)} right now.</> : null}
      </p>
    </section>
  )
}

function partWord(h: number): string {
  if (h < 5) return 'the middle of the night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function daylightWords(s: number): string {
  if (s < 60) return 'no daylight at all'
  if (s > 86_340) return 'the sun never sets'
  return `${duration(s)} of daylight`
}

/** Hours A's local clock is behind B's (negative: ahead), from the two "current" local timestamps. */
function hoursAhead(A: Facts, B: Facts): number {
  const ta = Date.parse(A.f.current.time + 'Z')
  const tb = Date.parse(B.f.current.time + 'Z')
  return Math.round((tb - ta) / 3600_000)
}
