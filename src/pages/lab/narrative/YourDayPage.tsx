import { useRef, useState, type ReactNode } from 'react'
import { Droplets, Sun, Sunrise, Sunset, Table2, Wind } from 'lucide-react'

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
  hourWord,
  parseAir,
  parseForecast,
  skyWord,
  speed,
  uvWord,
  type AirHour,
  type Forecast,
  type Hour,
  type Unit,
} from '@/features/lab/forecast/model'
import { LoadGate } from '@/features/lab/LabKit'
import { NarrativeHeader, joinList } from '@/features/lab/narrative/kit'
import { airQualityUrl, CITIES, openMeteoUrl, type City } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Your Day: the forecast in the second person, as a timeline. Only the hours
 * where something happens get a line (now, the commute, rain arriving, the
 * warmest moment, sunset…), each written as what you'll feel and need. The
 * gutter is a chart: every line carries a dot for that hour's temperature on
 * the day's own range, so reading down traces the curve.
 */

const PATH = '/lab/narrative/your-day'

export function YourDayPage() {
  const asked = useSearchParams().get('city')
  const cityId = CITIES.some((c) => c.id === asked) ? asked! : 'nyc'
  const city = CITIES.find((c) => c.id === cityId)!
  const setCity = (id: string) => navigate(id === 'nyc' ? PATH : `${PATH}?city=${id}`)
  const [unitChoice, setUnit] = useState<Unit | null>(null)

  const wanted = useLiveData(openMeteoUrl(city), { parse: parseForecast, refreshMs: 15 * 60_000 })
  useLiveData(airQualityUrl(city), { parse: parseAir })
  const shownRef = useRef<City>(city)
  if (wanted.data) shownRef.current = city
  const shown = shownRef.current
  const forecast = useLiveData(openMeteoUrl(shown), { parse: parseForecast })
  const air = useLiveData(airQualityUrl(shown), { parse: parseAir })
  const unit: Unit = unitChoice ?? (shown.id === 'nyc' ? 'f' : 'c')

  return (
    <div className="flex flex-col gap-8">
      <NarrativeHeader id="your-day" feeds={[wanted, air]} href="https://open-meteo.com/" />
      <div className="flex flex-wrap items-center gap-3">
        <div className="sm:hidden">
          <Label htmlFor="yd-city" className="sr-only">
            City
          </Label>
          <NativeSelect id="yd-city" value={cityId} onChange={(e) => setCity(e.target.value)} className="w-44">
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
          onChange={setUnit}
          options={[
            { value: 'c', label: '°C' },
            { value: 'f', label: '°F' },
          ]}
        />
      </div>
      <LoadGate feeds={[forecast]} label={`Planning your day in ${shown.name}`}>
        {() => (
          <div className={cn('transition-opacity', shown.id !== city.id && 'opacity-50')}>
            <Day city={shown} f={forecast.data!} air={air.data} unit={unit} />
          </div>
        )}
      </LoadGate>
    </div>
  )
}

// ── The model: which hours earn a line ──────────────────────────────────────

interface Moment {
  time: string
  /** sort order within the same hour */
  order: number
  icon?: ReactNode
  text: ReactNode
  now?: boolean
}

const H = (t: string) => Number(t.slice(11, 13))
const sameHour = (a: string, b: string) => a.slice(0, 13) === b.slice(0, 13)

/** What to wear, from the feels-like temperature (°C). */
function wear(feels: number): string {
  if (feels < -8) return 'everything you own: coat, hat, gloves, scarf'
  if (feels < 0) return 'a heavy coat, a hat and gloves'
  if (feels < 5) return 'a warm coat and gloves'
  if (feels < 10) return 'a warm coat'
  if (feels < 15) return 'a jacket'
  if (feels < 19) return 'a light layer'
  if (feels < 25) return 'short sleeves'
  return 'as little as you can get away with'
}

function partLabel(time: string, today: string): string {
  const h = H(time)
  const tomorrow = time.slice(0, 10) > today
  if (h < 5) return tomorrow ? 'Overnight' : 'Before dawn'
  if (h < 12) return tomorrow ? 'Tomorrow morning' : 'This morning'
  if (h < 17) return tomorrow ? 'Tomorrow afternoon' : 'This afternoon'
  if (h < 21) return tomorrow ? 'Tomorrow evening' : 'This evening'
  return 'Tonight'
}

