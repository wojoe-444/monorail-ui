import {
  useCarbonWindow,
  useGenerationNow,
  useHackerNews,
  useKpForecast,
  useKpNow,
  useLaunchesUpcoming,
  useQuakesMonth,
  useRegions,
  useWeather,
  useWikiLatest,
  useXray,
  weatherWords,
  type Weather,
} from '@/features/lab/feeds'
import { CITIES, flareClass, type CarbonSlot, type City, type Quake } from '@/features/lab/sources'
import { useNow, type LiveData } from '@/features/lab/useLiveData'

import {
  bar,
  blank,
  center,
  columns,
  compact,
  dh,
  fit,
  hbar,
  lr,
  padL,
  padR,
  paginate,
  row,
  s,
  spark,
  upper,
  wrap,
  type Row,
  type Screen,
  type Tone,
} from './screen'

/**
 * Every page in the service. Each page is a hook: it reads the feeds it
 * needs (and only those, so opening P300 doesn't fetch earthquakes) and
 * returns its screens, one per subpage. `null` screens means still loading.
 */

export interface PageState {
  feeds: LiveData<unknown>[]
  screens: Screen[] | null
  source: string
}

export interface PageDef {
  n: number
  title: string
  use: () => PageState
}

export type Fastext = [label: string, page: number][]

const MIN = 60_000

// ── shared bits ────────────────────────────────────────────────────────────

const utcHm = (t: number) => new Date(t).toISOString().slice(11, 16)
const localHm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayMon = (t: number) => upper(new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))
const ukHm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })

function loading(title: string, what: string, feeds: LiveData<unknown>[]): Screen {
  const err = feeds.find((f) => f.error && f.data === undefined)?.error
  return [
    bar(title),
    blank(),
    err ? row(s('  PAGE UNAVAILABLE', 'danger', { bold: true })) : row(s('  FETCHING PAGE…', 'highlight')),
    blank(),
    ...wrap(
      err
        ? err.trim().startsWith('429')
          ? `${what} is limiting requests from this browser. The page fills in when it allows the next one.`
          : `${what} did not answer (${err.trim()}). It will try again by itself.`
        : `Waiting for ${what}.`,
      36,
    ).map((l) => row('  ' + l, undefined)),
  ]
}

const magTone = (m: number): Tone | undefined => (m >= 6.5 ? 'danger' : m >= 5 ? 'warning' : undefined)
const indexTone = (i: string): Tone => (i === 'very low' || i === 'low' ? 'success' : i === 'high' ? 'warning' : i === 'very high' ? 'danger' : 'fg')

function currentSlot(slots: CarbonSlot[], now: number) {
  return slots.find((x) => x.from <= now && now < x.to) ?? slots[0]
}

const LOW_CARBON = new Set(['wind', 'solar', 'nuclear', 'hydro'])
const fuelTone = (f: string): Tone => (LOW_CARBON.has(f) ? 's1' : f === 'gas' || f === 'coal' ? 's2' : 'muted')

function placeShort(p: string) {
  return upper(p.replace(/^\d+(\.\d+)? ?km [NSEW]{1,3} of /, ''))
}

function kpWord(kp: number) {
  if (kp >= 9) return 'STORM G5'
  if (kp >= 8) return 'STORM G4'
  if (kp >= 7) return 'STORM G3'
  if (kp >= 6) return 'STORM G2'
  if (kp >= 5) return 'STORM G1'
  if (kp >= 4) return 'ACTIVE'
  if (kp >= 3) return 'UNSETTLED'
  return 'QUIET'
}

function auroraLat(kp: number) {
  return Math.round(66.5 - 2.1 * kp)
}

const REGION_SHORT: Record<string, string> = {
  'North East England': 'NE ENGLAND',
  'North West England': 'NW ENGLAND',
  'North Wales & Merseyside': 'N WALES&MERSEY',
  'South East England': 'SE ENGLAND',
  'South West England': 'SW ENGLAND',
}
const regionShort = (n: string) => REGION_SHORT[n] ?? upper(n)

// ── 100 index ──────────────────────────────────────────────────────────────

const INDEX: [string, number][] = [
  ['HEADLINES', 101],
  ['EARTHQUAKES, LAST 24 HOURS', 200],
  ['STRONGEST QUAKES, 30 DAYS', 201],
  ['GB GRID NOW', 300],
  ['GB GRID BY REGION', 301],
  ['GB GRID, 36 HOURS', 302],
  ['SPACE WEATHER', 400],
  ['KP INDEX, 5 DAYS', 401],
  ['SOLAR X-RAYS, 24 HOURS', 402],
  ['WEATHER, FIVE CITIES', 500],
  ['WIKIPEDIA MOST READ', 600],
  ['ROCKET LAUNCHES', 700],
  ['HACKER NEWS', 800],
]

