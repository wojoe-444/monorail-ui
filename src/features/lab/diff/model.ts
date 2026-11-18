import type { HnStory, Launch, MixSlot, Weather } from '@/features/lab/feeds'
import { weatherWords } from '@/features/lab/feeds'
import { flareClass, type CarbonSlot, type FuelShare, type KpPoint, type Quake, type WikiArticle, type XrayPoint } from '@/features/lab/sources'

/**
 * Diff: what the feeds said then vs what they say now, as unified-diff hunks.
 *
 * A Snapshot is a small, serializable digest of every feed. "Since last
 * visit" compares the one saved in prefs with a fresh one. The 1h / 6h / 24h
 * modes build a *virtual* earlier snapshot from the history the feeds carry
 * (quake times, half-hourly grid slots, observed Kp, the X-ray day, hourly
 * weather, the previous day's Wikipedia list, launches that have flown), so
 * the page works on a first visit too. Feeds with no history (Hacker News)
 * are marked as such in those modes rather than faked.
 */

export const SNAPSHOT_KEY = 'diff.snapshot'
export const LAST_SEEN_KEY = 'diff.lastSeen'
const HOUR = 3600_000
const DAY = 24 * HOUR

export interface Snapshot {
  t: number
  quakes?: { id: string; mag: number; place: string; time: number; depth: number }[]
  space?: { kp: number; kpMax?: number; kpMaxAt?: number; flareNow?: string; flarePeak?: string }
  grid?: { v: number; index: string; mix?: Record<string, number> }
  weather?: { temp: number; words?: string; tomorrowMax?: number }
  wiki?: { date: string; top: string[] }
  hn?: { id: number; title: string; score: number }[]
  launches?: { id: string; name: string; net: number; status: string }[]
}

export interface Feeds {
  now: number
  quakesMonth?: Quake[]
  kp?: KpPoint[]
  kpNow?: { time: number; kp: number }
  xray?: XrayPoint[]
  carbon?: CarbonSlot[]
  mix?: FuelShare[]
  mixDay?: MixSlot[]
  weather?: Weather
  wiki?: { date: Date; articles: WikiArticle[] }
  wikiPrev?: { date: Date; articles: WikiArticle[] }
  hn?: HnStory[]
  upcoming?: Launch[]
  previous?: Launch[]
}

const QUAKE_DAYS = 7
const mixRecord = (mix: FuelShare[]) => Object.fromEntries(mix.map((m) => [m.fuel, m.perc]))
const at = <T extends { time: number }>(list: T[] | undefined, t: number): T | undefined =>
  list?.reduce<T | undefined>((best, x) => (x.time <= t && (!best || x.time > best.time) ? x : best), undefined)

/** A digest of what every feed says right now. */
export function snapshotNow(f: Feeds): Snapshot {
  const s: Snapshot = { t: f.now }
  if (f.quakesMonth)
    s.quakes = f.quakesMonth
      .filter((q) => q.mag >= 4.5 && f.now - q.time < QUAKE_DAYS * DAY)
      .map((q) => ({ id: q.id, mag: q.mag, place: q.place, time: q.time, depth: Math.round(q.depth) }))
  if (f.kp || f.kpNow) {
    const predicted = (f.kp ?? []).filter((k) => k.kind === 'predicted' && k.time > f.now)
    const peak = predicted.reduce<KpPoint | undefined>((a, b) => (!a || b.kp > a.kp ? b : a), undefined)
    const day = (f.xray ?? []).filter((x) => f.now - x.time < DAY)
    const peakFlux = day.reduce((m, x) => Math.max(m, x.flux), 0)
    const last = f.xray?.at(-1)
    s.space = {
      kp: f.kpNow?.kp ?? f.kp?.filter((k) => k.kind !== 'predicted').at(-1)?.kp ?? 0,
      kpMax: peak?.kp,
      kpMaxAt: peak?.time,
      flareNow: last ? flareClass(last.flux) : undefined,
      flarePeak: peakFlux ? flareClass(peakFlux) : undefined,
    }
  }
  if (f.carbon) {
    const slot = f.carbon.find((x) => x.from <= f.now && f.now < x.to)
    if (slot) s.grid = { v: slot.actual ?? slot.forecast, index: slot.index, mix: f.mix ? mixRecord(f.mix) : undefined }
  }
  if (f.weather) {
    const wx = f.weather
    const ti = wx.daily.time.indexOf(wx.current.time.slice(0, 10))
    s.weather = { temp: wx.current.temp, words: weatherWords(wx.current.code), tomorrowMax: ti >= 0 ? wx.daily.max[ti + 1] : undefined }
  }
  if (f.wiki) s.wiki = { date: f.wiki.date.toISOString().slice(0, 10), top: f.wiki.articles.slice(0, 20).map((a) => a.title) }
  if (f.hn) s.hn = f.hn.slice(0, 30).map((h) => ({ id: h.id, title: h.title, score: h.score }))
  if (f.upcoming) s.launches = f.upcoming.filter((l) => l.net > f.now - HOUR).slice(0, 5).map((l) => ({ id: l.id, name: l.name, net: l.net, status: l.status }))
  return s
}

