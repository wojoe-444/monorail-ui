import { OTHER_COLOR, SERIES_COLORS } from '@/components/charts/palette'
import type { WikiArticle } from '@/features/lab/sources'

/**
 * Story Arcs model: daily ranks for every article that reached the top N in
 * the window, and the moments that make each one's story (debut, best rank,
 * runs at #1, biggest jump, exit), each with an importance used to decide
 * which annotations get space.
 */

export interface Day {
  date: Date
  list: WikiArticle[]
}

export type EventKind = 'debut' | 'peak' | 'run' | 'jump' | 'exit' | 'reentry'

export interface ArcEvent {
  kind: EventKind
  day: number
  rank: number
  label: string
  importance: number
}

export interface Arc {
  article: string
  title: string
  /** Rank per day (1-based), or null when outside the day's published list. */
  ranks: (number | null)[]
  views: (number | null)[]
  total: number
  best: number
  bestDay: number
  daysInTop: number
  color: string
  /** Gets one of the six series colors (the biggest stories by readers). */
  featured: boolean
  events: ArcEvent[]
}

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
export const shortDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function buildArcs(days: Day[], n: number): Arc[] {
  const rankMaps = days.map((d) => new Map(d.list.map((a) => [a.article, a])))
  const members = new Set<string>()
  days.forEach((d) => d.list.slice(0, n).forEach((a) => members.add(a.article)))
  const inTop = (r: number | null) => r !== null && r <= n

  const arcs: Arc[] = [...members].map((article) => {
    const ranks = rankMaps.map((m) => m.get(article)?.rank ?? null)
    const views = rankMaps.map((m) => m.get(article)?.views ?? null)
    const total = views.reduce<number>((s, v) => s + (v ?? 0), 0)
    let best = Infinity
    let bestDay = 0
    ranks.forEach((r, i) => {
      if (r !== null && r < best) {
        best = r
        bestDay = i
      }
    })
    return {
      article,
      title: article.replace(/_/g, ' '),
      ranks,
      views,
      total,
      best,
      bestDay,
      daysInTop: ranks.filter(inTop).length,
      color: OTHER_COLOR,
      featured: false,
      events: [],
    }
  })
  arcs.sort((a, b) => b.total - a.total)
  arcs.forEach((a, i) => {
    if (i < SERIES_COLORS.length) {
      a.color = SERIES_COLORS[i]
      a.featured = true
    }
  })

  const last = days.length - 1
  arcs.forEach((a, idx) => {
    const weight = 1 - idx / Math.max(1, arcs.length) // bigger stories first
    const ev: ArcEvent[] = []
    // Runs at #1.
    let runStart = -1
    let longest = { start: -1, len: 0 }
    a.ranks.forEach((r, i) => {
      if (r === 1) {
        if (runStart < 0) runStart = i
        const len = i - runStart + 1
        if (len > longest.len) longest = { start: runStart, len }
      } else runStart = -1
    })
    if (longest.len >= 2) {
      ev.push({ kind: 'run', day: longest.start + Math.floor((longest.len - 1) / 2), rank: 1, label: `${longest.len} days at #1`, importance: 3 + longest.len * 0.2 + weight })
    } else if (inTop(a.best)) {
      ev.push({ kind: 'peak', day: a.bestDay, rank: a.best, label: a.best === 1 ? '#1' : `peak #${a.best}`, importance: 2.4 + (n - a.best) / n + weight })
    }
    // Debut (and re-entries) into the top N.
    for (let i = 0; i <= last; i++) {
      const r = a.ranks[i]
      if (!inTop(r)) continue
      const prev = i > 0 ? a.ranks[i - 1] : r
      if (i > 0 && !inTop(prev)) {
        const firstTime = !a.ranks.slice(0, i).some(inTop)
        const from = prev === null ? '' : ` from #${prev}`
        if (firstTime) ev.push({ kind: 'debut', day: i, rank: r!, label: `in at #${r}${from}`, importance: 2 + (n - r!) / n + weight })
        else ev.push({ kind: 'reentry', day: i, rank: r!, label: `back at #${r}`, importance: 1.2 + weight })
      }
    }
    // Biggest single-day climb within or into the top N.
    let jump = { day: -1, by: 0 }
    for (let i = 1; i <= last; i++) {
      const p = a.ranks[i - 1]
      const r = a.ranks[i]
      if (p === null || r === null || !inTop(r)) continue
      if (p - r > jump.by) jump = { day: i, by: p - r }
    }
    if (jump.by >= Math.max(3, n / 4) && !ev.some((e) => e.day === jump.day)) {
      ev.push({ kind: 'jump', day: jump.day, rank: a.ranks[jump.day]!, label: `▲${jump.by}`, importance: 1.6 + Math.min(1, jump.by / 50) + weight })
    }
    // Exit: last day in the top N before leaving for good.
    let lastIn = -1
    a.ranks.forEach((r, i) => inTop(r) && (lastIn = i))
    if (lastIn >= 0 && lastIn < last) {
      const after = a.ranks[lastIn + 1]
      ev.push({
        kind: 'exit',
        day: lastIn,
        rank: a.ranks[lastIn]!,
        label: after === null ? 'gone next day' : `→ #${after}`,
        importance: 1 + weight,
      })
    }
    a.events = ev
  })
  return arcs
}