const P100: PageDef = {
  n: 100,
  title: 'INDEX',
  use: () => ({
    feeds: [],
    source: 'Lab Pages index',
    screens: [
      [
        dh(row(s(center('LAB PAGES'), undefined, { bg: 'primary', bold: true }))),
        blank(),
        row(s(center('LIVE PUBLIC DATA, ONE PAGE AT A TIME'), 'muted')),
        blank(),
        ...INDEX.map(([t, n]) => lr(s('  ' + t, 'fg'), s(`${n}  `, 'highlight', { go: n, bold: true }), true)),
        blank(),
        row(s('  Type a page number, or ← → to browse.', 'muted')),
        row(s('  ↑ ↓ change subpage. Colored keys below.', 'muted')),
      ],
    ],
  }),
}

// ── 101 headlines ──────────────────────────────────────────────────────────

const P101: PageDef = {
  n: 101,
  title: 'HEADLINES',
  use: () => {
    const now = useNow(MIN)
    const quakes = useQuakesMonth()
    const carbon = useCarbonWindow()
    const gen = useGenerationNow()
    const kp = useKpNow()
    const xray = useXray()
    const nyc = useWeather(CITIES[0])
    const wiki = useWikiLatest()
    const launches = useLaunchesUpcoming()
    const hn = useHackerNews(5)
    const items: [string | null, number][] = []

    const day = quakes.data?.filter((q) => q.time > now - 86_400_000)
    const big = day?.length ? day.reduce((m, q) => (q.mag > m.mag ? q : m)) : undefined
    items.push([big ? `M${big.mag.toFixed(1)} QUAKE ${placeShort(big.place)}, ${day!.length} M2.5+ IN 24H` : quakes.data ? 'NO M2.5+ QUAKES IN 24H' : null, 200])

    const slot = carbon.data && currentSlot(carbon.data, now)
    const top = gen.data && [...gen.data.mix].sort((a, b) => b.perc - a.perc)[0]
    items.push([slot ? `GB GRID ${slot.actual ?? slot.forecast}G CO2/KWH, ${upper(slot.index)}${top ? `. ${upper(top.fuel)} LEADS AT ${top.perc.toFixed(0)}%` : ''}` : null, 300])

    const x = xray.data?.at(-1)
    items.push([kp.data ? `KP ${kp.data.kp.toFixed(1)}, ${kpWord(kp.data.kp)}${x ? `. SUN AT ${flareClass(x.flux)}` : ''}` : null, 400])

    items.push([nyc.data ? `NEW YORK ${Math.round(nyc.data.current.temp)}C AND ${upper(weatherWords(nyc.data.current.code))}, FEELS ${Math.round(nyc.data.current.feels)}C` : null, 501])

    const w = wiki.data?.articles[0]
    items.push([w ? `MOST READ: ${upper(w.title)}, ${compact(w.views)} READERS` : wiki.error ? 'WIKIPEDIA FIGURES NOT OUT YET' : null, 600])

    const next = launches.data?.find((l) => l.net > now && ['Second', 'Minute', 'Hour'].includes(l.precision))
    items.push([next ? `NEXT LAUNCH ${upper(next.rocket)} IN ${hoursText(next.net - now)}, ${upper(next.mission)}` : launches.error && !launches.data ? 'LAUNCH LIST UNAVAILABLE' : null, 700])

    const h = hn.data?.[0]
    items.push([h ? `HN: ${upper(h.title)}` : null, 800])

    const rows: Row[] = [bar('HEADLINES', 'primary', dayMon(now)), blank()]
    for (const [text, n] of items) {
      const lines = text ? wrap(text, 33) : ['…']
      lines.slice(0, 2).forEach((l, i) => {
        rows.push(i === 0 ? row(s(' ' + padR(l, 34), text ? 'fg' : 'muted'), s(` ${n}`, 'highlight', { go: n, bold: true })) : row(s(' ' + l, 'fg')))
      })
      rows.push(blank())
    }
    return {
      feeds: [quakes, carbon, gen, kp, xray, nyc, wiki, launches, hn],
      source: 'USGS · NESO · NOAA SWPC · Open-Meteo · Wikimedia · Launch Library · HN',
      screens: [rows.slice(0, 23)],
    }
  },
}