/**
 * What the feeds would have said `windowMs` ago, rebuilt from their history.
 * Returns the snapshot plus the files that carry no history for this window.
 */
export function snapshotAgo(f: Feeds, windowMs: number): { snap: Snapshot; noHistory: Record<string, string> } {
  const t = f.now - windowMs
  const noHistory: Record<string, string> = {}
  const s: Snapshot = { t }
  if (f.quakesMonth)
    s.quakes = f.quakesMonth
      .filter((q) => q.mag >= 4.5 && q.time <= t && t - q.time < QUAKE_DAYS * DAY)
      .map((q) => ({ id: q.id, mag: q.mag, place: q.place, time: q.time, depth: Math.round(q.depth) }))
  if (f.kp) {
    const k = at(
      f.kp.filter((x) => x.kind !== 'predicted'),
      t,
    )
    const x = windowMs <= DAY ? at(f.xray, t) : undefined
    if (k) s.space = { kp: k.kp, flareNow: x ? flareClass(x.flux) : undefined }
  }
  if (f.carbon) {
    const slot = f.carbon.find((x) => x.from <= t && t < x.to)
    const mixAt = f.mixDay?.find((m) => m.from <= t && t < m.to)
    if (slot) s.grid = { v: slot.actual ?? slot.forecast, index: slot.index, mix: mixAt ? mixRecord(mixAt.mix) : undefined }
  }
  if (f.weather) {
    // Hourly times are city-local; find the hour that is `windowMs` before the current hour.
    const cur = f.weather.hourly.time.indexOf(`${f.weather.current.time.slice(0, 13)}:00`)
    const i = cur - Math.round(windowMs / HOUR)
    if (cur >= 0 && i >= 0) s.weather = { temp: f.weather.hourly.temp[i] }
  }
  if (f.wiki) {
    if (windowMs >= DAY && f.wikiPrev) s.wiki = { date: f.wikiPrev.date.toISOString().slice(0, 10), top: f.wikiPrev.articles.slice(0, 20).map((a) => a.title) }
    else {
      s.wiki = { date: f.wiki.date.toISOString().slice(0, 10), top: f.wiki.articles.slice(0, 20).map((a) => a.title) }
      noHistory['wikipedia.json'] = 'Wikipedia publishes one list a day, so nothing changes inside this window.'
    }
  }
  if (f.hn) {
    s.hn = f.hn.slice(0, 30).map((h) => ({ id: h.id, title: h.title, score: h.score }))
    noHistory['hackernews.json'] = 'Hacker News keeps no ranking history. Compare with your last visit to see it move.'
  }
  if (f.upcoming) {
    // The manifest then: today's upcoming list plus whatever has flown since `t`.
    const flown = (f.previous ?? []).filter((l) => l.net > t && l.net <= f.now)
    const then = [...flown, ...f.upcoming.filter((l) => l.net > t)].sort((a, b) => a.net - b.net).slice(0, 5)
    s.launches = then.map((l) => ({ id: l.id, name: l.name, net: l.net, status: flown.includes(l) ? 'scheduled' : l.status }))
  }
  return { snap: s, noHistory }
}