/** The whole arc as one sentence. */
export function arcStory(a: Arc, days: Day[], n: number): string {
  const inTop = (r: number | null) => r !== null && r <= n
  const first = a.ranks.findIndex(inTop)
  let lastIn = -1
  a.ranks.forEach((r, i) => inTop(r) && (lastIn = i))
  const last = days.length - 1
  const peakViews = Math.max(...a.views.map((v) => v ?? 0))
  const peakViewDay = a.views.indexOf(peakViews)
  const ones = a.ranks.filter((r) => r === 1).length
  const parts: string[] = []
  if (first === 0) {
    parts.push(`${a.title} was already in the top ${n} on ${fmtDay(days[0].date)} at #${a.ranks[0]}`)
  } else {
    const prev = a.ranks[first - 1]
    parts.push(`${a.title} entered the top ${n} on ${fmtDay(days[first].date)} at #${a.ranks[first]}${prev ? `, up from #${prev}` : ''}`)
  }
  if (a.best < (a.ranks[first] ?? Infinity)) parts.push(`climbed to #${a.best} on ${shortDay(days[a.bestDay].date)}`)
  if (ones >= 2) parts.push(`spent ${ones} days at #1`)
  parts.push(`drew ${compact.format(peakViews)} readers on its biggest day (${shortDay(days[peakViewDay].date)})`)
  let end: string
  if (lastIn === last) end = `and sits at #${a.ranks[last]} on the latest day`
  else {
    const after = a.ranks[lastIn + 1]
    end = `and left the top ${n} after ${shortDay(days[lastIn].date)}${after ? `, falling to #${after}` : ', dropping out of the top 1,000'}`
  }
  const body = parts.join(', ')
  return `${body}, ${end}. ${a.daysInTop} of ${days.length} days in the top ${n}.`
}

/** A summary of the whole window. */
export function windowStory(arcs: Arc[], days: Day[], n: number): string {
  const ones = arcs.map((a) => ({ a, k: a.ranks.filter((r) => r === 1).length })).sort((x, y) => y.k - x.k)
  let jump = { a: arcs[0], by: 0, day: 0 }
  arcs.forEach((a) => a.events.forEach((e) => e.kind === 'jump' && Number(e.label.slice(1)) > jump.by && (jump = { a, by: Number(e.label.slice(1)), day: e.day })))
  const brief = arcs.filter((a) => a.daysInTop <= 2).length
  const steady = arcs.filter((a) => a.daysInTop === days.length).length
  const s = [`In ${days.length} days, ${arcs.length} articles reached the top ${n}.`]
  if (ones[0]?.k) s.push(`${ones[0].a.title} spent the most days at #1: ${ones[0].k}.`)
  if (jump.by) s.push(`The biggest one-day climb: ${jump.a.title}, up ${jump.by} places on ${shortDay(days[jump.day].date)}.`)
  s.push(`${brief} lasted two days or less${steady ? `; ${steady} never left` : ''}.`)
  return s.join(' ')
}