function hoursText(ms: number) {
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}M`
  if (h < 48) return `${h}H`
  return `${Math.round(h / 24)} DAYS`
}

// ── 200 / 201 earthquakes ──────────────────────────────────────────────────

function quakeRows(list: Quake[], when: (q: Quake) => string): Row[] {
  return list.map((q) => row(s(' ' + padR(when(q), 6), 'muted'), s(padL(q.mag.toFixed(1), 4), magTone(q.mag) ?? 'fg', { bold: q.mag >= 5 }), s('  ' + fit(placeShort(q.place), 27), 'fg', { href: q.url })))
}

const P200: PageDef = {
  n: 200,
  title: 'EARTHQUAKES 24H',
  use: () => {
    const now = useNow(MIN)
    const q = useQuakesMonth()
    if (!q.data) return { feeds: [q], source: 'USGS', screens: [loading('EARTHQUAKES · 24 HOURS', 'the USGS feed', [q])] }
    const day = q.data.filter((x) => x.time > now - 86_400_000).reverse()
    const big = day.length ? day.reduce((m, x) => (x.mag > m.mag ? x : m)) : undefined
    const pages = paginate(day, 18, 4)
    return {
      feeds: [q],
      source: 'USGS · M2.5+ worldwide',
      screens: pages.map((chunk) => [
        bar('EARTHQUAKES · LAST 24 HOURS', 'primary'),
        row(s(` ${day.length} M2.5+ WORLDWIDE`, 'fg', { bold: true }), big ? s(`  LARGEST M${big.mag.toFixed(1)}`, magTone(big.mag) ?? 'fg') : ''),
        row(s(' UTC    MAG  WHERE', 'muted')),
        ...(chunk.length ? quakeRows(chunk, (x) => utcHm(x.time)) : [row(s('  No M2.5+ quakes in the last 24 hours.', 'muted'))]),
        ...pad(18 - chunk.length),
        row(s(' 201', 'highlight', { go: 201, bold: true }), s(' STRONGEST IN 30 DAYS', 'muted')),
      ]),
    }
  },
}

const P201: PageDef = {
  n: 201,
  title: 'STRONGEST 30D',
  use: () => {
    const q = useQuakesMonth()
    if (!q.data) return { feeds: [q], source: 'USGS', screens: [loading('STRONGEST QUAKES · 30 DAYS', 'the USGS feed', [q])] }
    const top = [...q.data].sort((a, b) => b.mag - a.mag).slice(0, 18)
    const n6 = q.data.filter((x) => x.mag >= 6).length
    return {
      feeds: [q],
      source: 'USGS · M2.5+ worldwide',
      screens: [
        [
          bar('STRONGEST QUAKES · 30 DAYS', 'primary'),
          row(s(` ${q.data.length.toLocaleString('en-US')} QUAKES M2.5+, ${n6} OF THEM M6+`, 'fg', { bold: true })),
          row(s(' DATE   MAG  WHERE', 'muted')),
          ...quakeRows(top, (x) => dayMon(x.time)),
          ...pad(18 - top.length),
          row(s(' 200', 'highlight', { go: 200, bold: true }), s(' LAST 24 HOURS', 'muted')),
        ],
      ],
    }
  },
}

function pad(n: number): Row[] {
  return Array.from({ length: Math.max(0, n) }, blank)
}

// ── 300 / 301 / 302 GB grid ────────────────────────────────────────────────

const P300: PageDef = {
  n: 300,
  title: 'GB GRID',
  use: () => {
    const now = useNow(MIN)
    const c = useCarbonWindow()
    const g = useGenerationNow()
    if (!c.data || !g.data) return { feeds: [c, g], source: 'NESO', screens: [loading('GB GRID NOW', 'the NESO carbon API', [c, g])] }
    const slot = currentSlot(c.data, now)
    const v = slot.actual ?? slot.forecast
    const ahead = c.data.filter((x) => x.from >= slot.from && x.from < now + 86_400_000)
    const lo = ahead.reduce((m, x) => (x.forecast < m.forecast ? x : m))
    const hi = ahead.reduce((m, x) => (x.forecast > m.forecast ? x : m))
    const mix = [...g.data.mix].filter((f) => f.perc > 0).sort((a, b) => b.perc - a.perc)
    const lowShare = g.data.mix.filter((f) => LOW_CARBON.has(f.fuel)).reduce((t, f) => t + f.perc, 0)
    return {
      feeds: [c, g],
      source: 'NESO Carbon Intensity API',
      screens: [
        [
          bar('GB GRID · CARBON INTENSITY', 'primary', ukHm(slot.from) + ' UK'),
          blank(),
          dh(row(s(`  ${v}`, 'fg', { bold: true }), s(' G CO2/KWH  ', 'muted'), s(upper(slot.index), indexTone(slot.index), { bold: true }))),
          blank(),
          row(s(`  ${slot.actual === null ? 'FORECAST' : 'MEASURED'} FOR THIS HALF HOUR`, 'muted')),
          blank(),
          row(s('  NEXT 24 HOURS', 'muted')),
          row(s('  LOWEST  ', 'fg'), s(padL(String(lo.forecast), 3), 'success', { bold: true }), s(` G AT ${ukHm(lo.from)} UK`, 'fg')),
          row(s('  HIGHEST ', 'fg'), s(padL(String(hi.forecast), 3), 'warning', { bold: true }), s(` G AT ${ukHm(hi.from)} UK`, 'fg')),
          blank(),
          bar(`MIX NOW · ${Math.round(lowShare)}% LOW-CARBON`, 'muted'),
          ...mix.slice(0, 8).map((f) => row(s('  ' + padR(upper(f.fuel), 9), 'fg'), s(padR(hbar(f.perc / 50, 21), 22), fuelTone(f.fuel), { thin: true }), s(padL(`${f.perc.toFixed(1)}%`, 6), 'fg'))),
          ...pad(8 - Math.min(8, mix.length)),
          row(s('  ■', 's1'), s(' LOW-CARBON  ', 'muted'), s('■', 's2'), s(' FOSSIL  ', 'muted'), s('■', 'muted'), s(' OTHER', 'muted')),
        ],
      ],
    }
  },
}

const P301: PageDef = {
  n: 301,
  title: 'GRID REGIONS',
  use: () => {
    const r = useRegions()
    if (!r.data) return { feeds: [r], source: 'NESO', screens: [loading('GB GRID BY REGION', 'the NESO regional API', [r])] }
    const list = r.data.filter((x) => x.id <= 14).sort((a, b) => a.forecast - b.forecast)
    const max = Math.max(1, ...list.map((x) => x.forecast))
    return {
      feeds: [r],
      source: 'NESO Carbon Intensity API · regional',
      screens: [
        [
          bar('GB GRID BY REGION · CLEANEST FIRST', 'primary'),
          row(s(' REGION         G/KWH', 'muted')),
          ...list.map((x) =>
            row(s(' ' + padR(regionShort(x.name), 14), 'fg'), s(padL(String(x.forecast), 4), 'fg', { bold: true }), s(' ' + padR(hbar(x.forecast / max, 10), 11), 's1', { thin: true }), s(padR(upper(x.index), 9), indexTone(x.index))),
          ),
          ...pad(14 - list.length),
          blank(),
          ...wrap(
            `${list[0].name} runs ${list.at(-1)!.forecast > 0 && list[0].forecast === 0 ? 'on almost no carbon' : `at ${list[0].forecast} g`} while ${list.at(-1)!.name} is at ${list.at(-1)!.forecast} g.`,
            38,
          ).map((l) => row(s(' ' + l, 'muted'))),
        ],
      ],
    }
  },
}

const P302: PageDef = {
  n: 302,
  title: 'GRID 36H',
  use: () => {
    const now = useNow(MIN)
    const c = useCarbonWindow()
    if (!c.data) return { feeds: [c], source: 'NESO', screens: [loading('GB GRID · 36 HOURS', 'the NESO carbon API', [c])] }
    // One column per hour: 12 back, 24 ahead.
    const start = Math.floor(now / 3_600_000) * 3_600_000 - 12 * 3_600_000
    const hours = Array.from({ length: 36 }, (_, i) => start + i * 3_600_000)
    const vals = hours.map((t) => {
      const inHour = c.data!.filter((x) => x.from >= t && x.from < t + 3_600_000)
      if (!inHour.length) return null
      return inHour.reduce((sum, x) => sum + (x.actual ?? x.forecast), 0) / inHour.length
    })
    const max = Math.ceil(Math.max(50, ...vals.map((v) => v ?? 0)) / 50) * 50
    const nowCol = 12
    const chart = columns(vals, {
      height: 12,
      max,
      tone: (i) => (i < nowCol ? 'fg' : 's1'),
      gutter: 4,
      label: (r) => (r === 0 ? String(max) : r === 6 ? String(max / 2) : r === 11 ? '0' : ''),
    })
    const marks = '    ' + hours.map((t, i) => (i === nowCol ? '▲' : new Date(t).getUTCHours() % 6 === 0 ? '┴' : '─')).join('')
    const labels = hours.reduce((acc, t, i) => {
      if (new Date(t).getUTCHours() % 6 === 0 && i + 4 + 5 <= 40) acc[i] = ukHm(t)
      return acc
    }, {} as Record<number, string>)
    let lab = ''
    for (let col = 0; col < 36; col++) {
      const at = Math.max(0, col - 2)
      if (labels[col] && lab.length < at) lab = lab.padEnd(at) + labels[col]
    }
    return {
      feeds: [c],
      source: 'NESO Carbon Intensity API',
      screens: [
        [
          bar('GB GRID · G CO2/KWH, 36 HOURS', 'primary'),
          row(s(' HOURLY. ', 'muted'), s('■', 'fg'), s(' MEASURED  ', 'muted'), s('■', 's1'), s(' FORECAST  ', 'muted'), s('▲', 'highlight'), s(' NOW', 'muted')),
          blank(),
          ...chart,
          row(s(marks.slice(0, 4 + nowCol), 'muted'), s('▲', 'highlight', { bold: true }), s(marks.slice(5 + nowCol), 'muted')),
          row(s('    ' + lab, 'muted')),
          blank(),
          ...wrap(dirtiestCleanest(c.data, now), 38).map((l) => row(s(' ' + l, 'fg'))),
        ],
      ],
    }
  },
}

function dirtiestCleanest(slots: CarbonSlot[], now: number): string {
  const ahead = slots.filter((x) => x.from > now && x.from < now + 86_400_000)
  if (!ahead.length) return ''
  const lo = ahead.reduce((m, x) => (x.forecast < m.forecast ? x : m))
  const hi = ahead.reduce((m, x) => (x.forecast > m.forecast ? x : m))
  return `CLEANEST AHEAD ${ukHm(lo.from)} AT ${lo.forecast} G. DIRTIEST ${ukHm(hi.from)} AT ${hi.forecast} G.`
}

// ── 400 / 401 / 402 space weather ──────────────────────────────────────────

const P400: PageDef = {
  n: 400,
  title: 'SPACE WEATHER',
  use: () => {
    const now = useNow(MIN)
    const kp = useKpNow()
    const f = useKpForecast()
    const x = useXray()
    if (!kp.data || !x.data) return { feeds: [kp, f, x], source: 'NOAA SWPC', screens: [loading('SPACE WEATHER', 'NOAA SWPC', [kp, x])] }
    const k = kp.data.kp
    const ahead = f.data?.filter((p) => p.kind === 'predicted' && p.time > now) ?? []
    const peak = ahead.length ? ahead.reduce((m, p) => (p.kp > m.kp ? p : m)) : undefined
    const xNow = x.data.at(-1)!
    const xPeak = x.data.reduce((m, p) => (p.flux > m.flux ? p : m))
    const storm = k >= 5
    return {
      feeds: [kp, f, x],
      source: 'NOAA Space Weather Prediction Center',
      screens: [
        [
          bar('SPACE WEATHER', 'primary', `${localHm(kp.data.time)} LOCAL`),
          blank(),
          dh(row(s(`  KP ${k.toFixed(1)}  `, 'fg', { bold: true }), s(kpWord(k), storm ? 'warning' : 'success', { bold: true }))),
          blank(),
          row(s('  PLANETARY K INDEX, 0 CALM TO 9 SEVERE', 'muted')),
          blank(),
          peak ? row(s('  NEXT 3 DAYS PEAK ', 'muted'), s(`KP ${peak.kp.toFixed(1)}`, peak.kp >= 5 ? 'warning' : 'fg', { bold: true }), s(` ${dayMon(peak.time)} ${utcHm(peak.time)}Z`, 'fg')) : blank(),
          blank(),
          row(s('  SOLAR X-RAYS NOW  ', 'muted'), s(flareClass(xNow.flux), xNow.flux >= 1e-5 ? 'warning' : 'fg', { bold: true })),
          row(s('  24H PEAK          ', 'muted'), s(flareClass(xPeak.flux), xPeak.flux >= 1e-5 ? 'warning' : 'fg', { bold: true }), s(` AT ${utcHm(xPeak.time)}Z`, 'fg')),
          blank(),
          bar('AURORA', 'muted'),
          ...wrap(`At Kp ${k.toFixed(0)} the aurora can reach about ${auroraLat(k)}° geomagnetic latitude${k < 4 ? ': northern Scandinavia, Iceland, Alaska.' : k < 6 ? ': Scotland, southern Canada.' : ': mid-latitudes, well beyond the usual oval.'}`, 36).map((l) =>
            row(s('  ' + l, 'fg')),
          ),
          blank(),
          lr(s('  KP, 5 DAYS', 'fg'), s('401  ', 'highlight', { go: 401, bold: true }), true),
          lr(s('  X-RAYS, 24 HOURS', 'fg'), s('402  ', 'highlight', { go: 402, bold: true }), true),
        ],
      ],
    }
  },
}

const P401: PageDef = {
  n: 401,
  title: 'KP INDEX',
  use: () => {
    const f = useKpForecast()
    if (!f.data) return { feeds: [f], source: 'NOAA SWPC', screens: [loading('KP INDEX · 5 DAYS', 'NOAA SWPC', [f])] }
    const firstPred = f.data.findIndex((p) => p.kind === 'predicted')
    const startAt = Math.max(0, (firstPred < 0 ? f.data.length : firstPred) - 12)
    const pts = f.data.slice(startAt, startAt + 36)
    const chart = columns(
      pts.map((p) => Math.max(0.15, p.kp)),
      {
        height: 9,
        max: 9,
        tone: (i) => (pts[i].kp >= 5 ? 'warning' : pts[i].kind === 'predicted' ? 's1' : 'fg'),
        gutter: 4,
        label: (r) => String(9 - r),
      },
    )
    let days = '    '
    pts.forEach((p, i) => {
      const d = new Date(p.time)
      if (d.getUTCHours() === 0 && days.length <= 4 + i) days = days.padEnd(4 + i) + upper(d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }))
    })
    const peak = pts.reduce((m, p) => (p.kp > m.kp ? p : m))
    return {
      feeds: [f],
      source: 'NOAA SWPC · 3-hourly Kp',
      screens: [
        [
          bar('KP INDEX · 3-HOURLY, UTC', 'primary'),
          row(s(' ■', 'fg'), s(' OBSERVED  ', 'muted'), s('■', 's1'), s(' PREDICTED  ', 'muted'), s('■', 'warning'), s(' STORM 5+', 'muted')),
          blank(),
          ...chart,
          row(s('    ' + '─'.repeat(pts.length), 'muted')),
          row(s(days, 'muted')),
          blank(),
          row(s(' PEAK IN VIEW ', 'muted'), s(`KP ${peak.kp.toFixed(2)}`, peak.kp >= 5 ? 'warning' : 'fg', { bold: true }), s(` ${dayMon(peak.time)} ${utcHm(peak.time)}Z`, 'fg'), s(peak.kind === 'predicted' ? ' FCST' : '', 'muted')),
          row(s(' G1 STORM STARTS AT KP 5.', 'muted')),
        ],
      ],
    }
  },
}

const P402: PageDef = {
  n: 402,
  title: 'SOLAR X-RAYS',
  use: () => {
    const x = useXray()
    if (!x.data) return { feeds: [x], source: 'NOAA SWPC', screens: [loading('SOLAR X-RAYS', 'NOAA SWPC GOES', [x])] }
    const now = x.data.at(-1)!
    const t0 = x.data[0].time
    const span = now.time - t0 || 1
    const bins: number[] = new Array(36).fill(0)
    for (const p of x.data) {
      const i = Math.min(35, Math.floor(((p.time - t0) / span) * 36))
      bins[i] = Math.max(bins[i], p.flux)
    }
    // Five decades A..X: value is how many decades above 1e-8, 0..5.
    const vals = bins.map((v) => (v > 0 ? Math.max(0.1, Math.log10(v) + 8) : null))
    const CL = ['X', 'M', 'C', 'B', 'A']
    const chart = columns(vals, { height: 5, max: 5, tone: (i) => (bins[i] >= 1e-5 ? 'warning' : 's1'), gutter: 3, label: (r) => CL[r] })
    const peak = x.data.reduce((m, p) => (p.flux > m.flux ? p : m))
    return {
      feeds: [x],
      source: 'NOAA SWPC · GOES 0.1–0.8 nm',
      screens: [
        [
          bar('SOLAR X-RAYS · GOES', 'primary', utcHm(now.time) + 'Z'),
          blank(),
          dh(row(s('  NOW ', 'muted'), s(flareClass(now.flux), now.flux >= 1e-5 ? 'warning' : 'fg', { bold: true }), s(now.flux >= 1e-4 ? '  MAJOR FLARE' : now.flux >= 1e-5 ? '  FLARE' : '  NO FLARE', now.flux >= 1e-5 ? 'warning' : 'muted'))),
          blank(),
          row(s(`  ${now.flux.toExponential(1)} W/M2 · 24H PEAK `, 'muted'), s(flareClass(peak.flux), peak.flux >= 1e-5 ? 'warning' : 'fg', { bold: true })),
          blank(),
          row(s(' PEAK FLUX PER 40 MIN, LOG SCALE', 'muted')),
          ...chart,
          row(s('   ' + '─'.repeat(36), 'muted')),
          row(s(`   ${padR('24H AGO', 18)}${padL('NOW ' + utcHm(now.time) + 'Z', 18)}`, 'muted')),
          blank(),
          ...wrap('Each class is ten times the one below. C is common; M flares can black out HF radio on the day side; X is rare and strong.', 38).map((l) => row(s(' ' + l, 'fg'))),
        ],
      ],
    }
  },
}

// ── 500 weather ────────────────────────────────────────────────────────────

function nowIndex(w: Weather) {
  return Math.max(0, w.hourly.time.indexOf(w.current.time.slice(0, 13) + ':00'))
}
function todayIndex(w: Weather) {
  return Math.max(0, w.daily.time.indexOf(w.current.time.slice(0, 10)))
}

const P500: PageDef = {
  n: 500,
  title: 'WEATHER',
  use: () => {
    const all = [useWeather(CITIES[0]), useWeather(CITIES[1]), useWeather(CITIES[2]), useWeather(CITIES[3]), useWeather(CITIES[4])]
    const rows: Row[] = [bar('WEATHER · FIVE CITIES', 'primary'), blank(), row(s(' CITY        NOW   HI  LO  SKY', 'muted'))]
    all.forEach((w, i) => {
      const c = CITIES[i]
      if (!w.data) {
        rows.push(row(s(' ' + padR(upper(c.name), 11), 'fg'), s(' …', 'muted')))
      } else {
        const d = todayIndex(w.data)
        rows.push(
          row(
            s(' ' + padR(upper(c.name), 11), 'fg', { go: 501 + i }),
            s(padL(`${Math.round(w.data.current.temp)}C`, 4), 'fg', { bold: true }),
            s(padL(String(Math.round(w.data.daily.max[d])), 5), 'fg'),
            s(padL(String(Math.round(w.data.daily.min[d])), 4), 'muted'),
            s('  ' + fit(upper(weatherWords(w.data.current.code)), 13), 'fg'),
          ),
        )
      }
      rows.push(blank())
    })
    rows.push(bar('CITY PAGES', 'muted'))
    CITIES.forEach((c, i) => rows.push(lr(s('  ' + upper(c.name), 'fg'), s(`${501 + i}  `, 'highlight', { go: 501 + i, bold: true }), true)))
    return { feeds: all, source: 'Open-Meteo', screens: all.some((w) => w.data) ? [rows] : [loading('WEATHER · FIVE CITIES', 'Open-Meteo', all)] }
  },
}

function cityPage(i: number): PageDef {
  const c: City = CITIES[i]
  return {
    n: 501 + i,
    title: upper(c.name),
    use: () => {
      const w = useWeather(c)
      if (!w.data) return { feeds: [w], source: 'Open-Meteo', screens: [loading(`WEATHER · ${upper(c.name)}`, 'Open-Meteo', [w])] }
      const d = w.data
      const h = nowIndex(d)
      const t = todayIndex(d)
      const temps = d.hourly.temp.slice(h, h + 24)
      const rain = d.hourly.rainChance.slice(h, h + 24)
      const lo = Math.min(...temps)
      const hi = Math.max(...temps)
      const rainMax = Math.max(...rain)
      const hm = (iso: string) => iso.slice(11, 16)
      const fahrenheit = c.id === 'nyc' ? ` (${Math.round((d.current.temp * 9) / 5 + 32)}F)` : ''
      return {
        feeds: [w],
        source: 'Open-Meteo forecast',
        screens: [
          [
            bar(`WEATHER · ${upper(c.name)}`, 'primary', `${hm(d.current.time)} LOCAL`),
            blank(),
            dh(row(s(`  ${Math.round(d.current.temp)}C${fahrenheit}  `, 'fg', { bold: true }), s(upper(weatherWords(d.current.code)), 'highlight', { bold: true }))),
            blank(),
            row(s(`  FEELS ${Math.round(d.current.feels)}C · WIND ${Math.round(d.current.wind)} KM/H · HUMID ${d.current.humidity}%`, 'muted')),
            blank(),
            row(s('  TEMP   ', 'muted'), s(spark(temps), 's1'), s(` ${Math.round(lo)}/${Math.round(hi)}C`, 'fg')),
            row(s('  RAIN   ', 'muted'), s([...spark(rain, 0, 100)].map((ch, k) => (rain[k] > 0 ? ch : '·')).join(''), rainMax >= 50 ? 's1' : 'muted'), s(rainMax > 0 ? ` MAX ${rainMax}%` : ' NONE', 'fg')),
            row(s('         ' + padR('NOW', 12) + padL('+24H', 12), 'muted')),
            blank(),
            row(s(`  RISE ${hm(d.daily.sunrise[t])}  SET ${hm(d.daily.sunset[t])}  ${(d.daily.daylight[t] / 3600).toFixed(1)}H OF LIGHT`, 'fg')),
            blank(),
            bar('THE WEEK', 'muted'),
            row(s('  DAY   HI  LO  RAIN  SKY', 'muted')),
            ...d.daily.time.slice(t, t + 6).map((day, k) => {
              const j = t + k
              return row(
                s('  ' + padR(k === 0 ? 'TODAY' : upper(new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' })), 5), 'fg'),
                s(padL(String(Math.round(d.daily.max[j])), 4), 'fg', { bold: true }),
                s(padL(String(Math.round(d.daily.min[j])), 4), 'muted'),
                s(padL(`${d.daily.rainChance[j] ?? 0}%`, 6), (d.daily.rainChance[j] ?? 0) >= 60 ? 's1' : 'fg'),
                s('  ' + fit(upper(weatherWords(d.daily.code[j])), 14), 'fg'),
              )
            }),
          ],
        ],
      }
    },
  }
}

// ── 600 Wikipedia ──────────────────────────────────────────────────────────

const P600: PageDef = {
  n: 600,
  title: 'MOST READ',
  use: () => {
    const w = useWikiLatest()
    if (!w.data) return { feeds: [w], source: 'Wikimedia', screens: [loading('WIKIPEDIA MOST READ', 'Wikimedia pageviews', [w])] }
    const top = w.data.articles.slice(0, 30)
    const date = upper(w.data.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }))
    return {
      feeds: [w],
      source: 'Wikimedia · English Wikipedia pageviews',
      screens: paginate(top, 10, 3).map((chunk, p) => [
        bar('WIKIPEDIA · MOST READ', 'primary', date),
        row(s(' ENGLISH WIKIPEDIA, READERS PER ARTICLE', 'muted')),
        blank(),
        ...chunk.flatMap((a) => [
          row(s(padL(String(a.rank), 3), 'highlight', { bold: true }), s('  ' + padR(a.title, 27), 'fg', { href: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.article)}` }), s(padL(compact(a.views), 7), 'fg', { bold: true })),
          row(s('     ' + hbar(a.views / top[0].views, 27), 's1', { thin: true })),
        ]),
        ...pad(20 - chunk.length * 2),
        row(s(` PAGE ${p + 1} OF 3 · TURNS EVERY 8 SECONDS`, 'muted')),
      ]),
    }
  },
}

