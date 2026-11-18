import { useRef, useState, type ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { experiment } from '@/features/lab/catalog'
import { InlineBars, InlineRanges, InlineSpark, Num, StatusDot } from '@/features/lab/forecast/glyphs'
import {
  ARCHIVE_FIRST,
  ARCHIVE_LAST,
  aqiCategory,
  clockWord,
  conditionWord,
  deg,
  degDelta,
  duration,
  monthName,
  nextSolstice,
  parseAir,
  parseArchive,
  parseForecast,
  partOfDay,
  rain,
  sameWeekHighs,
  seasonWord,
  skyWord,
  speed,
  uvWord,
  weekday,
  whenWord,
  windWord,
  type AirHour,
  type Forecast,
  type Unit,
  type YearValue,
} from '@/features/lab/forecast/model'
import { WeekBand, YearsStrip } from '@/features/lab/forecast/notes'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { airQualityUrl, CITIES, openMeteoArchiveUrl, openMeteoUrl, type City } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

const EXP = experiment('forecast')
const archiveUrl = (c: City) => openMeteoArchiveUrl(c, `${ARCHIVE_FIRST}-01-01`, `${ARCHIVE_LAST}-12-31`, 'temperature_2m_max')
const REFRESH = 15 * 60_000

export function ForecastPage() {
  // The city lives in the URL (?city=london), so a written forecast is linkable.
  const asked = useSearchParams().get('city')
  const cityId = CITIES.some((c) => c.id === asked) ? asked! : 'nyc'
  const setCityId = (id: string) => navigate(id === 'nyc' ? '/lab/forecast' : `/lab/forecast?city=${id}`)
  const [unitChoice, setUnitChoice] = useState<Unit | null>(null)
  const city = CITIES.find((c) => c.id === cityId)!

  // Fetch for the picked city…
  const wanted = useLiveData(openMeteoUrl(city), { parse: parseForecast, refreshMs: REFRESH })
  useLiveData(airQualityUrl(city), { parse: parseAir })
  useLiveData(archiveUrl(city), { parse: parseArchive })

  // …but keep showing the last city that loaded until the new one arrives (refetch keeps the frame).
  const shownRef = useRef<City>(city)
  if (wanted.data !== undefined) shownRef.current = city
  const shown = shownRef.current
  const stale = shown.id !== city.id

  const forecast = useLiveData(openMeteoUrl(shown), { parse: parseForecast })
  const air = useLiveData(airQualityUrl(shown), { parse: parseAir })
  const archive = useLiveData(archiveUrl(shown), { parse: parseArchive })

  // The US writes °F; everyone else here writes °C. A manual pick sticks.
  const unit: Unit = unitChoice ?? (shown.id === 'nyc' ? 'f' : 'c')

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} href="https://open-meteo.com/" feeds={[wanted, air, archive]} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="sm:hidden">
          <Label htmlFor="forecast-city" className="sr-only">
            City
          </Label>
          <NativeSelect id="forecast-city" value={cityId} onChange={(e) => setCityId(e.target.value)} className="w-44">
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Segmented
          aria-label="City"
          value={cityId}
          onChange={setCityId}
          options={CITIES.map((c) => ({ value: c.id, label: c.name }))}
          className="hidden sm:inline-flex"
        />
        <Segmented
          aria-label="Temperature unit"
          value={unit}
          onChange={setUnitChoice}
          options={[
            { value: 'c', label: '°C' },
            { value: 'f', label: '°F' },
          ]}
        />
      </div>
      <LoadGate feeds={[forecast]} label={`Reading the sky over ${shown.name}`}>
        {() => (
          <div className={cn('transition-opacity', stale && 'opacity-50')}>
            <Article city={shown} f={forecast.data!} air={air.data} archive={archive.data} unit={unit} />
          </div>
        )}
      </LoadGate>
    </div>
  )
}

/** A row of the article: kicker in the left margin, prose in the measure, sidenote in the right margin. */
function Section({ kicker, children, note, lede }: { kicker: string; children: ReactNode; note?: ReactNode; lede?: boolean }) {
  return (
    <section className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-[6rem_minmax(0,64ch)_16rem]">
      <div className={cn('pt-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase', lede && 'lg:pt-2.5')}>{kicker}</div>
      <div
        className={cn(
          'text-pretty',
          lede ? 'text-xl leading-snug font-medium tracking-tight sm:text-2xl sm:leading-snug' : 'text-base leading-relaxed text-foreground/85 sm:text-[17px] sm:leading-8',
        )}
      >
        {children}
      </div>
      <aside className="min-w-0 lg:pt-1.5">{note}</aside>
    </section>
  )
}

