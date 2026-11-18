import type { ReactNode } from 'react'

import { DotTimeline, KpColumns, LineChart, RankBars } from '@/features/lab/ask/charts'
import { cap, countWord, dayWord, fmtInt, localHm, plural, relative, signed, ukHm, utcHm } from '@/features/lab/ask/format'
import { weatherWords, type Launch, type Weather } from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { flareClass, type CarbonSlot, type KpPoint, type Quake, type WikiArticle, type XrayPoint } from '@/features/lab/sources'

/*
 * Rules turn feeds into messages. Each message has a stable id (the quake's
 * id, or a date-scoped id for digests) so read / starred / snoozed / archived
 * state survives refreshes and reloads. Bodies are written from the data: a
 * few sentences with the numbers emphasized, then one small chart.
 */

export type Label = 'earth' | 'space' | 'grid' | 'weather' | 'launches' | 'wikipedia'
export const LABELS: { id: Label; name: string }[] = [
  { id: 'earth', name: 'Earth' },
  { id: 'space', name: 'Space' },
  { id: 'grid', name: 'Grid' },
  { id: 'weather', name: 'Weather' },
  { id: 'launches', name: 'Launches' },
  { id: 'wikipedia', name: 'Wikipedia' },
]

export interface Message {
  id: string
  label: Label
  sender: string
  subject: string
  preview: string
  time: number
  important: boolean
  severity?: { tone: 'destructive' | 'warning'; text: string }
  body: () => ReactNode
  source: { label: string; href: string }
  open?: { label: string; path: string }
}

export interface Rules {
  quakes: { on: boolean; minMag: number }
  kp: { on: boolean; threshold: number }
  flares: { on: boolean }
  grid: { on: boolean; dirty: number; digest: boolean }
  weather: { on: boolean; swing: number; rain: number }
  launches: { on: boolean }
  wiki: { on: boolean }
}

export const DEFAULT_RULES: Rules = {
  quakes: { on: true, minMag: 5 },
  kp: { on: true, threshold: 4 },
  flares: { on: true },
  grid: { on: true, dirty: 200, digest: true },
  weather: { on: true, swing: 8, rain: 60 },
  launches: { on: true },
  wiki: { on: true },
}

export interface Feeds {
  quakes?: Quake[]
  kpNow?: { time: number; kp: number }
  kpf?: KpPoint[]
  xray?: XrayPoint[]
  carbon?: CarbonSlot[]
  weather?: Weather
  upcoming?: Launch[]
  previous?: Launch[]
  wiki?: { date: Date; articles: WikiArticle[] }
  wikiPrev?: WikiArticle[]
}

const P = ({ children }: { children: ReactNode }) => <p className="max-w-[68ch] text-[15px] leading-relaxed text-foreground/90">{children}</p>

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180
  const d = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(d))
}
const utcDate = (t: number) => new Date(t).toISOString().slice(0, 10)
const ukDate = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