// ── 700 launches ───────────────────────────────────────────────────────────

const STATUS_WORD: Record<string, [string, Tone]> = {
  Go: ['GO', 'success'],
  TBC: ['TBC', 'info'],
  TBD: ['TBD', 'muted'],
  Hold: ['HOLD', 'warning'],
  'In Flight': ['FLYING', 'info'],
}

const P700: PageDef = {
  n: 700,
  title: 'LAUNCHES',
  use: () => {
    const now = useNow(MIN)
    const l = useLaunchesUpcoming()
    if (!l.data) return { feeds: [l], source: 'Launch Library 2', screens: [loading('ROCKET LAUNCHES', 'Launch Library 2', [l])] }
    const list = l.data.filter((x) => x.net > now - 3_600_000)
    return {
      feeds: [l],
      source: 'The Space Devs · Launch Library 2',
      screens: paginate(list, 9, 3).map((chunk) => [
        bar('ROCKET LAUNCHES · NEXT UP', 'primary'),
        row(s(' DATE   TIME   ROCKET            STATUS', 'muted')),
        blank(),
        ...chunk.flatMap((x) => {
          const firm = ['Second', 'Minute', 'Hour'].includes(x.precision)
          const dated = firm || x.precision === 'Day'
          const [word, tone] = STATUS_WORD[x.status] ?? [upper(x.status).slice(0, 6), 'muted' as Tone]
          return [
            row(
              s(' ' + padR(dated ? dayMon(x.net) : `NET ${upper(new Date(x.net).toLocaleDateString('en-GB', { month: 'short' }))}`, 7), 'fg'),
              s(padR(firm ? localHm(x.net) : '--:--', 7), firm ? 'fg' : 'muted'),
              s(padR(upper(x.rocket), 18), 'fg', { bold: true }),
              s(padR(word, 6), tone, { bold: true }),
            ),
            row(s('        ' + fit(upper(x.mission), 31), 'muted')),
          ]
        }),
        ...pad(18 - chunk.length * 2),
        row(s(' TIMES ARE LOCAL. TBD = DATE IS A GUESS.', 'muted')),
      ]),
    }
  },
}