function Article({ city, f, air, archive, unit }: { city: City; f: Forecast; air?: AirHour[]; archive?: Map<string, number>; unit: Unit }) {
  const today = f.days[1]
  const yesterday = f.days[0]
  const todayDate = today.date
  const nowKey = `${f.current.time.slice(0, 13)}:00`
  const nowIdx = Math.max(0, f.hours.findIndex((h) => h.time === nowKey))
  const next = f.hours.slice(nowIdx, nowIdx + 25)
  const years: YearValue[] | undefined = archive ? sameWeekHighs(archive, todayDate) : undefined
  const src = (field: string, value: number | string, units = '') => (
    <>
      Open-Meteo <span className="font-mono">{field}</span>: {value}
      {units}
    </>
  )

  return (
    <article className="flex flex-col gap-10">
      <Section kicker="Now" lede note={years && years.length > 10 ? <YearsStrip years={years} today={today.max} unit={unit} season={seasonWord(todayDate)} /> : undefined}>
        <Lede city={city} f={f} years={years} unit={unit} src={src} />
      </Section>

      <Section kicker="Today">
        <NextDay f={f} next={next} unit={unit} todayDate={todayDate} src={src} />
      </Section>

      <Section kicker="Rain">
        <Rain next={next.slice(1)} unit={unit} todayDate={todayDate} src={src} />
      </Section>

      <Section kicker="Wind">
        <Wind f={f} next={next} unit={unit} todayDate={todayDate} />
      </Section>

      {air && (
        <Section kicker="Air">
          <Air air={air} nowKey={nowKey} todayDate={todayDate} />
        </Section>
      )}

      <Section kicker="Light">
        <Light f={f} today={today} yesterday={yesterday} city={city} />
      </Section>

      <Section kicker="The week" note={<WeekBand days={f.days.slice(1, 8)} unit={unit} />}>
        <Week f={f} unit={unit} />
      </Section>
    </article>
  )
}

type Src = (field: string, value: number | string, units?: string) => ReactNode

function Lede({ city, f, years, unit, src }: { city: City; f: Forecast; years?: YearValue[]; unit: Unit; src: Src }) {
  const c = f.current
  const today = f.days[1]
  const diff = c.feels - c.temp
  const feels =
    Math.abs(diff) < 2 ? (
      <>, and it feels like it.</>
    ) : diff < 0 ? (
      <>
        , but {c.wind > 10 ? 'the wind makes it' : 'it'} feel{c.wind > 10 ? '' : 's'} like <Num tip={src('apparent_temperature', c.feels, ' °C')}>{deg(c.feels, unit)}</Num>.
      </>
    ) : (
      <>
        , and {c.humidity > 60 ? 'the humidity makes it' : 'it'} feel{c.humidity > 60 ? '' : 's'} like <Num tip={src('apparent_temperature', c.feels, ' °C')}>{deg(c.feels, unit)}</Num>.
      </>
    )

  let history: ReactNode = <span className="text-muted-foreground"> Checking the last thirty years…</span>
  if (years && years.length > 10) {
    const n = years.length
    const beaten = years.filter((y) => y.value < today.max).length
    const sorted = years.map((y) => y.value).sort((a, b) => a - b)
    const median = sorted[Math.floor(n / 2)]
    const gap = today.max - median
    const high = (
      <Num tip={src('temperature_2m_max', today.max, ' °C')}>
        {deg(today.max, unit)}
      </Num>
    )
    const season = seasonWord(today.date)
    const count = (k: number) => (
      <Num tip={`${k} of the ${n} years ${years[0].year}–${years[n - 1].year} had a cooler week around this date`}>
        {k} of the last {n}
      </Num>
    )
    history =
      beaten === n ? (
        <> Today’s high of {high} would beat every {season} week since {years[0].year}.</>
      ) : beaten === 0 ? (
        <> Today’s high of {high} is colder than every {season} week since {years[0].year}.</>
      ) : beaten >= n - 3 ? (
        <> For {season}, today’s high of {high} is unusually warm: warmer than {count(beaten)} years.</>
      ) : beaten <= 3 ? (
        <> For {season}, today’s high of {high} is unusually cold: only {count(beaten)} years were cooler.</>
      ) : Math.abs(gap) < 1 ? (
        <> Today’s high of {high} is about as normal as {season} gets, right in the middle of the last {n} years.</>
      ) : gap > 0 ? (
        <>
          {' '}
          For {season}, today’s high of {high} runs <Num>{degDelta(gap, unit)}</Num> warmer than usual, beating {count(beaten)} years.
        </>
      ) : (
        <>
          {' '}
          For {season}, today’s high of {high} runs <Num>{degDelta(gap, unit)}</Num> cooler than usual; {count(n - beaten)} years were warmer.
        </>
      )
  }

  return (
    <p>
      It’s <Num tip={src('temperature_2m', c.temp, ' °C')}>{deg(c.temp, unit)}</Num> and {conditionWord(c.code)} in {city.name}
      {feels}
      {history}
    </p>
  )
}