// ── Diffing ─────────────────────────────────────────────────────────────────

export type LineKind = '+' | '-' | ' ' | '…'
export interface Line {
  kind: LineKind
  text: string
  tip?: string
}
export interface Hunk {
  title: string
  lines: Line[]
}
export interface FileDiff {
  file: string
  summary: string
  link: { path: string; label: string }
  hunks: Hunk[]
  added: number
  removed: number
  /** The earlier snapshot had no such file (a feed that failed then). */
  isNew?: boolean
  /** No history for this mode; the file is shown unchanged with a note. */
  note?: string
}

interface Item {
  key: string
  /** What's compared. */
  text: string
  /** What's shown, when it differs from `text` (e.g. with a rank prefix). */
  display?: string
  tip?: string
}

/** Keyed list diff: additions, removals and in-place changes, with unchanged runs folded to a little context. */
function listDiff(prev: Item[], cur: Item[], keep = 2): Line[] {
  const before = new Map(prev.map((p) => [p.key, p]))
  const now = new Set(cur.map((c) => c.key))
  const out: Line[] = []
  let run: Item[] = []
  const ctx = (r: Item): Line => ({ kind: ' ', text: r.display ?? r.text, tip: r.tip })
  const flush = (final: boolean) => {
    if (!run.length) return
    const leading = out.length === 0
    if (leading && final) {
      // Nothing changed at all: a few lines of context, then the count.
      run.slice(0, keep).forEach((r) => out.push(ctx(r)))
      if (run.length > keep) out.push({ kind: '…', text: `${run.length - keep} unchanged` })
    } else if (run.length <= keep * 2) run.forEach((r) => out.push(ctx(r)))
    else if (leading) {
      out.push({ kind: '…', text: `${run.length - keep} unchanged` })
      run.slice(-keep).forEach((r) => out.push(ctx(r)))
    } else if (final) {
      run.slice(0, keep).forEach((r) => out.push(ctx(r)))
      out.push({ kind: '…', text: `${run.length - keep} unchanged` })
    } else {
      run.slice(0, keep).forEach((r) => out.push(ctx(r)))
      out.push({ kind: '…', text: `${run.length - keep * 2} unchanged` })
      run.slice(-keep).forEach((r) => out.push(ctx(r)))
    }
    run = []
  }
  for (const c of cur) {
    const p = before.get(c.key)
    if (!p) {
      flush(false)
      out.push({ kind: '+', text: c.display ?? c.text, tip: c.tip })
    } else if (p.text !== c.text) {
      flush(false)
      out.push({ kind: '-', text: p.display ?? p.text, tip: p.tip })
      out.push({ kind: '+', text: c.display ?? c.text, tip: c.tip })
    } else run.push(c)
  }
  flush(true)
  for (const p of prev) if (!now.has(p.key)) out.push({ kind: '-', text: p.display ?? p.text, tip: p.tip })
  return out
}

/**
 * A ranked list compared by identity, not position: entries that came or went
 * are +/−; ones that only moved stay as context with "was #n", so a reshuffle
 * doesn't drown the real news.
 */
function rankedItems(list: { key: string; title: string; tip?: string }[], other: { key: string }[]): Item[] {
  const was = new Map(other.map((o, i) => [o.key, i + 1]))
  return list.map((x, i) => {
    const before = was.get(x.key)
    const move = before === undefined || before === i + 1 ? '' : `  (was #${before})`
    return { key: x.key, text: x.title, display: `#${pad(String(i + 1), 3)}${x.title}${move}`, tip: x.tip }
  })
}