// ── 800 Hacker News ────────────────────────────────────────────────────────

const P800: PageDef = {
  n: 800,
  title: 'HACKER NEWS',
  use: () => {
    const now = useNow(MIN)
    const hn = useHackerNews(20)
    if (!hn.data) return { feeds: [hn], source: 'Hacker News', screens: [loading('HACKER NEWS', 'the Hacker News API', [hn])] }
    return {
      feeds: [hn],
      source: 'Hacker News · top stories',
      screens: paginate(hn.data, 10, 2).map((chunk) => [
        bar('HACKER NEWS · TOP STORIES', 'primary'),
        blank(),
        ...chunk.flatMap((x) => [
          row(s(padL(String(x.rank), 3), 'highlight', { bold: true }), s(' ' + fit(x.title, 36), 'fg', { href: x.url })),
          row(s('    ' + fit(`${x.score} PTS · ${x.comments} COMMENTS · ${hoursText(now - x.time)} · ${x.domain}`, 36), 'muted')),
        ]),
      ]),
    }
  },
}

// ── registry ───────────────────────────────────────────────────────────────

export const PAGES: PageDef[] = [P100, P101, P200, P201, P300, P301, P302, P400, P401, P402, P500, ...CITIES.map((_, i) => cityPage(i)), P600, P700, P800]
export const PAGE_NUMBERS = PAGES.map((p) => p.n)
export const pageDef = (n: number) => PAGES.find((p) => p.n === n)

/** The four colored keys for a page: red, green, yellow, blue. */
export function fastext(n: number): Fastext {
  const sec = Math.floor(n / 100)
  if (sec === 2) return [['News', 101], n === 200 ? ['Top 30d', 201] : ['24h', 200], ['Grid', 300], ['Index', 100]]
  if (sec === 3) return [['Grid', 300], ['Regions', 301], ['36h', 302], ['Index', 100]]
  if (sec === 4) return [['Space', 400], ['Kp', 401], ['X-rays', 402], ['Index', 100]]
  if (sec === 5) return [['Cities', 500], ['NYC', 501], ['London', 502], ['Index', 100]]
  if (sec >= 6) return [['Wiki', 600], ['Rockets', 700], ['HN', 800], ['Index', 100]]
  return [['News', 101], ['Quakes', 200], ['Grid', 300], ['Weather', 500]]
}