function NextDay({ f, next, unit, todayDate, src }: { f: Forecast; next: Forecast['hours']; unit: Unit; todayDate: string; src: Src }) {
  const temps = next.map((h) => h.temp)
  const max = Math.max(...temps)
  const min = Math.min(...temps)
  const iMax = temps.indexOf(max)
  const iMin = temps.indexOf(min)
  const spark = (
    <InlineSpark
      points={next.map((h, i) => ({ label: i === 0 ? 'now' : whenWord(h.time, todayDate), value: h.temp, text: deg(h.temp, unit) }))}
      summary={`Next 24 hours: ${deg(min, unit)} to ${deg(max, unit)}`}
    />
  )
  const hiNum = <Num tip={src('temperature_2m', max, ' °C')}>{deg(max, unit)}</Num>
  const loNum = <Num tip={src('temperature_2m', min, ' °C')}>{deg(min, unit)}</Num>

  let shape: ReactNode
  if (max - min < 2) {
    shape = <>temperatures barely move, holding near {hiNum}</>
  } else if (iMax === 0) {
    shape = (
      <>
        it only gets colder from here, down to {loNum} by {whenWord(next[iMin].time, todayDate)}
      </>
    )
  } else if (iMin === 0) {
    shape = (
      <>
        it only gets warmer, up to {hiNum} around {whenWord(next[iMax].time, todayDate)}
      </>
    )
  } else if (iMax < iMin) {
    shape = (
      <>
        temperatures climb to {hiNum} around {whenWord(next[iMax].time, todayDate)}, then slip to {loNum} by {whenWord(next[iMin].time, todayDate)}
      </>
    )
  } else {
    shape = (
      <>
        temperatures dip to {loNum} around {whenWord(next[iMin].time, todayDate)} before recovering to {hiNum} by {whenWord(next[iMax].time, todayDate)}
      </>
    )
  }

  const today = f.days[1]
  const nowT = f.current.time
  const daytime = nowT >= today.sunrise && nowT < today.sunset
  const coming = next.slice(1, 13)
  const cloud = coming.reduce((s, h) => s + h.cloud, 0) / Math.max(1, coming.length)
  const uvPeak = next.reduce((best, h) => (h.uv > best.uv ? h : best), next[0])

  return (
    <p>
      Over the next day {spark} {shape}. Expect{' '}
      <Num tip={`Mean cloud cover over the next 12 hours: ${Math.round(cloud)}%`} className="font-normal">
        {skyWord(cloud)}
      </Num>{' '}
      {daytime ? 'for the rest of the day' : 'through the night'}.
      {uvPeak.uv >= 3 && (
        <>
          {' '}
          UV peaks at <Num tip={src('uv_index', uvPeak.uv)}>{Math.round(uvPeak.uv)}</Num> around {whenWord(uvPeak.time, todayDate)}, which counts as {uvWord(uvPeak.uv)}
          {uvPeak.uv >= 6 ? ': sunscreen weather.' : '.'}
        </>
      )}
    </p>
  )
}