function scalar(prev: string | undefined, cur: string | undefined): Line[] {
  if (prev === cur) return cur === undefined ? [] : [{ kind: ' ', text: cur }]
  const out: Line[] = []
  if (prev !== undefined) out.push({ kind: '-', text: prev })
  if (cur !== undefined) out.push({ kind: '+', text: cur })
  return out
}

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))
const utc = (ms: number) => new Date(ms).toISOString().slice(5, 16).replace('T', ' ') + ' UTC'
const kpWord = (kp: number) => (kp >= 5 ? `storm G${Math.min(5, Math.floor(kp) - 4)}` : kp >= 4 ? 'unsettled' : 'quiet')
const fF = (c: number) => `${Math.round(c * 1.8 + 32)}°F`
const near = (place: string) => (place.includes(' of ') ? place.slice(place.indexOf(' of ') + 4) : place)

function file(name: string, link: FileDiff['link'], hunks: Hunk[], summary: string, extra: Partial<FileDiff> = {}): FileDiff {
  const lines = hunks.flatMap((h) => h.lines)
  return {
    file: name,
    link,
    hunks: hunks.filter((h) => h.lines.length),
    summary,
    added: lines.filter((l) => l.kind === '+').length,
    removed: lines.filter((l) => l.kind === '-').length,
    ...extra,
  }
}