export function buildMessages(f: Feeds, rules: Rules, now: number): Message[] {
  const out: Message[] = []

  // ── Earthquakes ───────────────────────────────────────────────────────────
  if (rules.quakes.on && f.quakes) {
    const recent = f.quakes.filter((q) => q.time >= now - 3 * 86400_000 && q.mag >= rules.quakes.minMag)
    for (const q of recent) {
      const alertRank = { green: 0, yellow: 1, orange: 2, red: 3 }[q.alert ?? ''] ?? -1
      const important = q.mag >= 6.5 || q.tsunami || alertRank >= 1
      const severe = q.mag >= 7 || alertRank >= 2
      const near = f.quakes.filter((o) => o.id !== q.id && km(o, q) < 500)
      const bigger = near.filter((o) => o.mag > q.mag).length
      const depthWord = q.depth < 70 ? 'shallow enough to be felt widely' : q.depth < 300 ? 'at intermediate depth' : 'deep, so the shaking at the surface was muted'
      out.push({
        id: `quake-${q.id}`,
        label: 'earth',
        sender: 'USGS',
        subject: `M${q.mag.toFixed(1)} earthquake, ${q.place}`,
        preview: `${Math.round(q.depth)} km deep · ${q.felt ? `felt by ${fmtInt(q.felt)} people` : 'no felt reports yet'}${q.tsunami ? ' · tsunami flag' : ''}${q.alert ? ` · PAGER ${q.alert}` : ''}`,
        time: q.time,
        important,
        severity: important ? { tone: severe ? 'destructive' : 'warning', text: severe ? 'Major' : q.tsunami ? 'Tsunami flag' : 'Strong' } : undefined,
        source: { label: 'USGS event page', href: q.url },
        open: { label: 'Terminal', path: '/lab/terminal' },
        body: () => (
          <>
            <P>
              A magnitude <Num tip={`M${q.mag} · significance ${q.sig}`}>{q.mag.toFixed(1)}</Num> earthquake struck {q.place} {dayWord(q.time, now)} at <Num tip={utcHm(q.time)}>{localHm(q.time)}</Num> your time,{' '}
              <Num tip={`${q.depth.toFixed(1)} km`}>{Math.round(q.depth)} km</Num> down: {depthWord}.{' '}
              {near.length ? (
                <>
                  Within 500 km, <Num tip="M2.5+ in the past 30 days">{fmtInt(near.length)}</Num> other {plural(near.length, 'quake')} of M2.5+ hit in the past 30 days;{' '}
                  {bigger === 0 ? 'this is the largest of them.' : `${countWord(bigger)} ${plural(bigger, 'was', 'were')} bigger.`}
                </>
              ) : (
                'It is the only M2.5+ quake within 500 km in the past 30 days.'
              )}
            </P>
            {(q.tsunami || q.alert || q.felt) && (
              <P>
                {q.alert && (
                  <>
                    USGS’s PAGER system rates the expected impact <strong className="font-semibold">{q.alert}</strong>.{' '}
                  </>
                )}
                {q.tsunami && 'The tsunami flag is set: check local warning centres. '}
                {q.felt ? (
                  <>
                    <Num>{fmtInt(q.felt)}</Num> people have reported feeling it.
                  </>
                ) : null}
              </P>
            )}
            <DotTimeline
              points={[...near, q].map((o) => ({ id: o.id, x: o.time, y: o.mag }))}
              x0={now - 30 * 86400_000}
              x1={now}
              highlight={q.id}
              xFormat={(t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              yFormat={(v) => `M${v}`}
              tip={(id) => {
                const o = id === q.id ? q : near.find((n) => n.id === id)!
                return { title: o.place, rows: [{ key: 'm', label: `${Math.round(o.depth)} km deep`, value: `M${o.mag.toFixed(1)}` }, { key: 't', label: 'UTC', value: utcHm(o.time) }] }
              }}
            />
            <p className="text-xs text-muted-foreground">Quakes within 500 km, past 30 days. This one is highlighted.</p>
          </>
        ),
      })
    }
  }

  // ── Geomagnetic activity ──────────────────────────────────────────────────
  if (rules.kp.on && f.kpNow && f.kpf) {
    const k = f.kpNow
    const ahead = f.kpf.filter((p) => p.time > now)
    const peak = ahead.reduce<KpPoint | null>((m, p) => (!m || p.kp > m.kp ? p : m), null)
    const chart = () => <KpColumns points={f.kpf!.filter((p) => p.time >= now - 2 * 86400_000)} now={now} />
    if (k.kp >= rules.kp.threshold) {
      const storm = k.kp >= 5
      out.push({
        id: `kp-now-${utcDate(k.time)}`,
        label: 'space',
        sender: 'NOAA SWPC',
        subject: storm ? `Geomagnetic storm in progress: Kp ${k.kp.toFixed(1)}` : `Geomagnetic activity up: Kp ${k.kp.toFixed(1)}`,
        preview: storm ? `G${Math.min(5, Math.floor(k.kp) - 4)} conditions now. Aurora may reach lower latitudes.` : `Above your threshold of Kp ${rules.kp.threshold}. Below storm level.`,
        time: k.time,
        important: k.kp >= 6,
        severity: storm ? { tone: k.kp >= 7 ? 'destructive' : 'warning', text: `G${Math.min(5, Math.floor(k.kp) - 4)} storm` } : undefined,
        source: { label: 'SWPC planetary K-index', href: 'https://www.swpc.noaa.gov/products/planetary-k-index' },
        open: { label: 'Terminal', path: '/lab/terminal' },
        body: () => (
          <>
            <P>
              The planetary K-index reached <Num tip={`estimated at ${utcHm(k.time)}`}>{k.kp.toFixed(2)}</Num>, above your threshold of {rules.kp.threshold}.{' '}
              {storm ? 'That is storm level: power grids and satellites may feel it, and aurora can be seen far from the poles.' : 'That is active, not yet a storm.'}{' '}
              {peak && (
                <>
                  The forecast for the next three days peaks at <Num tip={utcHm(peak.time)}>Kp {peak.kp.toFixed(1)}</Num>.
                </>
              )}
            </P>
            {chart()}
          </>
        ),
      })
    }
    if (peak && peak.kp >= 5) {
      const g = Math.min(5, Math.floor(peak.kp) - 4)
      const day = new Date(peak.time).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      out.push({
        id: `kp-watch-${utcDate(peak.time)}`,
        label: 'space',
        sender: 'NOAA SWPC',
        subject: `Geomagnetic storm watch: G${g} possible ${day}`,
        preview: `Kp forecast peaks at ${peak.kp.toFixed(1)} around ${utcHm(peak.time)}.`,
        time: f.kpf.filter((p) => p.kind !== 'predicted').at(-1)?.time ?? now,
        important: g >= 2,
        severity: { tone: g >= 3 ? 'destructive' : 'warning', text: `G${g} watch` },
        source: { label: 'SWPC 3-day forecast', href: 'https://www.swpc.noaa.gov/products/3-day-forecast' },
        open: { label: 'Terminal', path: '/lab/terminal' },
        body: () => (
          <>
            <P>
              NOAA’s forecast has the K-index reaching <Num tip={utcHm(peak.time)}>{peak.kp.toFixed(2)}</Num> on {day}, a G{g} storm. Forecasts this far out often move; this
              message will update as the forecast does.
            </P>
            {chart()}
          </>
        ),
      })
    }
  }

  // ── Solar flares ──────────────────────────────────────────────────────────
  if (rules.flares.on && f.xray?.length) {
    // Distinct events: contiguous runs above M1 (1e-5 W/m²), one message per run at its peak.
    const runs: XrayPoint[][] = []
    let cur: XrayPoint[] | null = null
    for (const p of f.xray) {
      if (p.flux >= 1e-5) (cur ??= []).push(p)
      else if (cur) {
        runs.push(cur)
        cur = null
      }
    }
    if (cur) runs.push(cur)
    const step = Math.max(1, Math.floor(f.xray.length / 288))
    const line = f.xray.filter((_, i) => i % step === 0).map((p) => ({ x: p.time, y: Math.log10(p.flux) }))
    for (const run of runs) {
      const peak = run.reduce((m, p) => (p.flux > m.flux ? p : m))
      const cls = flareClass(peak.flux)
      const x = cls.startsWith('X')
      out.push({
        id: `flare-${peak.time}`,
        label: 'space',
        sender: 'NOAA SWPC',
        subject: `${cls} solar flare peaked at ${utcHm(peak.time)}`,
        preview: `${run.length} minutes above M1. ${x ? 'Strong radio blackouts likely on the sunlit side.' : 'Minor radio blackouts possible on the sunlit side.'}`,
        time: peak.time,
        important: x,
        severity: x ? { tone: 'destructive', text: 'X-class' } : undefined,
        source: { label: 'GOES X-ray flux', href: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux' },
        open: { label: 'Terminal', path: '/lab/terminal' },
        body: () => (
          <>
            <P>
              GOES saw an <Num tip={`${peak.flux.toExponential(2)} W/m²`}>{cls}</Num> flare peak at {utcHm(peak.time)}, after{' '}
              <Num tip={`${utcHm(run[0].time)}–${utcHm(run.at(-1)!.time)}`}>{run.length} minutes</Num> above M class.{' '}
              {x
                ? 'X-class flares can black out HF radio across the whole sunlit hemisphere for an hour or more.'
                : 'M-class flares can cause brief HF radio blackouts near the poles and on the sunlit side.'}
            </P>
            <LineChart
              series={[{ key: 'x', label: 'X-ray flux', color: 'var(--series-1)', points: line }]}
              xFormat={(t) => utcHm(t).replace(' UTC', '')}
              tipTitle={(t) => utcHm(t)}
              yFormat={(v) => (Number.isInteger(v) ? (['A', 'B', 'C', 'M', 'X'][v + 8] ?? '') : flareClass(10 ** v))}
              marks={[{ x: peak.time, y: Math.log10(peak.flux), label: cls }]}
            />
          </>
        ),
      })
    }
  }

  // ── GB grid ───────────────────────────────────────────────────────────────
  if (rules.grid.on && f.carbon?.length) {
    const slots = f.carbon
    const next = slots.filter((s) => s.to > now && s.from < now + 86400_000)
    const cur = slots.find((s) => s.from <= now && now < s.to)
    const mid = (s: CarbonSlot) => (s.from + s.to) / 2
    if (rules.grid.digest && next.length >= 6 && cur) {
      let best = { i: 0, avg: Infinity }
      for (let i = 0; i + 6 <= next.length; i++) {
        const avg = next.slice(i, i + 6).reduce((s, x) => s + x.forecast, 0) / 6
        if (avg < best.avg) best = { i, avg }
      }
      const w0 = next[best.i].from
      const w1 = next[best.i + 5].to
      const curV = cur.actual ?? cur.forecast
      const pct = Math.round((1 - best.avg / curV) * 100)
      const hiSlot = next.reduce((m, s) => (s.forecast > m.forecast ? s : m))
      const morning = new Date(now)
      morning.setHours(6, 0, 0, 0)
      const night = new Date(w0).getHours() >= 18 || new Date(w0).getHours() < 6
      out.push({
        id: `grid-digest-${ukDate(now)}`,
        label: 'grid',
        sender: 'NESO',
        subject: `Cleanest window ${night ? 'tonight' : 'today'}: ${ukHm(w0)}–${ukHm(w1)}`,
        preview: `${Math.round(best.avg)} g CO₂/kWh on average${pct > 0 ? `, ${pct}% cleaner than now` : ''}. Avoid ${ukHm(hiSlot.from)} (${hiSlot.forecast} g).`,
        time: Math.min(now, Math.max(morning.getTime(), now - 12 * 3600_000)),
        important: false,
        source: { label: 'NESO carbon intensity', href: 'https://carbonintensity.org.uk/' },
        open: { label: 'Grid Clock', path: '/lab/grid-clock' },
        body: () => (
          <>
            <P>
              The cleanest 3 hours on the GB grid in the next day run{' '}
              <Num tip="UK time">
                {ukHm(w0)}–{ukHm(w1)}
              </Num>
              , averaging <Num tip={`${best.avg.toFixed(1)} gCO₂/kWh forecast`}>{Math.round(best.avg)} g</Num> CO₂ per kWh
              {pct > 0 ? (
                <>
                  , <Num tip={`now ${curV} g`}>{pct}%</Num> cleaner than now
                </>
              ) : null}
              . Good for the dishwasher, the washing machine or charging a car. The dirtiest half hour is <Num>{ukHm(hiSlot.from)}</Num> at <Num>{hiSlot.forecast} g</Num>.
            </P>
            <LineChart
              series={[{ key: 'f', label: 'Forecast', color: 'var(--series-1)', points: next.map((s) => ({ x: mid(s), y: s.forecast })) }]}
              xFormat={ukHm}
              tipTitle={(t) => `${ukHm(t)} UK`}
              yFormat={(v) => `${Math.round(v)}`}
              yZero
              band={{ x0: w0, x1: w1, label: 'cleanest 3h' }}
            />
          </>
        ),
      })
    }
    const dirty = slots.filter((s) => s.from >= now - 86400_000 && s.from <= now && (s.actual ?? s.forecast) > rules.grid.dirty)
    if (dirty.length) {
      const worst = dirty.reduce((m, s) => ((s.actual ?? s.forecast) > (m.actual ?? m.forecast) ? s : m))
      const v = worst.actual ?? worst.forecast
      const past = slots.filter((s) => s.from >= now - 86400_000 && s.from <= now)
      out.push({
        id: `grid-dirty-${ukDate(dirty[0].from)}`,
        label: 'grid',
        sender: 'NESO',
        subject: `Grid running dirty: ${v} g CO₂/kWh at ${ukHm(worst.from)}`,
        preview: `${dirty.length} half ${plural(dirty.length, 'hour')} above your ${rules.grid.dirty} g threshold in the last day.`,
        time: dirty[0].from,
        important: false,
        severity: { tone: 'warning', text: 'Above threshold' },
        source: { label: 'NESO carbon intensity', href: 'https://carbonintensity.org.uk/' },
        open: { label: 'Grid Clock', path: '/lab/grid-clock' },
        body: () => (
          <>
            <P>
              Carbon intensity on the GB grid went over your <Num>{rules.grid.dirty} g</Num> threshold for <Num tip={`${dirty.length * 30} minutes`}>{dirty.length / 2} hours</Num> in the
              last day, peaking at <Num tip={worst.actual != null ? 'measured' : 'forecast'}>{v} g</Num> at {ukHm(worst.from)} UK. That usually means gas is covering an evening peak
              with little wind.
            </P>
            <LineChart
              series={[{ key: 'a', label: 'Intensity', color: 'var(--series-1)', points: past.map((s) => ({ x: mid(s), y: s.actual ?? s.forecast })) }]}
              xFormat={ukHm}
              tipTitle={(t) => `${ukHm(t)} UK`}
              yFormat={(n) => `${Math.round(n)}`}
              yZero
              marks={[{ x: mid(worst), y: v, label: `${v} g` }]}
            />
          </>
        ),
      })
    }
  }

  // ── NYC weather ───────────────────────────────────────────────────────────
  if (rules.weather.on && f.weather) {
    const w = f.weather
    const today = w.current.time.slice(0, 10)
    const di = w.daily.time.indexOf(today)
    if (di >= 0 && di + 1 < w.daily.time.length) {
      const tom = w.daily.time[di + 1]
      const F = (c: number) => Math.round((c * 9) / 5 + 32)
      const morning = Date.parse(`${today}T06:00`)
      const time = Math.min(now, morning)
      const t0 = w.hourly.time.indexOf(`${tom}T00:00`)
      const rainP = w.daily.rainChance[di + 1] ?? 0
      if (rainP >= rules.weather.rain && t0 >= 0) {
        const hours = w.hourly.rainChance.slice(t0, t0 + 24)
        const peak = Math.max(...hours)
        const peakH = hours.indexOf(peak)
        const first = hours.findIndex((p) => p >= 50)
        const hr = (h: number) => new Date(`${tom}T${String(h).padStart(2, '0')}:00`).toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase()
        out.push({
          id: `wx-rain-${tom}`,
          label: 'weather',
          sender: 'Open-Meteo',
          subject: `Rain likely tomorrow in New York (${rainP}%)`,
          preview: `${first >= 0 ? `From about ${hr(first)}` : 'On and off'}, ${w.daily.rain[di + 1].toFixed(1)} mm in all. Peak chance ${peak}% around ${hr(peakH)}.`,
          time,
          important: false,
          source: { label: 'Open-Meteo forecast', href: 'https://open-meteo.com/' },
          open: { label: 'Forecast, Written', path: '/lab/forecast' },
          body: () => (
            <>
              <P>
                Tomorrow looks <strong className="font-semibold">{weatherWords(w.daily.code[di + 1])}</strong> in New York, with a <Num>{rainP}%</Num> chance of rain and about{' '}
                <Num tip={`${w.daily.rain[di + 1]} mm`}>{(w.daily.rain[di + 1] / 25.4).toFixed(2)} in</Num> in all.{' '}
                {first >= 0 ? (
                  <>
                    It turns likely from about <Num>{hr(first)}</Num> and peaks near {hr(peakH)}.
                  </>
                ) : (
                  'No single hour looks more likely than not.'
                )}{' '}
                Pack an umbrella.
              </P>
              <LineChart
                series={[{ key: 'r', label: 'Chance of rain', color: 'var(--series-1)', area: true, points: hours.map((p, i) => ({ x: i, y: p })) }]}
                xFormat={(h) => hr(Math.round(h))}
                yFormat={(v) => `${Math.round(v)}%`}
                yZero
              />
            </>
          ),
        })
      }
      const swing = w.daily.max[di + 1] - w.daily.max[di]
      if (Math.abs(swing) >= rules.weather.swing && t0 >= 0) {
        const t00 = w.hourly.time.indexOf(`${today}T00:00`)
        const warmer = swing > 0
        out.push({
          id: `wx-swing-${tom}`,
          label: 'weather',
          sender: 'Open-Meteo',
          subject: `Tomorrow ${warmer ? 'warms' : 'drops'} ${Math.round(Math.abs(swing))}°C in New York`,
          preview: `High of ${F(w.daily.max[di + 1])}°F after ${F(w.daily.max[di])}°F today. Low ${F(w.daily.min[di + 1])}°F.`,
          time,
          important: false,
          source: { label: 'Open-Meteo forecast', href: 'https://open-meteo.com/' },
          open: { label: 'Forecast, Written', path: '/lab/forecast' },
          body: () => (
            <>
              <P>
                Tomorrow’s high in New York is <Num tip={`${w.daily.max[di + 1].toFixed(1)}°C`}>{F(w.daily.max[di + 1])}°F</Num>,{' '}
                <Num tip={`${signed(swing)}°C`}>{Math.round(Math.abs(swing) * 1.8)}°F</Num> {warmer ? 'warmer' : 'colder'} than today’s {F(w.daily.max[di])}°F. The overnight low is{' '}
                <Num tip={`${w.daily.min[di + 1].toFixed(1)}°C`}>{F(w.daily.min[di + 1])}°F</Num>. {warmer ? 'You can leave the heavy coat.' : 'Dress for it.'}
              </P>
              {t00 >= 0 && (
                <LineChart
                  series={[
                    { key: 'today', label: 'Today', color: 'var(--series-other)', points: w.hourly.temp.slice(t00, t00 + 24).map((c, i) => ({ x: i, y: F(c) })) },
                    { key: 'tom', label: 'Tomorrow', color: warmer ? 'var(--series-2)' : 'var(--series-1)', points: w.hourly.temp.slice(t0, t0 + 24).map((c, i) => ({ x: i, y: F(c) })) },
                  ]}
                  xFormat={(h) => new Date(`${tom}T${String(Math.round(h) % 24).padStart(2, '0')}:00`).toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase()}
                  yFormat={(v) => `${Math.round(v)}°`}
                />
              )}
            </>
          ),
        })
      }
    }
  }

  // ── Launches ──────────────────────────────────────────────────────────────
  if (rules.launches.on) {
    for (const l of f.upcoming ?? []) {
      if (l.net < now - 3600_000 || l.net > now + 86400_000) continue
      out.push({
        id: `launch-${l.id}`,
        label: 'launches',
        sender: 'Launch Library',
        subject: `Liftoff ${relative(l.net, now)}: ${l.rocket} · ${l.mission || 'unnamed payload'}`,
        preview: `${l.statusName}. ${l.location.split(',')[0]}. ${l.provider}.`,
        time: Math.min(now, l.net - 86400_000),
        important: false,
        source: { label: 'Launch Library 2', href: 'https://thespacedevs.com/llapi' },
        open: { label: 'Departures', path: '/lab/departures' },
        body: () => <LaunchBody l={l} now={now} />,
      })
    }
    for (const l of f.previous ?? []) {
      if (!/Failure/.test(l.statusName) || l.net < now - 14 * 86400_000) continue
      out.push({
        id: `launch-fail-${l.id}`,
        label: 'launches',
        sender: 'Launch Library',
        subject: `Launch failure: ${l.rocket} · ${l.mission || 'unnamed payload'}`,
        preview: `${l.statusName} on ${new Date(l.net).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. ${l.provider}.`,
        time: l.net,
        important: true,
        severity: { tone: 'warning', text: l.statusName },
        source: { label: 'Launch Library 2', href: 'https://thespacedevs.com/llapi' },
        open: { label: 'Departures', path: '/lab/departures' },
        body: () => <LaunchBody l={l} now={now} />,
      })
    }
  }

  // ── Wikipedia ─────────────────────────────────────────────────────────────
  if (rules.wiki.on && f.wiki && f.wikiPrev?.length) {
    const arts = f.wiki.articles
    const top = arts[0]
    const prevTop = f.wikiPrev[0]
    if (top && prevTop && top.article !== prevTop.article) {
      const was = f.wikiPrev.find((a) => a.article === top.article)
      const date = f.wiki.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
      out.push({
        id: `wiki-1-${utcDate(f.wiki.date.getTime())}`,
        label: 'wikipedia',
        sender: 'Wikimedia',
        subject: `New #1 on Wikipedia: ${top.title}`,
        preview: `${fmtInt(top.views)} views on ${date}${was ? `, up from #${was.rank}` : ', new to the list'}. ${prevTop.title} drops from the top.`,
        time: f.wiki.date.getTime() + 86400_000 + 3 * 3600_000,
        important: false,
        source: { label: 'Wikimedia pageviews', href: 'https://pageviews.wmcloud.org/topviews/' },
        open: { label: 'Attention', path: '/lab/attention' },
        body: () => (
          <>
            <P>
              <strong className="font-semibold">{top.title}</strong> was the most-read article on English Wikipedia on {date}, with <Num tip={`${top.views} views`}>{fmtInt(top.views)}</Num>{' '}
              views.{' '}
              {was ? (
                <>
                  The day before it was <Num>#{was.rank}</Num> with {fmtInt(was.views)}.
                </>
              ) : (
                'It wasn’t in the top 1,000 the day before.'
              )}{' '}
              It takes the top spot from {prevTop.title}.
            </P>
            <RankBars
              items={arts.slice(0, 5).map((a) => ({ key: a.article, label: a.title, value: a.views, href: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.article)}` }))}
              format={(v) => `${fmtInt(v)} views`}
            />
          </>
        ),
      })
    }
  }

  return out.sort((a, b) => b.time - a.time)
}

function LaunchBody({ l, now }: { l: Launch; now: number }) {
  const when = new Date(l.net).toLocaleString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC'
  const done = l.net < now
  const rows: [string, string][] = [
    ['Rocket', l.rocket],
    ['Payload', l.mission || '—'],
    ['Mission type', l.missionType || '—'],
    ['Orbit', l.orbit ?? '—'],
    ['Provider', l.provider],
    ['Pad', `${l.pad}, ${l.location}`],
    ['T-0', `${when} (${l.precision || 'precision unknown'})`],
    ['Status', l.statusName],
  ]
  return (
    <>
      <P>
        {done ? (
          <>
            {l.rocket} lifted off {relative(l.net, now)} carrying {l.mission || 'an unnamed payload'}. The outcome is recorded as{' '}
            <strong className="font-semibold">{l.statusName.toLowerCase()}</strong>.
          </>
        ) : (
          <>
            {cap(l.provider || 'A provider')}’s {l.rocket} is set to launch {l.mission || 'an unnamed payload'} from {l.location.split(',')[0]} at <Num tip={when}>{relative(l.net, now)}</Num>
            . Status: <strong className="font-semibold">{l.statusName.toLowerCase()}</strong>.
          </>
        )}
      </P>
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