function Rain({ next, unit, todayDate, src }: { next: Forecast['hours']; unit: Unit; todayDate: string; src: Src }) {
  const bars = (
    <InlineBars
      points={next.map((h) => ({ label: whenWord(h.time, todayDate), value: h.pop, text: `${h.pop}%` }))}
      summary={`Chance of rain, hourly for 24 hours: up to ${Math.max(...next.map((h) => h.pop))}%`}
    />
  )
  const peak = next.reduce((b, h) => (h.pop > b.pop ? h : b), next[0])
  const first = next.find((h) => h.pop >= 50)
  const total = next.reduce((s, h) => s + h.precip, 0)
  const cold = (first ?? peak).temp <= 1
  const what = cold ? 'Snow or sleet' : 'Rain'
  const peakNum = <Num tip={src('precipitation_probability', peak.pop, '%')}>{peak.pop}%</Num>
  const totalNum = <Num tip={src('precipitation (24 h sum)', total.toFixed(1), ' mm')}>{rain(total, unit)}</Num>

  if (first) {
    const startsNow = first === next[0]
    return (
      <p>
        {what} is likely {startsNow ? 'right away' : <>from {whenWord(first.time, todayDate)}</>} {bars}, with the chance peaking at {peakNum}
        {peak !== first && <> around {whenWord(peak.time, todayDate)}</>}. {total >= 0.5 ? <>Expect about {totalNum} in all.</> : <>Amounts look light, though: {totalNum}.</>}
      </p>
    )
  }
  if (peak.pop >= 20) {
    return (
      <p>
        A stray {cold ? 'flurry' : 'shower'} is possible but unlikely {bars}: the chance tops out at {peakNum} around {whenWord(peak.time, todayDate)}.
      </p>
    )
  }
  const ceiling = Math.max(5, Math.ceil((peak.pop + 1) / 5) * 5)
  return (
    <p>
      No rain in sight {bars} — the chance stays below <Num tip={src('precipitation_probability (max)', peak.pop, '%')}>{ceiling}%</Num> for the next 24 hours, so leave the umbrella.
    </p>
  )
}

function Wind({ f, next, unit, todayDate }: { f: Forecast; next: Forecast['hours']; unit: Unit; todayDate: string }) {
  const now = f.current.wind
  const peak = next.reduce((b, h) => (h.wind > b.wind ? h : b), next[0])
  const low = next.reduce((b, h) => (h.wind < b.wind ? h : b), next[0])
  const nowNum = <Num tip={`Open-Meteo wind_speed_10m: ${now} km/h`}>{speed(now, unit)}</Num>
  let change: ReactNode = <>, and it should stay that way.</>
  if (peak.wind - now >= 8) {
    change = (
      <>
        , freshening to a {windWord(peak.wind)} of <Num tip={`wind_speed_10m at ${peak.time}: ${peak.wind} km/h`}>{speed(peak.wind, unit)}</Num> by{' '}
        {peak.time.slice(0, 10) > todayDate ? `${partOfDay(peak.time)} tomorrow` : partOfDay(peak.time)}.
      </>
    )
  } else if (now - low.wind >= 8) {
    change = (
      <>
        , easing to <Num tip={`wind_speed_10m at ${low.time}: ${low.wind} km/h`}>{speed(low.wind, unit)}</Num> by {whenWord(low.time, todayDate)}.
      </>
    )
  }
  const word = windWord(now)
  return (
    <p>
      {word === 'calm' ? <>The air is calm right now ({nowNum})</> : <>The wind is a {word} at {nowNum} right now</>}
      {change}
    </p>
  )
}

function Air({ air, nowKey, todayDate }: { air: AirHour[]; nowKey: string; todayDate: string }) {
  const i = Math.max(0, air.findIndex((a) => a.time === nowKey))
  const now = air[i]
  const coming = air.slice(i + 1, i + 25).filter((a) => a.aqi != null)
  if (now?.aqi == null) return <p>Air quality readings aren’t available for this hour.</p>
  const cat = aqiCategory(now.aqi)
  const worst = coming.reduce((b, a) => ((a.aqi ?? 0) > (b.aqi ?? 0) ? a : b), now)
  const worstCat = aqiCategory(worst.aqi ?? 0)
  return (
    <p>
      The air is{' '}
      <span className="font-semibold text-foreground">
        <StatusDot tone={cat.tone} /> {cat.word}
      </span>{' '}
      (US AQI <Num tip={`Open-Meteo us_aqi: ${now.aqi}`}>{now.aqi}</Num>
      {now.pm25 != null && (
        <>
          , fine particles at <Num tip={`Open-Meteo pm2_5: ${now.pm25} µg/m³`}>{Math.round(now.pm25)} µg/m³</Num>
        </>
      )}
      ){' '}
      {worstCat.word !== cat.word && worst !== now ? (
        <>
          and should slip to{' '}
          <span className="font-semibold text-foreground">
            <StatusDot tone={worstCat.tone} /> {worstCat.word}
          </span>{' '}
          (<Num tip={`us_aqi at ${worst.time}`}>{worst.aqi}</Num>) around {whenWord(worst.time, todayDate)}.
        </>
      ) : (
        <>and should stay that way through this time tomorrow.</>
      )}
    </p>
  )
}

