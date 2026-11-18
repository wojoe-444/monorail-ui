import type { WikiArticle } from '@/features/lab/sources'

/**
 * The Chart's arithmetic. Input: up to 14 daily top-1000 lists, newest
 * first. A period's score is the sum of an article's daily views in the
 * lists for that period (an article outside a day's top 1,000 counts as
 * zero that day, so long-tail totals are undercounts). The chart is the
 * top 100 by that score.
 */

export const CHART_SIZE = 100
export type Mode = 'weekly' | 'daily'
export type Move = 'up' | 'down' | 'same' | 'new' | 'reentry'

export interface DayList {
  date: Date
  ranks: Map<string, { views: number; rank: number }>
}

export function toDayList(date: Date, list: WikiArticle[]): DayList {
  return { date, ranks: new Map(list.map((a) => [a.article, { views: a.views, rank: a.rank }])) }
}

export interface ChartRow {
  article: string
  title: string
  pos: number
  /** Position in the previous period's ranking (any depth), null if absent. */
  last: number | null
  move: Move
  /** Places gained (positive) or lost (negative); 0 for new and re-entries. */
  delta: number
  /** Best daily rank across the whole window. */
  peak: number | null
  /** Days in the daily top 100 across the window. */
  daysOn: number
  /** Days at daily #1 across the window. */
  daysAtOne: number
  views: number
  prevViews: number
  /** Daily views across the window, oldest first; null where the article missed a day's list. */
  spark: (number | null)[]
}

export interface Chart {
  rows: ChartRow[]
  /** In the previous period's top 40 and out of this period's top 100. */
  fellOff: { article: string; title: string; last: number }[]
  current: { from: Date; to: Date }
  previous: { from: Date; to: Date }
  /** Number of daily lists in the window. */
  days: number
  /** Index in `spark` where the current period starts. */
  periodStart: number
  totalViews: number
}

function rank(days: (DayList | null)[], idx: number[]) {
  const sums = new Map<string, number>()
  for (const i of idx) {
    const d = days[i]
    if (!d) continue
    for (const [a, v] of d.ranks) sums.set(a, (sums.get(a) ?? 0) + v.views)
  }
  const sorted = [...sums].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return { sorted, pos: new Map(sorted.map(([a], i) => [a, i + 1])), sums }
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

export function buildChart(days: (DayList | null)[], mode: Mode): Chart | null {
  const n = days.length
  const len = mode === 'weekly' ? 7 : 1
  if (n < len * 2 || !days[0] || !days[len]) return null
  const curIdx = range(0, len - 1)
  const prevIdx = range(len, 2 * len - 1)
  const earlierIdx = range(len, n - 1)
  const cur = rank(days, curIdx)
  const prev = rank(days, prevIdx)

  const rows: ChartRow[] = cur.sorted.slice(0, CHART_SIZE).map(([article, views], i) => {
    const pos = i + 1
    const last = prev.pos.get(article) ?? null
    let peak: number | null = null
    let daysOn = 0
    let daysAtOne = 0
    const spark: (number | null)[] = []
    for (let k = n - 1; k >= 0; k--) {
      const r = days[k]?.ranks.get(article)
      spark.push(r ? r.views : null)
      if (!r) continue
      if (peak === null || r.rank < peak) peak = r.rank
      if (r.rank <= CHART_SIZE) daysOn++
      if (r.rank === 1) daysAtOne++
    }
    let move: Move
    let delta = 0
    if (last !== null && last <= CHART_SIZE) {
      delta = last - pos
      move = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'
    } else {
      const seenBefore = earlierIdx.some((k) => {
        const r = days[k]?.ranks.get(article)
        return r !== undefined && r.rank <= CHART_SIZE
      })
      move = seenBefore ? 'reentry' : 'new'
    }
    return {
      article,
      title: article.replace(/_/g, ' '),
      pos,
      last,
      move,
      delta,
      peak,
      daysOn,
      daysAtOne,
      views,
      prevViews: prev.sums.get(article) ?? 0,
      spark,
    }
  })

  const fellOff = prev.sorted
    .slice(0, 40)
    .map(([article], i) => ({ article, title: article.replace(/_/g, ' '), last: i + 1, now: cur.pos.get(article) ?? Infinity }))
    .filter((a) => a.now > CHART_SIZE)
    .map(({ article, title, last }) => ({ article, title, last }))

  const at = (i: number) => days[i]?.date ?? new Date(days[0]!.date.getTime() - i * 86_400_000)
  let totalViews = 0
  for (const [, v] of cur.sorted.slice(0, CHART_SIZE)) totalViews += v
  return {
    rows,
    fellOff,
    current: { from: at(len - 1), to: at(0) },
    previous: { from: at(2 * len - 1), to: at(len) },
    days: n,
    periodStart: n - len,
    totalViews,
  }
}

export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`
  return String(n)
}

export const utcDate = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', { timeZone: 'UTC', ...opts })

export function periodLabel(p: { from: Date; to: Date }): string {
  const a = utcDate(p.from, { month: 'short', day: 'numeric' })
  const b = utcDate(p.to, { month: 'short', day: 'numeric' })
  return a === b ? utcDate(p.to, { weekday: 'long', month: 'long', day: 'numeric' }) : `${a} – ${b}`
}

export const wikiHref = (article: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}`