export function diffSnapshots(a: Snapshot, b: Snapshot, noHistory: Record<string, string> = {}): FileDiff[] {
  const files: FileDiff[] = []

  if (b.quakes) {
    const toItem = (q: NonNullable<Snapshot['quakes']>[number]): Item => ({
      key: q.id,
      text: `M${q.mag.toFixed(1)}  ${pad(near(q.place), 34)} ${pad(`${q.depth} km`, 7)} ${utc(q.time)}`,
      tip: q.place,
    })
    const prevIds = new Set((a.quakes ?? []).map((q) => q.id))
    const fresh = b.quakes.filter((q) => !prevIds.has(q.id))
    const biggest = fresh.reduce<(typeof fresh)[number] | undefined>((m, q) => (!m || q.mag > m.mag ? q : m), undefined)
    // Quakes that simply aged out of the 7-day window aren't news; only show removals USGS made.
    const prevKept = (a.quakes ?? []).filter((q) => b.t - q.time < QUAKE_DAYS * DAY)
    const sorted = (list: NonNullable<Snapshot['quakes']>) => [...list].sort((x, y) => y.time - x.time).map(toItem)
    files.push(
      file(
        'quakes.json',
        { path: '/lab/terminal', label: 'Terminal' },
        [{ title: `M4.5+, past ${QUAKE_DAYS} days`, lines: listDiff(sorted(prevKept), sorted(b.quakes), 1) }],
        fresh.length
          ? `${fresh.length} new ${fresh.length === 1 ? 'earthquake' : 'earthquakes'} of M4.5 or more, the largest M${biggest!.mag.toFixed(1)} near ${near(biggest!.place)}.`
          : 'No new earthquakes of M4.5 or more.',
        { isNew: !a.quakes },
      ),
    )
  }

  if (b.space) {
    const pa = a.space
    const pb = b.space
    const hunks: Hunk[] = [{ title: 'kp', lines: scalar(pa ? `Kp ${pa.kp.toFixed(2)}  ${kpWord(pa.kp)}` : undefined, `Kp ${pb.kp.toFixed(2)}  ${kpWord(pb.kp)}`) }]
    if (pb.kpMax !== undefined && pa?.kpMax !== undefined)
      hunks.push({ title: 'forecast', lines: scalar(`3-day peak Kp ${pa.kpMax.toFixed(2)}  ${utc(pa.kpMaxAt!)}`, `3-day peak Kp ${pb.kpMax.toFixed(2)}  ${utc(pb.kpMaxAt!)}`) })
    hunks.push({ title: 'x-ray', lines: scalar(pa?.flareNow && `now ${pa.flareNow}`, pb.flareNow && `now ${pb.flareNow}`) })
    if (pa?.flarePeak !== undefined || (pa && 'flarePeak' in pa)) hunks.push({ title: 'x-ray peak', lines: scalar(pa?.flarePeak && `24 h peak ${pa.flarePeak}`, pb.flarePeak && `24 h peak ${pb.flarePeak}`) })
    const dk = pa ? pb.kp - pa.kp : 0
    files.push(
      file(
        'space.json',
        { path: '/lab/terminal', label: 'Terminal' },
        hunks,
        !pa
          ? `Kp ${pb.kp.toFixed(1)}, ${kpWord(pb.kp)}.`
          : `${Math.abs(dk) < 0.34 ? `Kp held near ${pb.kp.toFixed(1)}` : `Kp ${dk > 0 ? 'rose' : 'fell'} from ${pa.kp.toFixed(1)} to ${pb.kp.toFixed(1)}`}${pb.flarePeak && pa.flarePeak !== pb.flarePeak && pa.flarePeak ? `; the day’s strongest flare is now ${pb.flarePeak}` : ''}.`,
        { isNew: !pa },
      ),
    )
  }

  if (b.grid) {
    const ga = a.grid
    const gb = b.grid
    const hunks: Hunk[] = [{ title: 'intensity', lines: scalar(ga && `${ga.v} gCO₂/kWh  ${ga.index}`, `${gb.v} gCO₂/kWh  ${gb.index}`) }]
    if (gb.mix && ga?.mix) {
      const fuels = Object.keys(gb.mix).sort((x, y) => gb.mix![y] - gb.mix![x])
      hunks.push({
        title: 'generation mix',
        lines: listDiff(
          fuels.map((k) => ({ key: k, text: `${pad(k, 9)} ${ga.mix![k]?.toFixed(1) ?? '0.0'}%` })),
          fuels.map((k) => ({ key: k, text: `${pad(k, 9)} ${gb.mix![k].toFixed(1)}%` })),
          3,
        ),
      })
    }
    const wind = (m?: Record<string, number>) => m?.wind
    const dv = ga ? gb.v - ga.v : 0
    files.push(
      file(
        'grid.json',
        { path: '/lab/grid-clock', label: 'Grid Clock' },
        hunks,
        !ga
          ? `GB grid at ${gb.v} g/kWh, ${gb.index}.`
          : Math.abs(dv) < 3
            ? `Carbon intensity held at about ${gb.v} g/kWh.`
            : `Carbon intensity ${dv < 0 ? 'fell' : 'rose'} from ${ga.v} to ${gb.v} g/kWh${wind(ga.mix) !== undefined && wind(gb.mix) !== undefined && Math.abs(wind(gb.mix)! - wind(ga.mix)!) >= 3 ? ` as wind ${wind(gb.mix)! > wind(ga.mix)! ? 'rose' : 'fell'} to ${Math.round(wind(gb.mix)!)}%` : ''}.`,
        { isNew: !ga },
      ),
    )
  }

  if (b.weather) {
    const wa = a.weather
    const wb = b.weather
    const hunks: Hunk[] = [{ title: 'new-york', lines: scalar(wa && `now ${fF(wa.temp)}${wa.words ? `  ${wa.words}` : ''}`, `now ${fF(wb.temp)}${wa && !wa.words ? '' : wb.words ? `  ${wb.words}` : ''}`) }]
    if (wa?.tomorrowMax !== undefined && wb.tomorrowMax !== undefined) hunks.push({ title: 'tomorrow', lines: scalar(`high ${fF(wa.tomorrowMax)}`, `high ${fF(wb.tomorrowMax)}`) })
    const dt = wa ? (wb.temp - wa.temp) * 1.8 : 0
    files.push(
      file(
        'weather.json',
        { path: '/lab/forecast', label: 'Forecast, Written' },
        hunks,
        !wa ? `New York is ${fF(wb.temp)}.` : Math.abs(dt) < 1 ? `New York is steady at ${fF(wb.temp)}.` : `New York ${dt > 0 ? 'warmed' : 'cooled'} ${Math.round(Math.abs(dt))}° to ${fF(wb.temp)}.`,
        { isNew: !wa },
      ),
    )
  }

  if (b.wiki) {
    const prevTop = a.wiki?.top ?? []
    const asList = (top: string[]) => top.map((t) => ({ key: t, title: t }))
    const entered = b.wiki.top.filter((t) => !prevTop.includes(t))
    const newNo1 = prevTop.length && prevTop[0] !== b.wiki.top[0]
    files.push(
      file(
        'wikipedia.json',
        { path: '/lab/attention', label: 'Attention' },
        [{ title: `top 20, ${b.wiki.date}`, lines: listDiff(rankedItems(asList(prevTop), []), rankedItems(asList(b.wiki.top), asList(prevTop)), 20) }],
        noHistory['wikipedia.json']
          ? 'Same list: Wikipedia publishes once a day.'
          : !a.wiki
            ? `“${b.wiki.top[0]}” leads the list.`
            : a.wiki.date === b.wiki.date
              ? 'Same day’s list as before; Wikipedia hasn’t published a new one yet.'
              : `${entered.length} new ${entered.length === 1 ? 'title' : 'titles'} in the top 20${newNo1 ? `; “${b.wiki.top[0]}” is the new #1` : `; “${b.wiki.top[0]}” is still #1`}.`,
        { isNew: !a.wiki, note: noHistory['wikipedia.json'] },
      ),
    )
  }

  if (b.hn) {
    const prev = a.hn ?? []
    const prevIds = new Set(prev.map((h) => h.id))
    // Rank and title are the line; scores change constantly, so they ride in the tooltip.
    const asList = (list: NonNullable<Snapshot['hn']>) => list.map((h) => ({ key: String(h.id), title: h.title, tip: `${h.score} points` }))
    const items = (list: NonNullable<Snapshot['hn']>, other: NonNullable<Snapshot['hn']> = []) => rankedItems(asList(list), asList(other))
    const entered = b.hn.filter((h) => !prevIds.has(h.id))
    files.push(
      file(
        'hackernews.json',
        { path: '/lab/terminal', label: 'Terminal' },
        [{ title: 'top 30', lines: noHistory['hackernews.json'] ? items(b.hn).slice(0, 3).map((i) => ({ kind: ' ' as const, text: i.display ?? i.text, tip: i.tip })) : listDiff(items(prev), items(b.hn, prev), 3) }],
        noHistory['hackernews.json']
          ? 'No history to compare against in this mode.'
          : !a.hn
            ? `“${b.hn[0]?.title}” is #1.`
            : `${entered.length} new ${entered.length === 1 ? 'story' : 'stories'} in the top 30${prev[0]?.id !== b.hn[0]?.id ? `; #1 is now “${b.hn[0]?.title}”` : ''}.`,
        { isNew: !a.hn && !noHistory['hackernews.json'], note: noHistory['hackernews.json'] },
      ),
    )
  }

  if (b.launches) {
    const show = (l: NonNullable<Snapshot['launches']>[number]) => `${pad(l.name, 44)} ${pad(l.status, 9)} ${utc(l.net)}`
    const prev = a.launches ?? []
    const curIds = new Set(b.launches.map((l) => l.id))
    const gone = prev.filter((l) => !curIds.has(l.id))
    const changed = b.launches.filter((l) => {
      const p = prev.find((x) => x.id === l.id)
      return p && show(p) !== show(l)
    })
    files.push(
      file(
        'launches.json',
        { path: '/lab/departures', label: 'Departures' },
        [{ title: 'next 5 on the manifest', lines: listDiff(prev.map((l) => ({ key: l.id, text: show(l) })), b.launches.map((l) => ({ key: l.id, text: show(l) })), 2) }],
        !a.launches
          ? `Next up: ${b.launches[0]?.name ?? 'nothing scheduled'}.`
          : gone.length || changed.length
            ? [gone.length ? `${gone.length} left the board (flown or scrubbed)` : '', changed.length ? `${changed.length} changed time or status` : ''].filter(Boolean).join('; ') + '.'
            : 'The next five launches are unchanged.',
        { isNew: !a.launches },
      ),
    )
  }

  return files
}