function Light({ f, today, yesterday, city }: { f: Forecast; today: Forecast['days'][number]; yesterday: Forecast['days'][number]; city: City }) {
  if (today.daylight < 60) return <p>The sun doesn’t rise over {city.name} today.</p>
  if (today.daylight > 86_340) return <p>The sun doesn’t set over {city.name} today.</p>
  const now = f.current.time
  const rise = <Num tip={`sunrise: ${today.sunrise}`}>{clockWord(today.sunrise)}</Num>
  const set = <Num tip={`sunset: ${today.sunset}`}>{clockWord(today.sunset)}</Num>
  const delta = Math.round((today.daylight - yesterday.daylight) / 60)
  const sol = nextSolstice(today.date)
  const short = today.daylight < 8 * 3600
  return (
    <p>
      {now < today.sunrise ? <>The sun rises at {rise} and sets at {set}</> : now < today.sunset ? <>The sun rose at {rise} and sets at {set}</> : <>The sun rose at {rise} and set at {set}</>}:{' '}
      {short ? 'only ' : ''}
      <Num tip={`daylight_duration: ${Math.round(today.daylight)} s`}>{duration(today.daylight)}</Num> of daylight,{' '}
      {delta === 0 ? (
        <>about the same as yesterday</>
      ) : (
        <>
          <Num tip={`${Math.round(today.daylight - yesterday.daylight)} s vs yesterday`}>
            {Math.abs(delta)} minute{Math.abs(delta) === 1 ? '' : 's'} {delta < 0 ? 'less' : 'more'}
          </Num>{' '}
          than yesterday
        </>
      )}
      .{' '}
      {sol.days === 0 ? (
        <>Today is the {monthName(sol.month)} solstice: the days turn around from here.</>
      ) : (
        <>
          They’ll keep {delta < 0 ? 'shortening' : 'lengthening'} for another <Num>{sol.days} days</Num>, until the {monthName(sol.month)} solstice.
        </>
      )}
    </p>
  )
}

function Week({ f, unit }: { f: Forecast; unit: Unit }) {
  const days = f.days.slice(1, 8)
  const name = (i: number) => (i === 0 ? 'today' : i === 1 ? 'tomorrow' : weekday(days[i].date))
  const iWarm = days.reduce((b, d, i) => (d.max > days[b].max ? i : b), 0)
  const iCold = days.reduce((b, d, i) => (d.min < days[b].min ? i : b), 0)
  const iWet = days.reduce((b, d, i) => (d.precip > days[b].precip ? i : b), 0)
  const wetDays = days.filter((d) => d.precip >= 1).length
  const glyph = (
    <InlineRanges
      points={days.map((d, i) => ({ label: name(i), value: d.max, lo: d.min, text: `${deg(d.min, unit)}–${deg(d.max, unit)}` }))}
      summary={`Daily low to high, next ${days.length} days`}
    />
  )
  return (
    <p>
      The week ahead {glyph} tops out {iWarm <= 1 ? name(iWarm) : <>on {name(iWarm)}</>} at{' '}
      <Num tip={`temperature_2m_max ${days[iWarm].date}: ${days[iWarm].max} °C`}>{deg(days[iWarm].max, unit)}</Num>, and{' '}
      {iCold === 0 ? (
        <>
          today’s low of <Num tip={`temperature_2m_min ${days[0].date}: ${days[0].min} °C`}>{deg(days[0].min, unit)}</Num> is the coldest it gets.
        </>
      ) : (
        <>
          the coldest night is {name(iCold)}’s, down to{' '}
          <Num tip={`temperature_2m_min ${days[iCold].date}: ${days[iCold].min} °C`}>{deg(days[iCold].min, unit)}</Num>.
        </>
      )}{' '}
      {wetDays === 0 ? (
        <>It stays dry all week.</>
      ) : (
        <>
          Rain falls on <Num>{wetDays === 1 ? 'one' : wetDays}</Num> of the {days.length} days; {name(iWet)} looks wettest with{' '}
          <Num tip={`precipitation_sum ${days[iWet].date}: ${days[iWet].precip} mm`}>{rain(days[iWet].precip, unit)}</Num>.
        </>
      )}
    </p>
  )
}