function Day({ city, f, air, unit }: { city: City; f: Forecast; air?: AirHour[]; unit: Unit }) {
  const [table, setTable] = useState(false)
  const today = f.days[1]
  const tomorrow = f.days[2]
  const todayDate = today.date
  const nowKey = `${f.current.time.slice(0, 13)}:00`
  const i0 = Math.max(0, f.hours.findIndex((h) => h.time === nowKey))
  // From now until tomorrow's 9 am (at least 18 hours, at most 30).
  const wake = f.hours.findIndex((h) => h.time === `${tomorrow.date}T09:00`)
  const iEnd = Math.min(f.hours.length - 1, Math.max(i0 + 18, Math.min(wake, i0 + 30)))
  const span = f.hours.slice(i0, iEnd + 1)
  const temps = span.map((h) => h.temp)
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const iHi = temps.indexOf(hi)
  const iLo = temps.indexOf(lo)
  const T = (c: number, field: string, time?: string) => (
    <Num tip={`Open-Meteo ${field}${time ? ` at ${time.replace('T', ' ')}` : ''}: ${c} °C`}>{deg(c, unit)}</Num>
  )
  const at = (t: string) => <Num tip={t.replace('T', ' ')}>{t.slice(0, 10) > todayDate && H(t) >= 5 ? `${hourWord(t)} tomorrow` : hourWord(t)}</Num>
  const moments: Moment[] = []
  const add = (m: Moment) => moments.push(m)
  const inSpan = (t: string) => t >= span[0].time && t <= span.at(-1)!.time

  // Now.
  const c = f.current
  const nowHour = span[0]
  const gap = c.feels - c.temp
  add({
    time: nowHour.time,
    order: 0,
    now: true,
    text: (
      <>
        Right now it’s {T(c.temp, 'temperature_2m')} and {conditionWord(c.code)}
        {Math.abs(gap) >= 2 ? <>, though it feels like {T(c.feels, 'apparent_temperature')}</> : null}. If you’re heading out, you’ll want{' '}
        <Num tip={`Chosen from the feels-like temperature, ${c.feels} °C`} className="font-normal">
          {wear(c.feels)}
        </Num>
        .
      </>
    ),
  })

  // Sun.
  for (const d of [today, tomorrow]) {
    if (d.daylight < 60 || d.daylight > 86_340) continue
    if (inSpan(d.sunrise.slice(0, 13) + ':00') && d.sunrise > c.time) {
      add({
        time: d.sunrise.slice(0, 13) + ':00',
        order: 1,
        icon: <Sunrise />,
        text: (
          <>
            The sun comes up at <Num tip={`sunrise: ${d.sunrise}`}>{clockWord(d.sunrise)}</Num>
            {d.date === tomorrow.date ? ' tomorrow' : ''}.
          </>
        ),
      })
    }
    if (inSpan(d.sunset.slice(0, 13) + ':00') && d.sunset > c.time) {
      const golden = new Date(new Date(d.sunset + 'Z').getTime() - 60 * 60_000).toISOString().slice(0, 16)
      add({
        time: d.sunset.slice(0, 13) + ':00',
        order: 5,
        icon: <Sunset />,
        text: (
          <>
            Sunset is at <Num tip={`sunset: ${d.sunset}`}>{clockWord(d.sunset)}</Num>
            {golden > c.time ? (
              <>
                ; the best light starts around <Num tip="One hour before sunset">{clockWord(golden)}</Num>
              </>
            ) : null}
            . After that you’ll be walking home in the dark.
          </>
        ),
      })
    }
  }
  if (today.daylight < 60 && inSpan(nowHour.time)) {
    add({ time: nowHour.time, order: 1, icon: <Sunset />, text: <>The sun won’t rise over {city.name} today.</> })
  }

  // Commutes.
  const commute = (hh: number, label: string) => {
    const h = span.find((x) => H(x.time) === hh && x.time > nowHour.time)
    if (!h) return
    const tip = h.pop >= 60 ? 'take an umbrella' : h.pop >= 30 ? 'an umbrella wouldn’t hurt' : null
    add({
      time: h.time,
      order: 2,
      text: (
        <>
          {label} {at(h.time)}? It’ll be {T(h.temp, 'temperature_2m', h.time)}
          {Math.abs(h.feels - h.temp) >= 2 ? <>, feeling like {T(h.feels, 'apparent_temperature', h.time)}</> : null}: {wear(h.feels)}
          {tip ? (
            <>
              , and with a <Num tip={`precipitation_probability at ${h.time}: ${h.pop}%`}>{h.pop}%</Num> chance of rain, {tip}
            </>
          ) : null}
          .
        </>
      ),
    })
  }
  commute(8, 'Out the door at')
  commute(18, 'Heading home at')

  // The warmest and coldest moments.
  if (hi - lo >= 2) {
    if (iHi > 0)
      add({
        time: span[iHi].time,
        order: 3,
        icon: <Sun />,
        text: (
          <>
            This is as warm as it gets: {T(hi, 'temperature_2m', span[iHi].time)}, {degDelta(hi - span[0].temp, unit)} warmer than now.
          </>
        ),
      })
    if (iLo > 0)
      add({
        time: span[iLo].time,
        order: 3,
        text: (
          <>
            The coldest point{H(span[iLo].time) < 8 || H(span[iLo].time) >= 20 ? ' of the night' : ''}: {T(lo, 'temperature_2m', span[iLo].time)}
            {span[iLo].feels < lo - 2 ? <> (feels like {T(span[iLo].feels, 'apparent_temperature', span[iLo].time)})</> : null}
            {lo <= 0 ? <>, below freezing, so watch for ice</> : null}.
          </>
        ),
      })
  }

  // Rain: arrivals and departures.
  for (let i = 1; i < span.length; i++) {
    const wet = span[i].pop >= 50
    const was = span[i - 1].pop >= 50
    if (wet && !was) {
      const run = span.slice(i).findIndex((h) => h.pop < 50)
      const end = run === -1 ? undefined : span[i + run]
      const total = span.slice(i, end ? i + run : undefined).reduce((s, h) => s + h.precip, 0)
      const snow = span[i].temp <= 1
      add({
        time: span[i].time,
        order: 4,
        icon: <Droplets />,
        text: (
          <>
            {snow ? 'Snow or sleet' : 'Rain'} moves in (<Num tip={`precipitation_probability: ${span[i].pop}%`}>{span[i].pop}%</Num> chance)
            {end ? <> and sticks around until about {at(end.time)}</> : <> and is still falling at the end of this timeline</>}
            {total >= 0.5 ? (
              <>
                , adding up to <Num tip={`precipitation, summed: ${total.toFixed(1)} mm`}>{unit === 'f' ? `${(total / 25.4).toFixed(2)} in` : `${total.toFixed(1)} mm`}</Num>
              </>
            ) : null}
            . Take an umbrella.
          </>
        ),
      })
    }
    if (!wet && was && i > 1) {
      add({ time: span[i].time, order: 4, text: <>The rain should be easing off by now.</> })
    }
  }
  if (!span.some((h) => h.pop >= 30)) {
    add({
      time: span[0].time,
      order: 6,
      text: (
        <>
          No rain to worry about: the chance stays under <Num tip={`Highest hourly chance: ${Math.max(...span.map((h) => h.pop))}%`}>{Math.max(5, Math.ceil(Math.max(...span.map((h) => h.pop)) / 5) * 5)}%</Num> for your
          whole day.
        </>
      ),
    })
  }

  // UV and wind.
  const uvPeak = span.reduce((b, h) => (h.uv > b.uv ? h : b), span[0])
  if (uvPeak.uv >= 3 && uvPeak.time > nowHour.time)
    add({
      time: uvPeak.time,
      order: 3,
      icon: <Sun />,
      text: (
        <>
          UV peaks at <Num tip={`uv_index: ${uvPeak.uv}`}>{Math.round(uvPeak.uv)}</Num> ({uvWord(uvPeak.uv)}){uvPeak.uv >= 6 ? <>: sunscreen and sunglasses</> : <>: sunglasses if it’s bright</>}.
        </>
      ),
    })
  const windPeak = span.reduce((b, h) => (h.wind > b.wind ? h : b), span[0])
  if (windPeak.wind >= 30 && windPeak.time > nowHour.time)
    add({
      time: windPeak.time,
      order: 3,
      icon: <Wind />,
      text: (
        <>
          The wind is at its strongest, <Num tip={`wind_speed_10m: ${windPeak.wind} km/h`}>{speed(windPeak.wind, unit)}</Num>
          {windPeak.wind >= 50 ? <>: hold onto your hat, and maybe your umbrella</> : <>, enough to make it feel colder</>}.
        </>
      ),
    })

  // Air, if it turns.
  if (air) {
    const a0 = air.find((a) => a.time === nowKey)
    const worst = air.filter((a) => inSpan(a.time) && a.aqi != null).reduce<AirHour | undefined>((b, a) => (!b || (a.aqi ?? 0) > (b.aqi ?? 0) ? a : b), undefined)
    if (worst && worst.aqi != null && a0?.aqi != null && aqiCategory(worst.aqi).word !== aqiCategory(a0.aqi).word && worst.time > nowKey) {
      const cat = aqiCategory(worst.aqi)
      add({
        time: worst.time,
        order: 4,
        text: (
          <>
            The air turns <StatusDot tone={cat.tone} /> <span className="font-semibold text-foreground">{cat.word}</span> (US AQI <Num tip={`us_aqi at ${worst.time}`}>{worst.aqi}</Num>)
            {cat.tone !== 'success' ? <>; if you run, run earlier</> : null}.
          </>
        ),
      })
    }
  }

  // Midnight and the morning after.
  const midnight = span.find((h) => h.time.slice(0, 10) > todayDate && H(h.time) === 0)
  if (midnight)
    add({
      time: midnight.time,
      order: 1,
      text: (
        <>
          By midnight it’s {T(midnight.temp, 'temperature_2m', midnight.time)} under {skyWord(midnight.cloud)}.
        </>
      ),
    })
  const wakeH = span.find((h) => h.time === `${tomorrow.date}T07:00`)
  if (wakeH) {
    const dHigh = tomorrow.max - today.max
    add({
      time: wakeH.time,
      order: 2,
      text: (
        <>
          You wake tomorrow to {T(wakeH.temp, 'temperature_2m', wakeH.time)}. The day tops out at{' '}
          <Num tip={`temperature_2m_max ${tomorrow.date}: ${tomorrow.max} °C`}>{deg(tomorrow.max, unit)}</Num>,{' '}
          {Math.abs(dHigh) < 1.5 ? 'much like today' : `${degDelta(dHigh, unit)} ${dHigh > 0 ? 'warmer' : 'colder'} than today`}.
        </>
      ),
    })
  }

  // Merge moments that land in the same hour, then group by part of the day.
  const sorted = moments.sort((a, b) => (a.time === b.time ? a.order - b.order : a.time < b.time ? -1 : 1))
  const rows: { time: string; now: boolean; icon?: ReactNode; parts: ReactNode[] }[] = []
  for (const m of sorted) {
    const last = rows.at(-1)
    if (last && sameHour(last.time, m.time)) {
      last.parts.push(m.text)
      last.icon ??= m.icon
      last.now ||= !!m.now
    } else rows.push({ time: m.time, now: !!m.now, icon: m.icon, parts: [m.text] })
  }
  const groups: { label: string; rows: typeof rows }[] = []
  for (const r of rows) {
    const label = r.now ? 'Now' : partLabel(r.time, todayDate)
    if (groups.at(-1)?.label === label) groups.at(-1)!.rows.push(r)
    else groups.push({ label, rows: [r] })
  }

  const hourOf = (t: string) => span.find((h) => sameHour(h.time, t)) ?? span[0]

  return (
    <article className="flex flex-col gap-8">
      <Summary city={city} span={span} lo={lo} hi={hi} iHi={iHi} unit={unit} todayDate={todayDate} />

      <div className="flex flex-col gap-8">
        <div className="-mb-6 hidden items-center gap-3 pl-[6.5rem] text-[11px] text-muted-foreground sm:flex">
          <span className="flex w-28 justify-between tabular-nums whitespace-nowrap" title="Each dot is that hour's temperature on today's range">
            <span>{deg(lo, unit)}</span>
            <span className="opacity-60">temp</span>
            <span>{deg(hi, unit)}</span>
          </span>
        </div>
        {groups.map((g) => (
          <section key={g.label + g.rows[0].time} className="flex flex-col gap-1">
            <h3 className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:pl-[6.5rem]">{g.label}</h3>
            <ol className="flex flex-col">
              {g.rows.map((r) => {
                const h = hourOf(r.time)
                return (
                  <li key={r.time} className="grid grid-cols-[3.25rem_1rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[4rem_1rem_7rem_minmax(0,64ch)]">
                    <div className={cn('pt-1 text-right text-sm tabular-nums', r.now ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{r.now ? 'Now' : hourWord(r.time)}</div>
                    {/* the spine */}
                    <div className="relative flex justify-center">
                      <span aria-hidden className="absolute inset-y-0 w-px bg-border" />
                      <span
                        aria-hidden
                        className={cn(
                          'relative mt-2 flex size-3 items-center justify-center rounded-full ring-4 ring-background',
                          r.now ? 'bg-primary' : r.icon ? 'bg-foreground' : 'bg-muted-foreground/60',
                        )}
                      />
                    </div>
                    {/* the gutter chart: this hour's temperature on the day's range */}
                    <TempTick h={h} lo={lo} hi={hi} unit={unit} className="hidden sm:block" />
                    <div className={cn('pb-6 text-base leading-relaxed text-pretty sm:text-[17px] sm:leading-8', r.now ? 'text-foreground' : 'text-foreground/85')}>
                      {r.icon && <span className="mr-1.5 inline-flex translate-y-[2px] text-muted-foreground [&_svg]:size-4">{r.icon}</span>}
                      {r.parts.map((p, i) => (
                        <span key={i}>
                          {i > 0 ? ' ' : ''}
                          {p}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setTable((t) => !t)} aria-expanded={table}>
          <Table2 />
          {table ? 'Hide the hours' : 'Every hour'}
        </Button>
        {table && <Hours span={span} unit={unit} />}
      </div>
    </article>
  )
}

function TempTick({ h, lo, hi, unit, className }: { h: Hour; lo: number; hi: number; unit: Unit; className?: string }) {
  const p = (h.temp - lo) / (hi - lo || 1)
  return (
    <div className={cn('relative mt-2.5 h-2', className)} title={`${hourWord(h.time)}: ${deg(h.temp, unit)}`}>
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chart-grid)]" />
      <span aria-hidden className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--series-1)]" style={{ left: `${p * 100}%` }} />
      {h.pop >= 50 && <span aria-hidden className="absolute -top-1 right-0 size-1 rounded-full bg-[var(--series-1)] opacity-60" />}
    </div>
  )
}

function Summary({ city, span, lo, hi, iHi, unit, todayDate }: { city: City; span: Hour[]; lo: number; hi: number; iHi: number; unit: Unit; todayDate: string }) {
  const feelsHi = Math.max(...span.map((h) => h.feels))
  const temper = feelsHi < 0 ? 'freezing' : feelsHi < 7 ? 'cold' : feelsHi < 13 ? 'cool' : feelsHi < 21 ? 'mild' : feelsHi < 27 ? 'warm' : 'hot'
  const wetFrom = span.find((h) => h.pop >= 50)
  const day = span.filter((h) => H(h.time) >= 8 && H(h.time) <= 17)
  const cloud = day.length ? day.reduce((s, h) => s + h.cloud, 0) / day.length : 50
  const sky = cloud < 30 ? 'bright' : cloud < 70 ? 'mixed' : 'grey'
  const windy = span.some((h) => h.wind >= 35)
  const words = [temper, wetFrom ? null : 'dry', sky, windy ? 'windy' : null].filter(Boolean) as string[]
  const climb = hi - span[0].temp
  return (
    <p className="max-w-[64ch] text-xl leading-snug font-medium tracking-tight text-pretty sm:text-2xl sm:leading-snug">
      Your day in {city.name}, in one line: {joinList(words)}
      {wetFrom ? (
        <>
          , with rain from <Num tip={`First hour at 50%+: ${wetFrom.time}`}>{wetFrom.time.slice(0, 10) > todayDate ? `${hourWord(wetFrom.time)} tomorrow` : hourWord(wetFrom.time)}</Num>
        </>
      ) : null}
      {climb >= 3 && iHi > 0 ? (
        <>
          , climbing <Num tip={`From ${span[0].temp} °C now to ${hi} °C`}>{degDelta(climb, unit)}</Num> to a high of <Num>{deg(hi, unit)}</Num>
        </>
      ) : (
        <>
          , between <Num>{deg(lo, unit)}</Num> and <Num>{deg(hi, unit)}</Num>
        </>
      )}
      .
    </p>
  )
}

function Hours({ span, unit }: { span: Hour[]; unit: Unit }) {
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted text-muted-foreground">
          <tr>
            {['Hour', 'Temp', 'Feels', 'Rain %', 'Wind', 'Cloud %', 'UV'].map((h) => (
              <th key={h} className={cn('px-3 py-2 font-medium', h === 'Hour' ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {span.map((h) => (
            <tr key={h.time}>
              <td className="px-3 py-1.5 tabular-nums">{h.time.replace('T', ' ')}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{deg(h.temp, unit)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{deg(h.feels, unit)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{h.pop}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{speed(h.wind, unit)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{h.cloud}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{h.uv.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
