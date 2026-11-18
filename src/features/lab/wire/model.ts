import type { Project, WikiEvent } from './useWikiStream'

export type WikiFilter = 'all' | Project
export const WIKI_FILTERS: { value: WikiFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'en', label: 'English' },
  { value: 'wikidata', label: 'Wikidata' },
  { value: 'commons', label: 'Commons' },
  { value: 'other', label: 'Other' },
]

export interface Filters {
  wiki: WikiFilter
  hideBots: boolean
  /** Minimum |bytes changed|; 0 lets everything through, including log entries. */
  minDelta: number
  q: string
}

export function matcher(f: Filters): (e: WikiEvent) => boolean {
  const q = f.q.trim().toLowerCase()
  return (e) =>
    (f.wiki === 'all' || e.project === f.wiki) &&
    (!f.hideBots || !e.bot) &&
    (f.minDelta === 0 || (e.delta !== null && Math.abs(e.delta) >= f.minDelta)) &&
    (!q || e.title.toLowerCase().includes(q))
}

export const fmtDelta = (d: number | null) => (d === null ? '' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toLocaleString('en-US')}`)

export const hms = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export interface Boards {
  n: number
  perSec10: number
  bots: number
  newPages: number
  titles: { key: string; title: string; code: string; link: string; n: number }[]
  wikis: { code: string; n: number }[]
  adds: WikiEvent[]
  cuts: WikiEvent[]
  enNew: WikiEvent[]
}

/** Leaderboards over the 5-minute window, after filters. */
export function boards(win: WikiEvent[], keep: (e: WikiEvent) => boolean, now: number): Boards {
  const titles = new Map<string, Boards['titles'][number]>()
  const wikis = new Map<string, number>()
  let n = 0
  let bots = 0
  let newPages = 0
  let last10 = 0
  const sized: WikiEvent[] = []
  const enNew: WikiEvent[] = []
  for (const e of win) {
    if (!keep(e)) continue
    n++
    if (e.at > now - 10_000) last10++
    if (e.bot) bots++
    if (e.type === 'new') newPages++
    if (e.type === 'new' && e.project === 'en' && e.ns === 0 && enNew.length < 8) enNew.push(e)
    wikis.set(e.code, (wikis.get(e.code) ?? 0) + 1)
    if (e.type !== 'log') {
      const key = `${e.code}:${e.title}`
      const t = titles.get(key)
      if (t) t.n++
      else titles.set(key, { key, title: e.title, code: e.code, link: `https://${e.server}/wiki/${encodeURIComponent(e.title.replace(/ /g, '_'))}`, n: 1 })
    }
    if (e.delta !== null && e.delta !== 0) sized.push(e)
  }
  sized.sort((a, b) => b.delta! - a.delta!)
  return {
    n,
    perSec10: last10 / 10,
    bots,
    newPages,
    titles: [...titles.values()].filter((t) => t.n > 1).sort((a, b) => b.n - a.n).slice(0, 8),
    wikis: [...wikis].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    adds: sized.filter((e) => e.delta! > 0).slice(0, 5),
    cuts: sized.filter((e) => e.delta! < 0).slice(-5).reverse(),
    enNew,
  }
}
